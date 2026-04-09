/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart2, GitBranch, AlertTriangle, Users, Zap, Calendar, Clock, TrendingUp, Play, Plus, X, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';

function TaskRow({ task, users, onEdit, onDelete }) {
  const owner = users?.find(u => u.id === task.owner_id);

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{task.title}</div>
        {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300 }} className="truncate">{task.description}</div>}
        {task.is_critical_path ? <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>🔴 CRITICAL PATH</span> : null}
      </td>
      <td><span className={`badge badge-${task.status}`}>{task.status?.replace('_', ' ')}</span></td>
      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
      <td>
        {owner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar avatar-sm">{owner.name?.substring(0, 2).toUpperCase()}</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{owner.name}</span>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>}
      </td>
      <td>
        {task.due_date ? (
          <span style={{ fontSize: 13, color: new Date(task.due_date) < new Date() && task.status !== 'done' ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {new Date(task.due_date) < new Date() && task.status !== 'done' ? '⚠ ' : ''}
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="progress-bar" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${task.completion_pct || 0}%` }} /></div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.completion_pct || 0}%</span>
        </div>
      </td>
      <td>
        {task.confidence_score < 0.8 && task.source === 'ai_extract' && (
          <span style={{ fontSize: 11, background:'rgba(245,158,11,0.1)',color:'var(--warning)',padding:'2px 6px',borderRadius:4 }}>
            AI {Math.round(task.confidence_score * 100)}%
          </span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => onEdit(task)} title="Edit"><Edit2 size={14} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => onDelete(task)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function TaskModal({ task, project, users, onClose, onSaved }) {
  const [form, setForm] = useState(task || { title: '', description: '', status: 'todo', priority: 'medium', owner_id: '', due_date: '', estimated_hours: 0, completion_pct: 0 });
  const [loading, setLoading] = useState(false);
  const { createTask, updateTask } = useStore();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (task) await updateTask(task.id, form);
      else await createTask({ ...form, project_id: project.id });
      onSaved();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title">{task ? '✏️ Edit Task' : '➕ New Task'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Task title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="textarea" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." style={{ minHeight: 70 }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['todo','in_progress','blocked','review','done','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Owner</label>
              <select className="select" value={form.owner_id || ''} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value || null }))}>
                <option value="">Unassigned</option>
                {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="input" type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <input className="input" type="number" min="0" value={form.estimated_hours || 0} onChange={e => setForm(f => ({ ...f, estimated_hours: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Completion %</label>
              <input className="input" type="number" min="0" max="100" value={form.completion_pct || 0} onChange={e => setForm(f => ({ ...f, completion_pct: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { loadProject, loadAnalytics, currentProject, projectAnalytics, deleteTask, runRiskAnalysis, generateStandup, aiProcessing, users, loadUsers } = useStore();
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [standup, setStandup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadProject(id), loadAnalytics(id), loadUsers()]).finally(() => setLoading(false));
  }, [id]);

  const project = currentProject?.project;
  const tasks = currentProject?.tasks || [];
  const members = currentProject?.members || [];

  const handleRiskAnalysis = async () => {
    await runRiskAnalysis(id);
    await loadProject(id);
  };

  const handleStandup = async () => {
    const data = await generateStandup(id);
    setStandup(data.standup);
  };

  const handleDeleteTask = async (task) => {
    if (confirm(`Delete "${task.title}"?`)) {
      await deleteTask(task.id);
      await loadProject(id);
    }
  };

  if (loading || !project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /><span>Loading project...</span></div>
    </div>
  );

  const analytics = projectAnalytics;
  const pct = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              <Link to="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Projects</Link> › {project.name}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{project.name}</h1>
            {project.description && <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 600 }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleStandup} disabled={aiProcessing}><Calendar size={14} /> Standup</button>
            <button className="btn btn-secondary btn-sm" onClick={handleRiskAnalysis} disabled={aiProcessing}><AlertTriangle size={14} /> Risk Analysis</button>
            <Link to={`/projects/${id}/kanban`} className="btn btn-secondary btn-sm"><GitBranch size={14} /> Kanban</Link>
            <Link to={`/projects/${id}/gantt`} className="btn btn-secondary btn-sm"><BarChart2 size={14} /> Gantt</Link>
            <Link to={`/projects/${id}/simulation`} className="btn btn-secondary btn-sm"><Zap size={14} /> Simulate</Link>
            <Link to={`/projects/${id}/risks`} className="btn btn-secondary btn-sm"><AlertTriangle size={14} /> Risks</Link>
            <Link to={`/projects/${id}/resources`} className="btn btn-secondary btn-sm"><Users size={14} /> Resources</Link>
            <Link to={`/projects/${id}/audit`} className="btn btn-secondary btn-sm"><TrendingUp size={14} /> Audit</Link>
            <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}><Plus size={14} /> Add Task</button>
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 20 }}>
          <div className="stat-card primary card-sm">
            <div className="stat-label">Progress</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{pct}%</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="stat-card success card-sm">
            <div className="stat-label">Done</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{tasks.filter(t => t.status === 'done').length}</div>
            <div className="stat-sub">of {tasks.length} tasks</div>
          </div>
          <div className="stat-card warning card-sm">
            <div className="stat-label">In Progress</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{tasks.filter(t => t.status === 'in_progress').length}</div>
          </div>
          <div className="stat-card danger card-sm">
            <div className="stat-label">Blocked</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{tasks.filter(t => t.status === 'blocked').length}</div>
          </div>
          <div className="stat-card accent card-sm">
            <div className="stat-label">Risk Score</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{Math.round(project.risk_score || 0)}</div>
            <div className="stat-sub">Health: {Math.round(project.health_score || 100)}</div>
          </div>
        </div>
      </div>

      {standup && (
        <div className="modal-overlay" onClick={() => setStandup(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 Daily Standup — {standup.date}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setStandup(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {Object.entries(standup.key_metrics || {}).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
              {standup.blockers?.length > 0 && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>🚨 Blockers</div>
                  {standup.blockers.map((b, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>• {b}</div>)}
                </div>
              )}
              {standup.today_focus?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>🎯 Today's Focus</div>
                  {standup.today_focus.map((f, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>• {f}</div>)}
                </div>
              )}
              <div style={{ padding: 14, background: 'rgba(79,142,247,0.08)', borderRadius: 8, border: '1px solid rgba(79,142,247,0.2)', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                "{standup.team_spotlight}"
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {['tasks', 'analytics', 'members'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th><th>Status</th><th>Priority</th><th>Owner</th><th>Due Date</th><th>Progress</th><th>Source</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <TaskRow key={t.id} task={t} users={users} onEdit={task => setTaskModal(task)} onDelete={handleDeleteTask} />
                ))}
              </tbody>
            </table>
            {!tasks.length && (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No tasks yet</div>
                <div className="empty-state-desc">Add tasks manually or use AI Extraction to import from meeting notes</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={() => setTaskModal('new')}><Plus size={16} /> Add Task</button>
                  <Link to="/ai/extract" className="btn btn-secondary"><Zap size={16} /> AI Extract</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid-3">
            {analytics.risk_analysis?.risks?.slice(0, 3).map((r, i) => (
              <div key={i} className="card card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{r.title}</span>
                  <span className={`risk-score ${r.risk_score > 60 ? 'risk-high' : r.risk_score > 30 ? 'risk-medium' : 'risk-low'}`} style={{ fontSize: 11 }}>{r.risk_score}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{r.description}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge badge-${r.category}`} style={{ textTransform: 'capitalize' }}>{r.category}</span>
                </div>
                {r.mitigation && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', background: 'var(--success-bg)', padding: '6px 10px', borderRadius: 6 }}>💡 {r.mitigation}</div>}
              </div>
            ))}
          </div>

          {analytics.prediction && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>🔮 Timeline Prediction</div>
              <div className="grid-3">
                {analytics.prediction.completion_scenarios?.map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{s.scenario}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.scenario === 'pessimistic' ? 'var(--danger)' : s.scenario === 'optimistic' ? 'var(--success)' : 'var(--primary)' }}>
                      {s.end_date ? format(new Date(s.end_date), 'MMM d') : '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{Math.round(s.probability * 100)}% probability</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(79,142,247,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                🤖 {analytics.prediction.recommendation}
              </div>
            </div>
          )}

          {analytics.critical_path && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>🔴 Critical Path ({analytics.critical_path.critical_path_ids?.length || 0} tasks)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analytics.critical_path.critical_path_tasks?.map(t => (
                  <span key={t.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {t.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="card">
          <table><thead><tr><th>Member</th><th>Role</th><th>Tasks</th><th>Email</th></tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{m.name?.substring(0, 2).toUpperCase()}</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                    </div>
                  </td>
                  <td><span className="badge badge-medium" style={{ textTransform: 'capitalize' }}>{m.role?.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{tasks.filter(t => t.owner_id === m.id).length} tasks</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          project={project}
          users={users}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); loadProject(id); }}
        />
      )}
    </div>
  );
}
