/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { format, differenceInDays, addDays, startOfMonth } from 'date-fns';

const STATUS_COLORS = {
  todo: '#6366f1', in_progress: '#3b82f6', blocked: '#ef4444',
  review: '#f59e0b', done: '#10b981', cancelled: '#6b7280'
};

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#4f8ef7', low: '#6b7280' };

function GanttBar({ task, startDate, totalDays, onClick, isCritical }) {
  if (!task.start || !task.end) return null;
  const taskStart = new Date(task.start);
  const taskEnd = new Date(task.end);
  const offset = differenceInDays(taskStart, startDate);
  const duration = Math.max(1, differenceInDays(taskEnd, taskStart));
  const left = (offset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  if (left + width < 0 || left > 100) return null;

  const color = isCritical ? '#ef4444' : STATUS_COLORS[task.status] || '#4f8ef7';

  return (
    <div
      className="gantt-bar"
      style={{
        left: `${Math.max(0, left)}%`,
        width: `${Math.min(width, 100 - Math.max(0, left))}%`,
        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
        border: `1px solid ${color}`,
        cursor: 'pointer',
        boxShadow: isCritical ? `0 0 10px ${color}44` : undefined
      }}
      onClick={() => onClick(task)}
      title={`${task.title} (${format(taskStart, 'MMM d')} - ${format(taskEnd, 'MMM d')})`}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </div>
      {task.progress > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: `${task.progress}%`, background: 'rgba(255,255,255,0.5)', borderRadius: '0 0 4px 4px' }} />
      )}
    </div>
  );
}

export default function GanttPage() {
  const { id } = useParams();
  const { loadProject, loadAnalytics, currentProject, projectAnalytics } = useStore();
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState('month'); // week, month, quarter
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  useEffect(() => {
    Promise.all([loadProject(id), loadAnalytics(id)]).finally(() => setLoading(false));
  }, [id]);

  const tasks = currentProject?.tasks || [];
  const criticalIds = projectAnalytics?.critical_path?.critical_path_ids || [];

  const ganttTasks = useMemo(() => {
    return tasks
      .filter(t => (t.due_date || t.start_date) && (!showCriticalOnly || criticalIds.includes(t.id)))
      .map(t => ({
        id: t.id,
        title: t.title,
        start: t.start_date || currentProject?.project?.start_date || t.due_date,
        end: t.due_date,
        status: t.status,
        priority: t.priority,
        progress: t.completion_pct || 0,
        owner_name: t.owner_name,
        isCritical: criticalIds.includes(t.id),
        dependencies: typeof t.dependencies === 'string' ? JSON.parse(t.dependencies || '[]') : (t.dependencies || []),
      }));
  }, [tasks, criticalIds, showCriticalOnly, currentProject?.project?.start_date]);

  const { startDate, endDate, totalDays } = useMemo(() => {
    if (!ganttTasks.length) return { startDate: new Date(), endDate: addDays(new Date(), 90), totalDays: 90 };
    const starts = ganttTasks.map(t => new Date(t.start)).filter(d => !isNaN(d));
    const ends = ganttTasks.map(t => new Date(t.end)).filter(d => !isNaN(d));
    const minDate = starts.length ? new Date(Math.min(...starts)) : new Date();
    const maxDate = ends.length ? new Date(Math.max(...ends)) : addDays(new Date(), 90);
    const start = startOfMonth(minDate);
    const end = addDays(maxDate, 7);
    return { startDate: start, endDate: end, totalDays: Math.max(30, differenceInDays(end, start)) };
  }, [ganttTasks]);

  const months = useMemo(() => {
    const result = [];
    let cur = startDate;
    while (cur <= endDate) {
      const offset = (differenceInDays(cur, startDate) / totalDays) * 100;
      result.push({ date: cur, offset, label: format(cur, 'MMM yyyy'), daysInMonth: new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return result;
  }, [startDate, endDate, totalDays]);

  const todayOffset = (differenceInDays(new Date(), startDate) / totalDays) * 100;

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gantt Chart</h1>
          <p>{currentProject?.project?.name} · {ganttTasks.length} tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={`btn btn-sm ${showCriticalOnly ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setShowCriticalOnly(v => !v)}>
            🔴 Critical Only
          </button>
          {['month', 'quarter'].map(z => (
            <button key={z} className={`btn btn-sm ${zoom === z ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setZoom(z)} style={{ textTransform: 'capitalize' }}>
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
              {s.replace('_', ' ')}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)' }} />
            Critical Path
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 250, minWidth: 250, borderRight: '1px solid var(--border)', padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Task
              </div>
              <div style={{ flex: 1, position: 'relative', height: 36 }}>
                {months.map((m, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${m.offset}%`,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    borderLeft: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {m.label}
                  </div>
                ))}
                {todayOffset >= 0 && todayOffset <= 100 && (
                  <div style={{ position: 'absolute', left: `${todayOffset}%`, top: 0, bottom: 0, width: 2, background: 'var(--primary)', opacity: 0.8 }} />
                )}
              </div>
            </div>

            {ganttTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">No tasks with dates</div>
                <div className="empty-state-desc">Assign start/end dates to tasks to see them on the Gantt chart</div>
              </div>
            ) : (
              ganttTasks.map(task => (
                <div key={task.id} className="gantt-task-row" style={{ borderLeft: task.isCritical ? '3px solid var(--danger)' : undefined }}>
                  <div className="gantt-task-label" style={{ width: 250, minWidth: 250, borderRight: '1px solid var(--border)' }} title={task.title}>
                    <div style={{ fontWeight: task.isCritical ? 700 : 500, color: task.isCritical ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                      {task.isCritical ? '🔴 ' : ''}{task.title}
                    </div>
                    {task.owner_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.owner_name}</div>}
                  </div>
                  <div className="gantt-timeline" style={{ position: 'relative' }}>
                    {todayOffset >= 0 && todayOffset <= 100 && (
                      <div style={{ position: 'absolute', left: `${todayOffset}%`, top: 0, bottom: 0, width: 1, background: 'rgba(79,142,247,0.4)', zIndex: 1 }} />
                    )}
                    <GanttBar task={task} startDate={startDate} totalDays={totalDays} onClick={setSelectedTask} isCritical={task.isCritical} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selectedTask.title}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Status', <span className={`badge badge-${selectedTask.status}`}>{selectedTask.status?.replace('_', ' ')}</span>],
                ['Priority', <span className={`badge badge-${selectedTask.priority}`}>{selectedTask.priority}</span>],
                ['Owner', selectedTask.owner_name || 'Unassigned'],
                ['Start', selectedTask.start ? format(new Date(selectedTask.start), 'MMM d, yyyy') : '—'],
                ['End', selectedTask.end ? format(new Date(selectedTask.end), 'MMM d, yyyy') : '—'],
                ['Progress', `${selectedTask.progress}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              {selectedTask.isCritical && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>
                  🔴 This task is on the Critical Path. Any delay will impact the project end date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
