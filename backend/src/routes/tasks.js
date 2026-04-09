const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { smartNotificationDecider } = require('../services/aiAgents');

const router = express.Router();

function createNotification({ user_id, type, title, message, data, priority = 'normal' }) {
  try {
    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, data, priority) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), user_id, type, title, message || '', JSON.stringify(data || {}), priority);
  } catch {}
}

router.get('/', authenticate, (req, res) => {
  try {
    const { project_id, status, owner_id, priority } = req.query;
    let query = `SELECT t.*, u.name as owner_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1`;
    const params = [];
    if (project_id) { query += ' AND t.project_id = ?'; params.push(project_id); }
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (owner_id) { query += ' AND t.owner_id = ?'; params.push(owner_id); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
    query += ' ORDER BY t.position ASC, t.due_date ASC';

    res.json({ tasks: db.prepare(query).all(...params) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { project_id, title, description, status, priority, owner_id, due_date, start_date, estimated_hours, dependencies, tags, parent_task_id, is_milestone, source } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' });

    const id = uuidv4();
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM tasks WHERE project_id = ?').get(project_id);
    
    db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, owner_id, due_date, baseline_due_date, start_date, estimated_hours, dependencies, tags, parent_task_id, is_milestone, source, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, title, description || '', status || 'todo', priority || 'medium', owner_id || null, due_date || null, due_date || null, start_date || null, estimated_hours || 0, JSON.stringify(dependencies || []), JSON.stringify(tags || []), parent_task_id || null, is_milestone ? 1 : 0, source || 'manual', (maxPos?.mp || 0) + 1);

    db.prepare('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, ai_reasoning, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), id, project_id, req.user.id, 'created', 'Task created manually', 'manual');

    if (owner_id && owner_id !== req.user.id) {
      createNotification({ user_id: owner_id, type: 'task_assigned', title: 'New Task Assigned', message: `You've been assigned: "${title}"`, data: { task_id: id }, priority: 'normal' });
    }

    const task = db.prepare('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = ?').get(id);
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const task = db.prepare('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const changes = db.prepare('SELECT tc.*, u.name as changed_by_name FROM task_changes tc LEFT JOIN users u ON tc.changed_by = u.id WHERE tc.task_id = ? ORDER BY tc.created_at DESC LIMIT 20').all(req.params.id);
    const comments = db.prepare('SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.author_id = u.id WHERE c.task_id = ? ORDER BY c.created_at ASC').all(req.params.id);
    
    res.json({ task, changes, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const fields = ['title', 'description', 'status', 'priority', 'owner_id', 'due_date', 'start_date', 'estimated_hours', 'actual_hours', 'completion_pct', 'dependencies', 'tags', 'is_milestone', 'is_critical_path', 'position'];
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
      const setParts = Object.keys(updates).map(f => {
        if (f === 'dependencies' || f === 'tags') return `${f} = ?`;
        return `${f} = ?`;
      });
      const values = Object.entries(updates).map(([f, v]) => {
        if (f === 'dependencies' || f === 'tags') return JSON.stringify(v);
        return v;
      });

      db.prepare(`UPDATE tasks SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(...values, req.params.id);

      changesToLog.forEach(c => {
        db.prepare('INSERT INTO task_changes (id, task_id, project_id, changed_by, change_type, field_name, old_value, new_value, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), task.id, task.project_id, req.user.id, 'updated', c.field, String(c.old_value), String(c.new_value), 'manual');
      });

      const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      changesToLog.forEach(c => {
        const notifications = smartNotificationDecider(updatedTask, `${c.field}_change`, req.user.role);
        notifications.forEach(n => {
          if (n.target_roles.includes(updatedTask.owner_id)) {
            createNotification({ user_id: updatedTask.owner_id, type: `task_${c.field}_changed`, title: n.message, message: n.message, priority: n.priority });
          }
        });
      });
    }

    const updated = db.prepare('SELECT t.*, u.name as owner_name FROM tasks t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = ?').get(req.params.id);
    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('project_manager', 'admin'), (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', authenticate, (req, res) => {
  try {
    const { content, mentions } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO comments (id, task_id, project_id, author_id, content, mentions) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, task.project_id, req.user.id, content, JSON.stringify(mentions || []));
    
    const comment = db.prepare('SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.author_id = u.id WHERE c.id = ?').get(id);
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bulk/reorder', authenticate, (req, res) => {
  try {
    const { tasks } = req.body; // [{id, position, status}]
    const updateMany = db.transaction((items) => {
      items.forEach(({ id, position, status }) => {
        const sets = [];
        const vals = [];
        if (position !== undefined) { sets.push('position = ?'); vals.push(position); }
        if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
        if (sets.length > 0) db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
      });
    });
    updateMany(tasks);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
