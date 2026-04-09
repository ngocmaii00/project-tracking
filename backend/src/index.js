require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });
const connectedClients = new Map(); // userId -> ws

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const userId = params.get('userId');
  if (userId) connectedClients.set(userId, ws);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch {}
  });

  ws.on('close', () => {
    if (userId) connectedClients.delete(userId);
  });

  ws.send(JSON.stringify({ type: 'connected', message: 'CWB AI connected' }));
});

function broadcastToUser(userId, data) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
  });
}

app.locals.broadcast = broadcast;
app.locals.broadcastToUser = broadcastToUser;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai_enabled: !!process.env.OPENAI_API_KEY,
    ws_clients: connectedClients.size
  });
});

app.post('/api/seed', async (req, res) => {
  try {
    const db = require('./database');
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
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)');
    users.forEach(u => insertUser.run(u.id, u.email, hash, u.name, u.role));

    db.prepare('INSERT OR IGNORE INTO projects (id, name, description, status, start_date, end_date, baseline_end_date, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('p1', 'CWB Platform v2.0', 'Next generation project intelligence platform with AI capabilities', 'active', '2026-01-15', '2026-07-30', '2026-06-30', 'u2');

    const tasks = [
      { id: 't1', title: 'Requirements Gathering', status: 'done', priority: 'high', owner: 'u5', due: '2026-02-01', est: 40, comp: 100 },
      { id: 't2', title: 'System Architecture Design', status: 'done', priority: 'critical', owner: 'u3', due: '2026-02-15', est: 60, comp: 100 },
      { id: 't3', title: 'Database Schema Design', status: 'done', priority: 'high', owner: 'u3', due: '2026-02-20', est: 24, comp: 100 },
      { id: 't4', title: 'Auth & Permission System', status: 'in_progress', priority: 'critical', owner: 'u3', due: '2026-04-15', est: 32, comp: 75 },
      { id: 't5', title: 'AI Extraction Engine', status: 'in_progress', priority: 'critical', owner: 'u4', due: '2026-04-30', est: 80, comp: 50 },
      { id: 't6', title: 'Risk Analysis Module', status: 'in_progress', priority: 'high', owner: 'u4', due: '2026-05-10', est: 48, comp: 30 },
      { id: 't7', title: 'Dashboard UI Design', status: 'in_progress', priority: 'high', owner: 'u6', due: '2026-04-20', est: 40, comp: 60 },
      { id: 't8', title: 'Meeting Intelligence Integration', status: 'todo', priority: 'high', owner: 'u4', due: '2026-05-20', est: 56, comp: 0 },
      { id: 't9', title: 'Gantt Chart Component', status: 'todo', priority: 'medium', owner: 'u6', due: '2026-05-15', est: 32, comp: 0 },
      { id: 't10', title: 'API Documentation', status: 'todo', priority: 'low', owner: 'u5', due: '2026-06-01', est: 16, comp: 0 },
      { id: 't11', title: 'Performance Testing', status: 'blocked', priority: 'high', owner: 'u3', due: '2026-04-10', est: 24, comp: 10 },
      { id: 't12', title: 'Security Audit', status: 'todo', priority: 'critical', owner: 'u2', due: '2026-06-15', est: 40, comp: 0 },
      { id: 't13', title: 'User Acceptance Testing', status: 'todo', priority: 'high', owner: 'u5', due: '2026-07-01', est: 48, comp: 0 },
      { id: 't14', title: 'Production Deployment', status: 'todo', priority: 'critical', owner: 'u3', due: '2026-07-20', est: 16, comp: 0 },
      { id: 't15', title: 'What-if Simulation Engine', status: 'in_progress', priority: 'high', owner: 'u4', due: '2026-05-25', est: 64, comp: 20 },
    ];

    const insertTask = db.prepare(`INSERT OR IGNORE INTO tasks (id, project_id, title, status, priority, owner_id, due_date, baseline_due_date, estimated_hours, completion_pct, position, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    tasks.forEach((t, i) => insertTask.run(t.id, 'p1', t.title, t.status, t.priority, t.owner, t.due, t.due, t.est, t.comp, i, 'manual'));

    const risks = [
      { id: 'r1', title: 'AI Integration Delays', category: 'technical', prob: 0.6, impact: 0.8, score: 48, mit: 'Use rule-based fallback; start with GPT-4o-mini' },
      { id: 'r2', title: 'Resource Overload - Dev Team', category: 'resource', prob: 0.7, impact: 0.7, score: 49, mit: 'Hire additional developer or extend timeline' },
      { id: 'r3', title: 'Scope Creep from Stakeholders', category: 'scope', prob: 0.5, impact: 0.6, score: 30, mit: 'Strict change control process via approval workflow' },
    ];
    const insertRisk = db.prepare('INSERT OR IGNORE INTO risks (id, project_id, title, category, probability, impact, risk_score, mitigation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    risks.forEach(r => insertRisk.run(r.id, 'p1', r.title, r.category, r.prob, r.impact, r.score, r.mit, 'open'));

    res.json({ success: true, message: 'Demo data seeded. Login: admin@cwb.com / password123' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cron.schedule('0 8 * * *', async () => {
  console.log('🤖 Running daily risk analysis...');
  try {
    const db = require('./database');
    const { riskAnalysisAgent } = require('./services/aiAgents');
    const projects = db.prepare("SELECT * FROM projects WHERE status = 'active'").all();
    
    for (const project of projects) {
      const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project.id);
      const users = db.prepare('SELECT * FROM users').all();
      const analysis = await riskAnalysisAgent(tasks, project, users);
      
      db.prepare('UPDATE projects SET risk_score = ?, health_score = ? WHERE id = ?')
        .run(analysis.project_risk_score, analysis.health_score, project.id);
      
      if (analysis.project_risk_score > 70) {
        const pm = db.prepare("SELECT id FROM users WHERE role IN ('project_manager', 'admin') LIMIT 1").get();
        if (pm) {
          db.prepare('INSERT INTO notifications (id, user_id, type, title, message, priority) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), pm.id, 'risk_alert', `⚠️ High Risk: ${project.name}`, `Risk score: ${analysis.project_risk_score}/100 — ${analysis.critical_warnings?.join(', ')}`, 'urgent');
          broadcastToUser(pm.id, { type: 'notification', data: { title: 'High Risk Alert', project: project.name } });
        }
      }
    }
  } catch (err) {
    console.error('Cron risk analysis failed:', err.message);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   CWB Project Intelligence Platform - Backend     ║
║   Running on http://localhost:${PORT}                ║
║   WebSocket: ws://localhost:${PORT}/ws               ║
║   AI: ${process.env.OPENAI_API_KEY ? '✅ Enabled (OpenAI)' : '⚡ Rule-based mode'}                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, broadcast, broadcastToUser };
