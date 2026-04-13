const express = require('express');
const { query } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/all', authenticate, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const logs = await query(`
      SELECT al.*, u.name as user_name, u.avatar as user_avatar
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
