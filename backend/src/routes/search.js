/**
 * Route: /api/search
 * Azure AI Search — semantic/full-text search toàn bộ project data
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { search, isConfigured } = require('../services/azureSearch');

const router = express.Router();

/**
 * GET /api/search?q=<query>&projectId=<id>&type=<task|meeting|memory>&status=<status>&top=<n>
 * Tìm kiếm semantic trên toàn bộ dữ liệu
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, projectId, type, status, top = '20' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    if (!isConfigured()) {
      return res.json({
        results: [],
        total: 0,
        message: 'Azure AI Search not configured. Add AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY to .env',
      });
    }

    const result = await search(q.trim(), {
      projectId,
      type,
      status,
      top: Math.min(parseInt(top), 50),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/tasks?q=<query>&projectId=<id>
 * Tìm riêng trong tasks
 */
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const { q, projectId, status } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const result = await search(q, { projectId, type: 'task', status });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/meetings?q=<query>&projectId=<id>
 * Tìm trong biên bản họp
 */
router.get('/meetings', authenticate, async (req, res) => {
  try {
    const { q, projectId } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const result = await search(q, { projectId, type: 'meeting' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
