const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../database');
const { authenticate } = require('../middleware/auth');
const { meetingIntelligenceAgent, extractionAgent } = require('../services/aiAgents');
const { transcribeWithDiarization } = require('../services/azureSpeech');
const { indexDocument } = require('../services/azureSearch');

const router = express.Router();

router.get('/azure-speech-credentials', authenticate, (req, res) => {
  console.log('GET /azure-speech-credentials called');
  res.json({
    key: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION
  });
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { project_id } = req.query;
    let sqlString = 'SELECT m.*, u.name as created_by_name FROM meetings m LEFT JOIN users u ON m.created_by = u.id WHERE 1=1';
    const params = [];
    if (project_id) { sqlString += ' AND m.project_id = $1'; params.push(project_id); }
    sqlString += ' ORDER BY m.scheduled_at DESC LIMIT 50';
    res.json({ meetings: await query(sqlString, params) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, title, scheduled_at, duration_minutes, attendees, meeting_type } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const id = uuidv4();
    await query(`
      INSERT INTO meetings (id, project_id, title, scheduled_at, duration_minutes, attendees, meeting_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, project_id || null, title, scheduled_at || null, duration_minutes || 60, JSON.stringify(attendees || []), meeting_type || 'standup', req.user.id]);

    const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [id]);
    await indexDocument({ ...meeting, type: 'meeting' });

    res.status(201).json({ meeting });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/process', authenticate, async (req, res) => {
  try {
    let { transcript, use_voice_ai = false } = req.body;
    const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    // Step 1: Simulate Speaker Diarization if requested
    let processedTranscript = transcript;
    if (use_voice_ai) {
      const diarized = await transcribeWithDiarization(null); // Simulated diarization
      processedTranscript = diarized.map(d => `[${d.speaker}]: ${d.text}`).join('\n');
    }

    const projectContext = meeting.project_id
      ? { 
          project: await queryOne('SELECT * FROM projects WHERE id = $1', [meeting.project_id]), 
          existing_tasks: await query('SELECT id, title, status FROM tasks WHERE project_id = $1', [meeting.project_id]) 
        }
      : {};

    // Step 2: Advanced Meeting Intelligence (Summary, Decisions, Next Steps, Next Meeting)
    const intel = await meetingIntelligenceAgent(processedTranscript || meeting.transcript || '', projectContext);
    
    // Step 3: Extract Tasks for Human-in-the-loop approval
    const extraction = await extractionAgent(processedTranscript || meeting.transcript || '', 'meeting', projectContext);

    await query(`
      UPDATE meetings 
      SET transcript = $1, 
          summary = $2, 
          action_items = $3, 
          decisions = $4, 
          next_steps_plan = $5,
          next_meeting_proposal = $6,
          quality_score = $7, 
          status = $8 
      WHERE id = $9
    `, [
      processedTranscript || meeting.transcript, 
      intel.summary, 
      JSON.stringify(intel.action_items || []), 
      JSON.stringify(intel.decisions || []), 
      JSON.stringify(intel.next_steps_plan || []),
      JSON.stringify(intel.next_meeting || {}),
      intel.participation_score || 0.8, 
      'completed', 
      meeting.id
    ]);

    if (meeting.project_id) {
      const draftId = uuidv4();
      await query('INSERT INTO ai_drafts (id, project_id, source_type, source_content, extracted_tasks, confidence_score, ai_summary, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [draftId, meeting.project_id, 'meeting', processedTranscript || '', JSON.stringify(extraction.extracted_tasks), extraction.overall_confidence, intel.summary, req.user.id]);
      intel.draft_id = draftId;
    }

    const updatedMeeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    await indexDocument({ ...updatedMeeting, type: 'meeting' });

    res.json({ result: intel, meeting: updatedMeeting });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, scheduled_at, status, transcript, summary, action_items, decisions } = req.body;
    await query('UPDATE meetings SET title=$1, scheduled_at=$2, status=$3, transcript=$4, summary=$5, action_items=$6, decisions=$7 WHERE id=$8',
      [title, scheduled_at, status, transcript, summary, JSON.stringify(action_items || []), JSON.stringify(decisions || []), req.params.id]);
    
    const updated = await queryOne('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    await indexDocument({ ...updated, type: 'meeting' });

    res.json({ meeting: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
