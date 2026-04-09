const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const {
  extractionAgent,
  riskAnalysisAgent,
  simulationAgent,
  resourceOptimizationAgent,
  dailyStandupGenerator,
  behavioralInsightAgent,
  conversationAgent,
  timelinePredictionAgent
} = require('../services/aiAgents');

const router = express.Router();

router.post('/extract', authenticate, async (req, res) => {
  try {
    const { text, source_type = 'meeting', project_id } = req.body;
    if (!text) return res.status(400).json({ error: 'Text content required' });

    const project = project_id ? db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id) : null;
    const existingTasks = project_id ? db.prepare('SELECT id, title, status, owner_id FROM tasks WHERE project_id = ?').all(project_id) : [];
    const projectContext = { project, existing_tasks: existingTasks };

    const result = await extractionAgent(text, source_type, projectContext);

    const draftId = uuidv4();
    db.prepare(`
      INSERT INTO ai_drafts (id, project_id, source_type, source_content, extracted_tasks, confidence_score, ai_summary, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(draftId, project_id || null, source_type, text, JSON.stringify(result.extracted_tasks), result.overall_confidence, result.summary, req.user.id);

    if (project_id) {
      db.prepare('INSERT INTO project_memory (id, project_id, memory_type, content) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), project_id, 'discussion', `${source_type.toUpperCase()}: ${result.summary}`);
    }

    res.json({ draft_id: draftId, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/drafts', authenticate, (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = 'SELECT d.*, u.name as created_by_name FROM ai_drafts d LEFT JOIN users u ON d.created_by = u.id WHERE 1=1';
    const params = [];
    if (project_id) { query += ' AND d.project_id = ?'; params.push(project_id); }
    if (status) { query += ' AND d.status = ?'; params.push(status); }
    query += ' ORDER BY d.created_at DESC LIMIT 50';

    res.json({ drafts: db.prepare(query).all(...params) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/drafts/:id', authenticate, (req, res) => {
  try {
    const draft = db.prepare('SELECT * FROM ai_drafts WHERE id = ?').get(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/drafts/:id/approve', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const draft = db.prepare('SELECT * FROM ai_drafts WHERE id = ?').get(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft already processed' });

    const { selected_tasks, approve_all = false } = req.body;
    const extractedTasks = JSON.parse(draft.extracted_tasks || '[]');
    const tasksToApply = approve_all ? extractedTasks : extractedTasks.filter((_, i) => selected_tasks?.includes(i));

    const createdTasks = [];
    const applyTasks = db.transaction((tasks) => {
      tasks.forEach(task => {
        const existing = draft.project_id ? db.prepare("SELECT * FROM tasks WHERE project_id = ? AND LOWER(title) LIKE ?").get(draft.project_id, `%${task.title.toLowerCase().substring(0, 30)}%`) : null;

        if (existing && task.change_type === 'update') {
          db.prepare('UPDATE tasks SET status=?, priority=?, due_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
            .run(task.status || existing.status, task.priority || existing.priority, task.due_date || existing.due_date, existing.id);
          
          db.prepare('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, ai_reasoning, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), existing.id, existing.project_id, req.user.id, 'ai_update', task.reasoning, 'ai_draft');
          createdTasks.push({ ...existing, action: 'updated' });
        } else if (!existing && draft.project_id) {
          const id = uuidv4();
          const maxPos = db.prepare('SELECT MAX(position) as mp FROM tasks WHERE project_id = ?').get(draft.project_id);
          
          db.prepare(`
            INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, baseline_due_date, tags, confidence_score, source, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, draft.project_id, task.title, task.description || task.evidence || '', task.status || 'todo', task.priority || 'medium', task.due_date || null, task.due_date || null, JSON.stringify(task.tags || []), task.confidence || 0.8, 'ai_extract', (maxPos?.mp || 0) + 1);

          db.prepare('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, ai_reasoning, source, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
            .run(uuidv4(), id, draft.project_id, req.user.id, 'ai_created', task.reasoning, 'ai_draft', req.user.id);
          createdTasks.push({ id, title: task.title, action: 'created' });
        }
      });
    });
    applyTasks(tasksToApply);

    if (draft.project_id) {
      db.prepare('INSERT INTO project_memory (id, project_id, memory_type, content) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), draft.project_id, 'change', `AI Draft approved: ${createdTasks.length} tasks applied. Source: ${draft.source_type}`);
    }

    db.prepare('UPDATE ai_drafts SET status=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?')
      .run('approved', req.user.id, draft.id);

    res.json({ success: true, applied_tasks: createdTasks, total_applied: createdTasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/drafts/:id/reject', authenticate, authorize('project_manager', 'admin'), (req, res) => {
  try {
    db.prepare('UPDATE ai_drafts SET status=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?')
      .run('rejected', req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/risk', authenticate, async (req, res) => {
  try {
    const { project_id } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);
    const users = db.prepare('SELECT id, name, role, skills FROM users').all();

    const analysis = await riskAnalysisAgent(tasks, project, users);

    const saveRisks = db.transaction((risks) => {
      db.prepare("DELETE FROM risks WHERE project_id = ? AND category != 'external'").run(project_id);
      risks.forEach(risk => {
        db.prepare(`INSERT INTO risks (id, project_id, title, description, category, probability, impact, risk_score, mitigation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(uuidv4(), project_id, risk.title, risk.description, risk.category, risk.probability, risk.impact, risk.risk_score, risk.mitigation || '', 'open');
      });
    });
    saveRisks(analysis.risks || []);

    db.prepare('UPDATE projects SET risk_score = ?, health_score = ? WHERE id = ?')
      .run(analysis.project_risk_score, analysis.health_score, project_id);

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/simulate', authenticate, async (req, res) => {
  try {
    const { scenario, project_id, name } = req.body;
    if (!scenario || !project_id) return res.status(400).json({ error: 'scenario and project_id required' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);

    const result = await simulationAgent(scenario, project, tasks);

    const simId = uuidv4();
    db.prepare('INSERT INTO simulations (id, project_id, name, scenario, input_changes, result, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(simId, project_id, name || `Simulation ${new Date().toLocaleDateString()}`, scenario, JSON.stringify([]), JSON.stringify(result), req.user.id);

    res.json({ simulation_id: simId, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/simulations/:project_id', authenticate, (req, res) => {
  try {
    const sims = db.prepare('SELECT s.*, u.name as created_by_name FROM simulations s LEFT JOIN users u ON s.created_by = u.id WHERE s.project_id = ? ORDER BY s.created_at DESC LIMIT 20').all(req.params.project_id);
    res.json({ simulations: sims });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/optimize-resources', authenticate, async (req, res) => {
  try {
    const { project_id } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? AND status != ?', ).all(project_id, 'done');
    const users = db.prepare('SELECT * FROM users').all();

    const result = await resourceOptimizationAgent(tasks, users, project);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/standup', authenticate, async (req, res) => {
  try {
    const { project_id } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const recentChanges = db.prepare('SELECT * FROM task_changes WHERE project_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 20').all(project_id, yesterday);

    const standup = await dailyStandupGenerator(project, tasks, recentChanges);
    res.json({ standup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/behavioral-insights', authenticate, async (req, res) => {
  try {
    const { project_id } = req.body;
    const history = db.prepare('SELECT tc.*, t.title as task_title, t.due_date, t.priority FROM task_changes tc LEFT JOIN tasks t ON tc.task_id = t.id WHERE tc.project_id = ? ORDER BY tc.created_at DESC LIMIT 200').all(project_id);
    const users = db.prepare('SELECT id, name, role FROM users').all();
    const insights = await behavioralInsightAgent(history, users);
    res.json({ insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/predict-timeline', authenticate, async (req, res) => {
  try {
    const { project_id } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);
    const prediction = await timelinePredictionAgent(project, tasks, []);
    res.json({ prediction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, project_id, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let projectContext = { user: req.user };
    if (project_id) {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
      const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);
      const risks = db.prepare('SELECT * FROM risks WHERE project_id = ?').all(project_id);
      const memories = db.prepare('SELECT * FROM project_memory WHERE project_id = ? ORDER BY created_at DESC LIMIT 20').all(project_id);
      projectContext = { project, tasks, risks, memories, user: req.user };
    }

    const { reply, confidence } = await conversationAgent(message, projectContext, history || []);
    
    if (project_id) {
      db.prepare('INSERT INTO project_memory (id, project_id, memory_type, content) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), project_id, 'discussion', `Q: ${message} | A: ${reply.substring(0, 200)}`);
    }

    res.json({ reply, confidence, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/single-source-validator/:project_id', authenticate, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.project_id);
    const changes = db.prepare('SELECT * FROM task_changes WHERE project_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.project_id);
    
    const inconsistencies = [];
    
    tasks.forEach(task => {
      const taskChanges = changes.filter(c => c.task_id === task.id);
      const sourceChanges = taskChanges.reduce((acc, c) => {
        acc[c.source] = acc[c.source] || [];
        acc[c.source].push(c);
        return acc;
      }, {});

      if (Object.keys(sourceChanges).length > 1) {
        const sources = Object.keys(sourceChanges);
        const latestBySource = sources.map(s => ({ source: s, change: sourceChanges[s][0] }));
        
        const ownerChanges = taskChanges.filter(c => c.field_name === 'owner_id');
        if (ownerChanges.length > 1 && ownerChanges[0].new_value !== ownerChanges[1]?.new_value) {
          inconsistencies.push({
            task_id: task.id,
            task_title: task.title,
            type: 'owner_conflict',
            description: `Owner changed ${ownerChanges.length} times across different sources`,
            sources: [...new Set(ownerChanges.map(c => c.source))],
            severity: 'high'
          });
        }
      }

      if (!task.owner_id) {
        inconsistencies.push({ task_id: task.id, task_title: task.title, type: 'missing_owner', description: 'Task has no assigned owner', sources: [task.source], severity: 'medium' });
      }

      if (!task.due_date && task.status !== 'done') {
        inconsistencies.push({ task_id: task.id, task_title: task.title, type: 'missing_due_date', description: 'Task has no due date', sources: [task.source], severity: 'low' });
      }
    });

    res.json({ inconsistencies, total: inconsistencies.length, high: inconsistencies.filter(i => i.severity === 'high').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
