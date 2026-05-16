/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { X } from "lucide-react";
import useStore from "../store/useStore";
import dayjs from "dayjs";
import { getAvatar } from "../lib/api";

const COLUMNS = [
  { id: "todo", label: "To Do", color: "#6366f1" },
  { id: "in_progress", label: "In Progress", color: "#3b82f6" },
  { id: "blocked", label: "Blocked", color: "#ef4444" },
  { id: "review", label: "Review", color: "#f59e0b" },
  { id: "done", label: "Done", color: "#10b981" },
];

function KanbanCard({ task, users, currentUser, onDragStart, onClick }) {
  const owner = users?.find((u) => u.id === task.owner_id);
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  const isManager =
    currentUser?.role === "project_manager" || currentUser?.role === "admin";
  const canEdit = isManager || task.owner_id === currentUser?.id;

  return (
    <div
      className={`kanban-task-card${task.is_critical_path ? " critical-path" : ""}`}
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) {
          e.preventDefault();
          return;
        }
        onDragStart(task);
      }}
      onClick={() => onClick(task)}
      style={{
        borderLeft: task.is_critical_path
          ? "3px solid var(--danger)"
          : undefined,
        cursor: canEdit ? "grab" : "pointer",
        opacity: canEdit ? 1 : 0.85,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <span
          className={`badge badge-${task.priority}`}
          style={{ fontSize: 10 }}
        >
          {task.priority}
        </span>
        {task.source === "ai_extract" && (
          <span
            style={{
              fontSize: 10,
              color: "var(--primary)",
              background: "rgba(79,142,247,0.1)",
              padding: "1px 6px",
              borderRadius: 10,
            }}
          >
            🤖 AI
          </span>
        )}
      </div>

      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: "var(--text-primary)",
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {task.title}
      </div>

      {task.description && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 10,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </div>
      )}

      {task.completion_pct > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div className="progress-bar" style={{ height: 4 }}>
            <div
              className="progress-fill"
              style={{ width: `${task.completion_pct}%` }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {owner ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              className="avatar avatar-sm"
              style={{ width: 24, height: 24, fontSize: 9, overflow: "hidden" }}
            >
              {owner.avatar ? (
                <img
                  src={getAvatar(owner.avatar)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
              ) : (
                owner.name?.substring(0, 2).toUpperCase()
              )}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {owner.name?.split(" ")[0]}
            </span>
          </div>
        ) : (
          <div />
        )}
        {task.due_date && (
          <span
            style={{
              fontSize: 11,
              color: isOverdue ? "var(--danger)" : "var(--text-muted)",
              fontWeight: isOverdue ? 700 : 400,
            }}
          >
            {isOverdue ? "⚠ " : ""}
            {new Date(task.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        {task.estimated_hours > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {task.estimated_hours}h
          </span>
        )}
      </div>
    </div>
  );
}

function TaskDetailModal({ task, users, currentUser, onClose, onSave }) {
  const [form, setForm] = useState({ ...task });
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { updateTask, loadTask, currentTask, addTaskComment } = useStore();

  useEffect(() => {
    loadTask(task.id);
  }, [task.id]);

  const isManager =
    currentUser?.role === "project_manager" || currentUser?.role === "admin";
  const canEdit = isManager || task.owner_id === currentUser?.id;

  const handle = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    try {
      await updateTask(task.id, form);
      onSave();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addTaskComment(task.id, commentText);
      setCommentText("");
    } catch {
      console.log("Error adding comment");
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal modal-xl"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "90vh",
          padding: 0,
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              className={`badge badge-${task.priority}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              {task.priority}
            </span>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {task.is_milestone ? "Milestone: " : "Task: "}
              {task.id.slice(0, 8)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {canEdit && (
              <button
                onClick={handle}
                className="btn btn-primary btn-sm"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Layout Split */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Main Content (Left) */}
          <div
            style={{
              flex: 3,
              padding: "24px 32px",
              overflowY: "auto",
              borderRight: "1px solid var(--border)",
            }}
          >
            <form id="task-form" onSubmit={handle}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <input
                  className="input"
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    padding: "12px 0",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                  }}
                  value={form.title}
                  placeholder="Task title"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 32 }}>
                <label
                  className="form-label"
                  style={{ marginBottom: 12, fontSize: 14 }}
                >
                  Description
                </label>
                <textarea
                  className="textarea"
                  value={form.description || ""}
                  placeholder="Add a detailed description..."
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  style={{
                    minHeight: 120,
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                  }}
                  disabled={!canEdit}
                />
              </div>
            </form>

            <div style={{ marginTop: 40 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Activity & Comments
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {currentTask?.comments?.length > 0 ? (
                  currentTask.comments.map((comment) => (
                    <div key={comment.id} style={{ display: "flex", gap: 12 }}>
                      <div
                        className="avatar"
                        style={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {comment.author_avatar ? (
                          <img
                            src={getAvatar(comment.author_avatar)}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            alt=""
                          />
                        ) : (
                          comment.author_name?.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {comment.author_name}
                          </span>
                          <span
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            {dayjs(comment.created_at).format(
                              "MMM D, YYYY h:mm A",
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            background: "var(--bg-card)",
                            padding: "10px 14px",
                            borderRadius: "0 12px 12px 12px",
                            fontSize: 14,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    No comments yet.
                  </div>
                )}
              </div>

              <form
                onSubmit={submitComment}
                style={{ display: "flex", gap: 12 }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 12,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {currentUser?.avatar ? (
                    <img
                      src={getAvatar(currentUser.avatar)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      alt=""
                    />
                  ) : (
                    currentUser?.name?.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    className="input"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{ paddingRight: 80 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      bottom: 4,
                    }}
                    disabled={!commentText.trim()}
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div
            style={{
              flex: 1,
              minWidth: 300,
              padding: 24,
              overflowY: "auto",
              background: "var(--bg-card)",
              borderTopRightRadius: "var(--radius-xl)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  disabled={!canEdit}
                >
                  {[
                    "todo",
                    "in_progress",
                    "blocked",
                    "review",
                    "done",
                    "cancelled",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {(
                        s.substring(0, 1).toUpperCase() + s.substring(1)
                      ).replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  disabled={!canEdit}
                >
                  {["critical", "high", "medium", "low"].map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select
                  className="select"
                  value={form.owner_id || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, owner_id: e.target.value || null }))
                  }
                  disabled={!canEdit}
                >
                  <option value="">Unassigned</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  className="input"
                  type="date"
                  value={dayjs(form.due_date).format("YYYY-MM-DD") || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <label className="form-label">Completion</label>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    {form.completion_pct || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.completion_pct || 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      completion_pct: parseInt(e.target.value),
                    }))
                  }
                  style={{
                    width: "100%",
                    accentColor: "var(--primary)",
                    height: 6,
                  }}
                  disabled={!canEdit}
                />
              </div>

              {task.source === "ai_extract" && (
                <div
                  style={{
                    background: "rgba(79,142,247,0.08)",
                    borderRadius: 8,
                    padding: 16,
                    border: "1px solid rgba(79,142,247,0.2)",
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--primary)",
                      marginBottom: 8,
                    }}
                  >
                    🤖 Imported
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Confidence: {Math.round((task.confidence_score || 0) * 100)}
                    %
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { id } = useParams();
  const { loadProject, currentProject, updateTask, users, loadUsers, user } =
    useStore();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadProject(id), loadUsers()]).finally(() =>
      setLoading(false),
    );
  }, [id]);

  const tasks = currentProject?.tasks || [];

  const handleDragStart = (task) => setDragging(task);
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOver(colId);
  };
  const handleDrop = async (colId) => {
    if (!dragging || dragging.status === colId) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    await updateTask(dragging.id, { status: colId });
    setDragging(null);
    setDragOver(null);
  };

  if (loading)
    return (
      <div className="empty-state">
        <div className="ai-thinking">
          <div className="ai-dot" />
          <div className="ai-dot" />
          <div className="ai-dot" />
        </div>
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kanban Board</h1>
          <p>
            {currentProject?.project?.name} · {tasks.length} tasks
          </p>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="kanban-column"
              style={{
                borderTop: `3px solid ${col.color}`,
                opacity: dragOver === col.id ? 0.85 : 1,
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="kanban-column-title">{col.label}</span>
                  <span
                    style={{
                      background: `${col.color}22`,
                      color: col.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 10,
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {colTasks.length === 0 && (
                <div
                  style={{
                    border: "2px dashed var(--border)",
                    borderRadius: 8,
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  Drop tasks here
                </div>
              )}

              {colTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  users={users}
                  currentUser={user}
                  onDragStart={handleDragStart}
                  onClick={setSelectedTask}
                />
              ))}
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUser={user}
          onClose={() => setSelectedTask(null)}
          onSave={() => {
            loadProject(id);
          }}
        />
      )}
    </div>
  );
}
