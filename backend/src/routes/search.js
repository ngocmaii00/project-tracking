/**
 * Route: /api/search
 * Azure AI Search with DB fallback for task search
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { search, isConfigured } = require('../services/azureSearch');
const { query } = require('../database');

const router = express.Router();

function mergeResults(...groups) {
  const seen = new Set();
  return groups
    .flatMap(group => group?.results || [])
    .filter(item => {
      const key = `${item.type || 'unknown'}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * DB fallback: search tasks & meetings directly via SQL LIKE
 */
async function dbSearch(q, options = {}) {
  const { projectId, type, status, top = 20 } = options;
  const term = `%${q}%`;
  const results = [];

  if (!type || type === 'task') {
    const params = [term, term, term, term, term, Math.min(parseInt(top, 10) || 20, 50)];
    let sql = `SELECT t.id,
                      t.title,
                      t.description as content,
                      t.status,
                      t.priority,
                      t.owner_id as "ownerId",
                      t.project_id as "projectId",
                      p.name as "projectName",
                      u.name as "ownerName",
                      t.due_date,
                      t.created_at as "createdAt",
                      'task' as type
               FROM tasks t
               LEFT JOIN projects p ON p.id = t.project_id
               LEFT JOIN users u ON u.id = t.owner_id
               WHERE (
                 t.title ILIKE $1 OR
                 t.description ILIKE $2 OR
                 p.name ILIKE $3 OR
                 t.project_id ILIKE $4 OR
                 u.name ILIKE $5
               )`;
    if (projectId) { sql += ` AND t.project_id = $${params.length + 1}`; params.push(projectId); }
    if (status) { sql += ` AND t.status = $${params.length + 1}`; params.push(status); }
    sql += ` ORDER BY
               CASE
                 WHEN t.title ILIKE $1 THEN 0
                 WHEN p.name ILIKE $3 THEN 1
                 ELSE 2
               END,
               t.updated_at DESC
             LIMIT $6`;
    try {
      const rows = await query(sql, params);
      results.push(...rows.map(r => ({ ...r, searchScore: 1 })));
    } catch (e) { console.warn('[dbSearch] task query failed:', e.message); }
  }

  if (!type || type === 'meeting') {
    const params = [term, term, term, Math.min(parseInt(top, 10) || 10, 50)];
    let sql = `SELECT id, title, summary as content, status, project_id as "projectId",
                      created_at as "createdAt", 'meeting' as type
               FROM meetings WHERE (title ILIKE $1 OR summary ILIKE $2 OR transcript ILIKE $3)`;
    if (projectId) { sql += ` AND project_id = $${params.length + 1}`; params.push(projectId); }
    sql += ' LIMIT $4';
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

    let azureResult = { results: [] };
    if (isConfigured()) {
      azureResult = await search(q.trim(), {
        projectId, type, status,
        top: Math.min(parseInt(top), 50),
      });
    }

    const dbResult = await dbSearch(q.trim(), { projectId, type, status, top });
    const results = mergeResults(azureResult, dbResult).slice(0, Math.min(parseInt(top, 10) || 20, 50));
    res.json({
      results,
      total: results.length,
      message: isConfigured() ? 'Azure AI Search + DB fallback search' : 'DB fallback search',
    });
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

    let azureResult = { results: [] };
    if (isConfigured()) {
      azureResult = await search(q, {
        projectId,
        type: 'task',
        status,
        top: Math.min(parseInt(req.query.top, 10) || 20, 50),
      });
    }

    const dbResult = await dbSearch(q, { projectId, type: 'task', status, top: req.query.top });
    const results = mergeResults(azureResult, dbResult);
    res.json({ results, total: results.length });
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

    let azureResult = { results: [] };
    if (isConfigured()) {
      azureResult = await search(q, {
        projectId,
        type: 'meeting',
        top: Math.min(parseInt(req.query.top, 10) || 20, 50),
      });
    }

    const dbResult = await dbSearch(q, { projectId, type: 'meeting', top: req.query.top });
    const results = mergeResults(azureResult, dbResult);
    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
