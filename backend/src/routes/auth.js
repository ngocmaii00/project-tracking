const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../database'); // PostgreSQL
const { generateToken, authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'contributor' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name required' });

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const allowedRoles = ['viewer', 'contributor', 'project_manager', 'admin'];
    const safeRole = allowedRoles.includes(role) ? role : 'contributor';

    await query('INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [id, email.toLowerCase(), hash, name, safeRole]);

    const user = await queryOne('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ user });
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar, skills } = req.body;
    await query('UPDATE users SET name = $1, avatar = $2, skills = $3, updated_at = NOW() WHERE id = $4',
      [name || req.user.name, avatar || req.user.avatar, JSON.stringify(skills || []), req.user.id]);
    const user = await queryOne('SELECT id, email, name, role, avatar, skills FROM users WHERE id = $1', [req.user.id]);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await query('SELECT id, email, name, role, avatar, skills, created_at FROM users ORDER BY name');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await query('INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [id, email.toLowerCase(), hash, name, role || 'contributor']);
    res.status(201).json({ success: true, userId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', authenticate, authorize('project_manager', 'admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role required' });
    await query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
