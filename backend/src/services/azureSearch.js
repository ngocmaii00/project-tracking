/**
 * Azure AI Search Service
 * Thay thế: không có search trước đây
 * Hỗ trợ: full-text, semantic, vector search trên toàn bộ dự án
 */

const { SearchClient, SearchIndexClient, AzureKeyCredential, odata } = require('@azure/search-documents');

const SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT;
const SEARCH_API_KEY = process.env.AZURE_SEARCH_API_KEY;
const INDEX_NAME = process.env.AZURE_SEARCH_INDEX || 'cwb-projects-index';

let searchClient = null;
let indexClient = null;
let isConfigured = false;

function init() {
  if (!SEARCH_ENDPOINT || !SEARCH_API_KEY) {
    console.warn('⚠️  Azure AI Search not configured — search features disabled');
    return;
  }
  const credential = new AzureKeyCredential(SEARCH_API_KEY);
  searchClient = new SearchClient(SEARCH_ENDPOINT, INDEX_NAME, credential);
  indexClient = new SearchIndexClient(SEARCH_ENDPOINT, credential);
  isConfigured = true;
}

/**
 * Tạo/cập nhật index schema
 */
async function ensureIndex() {
  if (!indexClient) return;
  try {
    await indexClient.createOrUpdateIndex({
      name: INDEX_NAME,
      fields: [
        { name: 'id', type: 'Edm.String', key: true, filterable: true },
        { name: 'type', type: 'Edm.String', filterable: true, facetable: true },
        { name: 'title', type: 'Edm.String', searchable: true, analyzerName: 'standard.lucene' },
        { name: 'content', type: 'Edm.String', searchable: true, analyzerName: 'standard.lucene' },
        { name: 'projectId', type: 'Edm.String', filterable: true, facetable: true },
        { name: 'status', type: 'Edm.String', filterable: true, facetable: true },
        { name: 'priority', type: 'Edm.String', filterable: true, facetable: true },
        { name: 'ownerId', type: 'Edm.String', filterable: true },
        { name: 'ownerName', type: 'Edm.String', searchable: true },
        { name: 'tags', type: 'Collection(Edm.String)', filterable: true, facetable: true },
        { name: 'createdAt', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
        { name: 'updatedAt', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
        { name: 'score', type: 'Edm.Double', filterable: true, sortable: true },
      ],
      semanticSearch: {
        configurations: [
          {
            name: 'semantic-config',
            prioritizedFields: {
              titleField: { fieldName: 'title' },
              contentFields: [{ fieldName: 'content' }],
            },
          },
        ],
      },
    });
    console.log('✅ Azure AI Search index ready');
  } catch (err) {
    console.error('Search index creation error:', err.message);
  }
}

/**
 * Index một document (task, meeting, memory, ...)
 */
async function indexDocument(doc) {
  if (!searchClient) return;
  try {
    await searchClient.uploadDocuments([{
      id: doc.id,
      type: doc.type,
      title: doc.title || '',
      content: doc.content || doc.description || '',
      projectId: doc.projectId || doc.project_id || '',
      status: doc.status || '',
      priority: doc.priority || '',
      ownerId: doc.ownerId || doc.owner_id || '',
      ownerName: doc.ownerName || '',
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      score: doc.score || 0,
    }]);
  } catch (err) {
    console.error('Search indexDocument error:', err.message);
  }
}

/**
 * Index nhiều documents cùng lúc (batch)
 */
async function indexDocuments(docs) {
  if (!searchClient || !docs.length) return;
  try {
    const batch = docs.map(doc => ({
      id: doc.id,
      type: doc.type || 'task',
      title: doc.title || '',
      content: doc.content || doc.description || '',
      projectId: doc.projectId || doc.project_id || '',
      status: doc.status || '',
      priority: doc.priority || '',
      ownerId: doc.ownerId || doc.owner_id || '',
      ownerName: doc.ownerName || '',
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      score: doc.score || 0,
    }));
    await searchClient.uploadDocuments(batch);
  } catch (err) {
    console.error('Search indexDocuments batch error:', err.message);
  }
}

/**
 * Tìm kiếm semantic + full-text
 * @param {string} query - Câu truy vấn tự nhiên
 * @param {object} options - { projectId, type, status, top }
 */
async function search(query, options = {}) {
  if (!searchClient) {
    return { results: [], total: 0, message: 'Search not configured' };
  }
  try {
    const { projectId, type, status, top = 20 } = options;

    const filters = [];
    if (projectId) filters.push(odata`projectId eq ${projectId}`);
    if (type) filters.push(odata`type eq ${type}`);
    if (status) filters.push(odata`status eq ${status}`);

    const searchOptions = {
      top,
      includeTotalCount: true,
      filter: filters.length > 0 ? filters.join(' and ') : undefined,
      queryType: 'semantic',
      semanticSearchOptions: {
        configurationName: 'semantic-config',
        answers: { answerType: 'extractive', count: 3 },
        captions: { captionType: 'extractive' },
      },
      select: ['id', 'type', 'title', 'content', 'projectId', 'status', 'priority', 'ownerId', 'ownerName', 'tags', 'createdAt'],
      orderBy: ['@search.score desc'],
    };

    const response = await searchClient.search(query, searchOptions);
    const results = [];
    for await (const result of response.results) {
      results.push({
        ...result.document,
        searchScore: result.score,
        captions: result.captions,
        highlights: result.highlights,
      });
    }

    return { results, total: await response.count };
  } catch (err) {
    console.error('Search error:', err.message);
    return { results: [], total: 0, error: err.message };
  }
}

/**
 * Xoá document khỏi index khi bị xoá trong DB
 */
async function deleteDocument(id) {
  if (!searchClient) return;
  try {
    await searchClient.deleteDocuments([{ id }]);
  } catch (err) {
    console.error('Search deleteDocument error:', err.message);
  }
}

init();

module.exports = { ensureIndex, indexDocument, indexDocuments, search, deleteDocument, isConfigured: () => isConfigured };
