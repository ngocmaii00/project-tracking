/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, Users, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import useStore from '../store/useStore';

export default function ResourcesPage() {
  const { id } = useParams();
  const { loadProject, currentProject, optimizeResources, getBehavioralInsights, users, loadUsers } = useStore();
  const [optimization, setOptimization] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('workload');

  useEffect(() => {
    Promise.all([loadProject(id), loadUsers()]).finally(() => setLoading(false));
  }, [id]);

  const tasks = currentProject?.tasks || [];

  const workloadMap = {};
  users.forEach(u => { workloadMap[u.id] = { user: u, tasks: [], totalHours: 0 }; });
  tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').forEach(t => {
    if (t.owner_id && workloadMap[t.owner_id]) {
      workloadMap[t.owner_id].tasks.push(t);
      workloadMap[t.owner_id].totalHours += t.estimated_hours || 8;
    }
  });

  const handleOptimize = async () => {
    setRunning(true);
    try {
      const data = await optimizeResources(id);
      setOptimization(data.result);
    } finally { setRunning(false); }
  };

  const handleInsights = async () => {
    setRunning(true);
    try {
      const data = await getBehavioralInsights(id);
      setInsights(data.insights);
    } finally { setRunning(false); }
  };

  const getLoadColor = (pct) => pct > 120 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : pct > 40 ? 'var(--success)' : 'var(--text-muted)';
  const getLoadBg = (pct) => pct > 120 ? 'var(--danger-bg)' : pct > 80 ? 'var(--warning-bg)' : 'var(--success-bg)';

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Resource Management</h1>
          <p>{currentProject?.project?.name} · {users.length} team members</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleInsights} disabled={running}>
            <TrendingUp size={16} /> Behavioral Insights
          </button>
          <button className="btn btn-primary" onClick={handleOptimize} disabled={running}>
            {running ? 'Running...' : <><Zap size={16} /> AI Optimize</>}
          </button>
        </div>
      </div>

      <div className="tabs">
        {['workload', 'optimization', 'insights'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {activeTab === 'workload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {users.map(u => {
            const load = workloadMap[u.id];
            const hours = load?.totalHours || 0;
            const pct = Math.round(hours / 40 * 100);
            const taskCount = load?.tasks?.length || 0;
            const blocked = load?.tasks?.filter(t => t.status === 'blocked')?.length || 0;
            const overdue = load?.tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')?.length || 0;

            return (
              <div key={u.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div className="avatar avatar-lg">{u.name?.substring(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role?.replace('_', ' ')} · {u.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: getLoadColor(pct) }}>{pct}%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hours}h / 40h week</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className="progress-bar" style={{ flex: 1, height: 10 }}>
                    <div className="progress-fill" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct > 120 ? 'linear-gradient(90deg, var(--danger), #f87171)' : pct > 80 ? 'linear-gradient(90deg, var(--warning), #fde68a)' : undefined
                    }} />
                  </div>
                  <div style={{ background: getLoadBg(pct), color: getLoadColor(pct), padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {pct > 120 ? '🔴 Overloaded' : pct > 80 ? '🟡 High Load' : pct > 0 ? '🟢 Healthy' : '⬜ Available'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{taskCount}</strong> active tasks</span>
                  {blocked > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {blocked} blocked</span>}
                  {overdue > 0 && <span style={{ color: 'var(--warning)' }}>🕐 {overdue} overdue</span>}
                </div>

                {load?.tasks?.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {load.tasks.slice(0, 6).map(t => (
                      <span key={t.id} style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '3px 8px', fontSize: 12, color: 'var(--text-secondary)'
                      }}>
                        {t.title.substring(0, 30)}
                        {t.status === 'blocked' && ' ⚠'}
                      </span>
                    ))}
                    {load.tasks.length > 6 && <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '3px 0' }}>+{load.tasks.length - 6} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'optimization' && (
        <div>
          {!optimization ? (
            <div className="card empty-state" style={{ minHeight: 300 }}>
              <div style={{ fontSize: 48 }}>⚡</div>
              <div className="empty-state-title">Run AI Resource Optimization</div>
              <div className="empty-state-desc">AI will analyze workload distribution and suggest reassignments to balance the team</div>
              <button className="btn btn-primary" onClick={handleOptimize} disabled={running}>
                {running ? 'Analyzing...' : <><Zap size={16} /> Optimize Resources</>}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(16,185,129,0.08))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Optimization Score</div>
                    <div style={{ fontSize: 42, fontWeight: 800, color: optimization.optimization_score > 70 ? 'var(--success)' : 'var(--warning)' }}>
                      {optimization.optimization_score}/100
                    </div>
                  </div>
                  <div style={{ fontSize: 48 }}>⚡</div>
                </div>
              </div>

              {optimization.suggestions?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 16 }}>💡 Reassignment Suggestions</div>
                  {optimization.suggestions.map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, marginBottom: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{s.task_title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 20 }}>{s.current_owner || 'Unassigned'}</span>
                        <span>→</span>
                        <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 20 }}>{s.suggested_owner}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{s.reason}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--primary)' }}>Confidence: {Math.round(s.confidence * 100)}%</span>
                        <button className="btn btn-success btn-sm">Apply</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {optimization.recommendations?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 12 }}>📌 Recommendations</div>
                  {optimization.recommendations.map((r, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < optimization.recommendations.length - 1 ? '1px solid var(--border)' : undefined, fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--primary)' }}>•</span> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div>
          {!insights ? (
            <div className="card empty-state" style={{ minHeight: 300 }}>
              <div style={{ fontSize: 48 }}>🧠</div>
              <div className="empty-state-title">AI Behavioral Insights</div>
              <div className="empty-state-desc">Analyze team patterns, detect risks, and understand performance trends</div>
              <button className="btn btn-primary" onClick={handleInsights} disabled={running}>
                {running ? 'Analyzing...' : <><TrendingUp size={16} /> Analyze Team</>}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {insights.team_insights?.map((insight, i) => (
                <div key={i} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div className="avatar">{insight.name?.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{insight.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        On-time rate: <span style={{ color: insight.on_time_rate > 0.75 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{Math.round(insight.on_time_rate * 100)}%</span>
                        {insight.avg_delay_days > 0 && ` · Avg delay: ${insight.avg_delay_days}d`}
                      </div>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 6, textTransform: 'uppercase' }}>Strengths</div>
                      {insight.strengths?.map((s, j) => <div key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>✓ {s}</div>)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 6, textTransform: 'uppercase' }}>Risk Factors</div>
                      {insight.risk_factors?.length > 0
                        ? insight.risk_factors.map((r, j) => <div key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>⚠ {r}</div>)
                        : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No risk factors identified</div>
                      }
                    </div>
                  </div>
                  {insight.recommendation && (
                    <div style={{ marginTop: 12, background: 'rgba(79,142,247,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', border: '1px solid rgba(79,142,247,0.15)' }}>
                      🤖 {insight.recommendation}
                    </div>
                  )}
                </div>
              ))}

              {insights.predictive_alerts?.length > 0 && (
                <div className="card" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'var(--warning-bg)' }}>
                  <div className="card-title" style={{ marginBottom: 12, color: 'var(--warning)' }}>⚠ Predictive Alerts</div>
                  {insights.predictive_alerts.map((a, i) => <div key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>• {a}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
