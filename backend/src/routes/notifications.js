const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(req.user.id);
    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ notifications, unread_count: unread.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all/all', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/risks/:project_id', authenticate, (req, res) => {
  try {
    const risks = db.prepare('SELECT * FROM risks WHERE project_id = ? ORDER BY risk_score DESC').all(req.params.project_id);
    res.json({ risks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/risks', authenticate, (req, res) => {
  try {
    const { project_id, title, description, category, probability, impact, mitigation, owner_id, due_date } = req.body;
    const risk_score = Math.round((probability || 0.5) * (impact || 0.5) * 100);
    const id = uuidv4();
    db.prepare('INSERT INTO risks (id, project_id, title, description, category, probability, impact, risk_score, mitigation, owner_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, project_id, title, description||'', category||'schedule', probability||0.5, impact||0.5, risk_score, mitigation||'', owner_id||null, due_date||null);
    res.status(201).json({ risk: db.prepare('SELECT * FROM risks WHERE id = ?').get(id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/risks/:id', authenticate, (req, res) => {
  try {
    const { status, mitigation } = req.body;
    db.prepare('UPDATE risks SET status=?, mitigation=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, mitigation, req.params.id);
    res.json({ risk: db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
