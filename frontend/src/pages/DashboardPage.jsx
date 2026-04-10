/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, AlertTriangle, CheckCircle, Zap, Calendar, ArrowRight, Shield, Search, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';
import { models } from 'powerbi-client';
import { PowerBIEmbed } from 'powerbi-client-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Power BI Embedded Report Panel ──────────────────────────────────────────
function PowerBIPanel({ reportName, height = 340 }) {
  const [embedConfig, setEmbedConfig] = useState(null);
  const [pbiError, setPbiError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cwb_token');
    axios.get(`${API_URL}/powerbi/embed-token`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        if (!data.configured) {
          setPbiError(data.message);
          return;
        }
        setEmbedConfig({
          type: 'report',
          id: data.reportId,
          embedUrl: data.embedUrl,
          accessToken: data.embedToken,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: { filters: { visible: false }, pageNavigation: { visible: false } },
            background: models.BackgroundType.Transparent,
          },
        });
      })
      .catch(() => setPbiError('Failed to load Power BI report'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ai-thinking">
          <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
          <span>Loading Power BI report...</span>
        </div>
      </div>
    );
  }

  if (pbiError) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ width: 48, height: 48, background: 'rgba(242,199,17,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Power BI — {reportName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320 }}>{pbiError}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Configure POWERBI_* in backend .env to enable embedded reports</div>
        </div>
      </div>
    );
  }

  return (
    <PowerBIEmbed
      embedConfig={embedConfig}
      cssClassName="powerbi-embed"
      getEmbeddedComponent={() => {}}
      eventHandlers={new Map([
        ['loaded', () => {}],
        ['rendered', () => {}],
        ['error', (e) => console.error('PowerBI error:', e)],
      ])}
    />
  );
}

// ─── Azure AI Search Bar ──────────────────────────────────────────────────────
function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('cwb_token');
        const { data } = await axios.get(`${API_URL}/search?q=${encodeURIComponent(q)}&top=6`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Azure AI Search — tìm task, meeting, quyết định..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }}
        />
        {searching && <RefreshCw size={14} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />}
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {results.map(r => (
            <div key={r.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 10, background: 'rgba(99,141,255,0.15)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{r.type}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.title}</span>
                </div>
                {r.searchScore && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(r.searchScore * 100).toFixed(0)}%</span>}
              </div>
              {r.content && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.content}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { projects, loadProjects, notifications, loadNotifications, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'powerbi'

  useEffect(() => {
    Promise.all([loadProjects(), loadNotifications()]).then(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!projects.length) return { allTasks: 0, doneTasks: 0, blockedTasks: 0, activeProjects: 0, highRiskProjects: 0 };
    return {
      allTasks: projects.reduce((acc, p) => acc + (p.total_tasks || 0), 0),
      doneTasks: projects.reduce((acc, p) => acc + (p.done_tasks || 0), 0),
      blockedTasks: projects.reduce((acc, p) => acc + (p.blocked_tasks || 0), 0),
      activeProjects: projects.filter(p => p.status === 'active').length,
      highRiskProjects: projects.filter(p => (p.risk_score || 0) > 60).length,
    };
  }, [projects]);

  const recentNotifs = notifications.filter(n => !n.is_read).slice(0, 5);
  const urgentProjects = projects.filter(p => (p.risk_score || 0) > 50).slice(0, 3);
  const completionRate = stats.allTasks ? Math.round((stats.doneTasks / stats.allTasks) * 100) : 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /><span>Loading dashboard...</span></div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>{format(new Date(), 'EEEE, MMMM d, yyyy')} · {stats.activeProjects} active projects</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GlobalSearchBar />
          <Link to="/ai/extract" className="btn btn-primary"><Zap size={16} /> AI Extract</Link>
        </div>
      </div>

      {/* Azure Service Status Banner */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Azure AI Foundry', icon: '🤖', env: 'ai' },
          { label: 'Power BI', icon: '📊', env: 'pbi' },
          { label: 'Cosmos DB', icon: '🌐', env: 'cosmos' },
          { label: 'AI Search', icon: '🔍', env: 'search' },
          { label: 'Blob Storage', icon: '📦', env: 'blob' },
          { label: 'GitHub', icon: '🐙', env: 'github' },
        ].map(s => (
          <div key={s.env} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{s.icon}</span><span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* View Tabs: Overview vs Power BI */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['overview', 'powerbi'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)' }}>
            {tab === 'overview' ? '📋 Overview' : '📊 Power BI Reports'}
          </button>
        ))}
      </div>

      {/* ── Power BI Tab ── */}
      {activeTab === 'powerbi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <span className="card-title"><BarChart2 size={18} /> Project Health Dashboard</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(242,199,17,0.12)', padding: '2px 8px', borderRadius: 6 }}>Power BI Embedded</span>
              </div>
              <PowerBIPanel reportName="Project Health" height={340} />
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title"><BarChart2 size={18} /> Risk & Resource Report</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(242,199,17,0.12)', padding: '2px 8px', borderRadius: 6 }}>Power BI Embedded</span>
              </div>
              <PowerBIPanel reportName="Risk & Resource" height={340} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title"><BarChart2 size={18} /> Velocity & Burndown Chart</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(242,199,17,0.12)', padding: '2px 8px', borderRadius: 6 }}>Power BI Embedded</span>
            </div>
            <PowerBIPanel reportName="Velocity Burndown" height={280} />
          </div>
        </div>
      )}

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Stats */}
          <div className="stat-grid">
            <div className="stat-card primary">
              <div className="stat-label">Active Projects</div>
              <div className="stat-value">{stats.activeProjects}</div>
              <div className="stat-sub">{projects.length} total projects</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Completion Rate</div>
              <div className="stat-value">{completionRate}%</div>
              <div className="stat-sub">{stats.doneTasks} / {stats.allTasks} tasks done</div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill success" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Blocked Tasks</div>
              <div className="stat-value">{stats.blockedTasks}</div>
              <div className="stat-sub">Needs immediate attention</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-label">High Risk Projects</div>
              <div className="stat-value">{stats.highRiskProjects}</div>
              <div className="stat-sub">Above risk threshold</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Open Risks</div>
              <div className="stat-value">{projects.reduce((a, p) => a + (p.open_risks || 0), 0)}</div>
              <div className="stat-sub">Across all projects</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Projects list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><BarChart2 size={18} /> Projects Overview</span>
                <Link to="/projects" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.slice(0, 5).map(p => {
                  const pct = p.total_tasks ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                  return (
                    <Link to={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', transition: 'all 0.2s' }}
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
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
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

            {/* Alerts */}
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
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk score: {Math.round(p.risk_score)} · {p.blocked_tasks} blocked</div>
                  </div>
                ))}
                {recentNotifs.map(n => (
                  <div key={n.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n.title}</div>
                    {n.message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('powerbi')}><BarChart2 size={14} /> Power BI</button>
                </div>
              </div>
            </div>
          </div>

          {/* Azure AI tip banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,120,212,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(0,120,212,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0078D4, #7C3AED)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Azure AI Foundry — Tip</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Paste meeting notes in <strong>AI Extraction</strong> to auto-create tasks via Azure AI Foundry.
                  Use <strong>Power BI tab</strong> for full analytics. Search across all data with <strong>Azure AI Search</strong>.
                </div>
              </div>
              <Link to="/ai/assistant" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Try AI Chat</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
