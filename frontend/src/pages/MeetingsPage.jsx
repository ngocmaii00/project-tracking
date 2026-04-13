/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Video, Play, CheckCircle, FileText, Plus, X, Mic, Brain, ListChecks, Users, Clock, ArrowRight, Headphones, UserPlus, Search, Trash, Bell } from 'lucide-react';
import useStore from '../store/useStore';
import { format, parseISO } from 'date-fns';
import api from '../lib/api';

function CreateMeetingModal({ projects, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', project_id: '', scheduled_at: '', duration_minutes: 60 });
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const { createMeeting } = useStore();

  const searchUsers = async (q) => {
    setUserQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await api.get(`/friends/search?q=${q}`);
      setSearchResults(data);
    } catch {
      throw new Error('Failed to search users');
     }
  };

  const toggleAttendee = (u) => {
    if (selectedAttendees.find(a => a.id === u.id)) {
      setSelectedAttendees(prev => prev.filter(a => a.id !== u.id));
    } else {
      setSelectedAttendees(prev => [...prev, u]);
    }
  };

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await createMeeting({ 
        ...form, 
        project_id: form.project_id || null,
        attendees: selectedAttendees.map(a => a.id)
      });
      onCreated(p);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title">📅 Schedule Meeting</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
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
          </div>
          
          <div className="form-group">
            <label className="form-label">Scheduled Time</label>
            <input className="input" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Invite Members</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Search size={14} className="input-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}/>
              <input className="input" style={{ paddingLeft: 34 }} placeholder="Search team members..." value={userQuery} onChange={e => searchUsers(e.target.value)} />
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results-box" style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {searchResults.map(u => (
                  <div key={u.id} onClick={() => toggleAttendee(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: `hsl(${u.name.charCodeAt(0) * 40}, 50%, 50%)` }}>
                      {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : u.name[0]}
                    </div>
                    <span style={{ fontSize: 13, flex: 1 }}>{u.name}</span>
                    <Plus size={14} style={{ opacity: 0.5 }} />
                  </div>
                ))}
              </div>
            )}

            {selectedAttendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {selectedAttendees.map(u => (
                  <div key={u.id} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                    <div className="avatar" style={{ width: 14, height: 14, fontSize: 8 }}>{u.name[0]}</div>
                    <span>{u.name}</span>
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleAttendee(u)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Creating Intelligence Sync...' : 'Schedule Syncup & Invite'}
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

function InviteUsersModal({ meeting, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { inviteToMeeting } = useStore();

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/friends/search?q=${q}`);
      setResults(data);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div className="modal-title">Invite Users: {meeting.title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-with-icon">
            <Search size={16} className="input-icon" />
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Search name or email..." value={query} onChange={e => search(e.target.value)} />
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div className="avatar" style={{ background: `hsl(${u.name.charCodeAt(0) * 40}, 50%, 50%)` }}>
                  {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : u.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => inviteToMeeting(meeting.id, u.id)}>Invite</button>
              </div>
            ))}
            {!loading && query.length >= 2 && results.length === 0 && <div className="text-muted text-center py-4">No users found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { meetings, loadMeetings, projects, loadProjects, activeMeeting, loadMeetingInvitations, acceptMeetingInvite, user, deleteMeeting } = useStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [processModal, setProcessModal] = useState(null);
  const [inviteModal, setInviteModal] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeView, setActiveView] = useState('meetings');

  const refreshAll = () => {
    setLoading(true);
    Promise.all([
      loadProjects(), 
      loadMeetings(''), 
      loadMeetingInvitations().then(setInvitations),
      api.get('/audit/all').then(r => setLogs(r.data.logs))
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleAccept = async (inviteId) => {
    await acceptMeetingInvite(inviteId);
    refreshAll();
  };

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Meetings Intelligence</h1>
          <p>Diarized transcripts, auto-plans, and follow-up scheduling</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="tab-group" style={{ background: 'var(--bg-elevated)', padding: 4, borderRadius: 10 }}>
            <button className={`btn btn-sm ${activeView === 'meetings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveView('meetings')}>Meetings</button>
            <button className={`btn btn-sm ${activeView === 'logs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveView('logs')}>Audit Logs</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Syncup
          </button>
        </div>
      </div>

      {activeView === 'meetings' ? (
        <>
          {invitations.length > 0 && (
            <div className="card mb-6" style={{ border: '1px solid var(--primary-dark)', background: 'rgba(79,142,247,0.05)' }}>
              <div className="card-title" style={{ color: 'var(--primary)' }}><Bell size={16} /> Lời mời tham gia họp ({invitations.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{inv.meeting_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mời bởi: {inv.inviter_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAccept(inv.id)}>Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className={`badge ${m.status === 'completed' ? 'badge-success' : 'badge-in_progress'}`} style={{ textTransform: 'capitalize' }}>
                    {m.status}
                  </span>
                  {m.created_by === user.id && (
                    <button 
                      className="btn btn-ghost btn-icon sm text-danger" 
                      onClick={async () => { if(confirm('Xóa cuộc họp này?')) { await deleteMeeting(m.id); refreshAll(); } }}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
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
                    <Link to={`/meetings/${m.id}/room`} className={`btn flex-1 ${activeMeeting?.id === m.id ? 'btn-success' : 'btn-primary'}`}>
                      {activeMeeting?.id === m.id ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Headphones size={16} className="beat-animation" /> Return to Call</div> : <><Video size={16} /> Join Call</>}
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
    </>
  ) : (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>User Operation Logs</div>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: 20 }}>
        {logs.length === 0 ? <div className="text-muted text-center py-8">No operation logs found</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div className="avatar" style={{ background: `hsl(${log.user_name?.charCodeAt(0) * 40}, 50%, 50%)`, width: 32, height: 32, overflow: 'hidden' }}>{log.user_avatar ? <img src={log.user_avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : log.user_name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}><strong style={{ color: 'var(--text-primary)' }}>{log.user_name}</strong> đã thực hiện: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{log.action.replace(/_/g, ' ').toUpperCase()}</span></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.entity_type} ID: {log.entity_id} · {format(new Date(log.created_at), 'MMM d, HH:mm')}</div>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="badge badge-ghost" style={{ fontSize: 10 }}>Log: {Object.keys(log.details)[0]}...</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {showCreate && <CreateMeetingModal projects={projects} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refreshAll(); }} />}
  {processModal && <ProcessMeetingModal meeting={processModal} onClose={() => setProcessModal(null)} onProcessed={() => { setProcessModal(null); refreshAll(); }} />}
  {inviteModal && <InviteUsersModal meeting={inviteModal} onClose={() => setInviteModal(null)} />}
</div>
  );
}
