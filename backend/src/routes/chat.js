const express = require('express');
const router = express.Router();
const { query, queryOne, transaction } = require('../database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all conversations for current user with unread count
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await query(`
      SELECT c.*, 
        (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar))
         FROM conversation_members cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.conversation_id = c.id) as members,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT count(*)::int FROM messages m 
         JOIN conversation_members cm_inner ON m.conversation_id = cm_inner.conversation_id
         WHERE m.conversation_id = c.id 
         AND cm_inner.user_id = $1
         AND m.created_at > cm_inner.last_read_at
         AND m.author_id != $1) as unread_count
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE cm.user_id = $1
      ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
    `, [req.user.id]);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark conversation as read
router.post('/conversations/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Get DM or Create Group
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { type, name, memberIds } = req.body; // type: 'dm' or 'group'
    
    if (type === 'dm') {
      const otherUserId = memberIds[0];
      // Check if DM already exists
      const existing = await queryOne(`
        SELECT c.id 
        FROM conversations c
        JOIN conversation_members cm1 ON c.id = cm1.conversation_id
        JOIN conversation_members cm2 ON c.id = cm2.conversation_id
        WHERE c.type = 'dm' 
        AND cm1.user_id = $1 
        AND cm2.user_id = $2
      `, [req.user.id, otherUserId]);

      if (existing) return res.json({ id: existing.id });

      // Create new DM
      const conversationId = uuidv4();
      await transaction(async (client) => {
        await client.query('INSERT INTO conversations (id, type) VALUES ($1, $2)', [conversationId, 'dm']);
        await client.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)', [conversationId, req.user.id]);
        await client.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)', [conversationId, otherUserId]);
      });
      return res.json({ id: conversationId });
    } else {
      // Create Group
      const conversationId = uuidv4();
      await transaction(async (client) => {
        await client.query('INSERT INTO conversations (id, type, name) VALUES ($1, $2, $3)', [conversationId, 'group', name]);
        await client.query('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)', [conversationId, req.user.id, 'admin']);
        for (const mId of memberIds) {
          if (mId !== req.user.id) {
            await client.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)', [conversationId, mId]);
          }
        }
      });
      return res.json({ id: conversationId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if user is member of conversation
    const member = await queryOne('SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [conversationId, req.user.id]);
    if (!member) return res.status(403).json({ error: 'Not a member of this conversation' });

    const messages = await query(`
      SELECT m.*, u.name as author_name, u.avatar as author_avatar
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC 
      LIMIT 100
    `, [conversationId]);
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy/Fallback route for global/project chat
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    let sql = `
      SELECT m.*, u.name as author_name, u.avatar as author_avatar
      FROM messages m
      JOIN users u ON m.author_id = u.id
    `;
    const params = [];
    
    if (projectId && projectId !== 'global') {
      sql += ` WHERE m.project_id = $1 `;
      params.push(projectId);
    } else {
      sql += ` WHERE m.project_id IS NULL AND m.conversation_id IS NULL `;
    }
    
    sql += ` ORDER BY m.created_at ASC LIMIT 100 `;
    
    const messages = await query(sql, params);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add members to a conversation
router.post('/conversations/:id/members', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Missing memberIds array' });
    }

    const isMember = await queryOne('SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!isMember) return res.status(403).json({ error: 'Unauthorized' });

    for (const userId of memberIds) {
      await query(`
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [id, userId]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update conversation (name, avatar)
router.put('/conversations/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar } = req.body;

    const isMember = await queryOne('SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!isMember) return res.status(403).json({ error: 'Unauthorized' });

    await query('UPDATE conversations SET name = $1, avatar = $2, updated_at = NOW() WHERE id = $3', [name, avatar, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave conversation
router.post('/conversations/:id/leave', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [id, req.user.id]);
    
    // Optional: If no members left, delete conversation. Or if admin left, assign new admin.
    // For now, simple leave.
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
