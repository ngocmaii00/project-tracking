/**
 * Azure Cosmos DB Service
 * Lưu trữ: chat history, audit events, AI memory, notification logs
 */

const { CosmosClient } = require('@azure/cosmos');

let client = null;
let db = null;

function getClient() {
  if (!client) {
    if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
      console.warn('⚠️  Cosmos DB not configured — chat history & audit logs will be in-memory only');
      return null;
    }
    client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
  }
  return client;
}

async function getDatabase() {
  if (db) return db;
  const c = getClient();
  if (!c) return null;
  const { database } = await c.databases.createIfNotExists({
    id: process.env.COSMOS_DATABASE || 'cwb_intelligence',
  });
  db = database;
  return db;
}

async function getContainer(containerId, partitionKey = '/projectId') {
  const database = await getDatabase();
  if (!database) return null;
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey] },
    defaultTtl: containerId === 'chat_history' ? 2592000 : -1, // 30 days TTL for chat
  });
  return container;
}

/**
 * Lưu message vào lịch sử chat
 */
async function saveChatMessage(projectId, userId, role, content, confidence = null) {
  try {
    const container = await getContainer('chat_history');
    if (!container) return null;

    const { v4: uuidv4 } = require('uuid');
    const doc = {
      id: uuidv4(),
      projectId: projectId || 'global',
      userId,
      role,
      content,
      confidence,
      timestamp: new Date().toISOString(),
    };
    const { resource } = await container.items.create(doc);
    return resource;
  } catch (err) {
    console.error('Cosmos saveChatMessage error:', err.message);
    return null;
  }
}

/**
 * Lấy lịch sử chat của project
 */
async function getChatHistory(projectId, userId, limit = 20) {
  try {
    const container = await getContainer('chat_history');
    if (!container) return [];

    const querySpec = {
      query: `SELECT TOP @limit * FROM c 
              WHERE c.projectId = @projectId AND c.userId = @userId 
              ORDER BY c.timestamp DESC`,
      parameters: [
        { name: '@projectId', value: projectId || 'global' },
        { name: '@userId', value: userId },
        { name: '@limit', value: limit },
      ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources.reverse(); // chronological order
  } catch (err) {
    console.error('Cosmos getChatHistory error:', err.message);
    return [];
  }
}

/**
 * Lưu audit event khi có thay đổi
 */
async function saveAuditEvent(event) {
  try {
    const container = await getContainer('audit_events');
    if (!container) return null;

    const { v4: uuidv4 } = require('uuid');
    const doc = {
      id: uuidv4(),
      projectId: event.projectId,
      entityType: event.entityType,
      entityId: event.entityId,
      changeType: event.changeType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      aiReasoning: event.aiReasoning || null,
      actor: event.actor,
      source: event.source || 'manual',
      timestamp: new Date().toISOString(),
    };
    const { resource } = await container.items.create(doc);
    return resource;
  } catch (err) {
    console.error('Cosmos saveAuditEvent error:', err.message);
    return null;
  }
}

/**
 * Lấy audit trail của project
 */
async function getAuditTrail(projectId, limit = 100) {
  try {
    const container = await getContainer('audit_events');
    if (!container) return [];

    const querySpec = {
      query: `SELECT TOP @limit * FROM c 
              WHERE c.projectId = @projectId 
              ORDER BY c.timestamp DESC`,
      parameters: [
        { name: '@projectId', value: projectId },
        { name: '@limit', value: limit },
      ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (err) {
    console.error('Cosmos getAuditTrail error:', err.message);
    return [];
  }
}

/**
 * Lưu AI memory/decision vào Cosmos
 */
async function saveProjectMemory(projectId, memoryType, content, entities = []) {
  try {
    const container = await getContainer('project_memory');
    if (!container) return null;

    const { v4: uuidv4 } = require('uuid');
    const doc = {
      id: uuidv4(),
      projectId,
      memoryType,
      content,
      referencedEntities: entities,
      timestamp: new Date().toISOString(),
    };
    const { resource } = await container.items.create(doc);
    return resource;
  } catch (err) {
    console.error('Cosmos saveProjectMemory error:', err.message);
    return null;
  }
}

module.exports = {
  saveChatMessage,
  getChatHistory,
  saveAuditEvent,
  getAuditTrail,
  saveProjectMemory,
};
