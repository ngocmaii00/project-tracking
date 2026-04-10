require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./database');
const { ensureIndex } = require('./services/azureSearch');

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server (Real-time push) ────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws' });
const connectedClients = new Map(); // userId → ws

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const userId = params.get('userId');
  if (userId) connectedClients.set(userId, ws);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else if (data.type === 'typing') {
        // Broadcast typing indicator to all OTHER clients
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'typing',
              userId,
              userName: data.userName,
              conversationId: data.conversationId,
              isTyping: data.isTyping
            }));
          }
        });
      } else if (data.type === 'meeting_event') {
        // Broadcast meeting events (reactions, notes, etc.) to everyone
        broadcast(data);
      } else if (data.type === 'chat_message') {
        const { query, queryOne } = require('./database');
        const messageId = uuidv4();
        query('INSERT INTO messages (id, project_id, conversation_id, author_id, content, type, file_url, reply_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
          messageId, data.projectId || null, data.conversationId || null, userId, data.content, data.msgType || 'text', data.fileUrl || null, data.replyTo ? JSON.stringify(data.replyTo) : null
        ]).then(async () => {
          const author = await queryOne('SELECT name, avatar FROM users WHERE id = $1', [userId]);
          broadcast({
            type: 'chat_message',
            id: messageId,
            projectId: data.projectId,
            conversationId: data.conversationId,
            authorId: userId,
            authorName: author?.name || data.authorName || 'User',
            authorAvatar: author?.avatar || null,
            content: data.content,
            msgType: data.msgType || 'text',
            fileUrl: data.fileUrl || null,
            replyTo: data.replyTo || null,
            createdAt: new Date().toISOString()
          });
        }).catch(err => console.error('Chat error:', err));
      } else if (data.type === 'pin_message') {
        const { query } = require('./database');
        query('UPDATE messages SET is_pinned = $1 WHERE id = $2', [data.isPinned, data.messageId])
          .then(() => {
            broadcast({ type: 'pin_update', messageId: data.messageId, isPinned: data.isPinned });
          });
      }
    } catch { /* ignore */ }
  });

  ws.on('close', () => { if (userId) connectedClients.delete(userId); });
  ws.send(JSON.stringify({ type: 'connected', message: 'CWB Azure Intelligence connected' }));
});

function broadcastToUser(userId, data) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(data) {
  wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data)); });
}

app.locals.broadcast = broadcast;
app.locals.broadcastToUser = broadcastToUser;

