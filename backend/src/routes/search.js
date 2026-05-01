/**
 * Route: /api/search
 * Azure AI Search with DB fallback for task search
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { search, isConfigured } = require('../services/azureSearch');
const { query } = require('../database');

const router = express.Router();

/**
 * DB fallback: search tasks & meetings directly via SQL LIKE
 */
async function dbSearch(q, options = {}) {
  const { projectId, type, status } = options;
  const term = `%${q}%`;
  const results = [];

  if (!type || type === 'task') {
    const params = [term, term];
    let sql = `SELECT id, title, description as content, status, priority, owner_id as "ownerId",
                      project_id as "projectId", due_date, created_at as "createdAt", 'task' as type
               FROM tasks WHERE (title ILIKE $1 OR description ILIKE $2)`;
    if (projectId) { sql += ` AND project_id = $${params.length + 1}`; params.push(projectId); }
    if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
    sql += ' LIMIT 20';
    try {
      const rows = await query(sql, params);
      results.push(...rows.map(r => ({ ...r, searchScore: 1 })));
    } catch (e) { console.warn('[dbSearch] task query failed:', e.message); }
  }

  if (!type || type === 'meeting') {
    const params = [term, term, term];
    let sql = `SELECT id, title, summary as content, status, project_id as "projectId",
                      created_at as "createdAt", 'meeting' as type
               FROM meetings WHERE (title ILIKE $1 OR summary ILIKE $2 OR transcript ILIKE $3)`;
    if (projectId) { sql += ` AND project_id = $${params.length + 1}`; params.push(projectId); }
    sql += ' LIMIT 10';
    try {
      const rows = await query(sql, params);
      results.push(...rows.map(r => ({ ...r, searchScore: 0.9 })));
    } catch (e) { console.warn('[dbSearch] meeting query failed:', e.message); }
  }

  return { results, total: results.length, message: 'DB fallback search' };
}


/**
 * GET /api/search?q=<query>&projectId=<id>&type=<task|meeting>&status=<status>&top=<n>
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, projectId, type, status, top = '20' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Try Azure Search first, fall back to DB
    if (isConfigured()) {
      const result = await search(q.trim(), {
        projectId, type, status,
        top: Math.min(parseInt(top), 50),
      });
      // If Azure returned results, use them
      if (result.results && result.results.length > 0) {
        return res.json(result);
      }
    }

    // DB fallback
    const dbResult = await dbSearch(q.trim(), { projectId, type, status });
    res.json(dbResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/tasks?q=<query>&projectId=<id>
 */
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const { q, projectId, status } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    if (isConfigured()) {
      const result = await search(q, { projectId, type: 'task', status });
      if (result.results && result.results.length > 0) return res.json(result);
    }

    const dbResult = await dbSearch(q, { projectId, type: 'task', status });
    res.json(dbResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/meetings?q=<query>&projectId=<id>
 */
router.get('/meetings', authenticate, async (req, res) => {
  try {
    const { q, projectId } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    if (isConfigured()) {
      const result = await search(q, { projectId, type: 'meeting' });
      if (result.results && result.results.length > 0) return res.json(result);
    }

    const dbResult = await dbSearch(q, { projectId, type: 'meeting' });
    res.json(dbResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
