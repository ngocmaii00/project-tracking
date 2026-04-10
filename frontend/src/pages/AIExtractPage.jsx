/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Zap, Check, X, Search, FileText } from 'lucide-react';
import useStore from '../store/useStore';

export default function AIExtractPage() {
  const { projects, loadProjects, extractFromText, aiDrafts, loadDrafts, approveDraft, rejectDraft, aiProcessing } = useStore();
  const location = useLocation();

  const [text, setText] = useState(location.state?.text || '');
  const [sourceType, setSourceType] = useState('meeting');
  const [projectId, setProjectId] = useState(location.state?.projectId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadProjects(), loadDrafts()]).finally(() => setLoading(false));
  }, []);

  const handleExtract = async () => {
    if (!text.trim()) return;
    await extractFromText(text, sourceType, projectId || undefined);
    setText('');
  };

  const handleApprove = async (draftId, all = false, selected = []) => {
    await approveDraft(draftId, { approve_all: all, selected_tasks: selected });
  };

  const pendingDrafts = aiDrafts.filter(d => d.status === 'pending');
  const pastDrafts = aiDrafts.filter(d => d.status !== 'pending').slice(0, 5);

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>⚡ AI Action Extraction</h1>
          <p>Extract structured tasks from unstructured notes, emails, and chat logs</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Input Context</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Target Project (Optional)</label>
              <select className="select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">-- No Project (Global Tasks) --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Source Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['meeting', 'email', 'chat'].map(t => (
                  <button key={t} className={`btn btn-sm ${sourceType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSourceType(t)} style={{ textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea 
                className="textarea" 
                value={text} 
                onChange={e => setText(e.target.value)} 
                placeholder="Paste meeting transcript, email thread, or chat history here..."
                style={{ minHeight: 250 }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleExtract} disabled={!text.trim() || aiProcessing}>
              {aiProcessing ? <><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /> Extracting...</> : <><Zap size={16} /> Extract Tasks & Actions</>}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Review Pending Extractions</h3>
          
          {pendingDrafts.length === 0 ? (
            <div className="empty-state card">
              <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-desc">No pending task drafts to review. Paste some text to generate new tasks.</div>
            </div>
          ) : (
            pendingDrafts.map(draft => {
              const tasks = typeof draft.extracted_tasks === 'string' ? JSON.parse(draft.extracted_tasks || '[]') : (draft.extracted_tasks || []);
              const p = projects.find(pr => pr.id === draft.project_id);
              
              return (
                <div key={draft.id} className="card" style={{ border: '1px solid var(--primary-glow)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-medium" style={{ textTransform: 'capitalize' }}>{draft.source_type}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(draft.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Found {tasks.length} actions</div>
                      {p && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Project: {p.name}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,142,247,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                      <Zap size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{Math.round(draft.confidence_score * 100)}% Match</span>
                    </div>
                  </div>

                  <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>AI Summary:</strong> {draft.ai_summary}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {tasks.map((t, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{t.title}</span>
                          <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span>Owner: <strong style={{ color: 'var(--text-secondary)' }}>{t.owner || 'Unassigned'}</strong></span>
                          <span>Due: <strong style={{ color: 'var(--text-secondary)' }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</strong></span>
                        </div>
                        {t.evidence && (
                          <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            "{t.evidence}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success flex-1" onClick={() => handleApprove(draft.id, true)}>
                      <Check size={16} /> Approve All Tasks
                    </button>
                    <button className="btn btn-ghost" onClick={() => rejectDraft(draft.id)} style={{ color: 'var(--danger)' }}>
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {pastDrafts.length > 0 && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-title" style={{ marginBottom: 16 }}>Recent History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastDrafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Extracted from {d.source_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`badge ${d.status === 'approved' ? 'badge-success' : 'badge-cancelled'}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
