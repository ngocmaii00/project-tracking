/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Video, Play, CheckCircle, FileText, Plus, X, Mic, Brain, ListChecks, Users, Clock, ArrowRight } from 'lucide-react';
import useStore from '../store/useStore';
import { format, parseISO } from 'date-fns';

function CreateMeetingModal({ projects, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', project_id: '', scheduled_at: '', duration_minutes: 60 });
  const [loading, setLoading] = useState(false);
  const { createMeeting } = useStore();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await createMeeting({ ...form, project_id: form.project_id || null });
      onCreated(p);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div className="modal-title">📅 Schedule Meeting</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Meeting Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="select" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">-- No Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="input" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProcessMeetingModal({ meeting, onClose, onProcessed }) {
  const [transcript, setTranscript] = useState(meeting.transcript || '');
  const [useVoiceAi, setUseVoiceAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const { processMeeting } = useStore();
  const navigate = useNavigate();

  const handle = async () => {
    setLoading(true);
    try {
      const res = await processMeeting(meeting.id, transcript, { use_voice_ai: useVoiceAi });
      if (res.result?.draft_id) {
        navigate('/ai/extract');
      } else {
        onProcessed();
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">🎙️ AI Meeting Intel: {meeting.title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Mic size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Voice Intelligence Support</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Automated speaker recognition & diarization using Azure AI Speech.</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={useVoiceAi} onChange={e => setUseVoiceAi(e.target.checked)} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Apply Speaker Diarization (Voice Identity)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Meeting Transcript / Notes</label>
            <textarea 
              className="textarea" 
              value={transcript} 
              onChange={e => setTranscript(e.target.value)} 
              placeholder="Paste transcript here OR let AI simulate voice-to-text diarization."
              style={{ minHeight: 250, fontFamily: 'monospace' }}
            />
          </div>
          
          <div style={{ background: 'rgba(79,142,247,0.08)', borderRadius: 8, padding: 12, border: '1px solid rgba(79,142,247,0.2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>AI Intelligence Layer</strong> will summarize the conversation, extract decisions, propose a 5-step next plan, and suggest the most logical follow-up meeting date.
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={handle} disabled={loading || (!transcript.trim() && !useVoiceAi)}>
            {loading ? 'AI analyzing voices & context...' : 'Extract Full Meeting Intel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { meetings, loadMeetings, projects, loadProjects } = useStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [processModal, setProcessModal] = useState(null);

  useEffect(() => {
    Promise.all([loadProjects(), loadMeetings('')]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Meetings Intelligence</h1>
          <p>Diarized transcripts, auto-plans, and follow-up scheduling</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Syncup
        </button>
      </div>

      <div className="grid-2">
        {meetings.map(m => {
          const act = typeof m.action_items === 'string' ? JSON.parse(m.action_items || '[]') : (m.action_items || []);
          const dec = typeof m.decisions === 'string' ? JSON.parse(m.decisions || '[]') : (m.decisions || []);
          const plan = typeof m.next_steps_plan === 'string' ? JSON.parse(m.next_steps_plan || '[]') : (m.next_steps_plan || []);
          const nextMeet = typeof m.next_meeting_proposal === 'string' ? JSON.parse(m.next_meeting_proposal || '{}') : (m.next_meeting_proposal || {});
          
          const p = projects.find(pr => pr.id === m.project_id);
          
          return (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{m.title}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    <Calendar size={12} /> {m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d, h:mm a') : 'Unscheduled'}
                    {p && <>  · <div className="avatar" style={{ width: 14, height: 14, fontSize: 8 }}>{p.name[0]}</div> {p.name}</>}
                  </div>
                </div>
                <span className={`badge ${m.status === 'completed' ? 'badge-success' : 'badge-in_progress'}`} style={{ textTransform: 'capitalize' }}>
                  {m.status}
                </span>
              </div>

              {m.status === 'completed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 14, border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
                      <Brain size={14} className="text-primary" /> AI Summary & Sentiment
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{m.summary}</div>
                  </div>

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ListChecks size={12} /> Decisions Made
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {dec.length > 0 ? dec.map((d, i) => (
                          <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: 6, background: 'var(--bg-elevated)', borderRadius: 6 }}>
                             {d}
                          </div>
                        )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</div>}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={12} /> Action Items
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {act.length > 0 ? act.map((a, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            <span>{a}</span>
                          </div>
                        )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None extracted</div>}
                      </div>
                    </div>
                  </div>

                  {plan.length > 0 && (
                    <div style={{ padding: 12, background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px dashed var(--success)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', marginBottom: 10 }}>🚀 Proposed Next Steps Plan</div>
                      {plan.slice(0, 3).map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{p.task}</span>
                          <span style={{ fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>{p.owner} · {p.due_date}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {nextMeet?.proposed_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13 }}>
                      <Clock size={16} style={{ color: 'var(--warning)' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--text-muted)' }}>AI suggests follow-up:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {format(parseISO(nextMeet.proposed_at), 'EEEE, MMM d @ h:mm a')}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm btn-icon"><ArrowRight size={14} /></button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary flex-1" onClick={() => setProcessModal(m)}>
                      <FileText size={16} /> Transcript
                    </button>
                    <button className="btn btn-ghost btn-icon" title="View Full AI Report"><Brain size={16} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="empty-state" style={{ padding: 24, margin: 0, minHeight: 'auto', background: 'var(--bg-elevated)' }}>
                    <Video size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Waiting for syncup to complete...</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/meetings/${m.id}/room`} className="btn btn-primary flex-1">
                      <Video size={16} /> Join Call
                    </Link>
                    <button className="btn btn-secondary flex-1" onClick={() => setProcessModal(m)}>
                      <Play size={16} /> Offline Process
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {meetings.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: 'span 2' }}>
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <div className="empty-state-title">No meetings scheduled</div>
            <div className="empty-state-desc">Schedule a meeting or import past notes to get AI-extracted action items.</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Schedule Sync</button>
          </div>
        )}
      </div>

      {showCreate && <CreateMeetingModal projects={projects} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadMeetings(''); }} />}
      {processModal && <ProcessMeetingModal meeting={processModal} onClose={() => setProcessModal(null)} onProcessed={() => { setProcessModal(null); loadMeetings(''); }} />}
    </div>
  );
}
