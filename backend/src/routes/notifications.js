const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    const unread = await queryOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
    res.json({ notifications, unread_count: parseInt(unread.count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all/all', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/risks/:project_id', authenticate, async (req, res) => {
  try {
    const risks = await query('SELECT * FROM risks WHERE project_id = $1 ORDER BY risk_score DESC', [req.params.project_id]);
    res.json({ risks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/risks', authenticate, async (req, res) => {
  try {
    const { project_id, title, description, category, probability, impact, mitigation, owner_id, due_date } = req.body;
    const risk_score = Math.round((probability || 0.5) * (impact || 0.5) * 100);
    const id = uuidv4();
    await query('INSERT INTO risks (id, project_id, title, description, category, probability, impact, risk_score, mitigation, owner_id, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, project_id, title, description||'', category||'schedule', probability||0.5, impact||0.5, risk_score, mitigation||'', owner_id||null, due_date||null]);
    res.status(201).json({ risk: await queryOne('SELECT * FROM risks WHERE id = $1', [id]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/risks/:id', authenticate, async (req, res) => {
  try {
    const { status, mitigation } = req.body;
    await query('UPDATE risks SET status=$1, mitigation=$2, updated_at=NOW() WHERE id=$3', [status, mitigation, req.params.id]);
    res.json({ risk: await queryOne('SELECT * FROM risks WHERE id = $1', [req.params.id]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
