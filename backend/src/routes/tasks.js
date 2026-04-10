const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, transaction } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { smartNotificationDecider } = require('../services/aiAgents');
const { saveAuditEvent } = require('../services/cosmosDb');
const { indexDocument, deleteDocument } = require('../services/azureSearch');

const router = express.Router();

async function createNotification({ user_id, type, title, message, data, priority = 'normal' }) {
  try {
    await query('INSERT INTO notifications (id, user_id, type, title, message, data, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [uuidv4(), user_id, type, title, message || '', JSON.stringify(data || {}), priority]);
  } catch {}
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { project_id, status, owner_id, priority } = req.query;
    let sqlString = `SELECT t.*, u.name as owner_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1`;
    const params = [];
    let paramCount = 1;
    if (project_id) { sqlString += ` AND t.project_id = $${paramCount++}`; params.push(project_id); }
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        sqlString += ` AND t.status = $${paramCount++}`;
        params.push(statuses[0]);
      } else {
        sqlString += ` AND t.status = ANY($${paramCount++}::text[])`;
        params.push(statuses);
      }
    }
    if (owner_id) { sqlString += ` AND t.owner_id = $${paramCount++}`; params.push(owner_id); }
    if (priority) { sqlString += ` AND t.priority = $${paramCount++}`; params.push(priority); }
    sqlString += ' ORDER BY t.position ASC, t.due_date ASC';

    res.json({ tasks: await query(sqlString, params) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, title, description, status, priority, owner_id, due_date, start_date, estimated_hours, dependencies, tags, parent_task_id, is_milestone, source } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' });

    const id = uuidv4();
    const maxPosRes = await queryOne('SELECT MAX(position) as mp FROM tasks WHERE project_id = $1', [project_id]);
    const maxPos = maxPosRes?.mp || 0;
    
    await query(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, owner_id, due_date, baseline_due_date, start_date, estimated_hours, dependencies, tags, parent_task_id, is_milestone, source, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [id, project_id, title, description || '', status || 'todo', priority || 'medium', owner_id || null, due_date || null, due_date || null, start_date || null, estimated_hours || 0, JSON.stringify(dependencies || []), JSON.stringify(tags || []), parent_task_id || null, is_milestone ? true : false, source || 'manual', maxPos + 1]);

    const changeId = uuidv4();
    await query('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, ai_reasoning, source) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [changeId, id, project_id, req.user.id, 'created', 'Task created manually', 'manual']);

    // Log to Cosmos
    await saveAuditEvent({
      projectId: project_id, entityType: 'task', entityId: id, changeType: 'created',
      oldValue: null, newValue: title, actor: req.user.id, source: 'manual'
    });

    if (owner_id && owner_id !== req.user.id) {
      await createNotification({ user_id: owner_id, type: 'task_assigned', title: 'New Task Assigned', message: `You've been assigned: "${title}"`, data: { task_id: id }, priority: 'normal' });
    }

    const task = await queryOne('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = $1', [id]);
    
    // Auto index Azure Search
    await indexDocument({ ...task, type: 'task' });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await queryOne('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const changes = await query('SELECT tc.*, u.name as changed_by_name FROM task_changes tc LEFT JOIN users u ON tc.changed_by = u.id WHERE tc.task_id = $1 ORDER BY tc.created_at DESC LIMIT 20', [req.params.id]);
    const comments = await query('SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.author_id = u.id WHERE c.task_id = $1 ORDER BY c.created_at ASC', [req.params.id]);
    
    res.json({ task, changes, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const fields = ['title', 'description', 'status', 'priority', 'owner_id', 'due_date', 'start_date', 'estimated_hours', 'actual_hours', 'completion_pct', 'dependencies', 'tags', 'is_milestone', 'is_critical_path', 'position', 'blob_attachment_url'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const changesToLog = [];
    ['status', 'owner_id', 'due_date', 'priority', 'title'].forEach(field => {
      if (updates[field] !== undefined && String(updates[field]) !== String(task[field])) {
        changesToLog.push({
          field,
          old_value: task[field],
          new_value: updates[field]
        });
      }
    });

    if (Object.keys(updates).length > 0) {
      const setParts = [];
      const values = [];
      let paramCount = 1;
      
      Object.entries(updates).forEach(([f, v]) => {
        setParts.push(`${f} = $${paramCount++}`);
        if (f === 'dependencies' || f === 'tags') values.push(JSON.stringify(v));
        else values.push(v);
      });
      
      values.push(req.params.id); // for WHERE id = $paramCount
      
      await query(`UPDATE tasks SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`, values);

      for (const c of changesToLog) {
        await query('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, field_name, old_value, new_value, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [uuidv4(), task.id, task.project_id, req.user.id, 'updated', c.field, String(c.old_value), String(c.new_value), 'manual']);
        
        // Log to Cosmos
        await saveAuditEvent({
          projectId: task.project_id, entityType: 'task', entityId: task.id, changeType: `${c.field}_change`,
          oldValue: String(c.old_value), newValue: String(c.new_value), actor: req.user.id, source: 'manual'
        });
      }

      const updatedTask = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
      
      // Update Search Index
      await indexDocument({ ...updatedTask, type: 'task' });

      for (const c of changesToLog) {
        const notifications = smartNotificationDecider(updatedTask, `${c.field}_change`, req.user.role);
        for (const n of notifications) {
          if (n.target_roles.includes(updatedTask.owner_id)) {
            await createNotification({ user_id: updatedTask.owner_id, type: `task_${c.field}_changed`, title: n.message, message: n.message, priority: n.priority });
          }
        }
      }
    }

    const updated = await queryOne('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = $1', [req.params.id]);
    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    await deleteDocument(req.params.id); // Remove from Azure Search
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content, mentions } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const id = uuidv4();
    await query('INSERT INTO comments (id, task_id, project_id, author_id, content, mentions) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, req.params.id, task.project_id, req.user.id, content, JSON.stringify(mentions || [])]);
    
    const comment = await queryOne('SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.author_id = u.id WHERE c.id = $1', [id]);
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bulk/reorder', authenticate, async (req, res) => {
  try {
    const { tasks } = req.body; // [{id, position, status}]
    await transaction(async (client) => {
      for (const { id, position, status } of tasks) {
        const sets = [];
        const vals = [];
        let pIndex = 1;
        if (position !== undefined) { sets.push(`position = $${pIndex++}`); vals.push(position); }
        if (status !== undefined) { sets.push(`status = $${pIndex++}`); vals.push(status); }
        if (sets.length > 0) {
          vals.push(id);
          await client.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${pIndex}`, vals);
        }
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
