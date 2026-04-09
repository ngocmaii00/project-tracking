/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, AlertTriangle, CheckCircle, Clock, TrendingUp, Zap, Users, Calendar, ArrowRight, Shield } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';

function SparkLine({ data = [], color = 'var(--primary)' }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" style={{ width: 80, height: 32 }} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const { projects, loadProjects, notifications, loadNotifications, user } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadProjects(), loadNotifications()]).then(() => {
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    if (!projects.length) return { allTasks: 0, doneTasks: 0, blockedTasks: 0, activeProjects: 0, highRiskProjects: 0 };
    const allTasks = projects.reduce((acc, p) => acc + (p.total_tasks || 0), 0);
    const doneTasks = projects.reduce((acc, p) => acc + (p.done_tasks || 0), 0);
    const blockedTasks = projects.reduce((acc, p) => acc + (p.blocked_tasks || 0), 0);
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const highRiskProjects = projects.filter(p => (p.risk_score || 0) > 60).length;
    return { allTasks, doneTasks, blockedTasks, activeProjects, highRiskProjects };
  }, [projects]);

  const recentNotifs = notifications.filter(n => !n.is_read).slice(0, 5);
  const urgentProjects = projects.filter(p => (p.risk_score || 0) > 50).slice(0, 3);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /><span>Loading dashboard...</span></div>
    </div>
  );

  const completionRate = stats?.allTasks ? Math.round((stats.doneTasks / stats.allTasks) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>{format(new Date(), 'EEEE, MMMM d, yyyy')} · {stats?.activeProjects || 0} active projects</p>
        </div>
        <Link to="/ai/extract" className="btn btn-primary">
          <Zap size={16} /> AI Extract Tasks
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card primary">
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{stats?.activeProjects || 0}</div>
          <div className="stat-sub">{projects.length} total projects</div>
          <SparkLine data={[2,3,3,4,5,stats?.activeProjects || 1]} color="var(--primary)" />
        </div>
        <div className="stat-card success">
          <div className="stat-label">Completion Rate</div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-sub">{stats?.doneTasks} / {stats?.allTasks} tasks done</div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill success" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Blocked Tasks</div>
          <div className="stat-value">{stats?.blockedTasks || 0}</div>
          <div className="stat-sub">Needs immediate attention</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{stats?.highRiskProjects || 0}</div>
          <div className="stat-sub">Projects above risk threshold</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Open Risks</div>
          <div className="stat-value">{projects.reduce((a, p) => a + (p.open_risks || 0), 0)}</div>
          <div className="stat-sub">Across all projects</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart2 size={18} /> Projects Overview</span>
            <Link to="/projects" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.slice(0, 5).map(p => {
              const pct = p.total_tasks ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
              const health = (p.health_score || 80);
              return (
                <Link to={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.total_tasks} tasks · {p.done_tasks} done</div>
                      </div>
                      <div className={`risk-score ${(p.risk_score || 0) > 60 ? 'risk-high' : (p.risk_score || 0) > 30 ? 'risk-medium' : 'risk-low'}`}>
                        {Math.round(p.risk_score || 0)}
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: health > 60 ? undefined : 'linear-gradient(90deg, var(--warning), #fde68a)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>{pct}% complete</span>
                      {p.blocked_tasks > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {p.blocked_tasks} blocked</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
            {!projects.length && <div className="empty-state"><div className="empty-state-icon">📁</div><div className="empty-state-title">No projects yet</div><Link to="/projects" className="btn btn-primary">Create First Project</Link></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={18} /> Alerts & Notifications</span>
            {recentNotifs.length > 0 && <span className="badge badge-danger">{recentNotifs.length} new</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgentProjects.map(p => (
              <div key={p.id} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--danger)' }}>High Risk: {p.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk score: {Math.round(p.risk_score)} · {p.blocked_tasks} blocked tasks</div>
              </div>
            ))}

            {recentNotifs.map(n => (
              <div key={n.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n.title}</div>
                {n.message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}

            {!recentNotifs.length && !urgentProjects.length && (
              <div className="empty-state" style={{ padding: 32 }}>
                <CheckCircle size={32} style={{ color: 'var(--success)', opacity: 0.7 }} />
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All clear! No urgent alerts.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/ai/extract" className="btn btn-secondary btn-sm"><Zap size={14} /> AI Extract</Link>
              <Link to="/ai/assistant" className="btn btn-secondary btn-sm"><Shield size={14} /> AI Chat</Link>
              <Link to="/meetings" className="btn btn-secondary btn-sm"><Calendar size={14} /> Meetings</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(79,142,247,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>AI Assistant Tip</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Paste your meeting notes in <strong>AI Extraction</strong> to automatically create tasks and detect action items. 
              Use <strong>AI Chat</strong> to ask questions about your project status and get risk insights.
            </div>
          </div>
          <Link to="/ai/assistant" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Try Now</Link>
        </div>
      </div>
    </div>
  );
}
