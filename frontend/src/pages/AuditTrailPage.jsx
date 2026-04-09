/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, ExternalLink, GitCommit, GitPullRequest } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';
import api from '../lib/api';

export default function AuditTrailPage() {
  const { id } = useParams();
  const { loadProject, currentProject, users, loadUsers } = useStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    Promise.all([
      loadProject(id),
      loadUsers(),
      api.get(`/projects/${id}/audit`).then(r => setLogs(r.data.logs))
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleRunChangeDetection = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await api.post(`/ai/projects/${id}/detect-changes`);
      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Change Detection & Audit</h1>
          <p>{currentProject?.project?.name} · Track what changed vs baseline</p>
        </div>
        <button className="btn btn-primary" onClick={handleRunChangeDetection} disabled={loadingAnalysis}>
          {loadingAnalysis ? 'Analyzing...' : <><GitPullRequest size={16} /> Analyze Changes vs Baseline</>}
        </button>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!analysis ? (
            <div className="card empty-state" style={{ minHeight: 300 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <div className="empty-state-title">Detect Meaningful Changes</div>
              <div className="empty-state-desc">AI will compare current tasks against the project baseline to highlight delays, scope creep, and resource shifts.</div>
            </div>
          ) : (
            <>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(124,58,237,0.08))', border: '1px solid var(--primary-glow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 24 }}>🤖</div>
                  <div className="card-title">AI Summary</div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {analysis.summary}
                </div>
              </div>

              {analysis.deviations?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 16 }}>⚠️ Key Deviations</div>
                  {analysis.deviations.map((d, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < analysis.deviations.length - 1 ? '1px solid var(--border)' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.task_id}</span>
                        <span className={`badge badge-${d.severity}`} style={{ textTransform: 'capitalize' }}>{d.severity}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{d.issue}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ textDecoration: 'line-through' }}>{d.expected}</span>
                        <span style={{ color: 'var(--text-primary)' }}>→</span>
                        <span>{d.actual}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Raw Audit Logs
          </div>
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', padding: 20 }}>
            {logs.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 200, margin: 0 }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>📜</div>
                <div className="empty-state-title" style={{ fontSize: 14 }}>No changes recorded yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {logs.map((log, i) => {
                  const user = users.find(u => u.id === log.user_id);
                  let details = {};
                  try { details = JSON.parse(log.details || '{}'); } catch (err) { console.error(err); }

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <GitCommit size={12} />
                        </div>
                        {i !== logs.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 20 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i !== logs.length - 1 ? 16 : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {log.action.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          {log.entity_type === 'task' ? 'Task ID: ' : 'Project ID: '}{log.entity_id}
                        </div>
                        
                        {Object.keys(details).length > 0 && (
                          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                            {Object.entries(details).map(([key, val]) => {
                              if (key === 'old' || key === 'new') return null; // Skip wrapper if present
                              return (
                                <div key={key} style={{ display: 'flex', marginBottom: 4 }}>
                                  <span style={{ width: 100, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                </div>
                              );
                            })}
                            {(details.old || details.new) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {Object.keys(details.new || {}).map(k => {
                                  if (details.old && details.old[k] === details.new[k]) return null;
                                  return (
                                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ width: 100, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
                                      {details.old && <span style={{ textDecoration: 'line-through', color: 'var(--danger)', opacity: 0.7 }}>{String(details.old[k])}</span>}
                                      {details.old && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                                      <span style={{ color: 'var(--success)' }}>{String(details.new[k])}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div className="avatar" style={{ width: 16, height: 16, fontSize: 8 }}>{user?.name?.[0] || '?'}</div>
                          {user?.name || log.user_id}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
