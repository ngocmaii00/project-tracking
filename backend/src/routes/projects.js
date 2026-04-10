const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { riskAnalysisAgent, criticalPathAgent, changeDetectionAgent, timelinePredictionAgent } = require('../services/aiAgents');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await query(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'blocked') as blocked_tasks,
        (SELECT COUNT(*) FROM risks r WHERE r.project_id = p.id AND r.status = 'open') as open_risks
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.updated_at DESC
    `);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const { name, description, start_date, end_date, owner_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const id = uuidv4();
    await query(`
      INSERT INTO projects (id, name, description, start_date, end_date, baseline_end_date, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, name, description || '', start_date || null, end_date || null, end_date || null, owner_id || req.user.id]);

    const project = await queryOne('SELECT * FROM projects WHERE id = $1', [id]);
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await queryOne('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = await query(`
      SELECT t.*, u.name as owner_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE t.project_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `, [req.params.id]);

    const risks = await query('SELECT * FROM risks WHERE project_id = $1 ORDER BY risk_score DESC', [req.params.id]);
    const members = await query(`
      SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar, u.skills
      FROM users u
      WHERE u.id IN (
        SELECT DISTINCT owner_id FROM tasks WHERE project_id = $1 AND owner_id IS NOT NULL
        UNION SELECT owner_id FROM projects WHERE id = $2
      )
    `, [req.params.id, req.params.id]);

    res.json({ project, tasks, risks, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const { name, description, status, start_date, end_date, owner_id, metadata } = req.body;
    const project = await queryOne('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await query(`
      UPDATE projects SET name=$1, description=$2, status=$3, start_date=$4, end_date=$5, owner_id=$6, metadata=$7, updated_at=NOW()
      WHERE id=$8
    `, [name || project.name, description ?? project.description, status || project.status, start_date ?? project.start_date, end_date ?? project.end_date, owner_id ?? project.owner_id, JSON.stringify(metadata || {}), req.params.id]);

    res.json({ project: await queryOne('SELECT * FROM projects WHERE id = $1', [req.params.id]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const project = await queryOne('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = await query('SELECT * FROM tasks WHERE project_id = $1', [req.params.id]);
    const users = await query(`
      SELECT * FROM users WHERE id IN (SELECT DISTINCT owner_id FROM tasks WHERE project_id = $1 AND owner_id IS NOT NULL)
    `, [req.params.id]);

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

    await query('UPDATE projects SET risk_score = $1, health_score = $2 WHERE id = $3',
      [riskAnalysis.project_risk_score, riskAnalysis.health_score, project.id]);

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
      dependencies: typeof t.dependencies === 'string' ? JSON.parse(t.dependencies) : (t.dependencies || [])
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

router.get('/:id/changes', authenticate, async (req, res) => {
  try {
    const { since } = req.query;
    let sqlString = `
      SELECT tc.*, u.name as changed_by_name, t.title as task_title
      FROM task_changes tc
      LEFT JOIN users u ON tc.changed_by = u.id
      LEFT JOIN tasks t ON tc.task_id = t.id
      WHERE tc.project_id = $1
    `;
    const params = [req.params.id];
    if (since) { 
      sqlString += ' AND tc.created_at >= $2'; 
      params.push(since); 
    }
    sqlString += ' ORDER BY tc.created_at DESC LIMIT 100';

    const changes = await query(sqlString, params);
    
    const currentTasks = await query('SELECT * FROM tasks WHERE project_id = $1', [req.params.id]);
    const baselineTasks = currentTasks.map(t => ({ ...t, due_date: t.baseline_due_date || t.due_date }));
    const detected = changeDetectionAgent(currentTasks, baselineTasks);

    res.json({ changes, detected_changes: detected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/memory', authenticate, async (req, res) => {
  try {
    const memories = await query('SELECT * FROM project_memory WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.id]);
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/memory', authenticate, async (req, res) => {
  try {
    const { memory_type, content, referenced_entities } = req.body;
    const id = uuidv4();
    await query('INSERT INTO project_memory (id, project_id, memory_type, content, referenced_entities) VALUES ($1, $2, $3, $4, $5)',
      [id, req.params.id, memory_type || 'decision', content, JSON.stringify(referenced_entities || [])]);
    res.status(201).json({ memory: await queryOne('SELECT * FROM project_memory WHERE id = $1', [id]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
