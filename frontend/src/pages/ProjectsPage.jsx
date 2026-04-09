/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderKanban, MoreVertical, Calendar, Users, TrendingUp, X } from 'lucide-react';
import useStore from '../store/useStore';
import { format } from 'date-fns';

function ProjectCard({ project }) {
  const pct = project.total_tasks ? Math.round((project.done_tasks / project.total_tasks) * 100) : 0;
  const risk = project.risk_score || 0;
  const statusColors = { planning: '#6366f1', active: '#10b981', on_hold: '#f59e0b', completed: '#3b82f6', cancelled: '#6b7280' };

  return (
    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer', height: '100%' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${statusColors[project.status] || '#4f8ef7'}, #7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            📊
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge badge-${project.status}`} style={{ textTransform: 'capitalize' }}>{project.status?.replace('_', ' ')}</span>
          </div>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{project.name}</h3>
        {project.description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderKanban size={12} /> {project.total_tasks || 0} tasks
          </span>
          {project.end_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {format(new Date(project.end_date), 'MMM d, yyyy')}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> {project.owner_name || 'Unassigned'}
          </span>
        </div>

        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-fill" style={{
            width: `${pct}%`,
            background: risk > 60 ? 'linear-gradient(90deg, var(--danger), #f87171)' : risk > 30 ? 'linear-gradient(90deg, var(--warning), #fde68a)' : undefined
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{pct}% complete</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {project.blocked_tasks > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {project.blocked_tasks} blocked</span>}
            <span className={`risk-score ${risk > 60 ? 'risk-high' : risk > 30 ? 'risk-medium' : 'risk-low'}`} style={{ fontSize: 11, padding: '2px 6px' }}>
              Risk {Math.round(risk)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', status: 'planning' });
  const [loading, setLoading] = useState(false);
  const { createProject, user } = useStore();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await createProject({ ...form, owner_id: user.id });
      onCreated(p);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title">✨ New Project</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="input" placeholder="e.g. Platform v2.0" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="textarea" placeholder="What is this project about?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 80 }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '✨ Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, loadProjects, user } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects().finally(() => setLoading(false));
  }, []);

  const canCreate = ['project_manager', 'admin'].includes(user?.role);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Projects</h1>
          <p>{projects.length} projects · {projects.filter(p => p.status === 'active').length} active</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        {['all', 'planning', 'active', 'on_hold', 'completed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">No projects found</div>
          <div className="empty-state-desc">Try adjusting your search or create a new project</div>
          {canCreate && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Project</button>}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadProjects(); }} />}
    </div>
  );
}
