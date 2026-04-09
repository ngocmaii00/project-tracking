/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import useStore from '../store/useStore';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#6366f1' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  { id: 'review', label: 'Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#10b981' },
];

function KanbanCard({ task, users, onDragStart, onClick }) {
  const owner = users?.find(u => u.id === task.owner_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div
      className={`kanban-task-card${task.is_critical_path ? ' critical-path' : ''}`}
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onClick(task)}
      style={{ borderLeft: task.is_critical_path ? '3px solid var(--danger)' : undefined }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span className={`badge badge-${task.priority}`} style={{ fontSize: 10 }}>{task.priority}</span>
        {task.source === 'ai_extract' && <span style={{ fontSize: 10, color: 'var(--primary)', background: 'rgba(79,142,247,0.1)', padding: '1px 6px', borderRadius: 10 }}>🤖 AI</span>}
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>

      {task.description && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </div>
      )}

      {task.completion_pct > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div className="progress-bar" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${task.completion_pct}%` }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {owner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: 9 }}>{owner.name?.substring(0, 2).toUpperCase()}</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{owner.name?.split(' ')[0]}</span>
          </div>
        ) : <div />}
        {task.due_date && (
          <span style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
            {isOverdue ? '⚠ ' : ''}
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.estimated_hours > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.estimated_hours}h</span>}
      </div>
    </div>
  );
}

function TaskDetailModal({ task, users, onClose, onSave }) {
  const [form, setForm] = useState({ ...task });
  const [loading, setLoading] = useState(false);
  const { updateTask } = useStore();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTask(task.id, form);
      onSave();
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title">✏️ {task.title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="textarea" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70 }} />
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
          <div className="form-group">
            <label className="form-label">Completion: {form.completion_pct || 0}%</label>
            <input type="range" min="0" max="100" value={form.completion_pct || 0} onChange={e => setForm(f => ({ ...f, completion_pct: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </div>

          {task.source === 'ai_extract' && (
            <div style={{ background: 'rgba(79,142,247,0.08)', borderRadius: 8, padding: 12, border: '1px solid rgba(79,142,247,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>🤖 AI Extracted</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confidence: {Math.round((task.confidence_score || 0) * 100)}%</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { id } = useParams();
  const { loadProject, currentProject, updateTask, users, loadUsers } = useStore();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadProject(id), loadUsers()]).finally(() => setLoading(false));
  }, [id]);

  const tasks = currentProject?.tasks || [];

  const handleDragStart = (task) => setDragging(task);
  const handleDragOver = (e, colId) => { e.preventDefault(); setDragOver(colId); };
  const handleDrop = async (colId) => {
    if (!dragging || dragging.status === colId) { setDragging(null); setDragOver(null); return; }
    await updateTask(dragging.id, { status: colId });
    setDragging(null);
    setDragOver(null);
  };

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kanban Board</h1>
          <p>{currentProject?.project?.name} · {tasks.length} tasks</p>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className="kanban-column"
              style={{ borderTop: `3px solid ${col.color}`, opacity: dragOver === col.id ? 0.85 : 1 }}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="kanban-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="kanban-column-title">{col.label}</span>
                  <span style={{ background: `${col.color}22`, color: col.color, fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>{colTasks.length}</span>
                </div>
              </div>

              {colTasks.length === 0 && (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Drop tasks here
                </div>
              )}

              {colTasks.map(task => (
                <KanbanCard key={task.id} task={task} users={users} onDragStart={handleDragStart} onClick={setSelectedTask} />
              ))}
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSave={() => { loadProject(id); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
