const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { riskAnalysisAgent, criticalPathAgent, changeDetectionAgent, timelinePredictionAgent } = require('../services/aiAgents');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'blocked') as blocked_tasks,
        (SELECT COUNT(*) FROM risks r WHERE r.project_id = p.id AND r.status = 'open') as open_risks
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.updated_at DESC
    `).all();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('project_manager', 'admin'), (req, res) => {
  try {
    const { name, description, start_date, end_date, owner_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, name, description, start_date, end_date, baseline_end_date, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', start_date || null, end_date || null, end_date || null, owner_id || req.user.id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db.prepare(`
      SELECT t.*, u.name as owner_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE t.project_id = ?
      ORDER BY t.position ASC, t.created_at ASC
    `).all(req.params.id);

    const risks = db.prepare('SELECT * FROM risks WHERE project_id = ? ORDER BY risk_score DESC').all(req.params.id);
    const members = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar, u.skills
      FROM users u
      WHERE u.id IN (
        SELECT DISTINCT owner_id FROM tasks WHERE project_id = ? AND owner_id IS NOT NULL
        UNION SELECT owner_id FROM projects WHERE id = ?
      )
    `).all(req.params.id, req.params.id);

    res.json({ project, tasks, risks, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('project_manager', 'admin'), (req, res) => {
  try {
    const { name, description, status, start_date, end_date, owner_id, metadata } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    db.prepare(`
      UPDATE projects SET name=?, description=?, status=?, start_date=?, end_date=?, owner_id=?, metadata=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(name || project.name, description ?? project.description, status || project.status, start_date ?? project.start_date, end_date ?? project.end_date, owner_id ?? project.owner_id, JSON.stringify(metadata || {}), req.params.id);

    res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id);
    const users = db.prepare(`
      SELECT * FROM users WHERE id IN (SELECT DISTINCT owner_id FROM tasks WHERE project_id = ? AND owner_id IS NOT NULL)
    `).all(req.params.id);

    const statusCount = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
    const priorityCount = tasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {});
    
    const completionRate = tasks.length > 0 ? tasks.filter(t => t.status === 'done').length / tasks.length : 0;
    
    const today = new Date();
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done');
    
    const startDate = project.start_date ? new Date(project.start_date) : new Date();
    const endDate = project.end_date ? new Date(project.end_date) : new Date();
    const totalDays = (endDate - startDate) / 86400000;
    const elapsed = (today - startDate) / 86400000;
    const timeProgress = totalDays > 0 ? Math.min(1, elapsed / totalDays) : 0;

    const cpResult = criticalPathAgent(tasks);

    const [riskAnalysis, prediction] = await Promise.all([
      riskAnalysisAgent(tasks, project, users),
      timelinePredictionAgent(project, tasks, [])
    ]);

    db.prepare('UPDATE projects SET risk_score = ?, health_score = ? WHERE id = ?')
      .run(riskAnalysis.project_risk_score, riskAnalysis.health_score, project.id);

    const ganttData = tasks.filter(t => t.due_date || t.start_date).map(t => ({
      id: t.id,
      title: t.title,
      start: t.start_date || project.start_date,
      end: t.due_date,
      status: t.status,
      priority: t.priority,
      owner: t.owner_id,
      progress: t.completion_pct,
      isCritical: cpResult.critical_path_ids.includes(t.id),
      dependencies: JSON.parse(t.dependencies || '[]')
    }));

    res.json({
      status_breakdown: statusCount,
      priority_breakdown: priorityCount,
      completion_rate: completionRate,
      overdue_tasks: overdue.length,
      time_progress: timeProgress,
      critical_path: cpResult,
      risk_analysis: riskAnalysis,
      prediction,
      gantt_data: ganttData,
      total_tasks: tasks.length,
      velocity: Math.round(tasks.filter(t => t.status === 'done').length / Math.max(1, Math.ceil(elapsed / 7)))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/changes', authenticate, (req, res) => {
  try {
    const { since } = req.query;
    let query = `
      SELECT tc.*, u.name as changed_by_name, t.title as task_title
      FROM task_changes tc
      LEFT JOIN users u ON tc.changed_by = u.id
      LEFT JOIN tasks t ON tc.task_id = t.id
      WHERE tc.project_id = ?
    `;
    const params = [req.params.id];
    if (since) { query += ' AND tc.created_at >= ?'; params.push(since); }
    query += ' ORDER BY tc.created_at DESC LIMIT 100';

    const changes = db.prepare(query).all(...params);
    
    const currentTasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id);
    const baselineTasks = currentTasks.map(t => ({ ...t, due_date: t.baseline_due_date || t.due_date }));
    const detected = changeDetectionAgent(currentTasks, baselineTasks);

    res.json({ changes, detected_changes: detected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/memory', authenticate, (req, res) => {
  try {
    const memories = db.prepare('SELECT * FROM project_memory WHERE project_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/memory', authenticate, (req, res) => {
  try {
    const { memory_type, content, referenced_entities } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO project_memory (id, project_id, memory_type, content, referenced_entities) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.id, memory_type || 'decision', content, JSON.stringify(referenced_entities || []));
    res.status(201).json({ memory: db.prepare('SELECT * FROM project_memory WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
