/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Play, CheckCircle, FileText, Plus, X } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(false);
  const { processMeeting } = useStore();
  const navigate = useNavigate();

  const handle = async () => {
    setLoading(true);
    try {
      const res = await processMeeting(meeting.id, transcript);
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
          <div className="modal-title">🎙️ Process Meeting: {meeting.title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Meeting Transcript</label>
            <textarea 
              className="textarea" 
              value={transcript} 
              onChange={e => setTranscript(e.target.value)} 
              placeholder="Paste recorded transcript here. AI will extract tasks, decisions, and action items."
              style={{ minHeight: 300, fontFamily: 'monospace' }}
            />
          </div>
          <div style={{ background: 'rgba(79,142,247,0.08)', borderRadius: 8, padding: 12, border: '1px solid rgba(79,142,247,0.2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>AI Intelligence Layer</strong> will automatically create tasks and map them to the project, assigning owners and due dates based on the conversation context.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handle} disabled={loading || !transcript.trim()}>
            {loading ? 'Processing...' : 'Run Analysis & Extract Tasks'}
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
    Promise.all([loadProjects(), loadMeetings()]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Meetings Intelligence</h1>
          <p>Record, transcribe, and extract actions from your syncups</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Schedule
        </button>
      </div>

      <div className="grid-2">
        {meetings.map(m => {
          const act = JSON.parse(m.action_items || '[]');
          const p = projects.find(pr => pr.id === m.project_id);
          return (
            <div key={m.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{m.title}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d, yyyy h:mm a') : 'Unscheduled'}
                    {p && ` · ${p.name}`}
                  </div>
                </div>
                <span className={`badge ${m.status === 'completed' ? 'badge-success' : 'badge-in_progress'}`} style={{ textTransform: 'capitalize' }}>
                  {m.status}
                </span>
              </div>

              {m.status === 'completed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>AI Summary</div>
                    {m.summary}
                  </div>
                  {act.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Action Items Extracted</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {act.slice(0, 3).map((a, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="btn btn-secondary w-full" style={{ marginTop: 8 }} onClick={() => setProcessModal(m)}>
                    <FileText size={16} /> View Transcript Log
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="empty-state" style={{ padding: 16, margin: 0, minHeight: 'auto' }}>
                    <Video size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ready for processing</div>
                  </div>
                  <button className="btn btn-primary w-full" onClick={() => setProcessModal(m)}>
                    <Play size={16} /> Process Transcript
                  </button>
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

      {showCreate && <CreateMeetingModal projects={projects} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadMeetings(); }} />}
      {processModal && <ProcessMeetingModal meeting={processModal} onClose={() => setProcessModal(null)} onProcessed={() => { setProcessModal(null); loadMeetings(); }} />}
    </div>
  );
}
