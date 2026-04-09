const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  try {
    const { project_id } = req.query;
    let q = 'SELECT m.*, u.name as created_by_name FROM meetings m LEFT JOIN users u ON m.created_by = u.id WHERE 1=1';
    const p = [];
    if (project_id) { q += ' AND m.project_id = ?'; p.push(project_id); }
    q += ' ORDER BY m.scheduled_at DESC LIMIT 50';
    res.json({ meetings: db.prepare(q).all(...p) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { project_id, title, scheduled_at, duration_minutes, attendees, meeting_type } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO meetings (id, project_id, title, scheduled_at, duration_minutes, attendees, meeting_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id || null, title, scheduled_at || null, duration_minutes || 60, JSON.stringify(attendees || []), meeting_type || 'standup', req.user.id);

    res.status(201).json({ meeting: db.prepare('SELECT * FROM meetings WHERE id = ?').get(id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const { extractionAgent } = require('../services/aiAgents');
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const { transcript } = req.body;
    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const projectContext = meeting.project_id
      ? { project: db.prepare('SELECT * FROM projects WHERE id = ?').get(meeting.project_id), existing_tasks: db.prepare('SELECT id, title, status FROM tasks WHERE project_id = ?').all(meeting.project_id) }
      : {};

    const result = await extractionAgent(transcript || meeting.transcript || '', 'meeting', projectContext);

    db.prepare('UPDATE meetings SET transcript = ?, summary = ?, action_items = ?, decisions = ?, quality_score = ?, status = ? WHERE id = ?')
      .run(transcript || meeting.transcript, result.summary, JSON.stringify(result.action_items || []), JSON.stringify(result.key_decisions || []), result.meeting_quality_score || 0.7, 'completed', meeting.id);

    if (meeting.project_id) {
      const draftId = uuidv4();
      db.prepare('INSERT INTO ai_drafts (id, project_id, source_type, source_content, extracted_tasks, confidence_score, ai_summary, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(draftId, meeting.project_id, 'meeting', transcript || '', JSON.stringify(result.extracted_tasks), result.overall_confidence, result.summary, req.user.id);
      result.draft_id = draftId;
    }

    res.json({ result, meeting: db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { title, scheduled_at, status, transcript, summary, action_items, decisions } = req.body;
    db.prepare('UPDATE meetings SET title=?, scheduled_at=?, status=?, transcript=?, summary=?, action_items=?, decisions=? WHERE id=?')
      .run(title, scheduled_at, status, transcript, summary, JSON.stringify(action_items || []), JSON.stringify(decisions || []), req.params.id);
    res.json({ meeting: db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
