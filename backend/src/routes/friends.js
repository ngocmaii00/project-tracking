const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Search users to add as friends
router.get('/search', authenticate, async (req, res) => {
  try {
    const q = req.query.q || '';
    let users;
    if (q) {
      users = await query(`
        SELECT u.id, u.name, u.email, u.avatar,
               f.status as friendship_status,
               f.user_id1 as requester_id
        FROM users u
        LEFT JOIN friendships f ON (
          (f.user_id1 = $2 AND f.user_id2 = u.id) OR
          (f.user_id1 = u.id AND f.user_id2 = $2)
        )
        WHERE (u.name ILIKE $1 OR u.email ILIKE $1) AND u.id != $2
        ORDER BY u.name ASC
        LIMIT 20
      `, [`%${q}%`, req.user.id]);
    } else {
      // Discover mode: suggest users who are not yet friends
      users = await query(`
        SELECT u.id, u.name, u.email, u.avatar,
               f.status as friendship_status,
               f.user_id1 as requester_id
        FROM users u
        LEFT JOIN friendships f ON (
          (f.user_id1 = $2 AND f.user_id2 = u.id) OR
          (f.user_id1 = u.id AND f.user_id2 = $2)
        )
        WHERE u.id != $2 AND (f.status IS NULL)
        ORDER BY RANDOM()
        LIMIT 10
      `, [req.user.id]);
    }

    const userWithStatus = users.map(u => ({
      ...u,
      friendshipStatus: u.friendship_status,
      isRequester: u.requester_id === req.user.id
    }));

    res.json(userWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send friend request
router.post('/request', authenticate, async (req, res) => {
  try {
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'Missing friendId' });

    // Check if already exists
    const existing = await queryOne(`
      SELECT * FROM friendships 
      WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
    `, [req.user.id, friendId]);

    if (existing) {
      return res.status(400).json({ error: 'Friendship already exists' });
    }

    const id = uuidv4();
    await query(`
      INSERT INTO friendships (id, user_id1, user_id2, status)
      VALUES ($1, $2, $3, 'pending')
    `, [id, req.user.id, friendId]);

    // Send realtime notification
    if (req.app.locals.broadcastToUser) {
      req.app.locals.broadcastToUser(friendId, {
        type: 'friend_request',
        requesterId: req.user.id,
        requesterName: req.user.name,
        requesterAvatar: req.user.avatar
      });
      req.app.locals.broadcastToUser(friendId, {
        type: 'notification',
        content: `${req.user.name} đã gửi lời mời kết bạn!`,
        icon: 'user_plus'
      });
      console.log(`[FriendRequest] Broadcasted to ${friendId} from ${req.user.id}`);
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Respond to friend request (accept/reject)
router.post('/respond', authenticate, async (req, res) => {
  try {
    const { friendId, action } = req.body; // action: 'accepted' or delete for 'rejected'
    if (!friendId || !action) return res.status(400).json({ error: 'Missing parameters' });

    if (action === 'accepted') {
      await query(`
        UPDATE friendships 
        SET status = 'accepted', updated_at = NOW()
        WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
      `, [req.user.id, friendId]);
      
      // Send realtime notification to THE OTHER person as well
      if (req.app.locals.broadcastToUser) {
        req.app.locals.broadcastToUser(friendId, {
          type: 'friend_accepted',
          userId: req.user.id,
          userName: req.user.name,
          userAvatar: req.user.avatar
        });
        req.app.locals.broadcastToUser(friendId, {
          type: 'notification',
          content: `${req.user.name} đã chấp nhận lời mời kết bạn!`,
          icon: 'check_circle'
        });
      }
    } else if (action === 'rejected') {
      await query(`
        DELETE FROM friendships 
        WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
      `, [req.user.id, friendId]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get friend list
router.get('/', authenticate, async (req, res) => {
  try {
    const friends = await query(`
      SELECT u.id, u.name, u.email, u.avatar, f.status, f.created_at
      FROM friendships f
      JOIN users u ON (f.user_id1 = u.id AND f.user_id2 = $1) OR (f.user_id2 = u.id AND f.user_id1 = $1)
      WHERE f.status = 'accepted'
    `, [req.user.id]);
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending requests
router.get('/pending', authenticate, async (req, res) => {
  try {
    const requests = await query(`
      SELECT u.id, u.name, u.email, u.avatar, f.created_at
      FROM friendships f
      JOIN users u ON f.user_id1 = u.id
      WHERE f.user_id2 = $1 AND f.status = 'pending'
    `, [req.user.id]);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
