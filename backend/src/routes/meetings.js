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
    const userId = req.user.id;

    // Chỉ lấy meeting do mình tạo HOẶC mình đã ACCEPT invitation
    let sqlString = `
      SELECT DISTINCT m.*, u.name as created_by_name 
      FROM meetings m 
      LEFT JOIN users u ON m.created_by = u.id 
      LEFT JOIN meeting_invitations mi ON m.id = mi.meeting_id
      WHERE (m.created_by = $1 OR (mi.user_id = $1 AND mi.status = 'accepted'))
    `;
    const params = [userId];

    if (project_id) { 
      sqlString += ' AND m.project_id = $2'; 
      params.push(project_id); 
    }

    sqlString += ' ORDER BY m.scheduled_at DESC LIMIT 50';
    res.json({ meetings: await query(sqlString, params) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/invitations', authenticate, async (req, res) => {
  try {
    const invitations = await query(`
      SELECT mi.*, m.title as meeting_title, u.name as inviter_name
      FROM meeting_invitations mi
      JOIN meetings m ON mi.meeting_id = m.id
      JOIN users u ON m.created_by = u.id
      WHERE mi.user_id = $1 AND mi.status = 'pending'
    `, [req.user.id]);
    res.json({ invitations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;
    const meetingId = req.params.id;

    const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [meetingId]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.created_by !== req.user.id) return res.status(403).json({ error: 'Only creator can invite' });

    const inviteId = uuidv4();
    await query(`
      INSERT INTO meeting_invitations (id, meeting_id, user_id, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (meeting_id, user_id) DO NOTHING
    `, [inviteId, meetingId, user_id]);

    // Send realtime notification
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (id, user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notificationId,
      user_id,
      'meeting_invite',
      'Lời mời họp mới',
      `Bạn được mời tham gia buổi họp: ${meeting.title}`,
      JSON.stringify({ meetingId, inviteId })
    ]);

    if (req.app.locals.broadcastToUser) {
      req.app.locals.broadcastToUser(user_id, {
        type: 'notification',
        notification: {
          id: notificationId,
          type: 'meeting_invite',
          title: 'Lời mời họp mới',
          message: `Bạn được mời tham gia buổi họp: ${meeting.title}`,
          data: { meetingId, inviteId }
        }
      });
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/invitations/:id/accept', authenticate, async (req, res) => {
  try {
    const inviteId = req.params.id;
    const invite = await queryOne('SELECT * FROM meeting_invitations WHERE id = $1 AND user_id = $2', [inviteId, req.user.id]);
    if (!invite) return res.status(404).json({ error: 'Invitation not found' });

    await query('UPDATE meeting_invitations SET status = \'accepted\', updated_at = NOW() WHERE id = $1', [inviteId]);
    
    await query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), req.user.id, 'accept_meeting_invite', 'meeting', invite.meeting_id, JSON.stringify({ invite_id: inviteId })]);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, title, scheduled_at, duration_minutes, attendees, meeting_type } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const id = uuidv4();
    const attendeeList = Array.isArray(attendees) ? attendees : [];
    
    await query(`
      INSERT INTO meetings (id, project_id, title, scheduled_at, duration_minutes, attendees, meeting_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, project_id || null, title, scheduled_at || null, duration_minutes || 60, JSON.stringify(attendeeList), meeting_type || 'standup', req.user.id]);

    // Log creation
    await query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), req.user.id, 'create_meeting', 'meeting', id, JSON.stringify({ title, project_id })]);

    // Create invitations for each attendee
    for (const userId of attendeeList) {
      if (userId === req.user.id) continue; // Don't invite self

      const inviteId = uuidv4();
      await query(`
        INSERT INTO meeting_invitations (id, meeting_id, user_id, status)
        VALUES ($1, $2, $3, 'pending')
      `, [inviteId, id, userId]);

      const notificationId = uuidv4();
      await query(`
        INSERT INTO notifications (id, user_id, type, title, message, data)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        notificationId,
        userId,
        'meeting_invite',
        'Lời mời họp mới',
        `Bạn được mời tham gia buổi họp: ${title}`,
        JSON.stringify({ meetingId: id, inviteId })
      ]);

      if (req.app.locals.broadcastToUser) {
        req.app.locals.broadcastToUser(userId, {
          type: 'notification',
          notification: {
            id: notificationId,
            type: 'meeting_invite',
            title: 'Lời mời họp mới',
            message: `Bạn được mời tham gia buổi họp: ${title}`,
            data: { meetingId: id, inviteId }
          }
        });
      }
    }

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
      // Note: Diarization usually requires an audio file. 
      // Falling back to text-only if no audio is provided.
      try {
        if (meeting.transcript_blob_url) {
          const diarized = await transcribeWithDiarization(meeting.transcript_blob_url);
          processedTranscript = diarized.map(d => `[${d.speaker}]: ${d.text}`).join('\n');
        }
      } catch (e) {
        console.error("Diarization failed, falling back to basic transcript:", e.message);
      }
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

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.created_by !== req.user.id) return res.status(403).json({ error: 'Only creator can delete meeting' });

    await query('DELETE FROM meetings WHERE id = $1', [req.params.id]);

    await query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), req.user.id, 'delete_meeting', 'meeting', req.params.id, JSON.stringify({ title: meeting.title })]);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