// Static uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/files', require('./routes/files'));      // Azure Blob Storage
app.use('/api/search', require('./routes/search'));    // Azure AI Search
app.use('/api/powerbi', require('./routes/powerbi')); // Power BI Embedded token
app.use('/api/chat', require('./routes/chat'));       // Real-time Chat history
app.use('/api/friends', require('./routes/friends'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/friends', require('./routes/friends')); // Friend & search system

// ─── Power Automate Webhooks (thay thế node-cron) ────────────────────────────
// Power Automate gọi endpoint này theo lịch (8:00 AM daily)
app.post('/api/webhooks/daily-risk-scan', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.POWER_AUTOMATE_SECRET) {
    return res.status(403).json({ error: 'Unauthorized webhook' });
  }
  try {
    const { query, queryOne } = require('./database');
    const { riskAnalysisAgent } = require('./services/aiAgents');

    const projects = await query("SELECT * FROM projects WHERE status = 'active'");
    const results = [];

    for (const project of projects) {
      const tasks = await query('SELECT * FROM tasks WHERE project_id = $1', [project.id]);
      const users = await query('SELECT * FROM users');
      const analysis = await riskAnalysisAgent(tasks, project, users);

      await query('UPDATE projects SET risk_score = $1, health_score = $2 WHERE id = $3', [analysis.project_risk_score, analysis.health_score, project.id]);

      if (analysis.project_risk_score > 70) {
        const pm = await queryOne("SELECT id FROM users WHERE role IN ('project_manager', 'admin') LIMIT 1");
        if (pm) {
          await query('INSERT INTO notifications (id, user_id, type, title, message, priority) VALUES ($1, $2, $3, $4, $5, $6)',
            [uuidv4(), pm.id, 'risk_alert', `⚠️ High Risk: ${project.name}`, `Risk score: ${analysis.project_risk_score}/100`, 'urgent']);
          broadcastToUser(pm.id, { type: 'notification', data: { title: 'High Risk Alert', project: project.name } });
        }
      }
      results.push({ projectId: project.id, riskScore: analysis.project_risk_score });
    }
    res.json({ success: true, scanned: projects.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Power Automate: GitHub PR merge → cập nhật task
app.post('/api/webhooks/github-pr-merged', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.POWER_AUTOMATE_SECRET) {
    return res.status(403).json({ error: 'Unauthorized webhook' });
  }
  try {
    const { prTitle, prNumber, mergedBy, taskIds = [] } = req.body;
    const { query } = require('./database');
    const { saveAuditEvent } = require('./services/cosmosDb');

    for (const taskId of taskIds) {
      await query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['done', taskId]);
      await saveAuditEvent({
        projectId: 'github',
        entityType: 'task',
        entityId: taskId,
        changeType: 'status_change',
        oldValue: 'in_progress',
        newValue: 'done',
        aiReasoning: `GitHub PR #${prNumber} "${prTitle}" merged by ${mergedBy}`,
        actor: 'github-actions',
        source: 'github',
      });
    }
    broadcast({ type: 'github_pr_merged', data: { prTitle, prNumber, taskIds } });
    res.json({ success: true, updated: taskIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      ai_foundry: !!process.env.AZURE_OPENAI_ENDPOINT ? '✅ Azure AI Foundry' : '⚡ Rule-based mode',
      database: !!process.env.PG_HOST ? '✅ Azure PostgreSQL' : '❌ Not configured',
      cosmos: !!process.env.COSMOS_ENDPOINT ? '✅ Azure Cosmos DB' : '⚠️ Disabled',
      blob_storage: !!process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ Azure Blob Storage' : '⚠️ Disabled',
      search: !!process.env.AZURE_SEARCH_ENDPOINT ? '✅ Azure AI Search' : '⚠️ Disabled',
    },
    ws_clients: connectedClients.size,
  });
});

// ─── Seed Demo Data ───────────────────────────────────────────────────────────
app.post('/api/seed', async (req, res) => {
  try {
    const { query } = require('./database');
    const bcrypt = require('bcryptjs');

    const users = [
      { id: 'u1', email: 'admin@cwb.com', name: 'Admin User', role: 'admin' },
      { id: 'u2', email: 'pm@cwb.com', name: 'Project Manager', role: 'project_manager' },
      { id: 'u3', email: 'dev1@cwb.com', name: 'Dev Alpha', role: 'contributor' },
      { id: 'u4', email: 'dev2@cwb.com', name: 'Dev Beta', role: 'contributor' },
      { id: 'u5', email: 'ba@cwb.com', name: 'Business Analyst', role: 'contributor' },
      { id: 'u6', email: 'designer@cwb.com', name: 'UI Designer', role: 'contributor' },
    ];
    const hash = await bcrypt.hash('password123', 12);
    for (const u of users) {
      await query('INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [u.id, u.email, hash, u.name, u.role]);
    }

    await query(`INSERT INTO projects (id, name, description, status, start_date, end_date, baseline_end_date, owner_id)
      VALUES ('p1', 'CWB Platform v2.0', 'Azure-powered project intelligence platform', 'active', '2026-01-15', '2026-07-30', '2026-06-30', 'u2')
      ON CONFLICT (id) DO NOTHING`);

    const tasks = [
      ['t1', 'Requirements Gathering', 'done', 'critical', 'u5', '2026-02-01', 40, 100],
      ['t2', 'System Architecture Design', 'done', 'critical', 'u3', '2026-02-15', 60, 100],
      ['t3', 'Database Schema Design', 'done', 'high', 'u3', '2026-02-20', 24, 100],
      ['t4', 'Auth & Permission System', 'in_progress', 'critical', 'u3', '2026-04-15', 32, 75],
      ['t5', 'Azure AI Foundry Integration', 'in_progress', 'critical', 'u4', '2026-04-30', 80, 50],
      ['t6', 'Risk Analysis Module', 'in_progress', 'high', 'u4', '2026-05-10', 48, 30],
      ['t7', 'Power BI Dashboard Embedding', 'in_progress', 'high', 'u6', '2026-04-20', 40, 60],
      ['t8', 'Azure Cosmos DB Integration', 'todo', 'high', 'u4', '2026-05-20', 56, 0],
      ['t9', 'Gantt Chart Component', 'todo', 'medium', 'u6', '2026-05-15', 32, 0],
      ['t10', 'Azure Blob Storage Setup', 'todo', 'high', 'u3', '2026-05-01', 16, 0],
      ['t11', 'Azure AI Search Indexing', 'blocked', 'high', 'u3', '2026-04-10', 24, 10],
      ['t12', 'Power Automate Flows', 'todo', 'critical', 'u2', '2026-06-15', 40, 0],
      ['t13', 'GitHub Actions CI/CD', 'todo', 'high', 'u5', '2026-07-01', 48, 0],
      ['t14', 'Production Deployment to Azure', 'todo', 'critical', 'u3', '2026-07-20', 16, 0],
      ['t15', 'What-if Simulation Engine', 'in_progress', 'high', 'u4', '2026-05-25', 64, 20],
    ];
    for (const [i, t] of tasks.entries()) {
      await query(`INSERT INTO tasks (id, project_id, title, status, priority, owner_id, due_date, baseline_due_date, estimated_hours, completion_pct, position, source)
        VALUES ($1, 'p1', $2, $3, $4, $5, $6, $6, $7, $8, $9, 'manual') ON CONFLICT (id) DO NOTHING`,
        [t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], i]);
    }

    res.json({ success: true, message: 'Demo data seeded. Login: admin@cwb.com / password123' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  await initializeDatabase();
  await ensureIndex(); // Azure AI Search index
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   CWB Project Intelligence Platform v2.0 — Azure        ║
║   API:       http://localhost:${PORT}                      ║
║   WebSocket: ws://localhost:${PORT}/ws                     ║
║   AI:        ${process.env.AZURE_OPENAI_ENDPOINT ? 'Azure AI Foundry ✅' : 'Rule-based mode ⚡'}         ║
║   DB:        ${process.env.PG_HOST ? 'Azure PostgreSQL ✅' : 'Not configured ❌'}            ║
║   Cosmos:    ${process.env.COSMOS_ENDPOINT ? 'Azure Cosmos DB ✅' : 'Disabled ⚠️ '}        ║
║   Search:    ${process.env.AZURE_SEARCH_ENDPOINT ? 'Azure AI Search ✅' : 'Disabled ⚠️ '}  ║
║   Blob:      ${process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Azure Blob ✅     ' : 'Disabled ⚠️ '}       ║
╚══════════════════════════════════════════════════════════╝
    `);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = { app, server, broadcast, broadcastToUser };
