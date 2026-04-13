/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Send,
  Search,
  Settings,
  Bell,
  Plus,
  MoreVertical,
  Smile,
  Paperclip,
  ChevronDown,
  Users,
  AtSign,
  Bot,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  MessageSquare,
  ChevronRight,
  Mic,
  Video,
  PhoneCall,
  Pin,
  Reply,
  Copy,
  Circle,
  UserPlus,
  Shield,
  File,
  Download,
  Volume2,
  Lock,
  LogOut,
  User,
  Palette,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useStore from "../store/useStore";
import api from "../lib/api";
import toast from "react-hot-toast";

const getAvatar = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:3001";
  return `${baseUrl}${url}`;
};

const EMOJI_LIST = [
  "👍",
  "❤️",
  "😂",
  "🚀",
  "✅",
  "🔥",
  "👏",
  "💯",
  "🎉",
  "⚡",
  "💡",
  "✨",
  "💻",
  "🤔",
  "🙌",
  "👀",
];

function SettingsModal({ user, onClose }) {
  return (
    <div className="cwb-modal-overlay" onClick={onClose}>
      <div className="cwb-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="cwb-modal-header">
          <h3>Cài đặt tài khoản</h3>
          <button className="c-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="cwb-modal-body">
          <div className="settings-user-section">
            <div
              className="cwb-user-av"
              style={{
                width: 64,
                height: 64,
                fontSize: 24,
                overflow: "hidden",
                background: `hsl(${user.name.charCodeAt(0) * 40}, 50%, 50%)`,
              }}
            >
              {user.avatar ? (
                <img
                  src={getAvatar(user.avatar)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
              ) : (
                user.name[0]
              )}
            </div>
            <div style={{ marginLeft: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
              <div style={{ color: "#64748b" }}>{user.email}</div>
            </div>
          </div>
          <div className="settings-list">
            <div className="settings-item">
              <User size={16} /> <span>Hồ sơ cá nhân</span>
            </div>
            <div className="settings-item">
              <Lock size={16} /> <span>Bảo mật & Mật khẩu</span>
            </div>
            <div className="settings-item">
              <Bell size={16} /> <span>Thông báo</span>
            </div>
            <div className="settings-item">
              <Palette size={16} /> <span>Giao diện & Chủ đề</span>
            </div>
            <div
              className="settings-item danger"
              onClick={() => (window.location.href = "/login")}
            >
              <LogOut size={16} /> <span>Đăng xuất</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallModal({ activeConversation, type, status, seconds, onClose }) {
  return (
    <div className="cwb-call-overlay">
      <div className="cwb-call-content">
        <div className="call-avatar-pulse">
          <div
            className="call-avatar"
            style={{
              background: activeConversation.name
                ? `hsl(${activeConversation.name.charCodeAt(0) * 40}, 60%, 40%)`
                : "#6366f1",
            }}
          >
            {type === "video" ? (
              <Video size={40} />
            ) : (
              activeConversation.name?.[0] || <PhoneCall size={40} />
            )}
          </div>
        </div>
        <h2 style={{ color: "white", marginTop: 20 }}>
          {activeConversation.name || "Người dùng CWB"}
        </h2>
        <p style={{ color: "#94a3b8" }}>
          {status === "active" ? "Đang đàm thoại" : "Đang đổ chuông..."}
        </p>
        {status === "active" && (
          <div
            className="call-timer"
            style={{ fontSize: 24, fontWeight: 700, margin: "10px 0" }}
          >
            {Math.floor(seconds / 60)}:
            {(seconds % 60).toString().padStart(2, "0")}
          </div>
        )}

        <div className="call-actions">
          <button className="call-btn-circle mic">
            <Mic size={20} />
          </button>
          <button className="call-btn-circle video">
            <Video size={20} />
          </button>
          <button className="call-btn-circle end" onClick={onClose}>
            <LogOut size={20} style={{ transform: "rotate(135deg)" }} />
          </button>
          <button className="call-btn-circle speaker">
            <Volume2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/friends/search?q=${userId}`);
        const found = data.find((u) => u.id === userId);
        setProfile(found);
      } catch (err) {
        console.error("Profile fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) return null;
  if (!profile) return null;

  return (
    <div className="cwb-modal-overlay" onClick={onClose}>
      <div
        className="cwb-modal-content profile"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="profile-banner"
          style={{
            background: `hsl(${profile.name.charCodeAt(0) * 40}, 60%, 40%)`,
          }}
        />
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <div
              className="profile-avatar"
              style={{
                background: `hsl(${profile.name.charCodeAt(0) * 40}, 60%, 40%)`,
              }}
            >
              {profile.avatar ? (
                <img src={getAvatar(profile.avatar)} alt="" />
              ) : (
                profile.name[0]
              )}
            </div>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{profile.name}</h2>
            <p className="profile-email">{profile.email}</p>
            <div className="profile-badges">
              <span className="profile-badge">Member</span>
              <span className="profile-badge online">Online</span>
            </div>

            <div className="profile-actions">
              <button className="profile-btn primary" onClick={onClose}>
                Nhắn tin
              </button>
              <button className="profile-btn ghost" onClick={onClose}>
                Hồ sơ đầy đủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="cwb-emoji-picker-wrap" onClick={onClose}>
      <div className="cwb-emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-grid">
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              className="emoji-item"
              onClick={() => {
                onSelect(e);
                onClose();
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InviteModal({
  conversationId,
  existingMemberIds,
  onClose,
  onInviteSuccess,
}) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/friends");
        const available = (data || []).filter(
          (f) => !existingMemberIds.includes(f.id),
        );
        setFriends(available);
      } catch (err) {
        toast.error("Không thể tải danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [conversationId, existingMemberIds]);

  const handleInvite = async () => {
    if (selectedIds.length === 0) return;
    try {
      setInviting(true);
      await api.post(`/chat/conversations/${conversationId}/members`, {
        memberIds: selectedIds,
      });
      toast.success("Đã gửi lời mời!");
      onInviteSuccess();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi mời bạn bè");
    } finally {
      setInviting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="cwb-modal-overlay" onClick={onClose}>
      <div
        className="cwb-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400 }}
      >
        <div className="cwb-modal-header">
          <h3>Mời bạn bè vào nhóm</h3>
          <button className="c-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="cwb-modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div className="ai-thinking">
                <div className="ai-dot" />
                <div className="ai-dot" />
                <div className="ai-dot" />
              </div>
            </div>
          ) : friends.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "#64748b",
              }}
            >
              Tất cả bạn bè đã có mặt trong cuộc trò chuyện này.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 300,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className={`search-result-item ${selectedIds.includes(friend.id) ? "selected" : ""}`}
                  onClick={() => toggleSelect(friend.id)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 10,
                    background: selectedIds.includes(friend.id)
                      ? "rgba(99,102,241,0.1)"
                      : "transparent",
                    border: selectedIds.includes(friend.id)
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="cwb-user-av"
                    style={{
                      background: `hsl(${friend.name.charCodeAt(0) * 40}, 60%, 40%)`,
                    }}
                  >
                    {friend.avatar ? (
                      <img
                        src={getAvatar(friend.avatar)}
                        width={40}
                        height={40}
                        className="add-friend-avatar"
                        style={{ objectFit: "cover", borderRadius: "inherit" }}
                      />
                    ) : (
                      friend.name[0]
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: "white" }}
                    >
                      {friend.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {friend.email}
                    </div>
                  </div>
                  <div
                    className={`checkbox-custom ${selectedIds.includes(friend.id) ? "checked" : ""}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="cwb-modal-footer"
          style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}
        >
          <button
            className="profile-btn ghost"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          <button
            className="profile-btn primary"
            onClick={handleInvite}
            disabled={selectedIds.length === 0 || inviting}
            style={{ flex: 2 }}
          >
            {inviting ? "Đang gửi..." : `Mời ${selectedIds.length} người bạn`}
          </button>
        </div>
      </div>
      <style>{`
        .checkbox-custom {
          width: 18px; height: 18px; border: 2px solid #334155; border-radius: 4px; transition: 0.2s;
        }
        .checkbox-custom.checked {
          background: #6366f1; border-color: #6366f1; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
          background-size: 80%; background-repeat: no-repeat; background-position: center;
        }
      `}</style>
    </div>
  );
}

function AIDeadlinePanel({ userId, onClose }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/tasks?owner_id=${userId}&status=in_progress,todo,blocked`,
        );
        const tasks = data.tasks || [];
        const now = new Date();

        const categorized = tasks
          .filter((t) => t.due_date)
          .map((t) => {
            const due = new Date(t.due_date);
            const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
            return { ...t, diffDays, due };
          })
          .sort((a, b) => a.diffDays - b.diffDays)
          .slice(0, 8);

        setReminders(categorized);
      } catch (err) {
        console.error("Deadline fetch error", err);
        setReminders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReminders();
  }, [userId]);

  const getUrgencyColor = (days) => {
    if (days < 0)
      return {
        color: "#ef4444",
        bg: "rgba(239,68,68,0.1)",
        label: "Quá hạn",
        icon: AlertTriangle,
      };
    if (days <= 2)
      return {
        color: "#ef4444",
        bg: "rgba(239,68,68,0.08)",
        label: `Còn ${days} ngày`,
        icon: AlertTriangle,
      };
    if (days <= 7)
      return {
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.08)",
        label: `Còn ${days} ngày`,
        icon: Clock,
      };
    return {
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      label: `Còn ${days} ngày`,
      icon: CheckCircle,
    };
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="ai-avatar-glow">
            <Bot size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
              CWB AI Assistant
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Deadline Tracker
            </div>
          </div>
        </div>
        <button className="c-icon-btn" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="ai-panel-body">
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="ai-thinking">
              <div className="ai-dot" />
              <div className="ai-dot" />
              <div className="ai-dot" />
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
              Đang phân tích deadline...
            </div>
          </div>
        ) : reminders.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}
          >
            <CheckCircle
              size={32}
              style={{
                margin: "0 auto 12px",
                display: "block",
                color: "#10b981",
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
              Tuyệt vời!
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Không có deadline nào sắp tới.
            </div>
          </div>
        ) : (
          <>
            <div className="ai-insight-box">
              <Zap size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>
                Bạn có{" "}
                <b style={{ color: "#f59e0b" }}>
                  {reminders.filter((r) => r.diffDays <= 7).length} task
                </b>{" "}
                sắp đến hạn trong 7 ngày tới.
                {reminders.filter((r) => r.diffDays < 0).length > 0 && (
                  <>
                    {" "}
                    <b style={{ color: "#ef4444" }}>
                      {reminders.filter((r) => r.diffDays < 0).length} task quá
                      hạn!
                    </b>
                  </>
                )}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reminders.map((task) => {
                const urgency = getUrgencyColor(task.diffDays);
                const IconComp = urgency.icon;
                return (
                  <div
                    key={task.id}
                    className="deadline-card"
                    style={{
                      background: urgency.bg,
                      borderColor: `${urgency.color}30`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <IconComp
                        size={14}
                        style={{
                          color: urgency.color,
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#e2e8f0",
                            lineHeight: 1.3,
                          }}
                        >
                          {task.title}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: urgency.color,
                              fontWeight: 700,
                            }}
                          >
                            {urgency.label}
                          </span>
                          <span style={{ fontSize: 10, color: "#475569" }}>
                            •
                          </span>
                          <span style={{ fontSize: 10, color: "#64748b" }}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "3px 6px",
                          borderRadius: 4,
                          background:
                            task.status === "in_progress"
                              ? "rgba(59,130,246,0.15)"
                              : "rgba(99,102,241,0.15)",
                          color:
                            task.status === "in_progress"
                              ? "#60a5fa"
                              : "#818cf8",
                        }}
                      >
                        {task.status?.replace("_", " ").toUpperCase()}
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        {new Date(task.due_date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        {task.completion_pct || 0}% hoàn thành
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        height: 3,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${task.completion_pct || 0}%`,
                          background: urgency.color,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageItem({
  msg,
  isMe,
  hideHeader,
  onReact,
  onReply,
  onTogglePin,
  onOpenProfile,
  user,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  return (
    <div
      className={`chat-msg-item ${isMe ? "is-me" : ""} ${hideHeader ? "compact" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmoji(false);
      }}
    >
      {!hideHeader && (
        <div
          className="msg-avatar-wrap"
          onClick={() => onOpenProfile(msg.author_id || msg.authorId)}
        >
          <div
            className="msg-avatar-v2"
            style={{
              cursor: "pointer",
              background: msg.isAI
                ? "linear-gradient(135deg, #0ea5e9, #6366f1)"
                : `hsl(${(msg.author_name || msg.authorName || "X").charCodeAt(0) * 45}, 60%, 40%)`,
            }}
          >
            {msg.isAI ? (
              <Bot size={14} />
            ) : msg.author_avatar || msg.authorAvatar ? (
              <img
                src={getAvatar(msg.author_avatar || msg.authorAvatar)}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "inherit",
                  objectFit: "cover",
                }}
              />
            ) : (
              msg.author_name?.[0] || msg.authorName?.[0] || "?"
            )}
          </div>
        </div>
      )}

      <div
        className="msg-body-v2"
        style={{ marginLeft: hideHeader && !isMe ? 40 : 0 }}
      >
        {!hideHeader && !isMe && (
          <div className="msg-header-v2">
            <span
              className="msg-author-v2"
              style={{ cursor: "pointer" }}
              onClick={() => onOpenProfile(msg.author_id || msg.authorId)}
            >
              {msg.author_name || msg.authorName}
            </span>
            {msg.isAI && <span className="ai-badge-pill">AI</span>}
            <span className="msg-time-v2">
              {new Date(
                msg.created_at || msg.createdAt || Date.now(),
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
        <div
          className={`msg-bubble-v2 ${msg.isAI ? "ai-bubble" : ""}`}
          style={{ borderLeft: msg.is_pinned ? "3px solid #f59e0b" : "" }}
        >
          {msg.is_pinned && (
            <div
              style={{
                fontSize: 9,
                color: "#f59e0b",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 700,
              }}
            >
              <Pin size={10} /> ĐÃ GHIM
            </div>
          )}
          {msg.replyTo && (
            <div className="reply-preview">
              <div
                style={{
                  width: 3,
                  background: "#6366f1",
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <div>
                <span
                  style={{ fontSize: 10, color: "#6366f1", fontWeight: 700 }}
                >
                  ↩ {msg.replyTo.author}
                </span>
                <p
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  {msg.replyTo.content}
                </p>
              </div>
            </div>
          )}
          {msg.msgType === "file" ? (
            <div className="file-attachment">
              <div className="file-icon">
                <File size={20} />
              </div>
              <div className="file-info">
                <div className="file-name">{msg.content}</div>
                <div className="file-meta">Tài liệu đính kèm</div>
              </div>
              <a
                href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"}/..${msg.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="file-download"
              >
                <Download size={16} />
              </a>
            </div>
          ) : (
            <span
              className="msg-text-v2"
              dangerouslySetInnerHTML={{
                __html: (msg.content || "").replace(/\n/g, "<br/>"),
              }}
            />
          )}
        </div>
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="msg-reactions">
            {Object.entries(
              msg.reactions.reduce(
                (acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }),
                {},
              ),
            ).map(([emoji, count]) => (
              <button key={emoji} className="reaction-pill">
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {showActions && (
        <div className="msg-actions">
          <button
            className="action-pill"
            onClick={() => setShowEmoji(true)}
            title="React"
          >
            <Smile size={13} />
          </button>
          <button
            className="action-pill"
            onClick={() => onReply(msg)}
            title="Reply"
          >
            <Reply size={13} />
          </button>
          <button
            className="action-pill"
            onClick={() => onTogglePin(msg.id, msg.is_pinned)}
            title={msg.is_pinned ? "Bỏ ghim" : "Ghim"}
            style={{ color: msg.is_pinned ? "#f59e0b" : "" }}
          >
            <Pin size={13} />
          </button>
          <button
            className="action-pill"
            onClick={() => {
              navigator.clipboard.writeText(msg.content);
              toast.success("Đã sao chép!");
            }}
            title="Copy"
          >
            <Copy size={13} />
          </button>
          <button
            className="action-pill"
            onClick={() => toast("Tính năng mở rộng", { icon: "⚙️" })}
            title="More"
          >
            <MoreVertical size={13} />
          </button>
          {showEmoji && (
            <div className="emoji-quick-picker">
              {EMOJI_LIST.map((e) => (
                <button
                  key={e}
                  className="emoji-quick-btn"
                  onClick={() => {
                    onReact(msg.id, e);
                    setShowEmoji(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IncomingCallModal({ call, onAnswer, onReject }) {
  return (
    <div className="cwb-call-overlay">
      <div className="cwb-call-content">
        <div className="call-avatar-pulse">
          <div className="call-avatar" style={{ background: "#6366f1" }}>
            {call.senderName[0]}
          </div>
        </div>
        <h2 style={{ color: "white", marginTop: 20 }}>{call.senderName}</h2>
        <p style={{ color: "#94a3b8" }}>
          Đang gọi {call.type === "video" ? "video..." : "thoại..."}
        </p>
        <div className="call-actions">
          <button
            className="call-btn-circle accept"
            onClick={() => onAnswer("accepted")}
            style={{ background: "#10b981" }}
          >
            {call.type === "video" ? (
              <Video size={20} />
            ) : (
              <PhoneCall size={20} />
            )}
          </button>
          <button
            className="call-btn-circle end"
            onClick={() => onReject("rejected")}
            style={{ background: "#ef4444" }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  title,
  description,
  value: initialValue = "",
  placeholder,
  confirmText,
  danger,
  onClose,
  onSubmit,
}) {
  const [val, setVal] = useState(initialValue);
  const isConfirmOnly = initialValue === undefined && placeholder === undefined;

  return (
    <div className="cwb-modal-overlay">
      <motion.div
        className="cwb-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="cwb-modal-header">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button className="c-icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="cwb-modal-body">
          {description && (
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}

          {!isConfirmOnly && (
            <input
              autoFocus
              className="cwb-input-v2"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                color: "white",
                fontSize: 14,
                marginBottom: 24,
                outline: "none",
              }}
            />
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="profile-btn ghost"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Hủy
            </button>
            <button
              className={`profile-btn primary ${danger ? "danger" : ""}`}
              onClick={() => onSubmit(val)}
              style={{
                flex: 1,
                background: danger ? "#ef4444" : "#6366f1",
              }}
            >
              {confirmText || "Xác nhận"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  // Feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [activeCall, setActiveCall] = useState(null); // { type: 'voice'|'video' }
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [viewConversationId, setViewConversationId] = useState(null);
  const [viewMessages, setViewMessages] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null); // { senderId, senderName, type }
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (activeCall?.status === "active") {
      interval = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const currentWsUserIdRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const isUploadingRef = useRef(isUploading);
  useEffect(() => {
    isUploadingRef.current = isUploading;
  }, [isUploading]);

  const [promptModal, setPromptModal] = useState(null); // { title, description, value, onSubmit, placeholder, danger, confirmText }

  const activeConvIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const initWebSocket = useCallback(
    function initWS() {
      if (!user?.id) return;

      if (wsRef.current && currentWsUserIdRef.current !== user.id) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001/ws";
      const ws = new WebSocket(`${WS_URL}?userId=${user.id}`);
      currentWsUserIdRef.current = user.id;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "chat_message") {
            if (
              msg.conversationId ===
              (viewConversationId || activeConvIdRef.current)
            ) {
              setViewMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
            setConversations((prev) => {
              const index = prev.findIndex((c) => c.id === msg.conversationId);
              if (index === -1) {
                setTimeout(loadInitialData, 500);
                return prev;
              }
              const conv = prev[index];
              const updated = {
                ...conv,
                last_message:
                  msg.msgType === "file" ? `📄 ${msg.content}` : msg.content,
                last_message_at: msg.createdAt || new Date().toISOString(),
                unread_count:
                  msg.conversationId !== activeConvIdRef.current &&
                  msg.authorId !== user.id
                    ? (conv.unread_count || 0) + 1
                    : 0,
              };
              const others = prev.filter((c) => c.id !== msg.conversationId);
              return [updated, ...others];
            });
          } else if (msg.type === "typing") {
            setTypingUsers((prev) => {
              if (msg.userId === user.id) return prev;
              const filtered = prev.filter((u) => u.id !== msg.userId);
              if (msg.isTyping)
                return [
                  ...filtered,
                  {
                    id: msg.userId,
                    name: msg.userName,
                    conversationId: msg.conversationId,
                  },
                ];
              return filtered;
            });
          } else if (msg.type === "pin_update") {
            setViewMessages((prev) =>
              prev.map((m) =>
                m.id === msg.messageId ? { ...m, is_pinned: msg.isPinned } : m,
              ),
            );
            toast.success(msg.isPinned ? "Đã ghim tin nhắn" : "Đã bỏ ghim");
          } else if (msg.type === "call_event") {
            if (msg.event === "invite") {
              setIncomingCall({
                senderId: msg.senderId,
                senderName: msg.senderName,
                type: msg.callType,
              });
            } else if (msg.event === "accepted") {
              toast.success(`${msg.senderName} đã nhận cuộc gọi`);
              setActiveCall((prev) =>
                prev ? { ...prev, status: "active" } : null,
              );
            } else if (msg.event === "rejected") {
              toast.error(`${msg.senderName} đã từ chối cuộc gọi`);
              setActiveCall(null);
            } else if (msg.event === "hangup") {
              toast("Cuộc gọi đã kết thúc", { icon: "📞" });
              setActiveCall(null);
              setIncomingCall(null);
            }
          } else if (msg.type === "friend_request") {
            loadInitialData(); // Refresh requests list
            toast("Bạn nhận được một lời mời kết bạn mới!", { icon: "👋" });
          } else if (msg.type === "friend_accepted") {
            loadInitialData(); // Refresh friends list
            toast(`${msg.userName} đã chấp nhận kết bạn!`, {
              icon: "✨",
            });
          } else if (msg.type === "notification") {
            toast(msg.content, {
              icon: msg.icon === "user_plus" ? "👤" : "🔔",
            });
          }
        } catch (err) {
          console.error("WS Error", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(() => initWS(), 3000);
      };
      wsRef.current = ws;
    },
    [user.id],
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Send file message via WebSocket
      wsRef.current.send(
        JSON.stringify({
          type: "chat_message",
          conversationId: activeConversationId,
          content: file.name,
          msgType: "file",
          fileUrl: data.url,
          authorName: user.name,
        }),
      );

      setConversations((prev) => {
        const conv = prev.find((c) => c.id === activeConversationId);
        if (!conv) return prev;
        const updated = {
          ...conv,
          last_message: `📄 ${file.name}`,
          last_message_at: new Date().toISOString(),
        };
        return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
      });

      toast.success(`Đã gửi file: ${file.name}`);
    } catch (err) {
      toast.error("Lỗi khi tải file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const togglePin = (messageId, currentPinned) => {
    wsRef.current.send(
      JSON.stringify({
        type: "pin_message",
        messageId,
        isPinned: !currentPinned,
      }),
    );
  };

  const loadInitialData = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      const [convRes, friendsRes, requestsRes] = await Promise.all([
        api.get("/chat/conversations"),
        api.get("/friends"),
        api.get("/friends/pending"),
      ]);
      setConversations(convRes.data || []);
      setFriends(friendsRes.data || []);
      setFriendRequests(requestsRes.data || []);

      // Select first conversation by default if none selected
      if (!activeConversationId && convRes.data?.length > 0) {
        setActiveConversationId(convRes.data[0].id);
      }
    } catch (err) {
      console.error("Load initial data error", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    loadInitialData();
    initWebSocket();
    return () => wsRef.current?.close();
  }, [initWebSocket, loadInitialData]);

  const initiateCall = (type) => {
    const otherMember = activeViewConversation.members?.find(
      (m) => m.id !== user.id,
    );
    if (!otherMember) return toast.error("Không tìm thấy người nhận");

    wsRef.current.send(
      JSON.stringify({
        type: "call_event",
        event: "invite",
        targetId: otherMember.id,
        callType: type,
        senderName: user.name,
      }),
    );
    setActiveCall({ type, status: "calling", targetId: otherMember.id });
  };

  const respondToCall = (action) => {
    if (!incomingCall) return;
    wsRef.current.send(
      JSON.stringify({
        type: "call_event",
        event: action === "accepted" ? "accepted" : "rejected",
        targetId: incomingCall.senderId,
        senderName: user.name,
      }),
    );
    if (action === "accepted") {
      setActiveCall({
        type: incomingCall.type,
        status: "active",
        targetId: incomingCall.senderId,
        incoming: true,
      });
    }
    setIncomingCall(null);
  };

  const hangupCall = () => {
    const targetId = activeCall?.targetId || incomingCall?.senderId;
    if (targetId) {
      wsRef.current.send(
        JSON.stringify({
          type: "call_event",
          event: "hangup",
          targetId: targetId,
          senderName: user.name,
        }),
      );
    }
    setActiveCall(null);
    setIncomingCall(null);
  };

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) return;
      try {
        // Đã kích hoạt loading ở click sidebar để phản ứng tức thì (Không set lại ở đây để tránh nháy)
        const [res] = await Promise.all([
          api.get(`/chat/messages/${activeConversationId}`),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);

        const fetched = Array.isArray(res.data) ? res.data : [];
        setViewMessages(fetched);
        setViewConversationId(activeConversationId);
      } catch (err) {
        console.error("History error", err);
      } finally {
        setMessagesLoading(false);
      }
    };
    loadMessages();

    if (activeConversationId) {
      api
        .post(`/chat/conversations/${activeConversationId}/read`)
        .catch(() => {});
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, unread_count: 0 } : c,
        ),
      );
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const searchUsers = async (query) => {
    setIsSearching(true);
    try {
      const { data } = await api.get(`/friends/search?q=${query || ""}`);
      setSearchResults(data);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      const loading = toast.loading("Đang gửi lời mời...");
      await api.post("/friends/request", { friendId });
      toast.success("Đã gửi lời mời kết bạn!", { id: loading });
      searchUsers(search);
    } catch (err) {
      toast.error("Gửi lời mời thất bại");
      console.error("Request error", err);
    }
  };

  const respondFriendRequest = async (friendId, action) => {
    try {
      await api.post("/friends/respond", { friendId, action });
      toast.success(
        action === "accepted" ? "Đã chấp nhận kết bạn" : "Đã từ chối",
      );
      loadInitialData();
    } catch (err) {
      toast.error("Lỗi khi xử lý");
    }
  };

  const startConversation = async (userId) => {
    try {
      setMessagesLoading(true);
      const { data } = await api.post("/chat/conversations", {
        type: "dm",
        memberIds: [userId],
      });
      setActiveConversationId(data.id);
      loadInitialData();
    } catch (err) {
      console.error("Start conv error", err);
      setMessagesLoading(false);
    }
  };

  const createGroup = async (name, memberIds) => {
    try {
      const { data } = await api.post("/chat/conversations", {
        type: "group",
        name,
        memberIds,
      });
      setActiveConversationId(data.id);
      loadInitialData();
    } catch (err) {
      console.error("Create group error", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConversationId) return;
    setPromptModal({
      title: "Rời khỏi nhóm",
      description:
        "Bạn có chắc chắn muốn rời khỏi nhóm này không? Bạn sẽ không thể xem tin nhắn trừ khi được mời lại.",
      danger: true,
      confirmText: "Rời nhóm",
      onSubmit: async () => {
        try {
          await api.post(`/chat/conversations/${activeConversationId}/leave`);
          toast.success("Đã rời nhóm");
          setActiveConversationId(null);
          loadInitialData();
          setPromptModal(null);
        } catch (err) {
          toast.error("Lỗi khi rời nhóm");
        }
      },
    });
  };

  const handleUpdateGroup = async (name, avatar) => {
    if (!activeConversationId) return;
    try {
      await api.put(`/chat/conversations/${activeConversationId}`, {
        name,
        avatar,
      });
      toast.success("Đã cập nhật nhóm");
      loadInitialData();
      setPromptModal(null);
    } catch (err) {
      toast.error("Lỗi khi cập nhật");
    }
  };

  const sendTypingEvent = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          isTyping: true,
          userName: user.name,
          conversationId: activeConversationId,
        }),
      );
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "typing",
            isTyping: false,
            userName: user.name,
            conversationId: activeConversationId,
          }),
        );
      }
    }, 2000);
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !wsRef.current || !activeConversationId) return;

    const data = {
      type: "chat_message",
      conversationId: activeConversationId,
      projectId: null,
      content: input,
      authorName: user.name,
      msgType: "text",
      ...(replyTo && {
        replyTo: {
          author: replyTo.author_name || replyTo.authorName,
          content: replyTo.content,
        },
      }),
    };

    wsRef.current.send(JSON.stringify(data));
    setInput("");
    setReplyTo(null);
    clearTimeout(typingTimerRef.current);
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === activeConversationId);
      if (!conv) return prev;
      const updated = {
        ...conv,
        last_message: input,
        last_message_at: new Date().toISOString(),
      };
      return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReact = (msgId, emoji) => {
    setViewMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = m.reactions || [];
        const exists = reactions.find(
          (r) => r.emoji === emoji && r.userId === user.id,
        );
        const next = exists
          ? reactions.filter((r) => r !== exists)
          : [...reactions, { emoji, userId: user.id }];
        return { ...m, reactions: next };
      }),
    );
  };

  const activeViewConversation =
    conversations.find(
      (c) => c.id === (viewConversationId || activeConversationId),
    ) || {};
  const filteredMessages = viewMessages;

  return (
    <div className="cwb-chat">
      {/* ── Sidebar ── */}
      <aside className="cwb-sidebar">
        <div className="cwb-ws-header">
          <div className="cwb-ws-name">
            <div className="cwb-ws-dot" />
            <span>CWB Messenger</span>
            <ChevronDown size={13} style={{ color: "#64748b" }} />
          </div>
          <button
            className="cwb-new-btn"
            title="Tạo nhóm"
            onClick={() => {
              setPromptModal({
                title: "Tạo nhóm mới",
                description:
                  "Tên nhóm sẽ giúp mọi người nhận diện cuộc trò chuyện này.",
                placeholder: "Ví dụ: Team Design, Ăn chơi...",
                confirmText: "Tạo nhóm",
                value: "",
                onSubmit: (val) => {
                  if (val) createGroup(val, []);
                  setPromptModal(null);
                },
              });
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="cwb-sidebar-search">
          <Search size={13} />
          <input
            placeholder="Tìm bạn bè hoặc khám phá..."
            value={search}
            onFocus={() => {
              if (!search) searchUsers("");
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              searchUsers(e.target.value);
            }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSearchResults([]);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="search-results-overlay">
            <div className="search-overlay-header">
              <span>{search ? "Kết quả tìm kiếm" : "Gợi ý kết bạn"}</span>
              <button onClick={() => setSearchResults([])}>
                <X size={12} />
              </button>
            </div>
            {searchResults.map((u) => (
              <div key={u.id} className="search-result-item">
                <div
                  className="msg-avatar-v2"
                  style={{
                    background: `hsl(${u.name.charCodeAt(0) * 40}, 60%, 40%)`,
                    width: 36,
                    height: 36,
                  }}
                >
                  {u.avatar ? (
                    <img src={getAvatar(u.avatar)} alt="" />
                  ) : (
                    u.name[0]
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "white" }}
                  >
                    {u.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {u.email}
                  </div>
                </div>
                {u.friendshipStatus === "accepted" ? (
                  <button
                    className="cwb-icon-btn active"
                    title="Nhắn tin"
                    onClick={() => {
                      startConversation(u.id);
                      setSearch("");
                      setSearchResults([]);
                    }}
                  >
                    <MessageSquare size={14} />
                  </button>
                ) : u.friendshipStatus === "pending" ? (
                  <div className="friend-status-label">
                    {u.isRequester ? "Đã gửi" : "Chờ bạn duyệt"}
                  </div>
                ) : (
                  <button
                    className="c-add-friend-btn"
                    onClick={() => sendFriendRequest(u.id)}
                  >
                    <UserPlus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="cwb-sidebar-scroll">
          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="cwb-group">
              <div className="cwb-group-label" style={{ color: "#f59e0b" }}>
                YÊU CẦU KẾT BẠN ({friendRequests.length})
              </div>
              {friendRequests.map((req) => (
                <div key={req.id} className="cwb-ch-btn dm" style={{ gap: 8 }}>
                  <div
                    className="cwb-user-av"
                    style={{ width: 24, height: 24, fontSize: 11 }}
                  >
                    {req.name[0]}
                  </div>
                  <span style={{ flex: 1, fontSize: 12 }}>{req.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="c-icon-btn"
                      style={{ color: "#10b981" }}
                      onClick={() => respondFriendRequest(req.id, "accepted")}
                    >
                      <CheckCircle size={12} />
                    </button>
                    <button
                      className="c-icon-btn"
                      style={{ color: "#ef4444" }}
                      onClick={() => respondFriendRequest(req.id, "rejected")}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends List */}
          <div className="cwb-group">
            <button
              className="cwb-group-label"
              onClick={() => setDmsExpanded((p) => !p)}
            >
              {dmsExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <span>DANH SÁCH BẠN BÈ ({friends.length})</span>
            </button>
            {dmsExpanded &&
              friends.map((friend) => (
                <button
                  key={friend.id}
                  className="cwb-ch-btn dm"
                  onClick={() => startConversation(friend.id)}
                >
                  <div
                    className="cwb-user-av"
                    style={{
                      background: `hsl(${friend.name.charCodeAt(0) * 40}, 60%, 40%)`,
                      width: 24,
                      height: 24,
                      fontSize: 11,
                    }}
                  >
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      friend.name[0]
                    )}
                  </div>
                  <span style={{ flex: 1, fontSize: 12 }}>{friend.name}</span>
                  <div className={`cwb-online-dot online`} />
                </button>
              ))}
          </div>

          {/* Conversations */}
          <div className="cwb-group">
            <button
              className="cwb-group-label"
              onClick={() => setChannelsExpanded((p) => !p)}
            >
              {channelsExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <span>TẤT CẢ CUỘC TRÒ CHUYỆN</span>
            </button>
            {channelsExpanded && (
              <AnimatePresence mode="popLayout" initial={false}>
                {conversations.map((conv) => {
                  const otherMember =
                    conv.type === "dm"
                      ? conv.members?.find((m) => m.id !== user.id)
                      : null;
                  const displayName =
                    conv.type === "dm"
                      ? otherMember?.name || "Unknown"
                      : conv.name || "Group";
                  const avatarColor = `hsl(${(displayName || "X").charCodeAt(0) * 40}, 60%, 40%)`;

                  return (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                        mass: 1,
                      }}
                    >
                      <button
                        className={`cwb-ch-btn ${activeConversationId === conv.id ? "active" : ""}`}
                        onClick={() => {
                          if (activeConversationId !== conv.id) {
                            setMessagesLoading(true);
                            setActiveConversationId(conv.id);
                          }
                        }}
                      >
                        <div
                          className="cwb-user-av"
                          style={{
                            background:
                              conv.type === "group"
                                ? "linear-gradient(135deg, #6366f1, #a855f7)"
                                : avatarColor,
                            width: 32,
                            height: 32,
                            fontSize: 14,
                          }}
                        >
                          {conv.avatar ? (
                            <img
                              src={getAvatar(conv.avatar)}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "inherit",
                                objectFit: "cover",
                              }}
                            />
                          ) : conv.type === "group" ? (
                            <Users size={16} />
                          ) : otherMember?.avatar ? (
                            <img
                              src={getAvatar(otherMember.avatar)}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "inherit",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            displayName[0]
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight:
                                conv.unread_count > 0 ||
                                activeConversationId === conv.id
                                  ? 700
                                  : 500,
                              color:
                                activeConversationId === conv.id
                                  ? "white"
                                  : conv.unread_count > 0
                                    ? "#f8fafc"
                                    : "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {displayName}
                            </span>
                            {conv.type === "group" && (
                              <span style={{ fontSize: 9, opacity: 0.6 }}>
                                ({conv.members?.length})
                              </span>
                            )}
                            {conv.unread_count > 0 && (
                              <div className="cwb-unread-dot" />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: conv.unread_count > 0 ? 600 : 400,
                              color:
                                activeConversationId === conv.id
                                  ? "rgba(255,255,255,0.7)"
                                  : conv.unread_count > 0
                                    ? "#e2e8f0"
                                    : "#64748b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {conv.last_message || "Chưa có tin nhắn"}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="cwb-sidebar-footer">
          <div className="cwb-user-pill">
            <div className="cwb-user-av">
              {user.avatar ? (
                <img
                  src={getAvatar(user.avatar)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "inherit",
                    objectFit: "cover",
                  }}
                />
              ) : (
                user.name[0]
              )}
            </div>
            <div className="cwb-user-info">
              <span className="cwb-user-name">{user.name}</span>
              <span className="cwb-user-role">● Online</span>
            </div>
            <Settings
              size={13}
              className="cwb-settings-icon"
              onClick={() => setShowSettings(true)}
            />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="cwb-main" style={{ position: "relative" }}>
        {/* CHAT AREA LOADING - KHÓA RIÊNG KHU VỰC CHAT ĐỂ TRÁNH NHÁY */}
        <div className={`cwb-chat-lockdown ${messagesLoading ? 'active' : ''}`}>
          <div className="cwb-lock-content">
            <div className="cwb-loading-spinner-premium" />
            <div className="cwb-lock-text">ĐANG KẾT NỐI...</div>
          </div>
        </div>

        {/* Header content starts here */}
        <header className="cwb-header">
          <div className="cwb-header-left">
            <div
              className="cwb-user-av"
              style={{
                background:
                  activeViewConversation.type === "group"
                    ? "linear-gradient(135deg, #6366f1, #a855f7)"
                    : "#334155",
                width: 36,
                height: 36,
              }}
            >
              {activeViewConversation.avatar ? (
                <img
                  src={getAvatar(activeViewConversation.avatar)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "inherit",
                    objectFit: "cover",
                  }}
                />
              ) : activeViewConversation.type === "group" ? (
                <Users size={18} />
              ) : activeViewConversation.members?.find((m) => m.id !== user.id)
                  ?.avatar ? (
                <img
                  src={getAvatar(
                    activeViewConversation.members.find((m) => m.id !== user.id)
                      ?.avatar,
                  )}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "inherit",
                    objectFit: "cover",
                  }}
                />
              ) : (
                activeViewConversation.members?.find((m) => m.id !== user.id)
                  ?.name?.[0] || "C"
              )}
            </div>
            <div>
              <h3 className="cwb-channel-name">
                {activeViewConversation.type === "dm"
                  ? activeViewConversation.members?.find(
                      (m) => m.id !== user.id,
                    )?.name || "Loading..."
                  : activeViewConversation.name ||
                    (activeConversationId
                      ? "Đang chuẩn bị..."
                      : "Chọn cuộc trò chuyện")}
              </h3>
              <p className="cwb-channel-desc">
                {activeViewConversation.type === "dm"
                  ? "Trò chuyện cá nhân"
                  : activeViewConversation.members
                    ? `${activeViewConversation.members.length} thành viên`
                    : "Tải dữ liệu..."}
              </p>
            </div>
          </div>
          <div className="cwb-header-right">
            <button
              className={`cwb-icon-btn ${showAIPanel ? "active" : ""}`}
              onClick={() => setShowAIPanel(!showAIPanel)}
              title="AI Assistant"
            >
              <Bot size={17} />
            </button>
            <button
              className={`cwb-icon-btn ${showMembersPanel ? "active" : ""}`}
              onClick={() => setShowMembersPanel(!showMembersPanel)}
            >
              <Users size={17} />
            </button>
            <button
              className="cwb-icon-btn"
              onClick={() => initiateCall("voice")}
            >
              <PhoneCall size={17} />
            </button>
            <button
              className="cwb-icon-btn"
              onClick={() => initiateCall("video")}
            >
              <Video size={17} />
            </button>
            <button
              className="cwb-icon-btn"
              onClick={() => toast("Tùy chọn đoạn chat", { icon: "💬" })}
            >
              <MoreVertical size={17} />
            </button>
          </div>
        </header>

        <div className="cwb-content-wrap">
          {/* Message list */}
          <div className="cwb-messages" ref={scrollRef}>
            {!viewConversationId && !messagesLoading ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  opacity: 0.5,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <MessageSquare
                    size={48}
                    style={{ margin: "0 auto 16px", color: "#6366f1" }}
                  />
                  <p style={{ fontSize: 13 }}>
                    Hãy chọn một cuộc thảo luận để bắt đầu
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="cwb-welcome">
                  <div
                    className="cwb-welcome-icon"
                    style={{
                      background: `rgba(99,102,241,0.2)`,
                      color: "#6366f1",
                    }}
                  >
                    {activeViewConversation.type === "group" ? (
                      <Users size={28} />
                    ) : (
                      <MessageSquare size={28} />
                    )}
                  </div>
                  <h2 className="cwb-welcome-title">
                    {activeViewConversation.type === "dm"
                      ? `Cuộc trò chuyện với ${activeViewConversation.members?.find((m) => m.id !== user.id)?.name || "..."}`
                      : `Chào mừng đến ${activeViewConversation.name || "nhóm"}!`}
                  </h2>
                  <p className="cwb-welcome-desc">
                    {activeViewConversation.type === "dm"
                      ? "Đây là nơi bắt đầu cuộc trò chuyện riêng tư giữa bạn và người này."
                      : "Gửi tin nhắn đầu tiên để bắt đầu thảo luận với mọi người."}
                  </p>
                </div>

                {filteredMessages.map((m, i) => {
                  const isMe =
                    m.author_id === user.id || m.authorId === user.id;
                  const prev = filteredMessages[i - 1];
                  const hideHeader = false; // Disable grouping to show avatar for every message

                  return (
                    <MessageItem
                      key={m.id || i}
                      msg={m}
                      user={user}
                      isMe={isMe}
                      hideHeader={hideHeader}
                      onReact={handleReact}
                      onReply={setReplyTo}
                      onTogglePin={togglePin}
                      onOpenProfile={(id) => setSelectedProfileId(id)}
                    />
                  );
                })}
              </>
            )}

            {typingUsers.filter(
              (u) => u.conversationId === activeConversationId,
            ).length > 0 && (
              <div className="cwb-typing">
                <div className="cwb-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>
                  {typingUsers
                    .filter((u) => u.conversationId === activeConversationId)
                    .map((u) => u.name)
                    .join(", ")}{" "}
                  đang nhập...
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="cwb-input-zone">
            {replyTo && (
              <div className="cwb-reply-bar">
                <Reply size={13} style={{ color: "#6366f1" }} />
                <div className="cwb-reply-preview">
                  <span className="cwb-reply-author">
                    {replyTo.author_name || replyTo.authorName}
                  </span>
                  <span className="cwb-reply-text">{replyTo.content}</span>
                </div>
                <button
                  className="cwb-icon-btn sm"
                  onClick={() => setReplyTo(null)}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="cwb-input-box">
              <div className="cwb-toolbar">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="cwb-tool"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus size={15} />
                </button>
                <div className="cwb-tool-sep" />
                <button
                  type="button"
                  className="cwb-tool"
                  onClick={() => setInput((p) => p + "@")}
                >
                  <AtSign size={15} />
                </button>
                <button
                  type="button"
                  className="cwb-tool"
                  onClick={() => setShowEmojiPicker(true)}
                >
                  <Smile size={15} />
                </button>
                <button
                  type="button"
                  className="cwb-tool"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={15} />
                </button>
                <button
                  type="button"
                  className="cwb-tool"
                  onClick={() =>
                    toast("Tính năng ghi âm yêu cầu quyền truy cập mic", {
                      icon: "🎙️",
                    })
                  }
                >
                  <Mic size={15} />
                </button>
              </div>

              <form onSubmit={sendMessage} className="cwb-input-form">
                <textarea
                  ref={inputRef}
                  className="cwb-textarea"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    sendTypingEvent();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Nhắn tin cho ${activeViewConversation.type === "dm" ? activeViewConversation.members?.find((m) => m.id !== user.id)?.name : activeViewConversation.name || "..."}`}
                  rows={1}
                />
                <button
                  type="submit"
                  className={`cwb-send-btn ${input.trim() ? "active" : ""}`}
                  disabled={!input.trim()}
                >
                  <Send size={16} />
                </button>
              </form>

              <div className="cwb-input-hint">
                <span>Enter gửi tin · Shift+Enter xuống dòng</span>
                <span className={`cwb-live-dot ${isConnected ? "on" : "off"}`}>
                  <Circle size={7} fill="currentColor" />
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── AI Deadline Panel ── */}
      {showAIPanel && (
        <div className="cwb-right-panel">
          <AIDeadlinePanel
            userId={user.id}
            onClose={() => setShowAIPanel(false)}
          />
        </div>
      )}

      {/* ── Members Panel ── */}
      {showMembersPanel && (
        <div className="cwb-right-panel">
          <div className="ai-panel">
            <div className="ai-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={16} style={{ color: "#6366f1" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                  Thành viên ({activeViewConversation.members?.length || 0})
                </span>
              </div>
              <button
                className="c-icon-btn"
                onClick={() => setShowMembersPanel(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="ai-panel-body">
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: 1,
                }}
              >
                THÀNH VIÊN — {activeViewConversation.members?.length || 0}
              </div>
              {activeViewConversation.members?.map((m) => (
                <div key={m.id} className="member-row">
                  <div
                    className="member-avatar"
                    style={{
                      background: `hsl(${m.name.charCodeAt(0) * 40}, 60%, 40%)`,
                    }}
                  >
                    {m.avatar ? (
                      <img
                        src={getAvatar(m.avatar)}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "inherit",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      m.name[0]
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#e2e8f0",
                      }}
                    >
                      {m.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#10b981" }}>
                      ● Online
                    </div>
                  </div>
                  {m.id === user.id && (
                    <Shield
                      size={12}
                      style={{ color: "#6366f1", marginLeft: "auto" }}
                    />
                  )}
                </div>
              ))}
              <button
                className="cwb-invite-btn"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus size={14} />
                Mời thành viên
              </button>

              {activeViewConversation.type === "group" && (
                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                    }}
                  >
                    Cài đặt nhóm
                  </div>
                  <button
                    className="cwb-panel-btn"
                    onClick={() => {
                      setPromptModal({
                        title: "Đổi tên nhóm",
                        description:
                          "Nhập tên mới cho cuộc trò chuyện nhóm này.",
                        value: activeViewConversation.name,
                        confirmText: "Lưu thay đổi",
                        onSubmit: (val) =>
                          handleUpdateGroup(val, activeViewConversation.avatar),
                      });
                    }}
                  >
                    <Settings size={14} />
                    Đổi tên nhóm
                  </button>
                  <button
                    className="cwb-panel-btn"
                    onClick={() => {
                      setPromptModal({
                        title: "Đổi ảnh nhóm",
                        description: "Nhập địa chỉ URL hình ảnh mới cho nhóm.",
                        value: activeViewConversation.avatar || "",
                        placeholder: "https://...",
                        confirmText: "Cập nhật ảnh",
                        onSubmit: (val) =>
                          handleUpdateGroup(activeViewConversation.name, val),
                      });
                    }}
                  >
                    <Camera size={14} />
                    Đổi ảnh nhóm
                  </button>
                  <button
                    className="cwb-panel-btn danger"
                    onClick={handleLeaveGroup}
                  >
                    <LogOut size={14} />
                    Rời khỏi nhóm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating UI */}
      {showInviteModal && (
        <InviteModal
          conversationId={activeConversationId}
          existingMemberIds={
            activeViewConversation.members?.map((m) => m.id) || []
          }
          onClose={() => setShowInviteModal(false)}
          onInviteSuccess={() => {
            loadInitialData(); // To refresh members list
          }}
        />
      )}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(emoji) => setInput((p) => p + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      {showSettings && (
        <SettingsModal user={user} onClose={() => setShowSettings(false)} />
      )}
      {promptModal && (
        <ActionModal {...promptModal} onClose={() => setPromptModal(null)} />
      )}
      {selectedProfileId && (
        <ProfileModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAnswer={() => respondToCall("accepted")}
          onReject={() => respondToCall("rejected")}
        />
      )}

      {activeCall && (
        <CallModal
          activeConversation={activeViewConversation}
          type={activeCall.type}
          status={activeCall.status}
          seconds={callSeconds}
          onClose={hangupCall}
        />
      )}

      <style>{`
        /* ─── Profile Modal ─── */
        .cwb-modal-content.profile { width: 340px; padding: 0; border: none; }
        .profile-banner { height: 100px; width: 100%; }
        .profile-body { padding: 20px; position: relative; }
        .profile-avatar-wrap { position: absolute; top: -45px; left: 20px; border: 4px solid #111827; border-radius: 20px; }
        .profile-avatar { width: 80px; height: 80px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: white; overflow: hidden; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info { margin-top: 45px; }
        .profile-name { font-size: 20px; font-weight: 800; color: white; margin-bottom: 4px; }
        .profile-email { font-size: 13px; color: #64748b; margin-bottom: 16px; }
        .profile-badges { display: flex; gap: 8px; margin-bottom: 24px; }
        .profile-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.05); color: #94a3b8; }
        .profile-badge.online { background: rgba(16,185,129,0.1); color: #10b981; }
        .profile-actions { display: flex; gap: 10px; }
        .profile-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .profile-btn.primary { background: #6366f1; color: white; }
        .profile-btn.primary:hover { background: #4f46e5; }
        .profile-btn.ghost { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        .profile-btn.ghost:hover { background: rgba(255,255,255,0.08); }

        .cwb-unread-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3b82f6; margin-left: auto;
          box-shadow: 0 0 8px rgba(59,130,246,0.6);
        }

        /* ─── Layout ─── */
        .cwb-chat {
          display: flex;
          height: calc(100vh - 64px);
          background: #080d1a;
          margin: -28px -32px;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          color: #e2e8f0;
        }

        /* ─── Sidebar ─── */
        .cwb-sidebar {
          width: 270px;
          background: #060b18;
          border-right: 1px solid rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: relative;
        }

        .search-results-overlay {
          position: absolute;
          top: 110px; left: 12px; right: 12px;
          background: #111827;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          z-index: 100;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
          max-height: 420px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .search-overlay-header {
          position: sticky;
          top: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;
          background: rgba(255,255,255,0.02);
        }
        .search-overlay-header button {
          background: none; border: none; color: #475569; cursor: pointer;
        }

        .search-result-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; 
          transition: 0.2s;
        }
        .search-result-item:hover { background: rgba(255,255,255,0.04); }
        
        .c-add-friend-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px ; border-radius: 8px;
          background: transparent ; color: white;
          border: none; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .c-add-friend-btn:hover { background: #4f46e5; transform: translateY(-1px); }
        .friend-status-label {
          font-size: 11px; color: #f59e0b; font-weight: 700;
          padding: 4px 8px; background: rgba(245,158,11,0.1); border-radius: 6px;
        }

        .cwb-ws-header {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cwb-ws-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
          color: white;
          cursor: pointer;
        }
        .cwb-ws-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f8ef7, #7c3aed);
          box-shadow: 0 0 8px rgba(79,142,247,0.5);
        }
        .cwb-new-btn {
          width: 28px; height: 28px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.08);
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .cwb-new-btn:hover { background: rgba(255,255,255,0.12); color: white; }

        .cwb-sidebar-search {
          margin: 10px 12px;
          padding: 7px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
        }
        .cwb-sidebar-search input {
          background: none; border: none; outline: none;
          color: #94a3b8; font-size: 12px; flex: 1;
        }
        .cwb-sidebar-search kbd {
          font-size: 10px; color: #334155;
          background: rgba(255,255,255,0.04);
          padding: 2px 5px; border-radius: 4px;
        }

        .cwb-sidebar-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }

        .cwb-group { margin-bottom: 4px; }
        .cwb-group-label {
          width: 100%; padding: 6px 16px;
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          font-size: 10px; font-weight: 700; color: #475569;
          letter-spacing: 0.8px; text-transform: uppercase;
          transition: 0.2s;
        }
        .cwb-group-label:hover { color: #64748b; }

        .cwb-ch-btn {
          width: 100%; padding: 7px 16px;
          display: flex; align-items: center; gap: 9px;
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #64748b;
          transition: 0.15s; position: relative;
          border-radius: 0;
          text-align: left;
        }
        .cwb-ch-btn:hover { background: rgba(255,255,255,0.04); color: #94a3b8; }
        .cwb-ch-btn.active {
          background: rgba(79,142,247,0.08);
          color: #7eb8ff;
          font-weight: 600;
        }
        .cwb-ch-btn.active::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 2px;
          background: #4f8ef7;
          border-radius: 0 2px 2px 0;
        }
        .cwb-ch-btn.dm { font-size: 13px; }

        .cwb-badge {
          margin-left: auto;
          padding: 2px 6px; border-radius: 10px;
          font-size: 9px; font-weight: 700;
          background: #ef4444; color: white;
        }
        .cwb-badge.ai { background: rgba(99,102,241,0.2); color: #818cf8; }

        .cwb-online-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #475569;
          flex-shrink: 0;
        }
        .cwb-online-dot.online { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }
        .cwb-online-dot.ai-online { background: #6366f1; box-shadow: 0 0 6px rgba(99,102,241,0.5); }

        .deadline-shortcut { padding: 8px 12px; margin-top: 4px; }
        .cwb-deadline-btn {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05));
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 10px;
          cursor: pointer;
          transition: 0.2s;
          text-align: left;
        }
        .cwb-deadline-btn:hover {
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
          border-color: rgba(99,102,241,0.3);
        }
        .dl-btn-icon {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }

        .cwb-conn-indicator {
          padding: 4px 12px;
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: #475569;
        }
        .cwb-conn-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #475569;
        }
        .cwb-conn-dot.on { background: #10b981; }
        .cwb-conn-indicator.on { color: #10b981; }

        .cwb-sidebar-footer {
          padding: 10px 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .cwb-user-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.2s;
          margin-top: 6px;
        }
        .cwb-user-pill:hover { background: rgba(255,255,255,0.04); }
        .cwb-user-av {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #4f8ef7, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: white;
          flex-shrink: 0;
        }
        .cwb-user-info { flex: 1; min-width: 0; }
        .cwb-user-name { font-size: 13px; font-weight: 600; color: white; display: block; }
        .cwb-user-role { font-size: 10px; color: #10b981; }
        .cwb-settings-icon { color: #475569; cursor: pointer; transition: 0.3s; }
        .cwb-settings-icon:hover { transform: rotate(60deg); color: #94a3b8; }

        /* ─── Main ─── */
        .cwb-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0a101f;
          min-width: 0;
        }

        .cwb-header {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(10,16,31,0.9);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
          z-index: 10;
        }
        .cwb-header-left { display: flex; align-items: center; gap: 12px; }
        .cwb-channel-name { font-size: 15px; font-weight: 800; color: white; margin: 0; }
        .cwb-channel-desc { font-size: 11px; color: #475569; margin: 0; }

        .cwb-header-right { display: flex; align-items: center; gap: 6px; }
        .cwb-search-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          transition: 0.2s;
        }
        .cwb-search-pill:focus-within { border-color: rgba(79,142,247,0.3); background: rgba(79,142,247,0.04); }
        .cwb-search-pill input {
          background: none; border: none; outline: none;
          color: #e2e8f0; font-size: 12px; width: 130px;
        }
        .cwb-search-pill input::placeholder { color: #475569; }
        .cwb-kbd {
          display: flex; align-items: center; gap: 2px;
          font-size: 9px; color: #334155;
          background: rgba(255,255,255,0.04);
          padding: 2px 5px; border-radius: 4px;
        }

        .cwb-icon-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: none; background: none;
          color: #64748b; cursor: pointer;
          transition: 0.2s; position: relative;
        }
        .cwb-icon-btn:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
        .cwb-icon-btn.active { background: rgba(79,142,247,0.1); color: #7eb8ff; }
        .cwb-btn-dot {
          position: absolute; top: 4px; right: 4px;
          width: 6px; height: 6px;
          border-radius: 50%; background: #4f8ef7;
          border: 2px solid #0a101f;
        }

        .cwb-content-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* ─── Messages ─── */
        .cwb-messages {
          flex: 1; overflow-y: auto;
          padding: 20px 24px;
          display: flex; flex-direction: column;
        }

        .cwb-welcome { padding: 32px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px; }
        .cwb-welcome-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .cwb-welcome-title { font-size: 22px; font-weight: 800; color: white; margin-bottom: 6px; }
        .cwb-welcome-desc { font-size: 13px; color: #64748b; line-height: 1.6; max-width: 500px; }

        .chat-msg-item {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-radius: 8px;
          transition: background 0.1s;
          position: relative;
          margin: 0 -8px;
          padding: 6px 8px;
        }
        .chat-msg-item.is-me {
          flex-direction: row-reverse;
        }
        .chat-msg-item:hover { background: rgba(255,255,255,0.015); }
        .chat-msg-item.compact { padding-top: 2px; padding-bottom: 2px; }
        .chat-msg-item.compact .msg-avatar-wrap { visibility: hidden; }
        .chat-msg-item.compact .msg-header-v2 { display: none; }

        .msg-avatar-wrap { width: 28px; flex-shrink: 0; margin-top: 2px; }
        .msg-avatar-v2 {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 11px; color: white;
        }

        .msg-body-v2 { flex: 1; min-width: 0; }
        .is-me .msg-body-v2 { display: flex; flex-direction: column; align-items: flex-end; }
        .msg-header-v2 { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
        .is-me .msg-header-v2 { flex-direction: row-reverse; }
        .msg-author-v2 { font-size: 13px; font-weight: 700; color: #e2e8f0; }
        .ai-badge-pill {
          font-size: 9px; font-weight: 800;
          padding: 1px 6px; border-radius: 4px;
          background: rgba(79,142,247,0.15); color: #7eb8ff;
          border: 1px solid rgba(79,142,247,0.2);
        }
        .msg-time-v2 { font-size: 10px; color: #475569; }

        .msg-bubble-v2 {
          display: inline-block;
          padding: 8px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 4px 14px 14px 14px;
          max-width: 85%;
          transition: 0.2s;
        }
        .is-me .msg-bubble-v2 {
          background: #6366f1;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border-radius: 14px 14px 4px 14px;
          border: none;
          box-shadow: 0 4px 15px rgba(99,102,241,0.25);
        }
        .msg-bubble-v2:hover { border-color: rgba(255,255,255,0.07); }
        .is-me .msg-bubble-v2:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.3); }
        .is-me .msg-text-v2 { color: white; }
        .ai-bubble {
          background: rgba(79,142,247,0.04);
          border-color: rgba(79,142,247,0.1);
          border-radius: 4px 12px 12px 12px;
        }
        .msg-text-v2 { font-size: 14px; color: #cbd5e1; line-height: 1.65; word-wrap: break-word; white-space: pre-wrap; }

        .reply-preview {
          display: flex; gap: 8px;
          padding: 4px 8px; margin-bottom: 6px;
          background: rgba(255,255,255,0.02);
          border-radius: 6px;
          font-size: 11px;
        }

        .msg-reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .reaction-pill {
          padding: 2px 8px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          font-size: 12px; cursor: pointer; transition: 0.2s;
          color: white;
        }
        .reaction-pill:hover { background: rgba(255,255,255,0.07); }

        .msg-actions {
          position: absolute; top: 0; right: 8px;
          display: flex; gap: 2px; align-items: center;
          background: rgba(10,16,31,0.95);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 3px 4px;
          z-index: 10;
          transform: translateY(-50%);
          top: 50%;
        }
        .action-pill {
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; border: none;
          background: none; color: #64748b;
          cursor: pointer; transition: 0.15s;
        }
        .action-pill:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }

        .emoji-quick-picker {
          position: absolute; right: 0; top: 110%;
          background: #141e35;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 8px;
          display: flex; flex-wrap: wrap; gap: 4px;
          width: 200px;
          z-index: 20;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .emoji-quick-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; border: none; background: none;
          font-size: 16px; cursor: pointer; transition: 0.15s;
        }
        .emoji-quick-btn:hover { background: rgba(255,255,255,0.08); transform: scale(1.2); }

        .cwb-typing {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #64748b;
          padding: 4px 0;
        }
        .cwb-typing-dots { display: flex; gap: 3px; }
        .cwb-typing-dots span {
          width: 5px; height: 5px; border-radius: 50%;
          background: #64748b;
          animation: typingAnim 1.4s infinite;
        }
        .cwb-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .cwb-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingAnim {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ─── Input ─── */
        .cwb-input-zone {
          padding: 0 20px 20px;
          flex-shrink: 0;
        }
        .cwb-reply-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.15);
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          font-size: 12px;
        }
        .cwb-reply-preview { flex: 1; min-width: 0; display: flex; gap: 6px; }
        .cwb-reply-author { color: #818cf8; font-weight: 700; white-space: nowrap; }
        .cwb-reply-text { color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .cwb-input-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .cwb-input-box:focus-within { border-color: rgba(79,142,247,0.25); }

        .cwb-toolbar {
          padding: 6px 12px;
          display: flex; align-items: center; gap: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          background: rgba(0,0,0,0.1);
        }
        .cwb-tool {
          width: 26px; height: 26px; border-radius: 6px;
          border: none; background: none; color: #475569;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.15s;
        }
        .cwb-tool:hover { background: rgba(255,255,255,0.05); color: #94a3b8; }
        .cwb-tool-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.04); margin: 0 2px; }

        .cwb-input-form {
          display: flex; align-items: flex-end; gap: 8px;
          padding: 10px 12px 8px;
          position: relative;
        }
        .cwb-textarea {
          flex: 1;
          background: none; border: none; outline: none;
          color: #e2e8f0; font-size: 14px;
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
          resize: none;
          max-height: 120px;
          overflow-y: auto;
        }
        .cwb-textarea::placeholder { color: #334155; }
        .cwb-send-btn {
          width: 32px; height: 32px; border-radius: 8px;
          border: none; background: rgba(255,255,255,0.06);
          color: #475569; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.2s; flex-shrink: 0;
        }
        .cwb-send-btn.active {
          background: linear-gradient(135deg, #4f8ef7, #7c3aed);
          color: white;
          box-shadow: 0 6px 20px rgba(79,142,247,0.35);
        }
        .cwb-send-btn.active:hover { transform: scale(1.05); }

        .cwb-input-hint {
          padding: 4px 12px 6px;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 10px; color: #334155;
        }
        .cwb-live-dot {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px;
        }
        .cwb-live-dot.on { color: #10b981; }
        .cwb-live-dot.off { color: #ef4444; }

        /* ─── Right Panels ─── */
        .cwb-right-panel {
          width: 300px;
          background: #060b18;
          border-left: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0;
          overflow-y: auto;
        }

        .ai-panel { display: flex; flex-direction: column; height: 100%; }
        .ai-panel-header {
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
          background: rgba(255,255,255,0.01);
        }
        .ai-avatar-glow {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        .c-icon-btn {
          width: 26px; height: 26px; border-radius: 6px;
          border: none; background: rgba(255,255,255,0.04);
          color: #64748b; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.15s;
        }
        .c-icon-btn:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }

        .ai-panel-body { padding: 14px; flex: 1; overflow-y: auto; }

        .ai-thinking {
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .ai-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4f8ef7;
          animation: aiDotAnim 1.4s ease-in-out infinite;
        }
        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aiDotAnim {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .ai-insight-box {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px;
          background: rgba(245,158,11,0.05);
          border: 1px solid rgba(245,158,11,0.12);
          border-radius: 10px;
          font-size: 12px; color: #94a3b8;
          line-height: 1.5; margin-bottom: 12px;
        }


        .deadline-card {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: 0.2s;
        }
        .deadline-card:hover { filter: brightness(1.05); }

        .member-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 4px;
          border-radius: 8px;
          transition: 0.15s;
        }
        .member-row:hover { background: rgba(255,255,255,0.03); }
        .member-avatar {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: white;
          flex-shrink: 0;
        }
        .cwb-invite-btn {
          width: 100%; margin-top: 12px;
          padding: 8px 12px;
          display: flex; align-items: center; gap: 8px; justify-content: center;
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 8px; background: none;
          color: #64748b; font-size: 12px; cursor: pointer;
          transition: 0.2s;
        }
        .cwb-invite-btn:hover { border-color: rgba(79,142,247,0.3); color: #7eb8ff; }

        /* Scrollbars */
        .cwb-sidebar-scroll::-webkit-scrollbar,
        .cwb-messages::-webkit-scrollbar,
        .ai-panel-body::-webkit-scrollbar { width: 4px; }
        .cwb-sidebar-scroll::-webkit-scrollbar-track,
        .cwb-messages::-webkit-scrollbar-track,
        .ai-panel-body::-webkit-scrollbar-track { background: transparent; }
        .cwb-sidebar-scroll::-webkit-scrollbar-thumb,
        .cwb-messages::-webkit-scrollbar-thumb,
        .ai-panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }

        .cwb-panel-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
          color: #94a3b8; font-size: 12px; cursor: pointer; transition: 0.2s;
          margin-bottom: 4px;
        }
        .cwb-panel-btn:hover { background: rgba(255,255,255,0.06); color: white; }
        .cwb-panel-btn.danger { color: #f87171; border-color: rgba(239, 68, 68, 0.1); }
        .cwb-panel-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        /* Modals */
        .cwb-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .cwb-modal-content {
          width: 400px; background: #111827; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1); overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .cwb-modal-header {
          padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.01);
        }
        .cwb-modal-header h3 { margin: 0; font-size: 16px; color: white; }
        .cwb-modal-body { padding: 20px; }
        .settings-user-section { display: flex; align-items: center; margin-bottom: 24px; }
        .settings-list { display: grid; gap: 4px; }
        .settings-item {
          display: flex; align-items: center; gap: 12px; padding: 12px;
          border-radius: 10px; cursor: pointer; color: #94a3b8; transition: 0.2s;
        }
        .settings-item:hover { background: rgba(255,255,255,0.04); color: white; }
        .settings-item.danger { color: #ef4444; }
        .settings-item.danger:hover { background: rgba(239,68,68,0.1); }

        /* Calls */
        .cwb-call-overlay {
          position: fixed; inset: 0; background: #0a101f;
          display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .cwb-call-content { text-align: center; }
        .call-avatar-pulse {
          position: relative; width: 120px; height: 120px; margin: 0 auto;
        }
        .call-avatar {
          width: 100%; height: 100%; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 32px; font-weight: 800;
          z-index: 2; position: relative;
        }
        .call-avatar-pulse::after {
          content: ''; position: absolute; inset: -10px; border-radius: 50%;
          border: 2px solid #6366f1; opacity: 0;
          animation: pulseAnim 2s infinite;
        }
        @keyframes pulseAnim {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .call-actions {
          display: flex; gap: 20px; justify-content: center; margin-top: 40px;
        }
        .call-btn-circle {
          width: 50px; height: 50px; border-radius: 50%; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.2s; color: white;
          background: rgba(255,255,255,0.1);
        }
        .call-btn-circle:hover { transform: scale(1.1); background: rgba(255,255,255,0.2); }
        .call-btn-circle.end { background: #ef4444; }
        .call-btn-circle.end:hover { background: #dc2626; }

        /* Emoji Picker */
        .cwb-emoji-picker-wrap {
          position: fixed; inset: 0; z-index: 1500;
        }
        .cwb-emoji-picker {
          position: absolute; bottom: 80px; left: 320px;
          background: #1f2937; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px; width: 260px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .emoji-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .emoji-item {
          font-size: 20px; padding: 8px; border: none; background: none;
          cursor: pointer; border-radius: 8px; transition: 0.2s;
        }
        .emoji-item:hover { background: rgba(255,255,255,0.1); transform: scale(1.2); }

        /* File Attachment */
        .file-attachment {
          display: flex; align-items: center; gap: 12px;
          padding: 8px 12px; background: rgba(0,0,0,0.2);
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);
          margin: 4px 0; min-width: 200px;
        }
        .file-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: #374151; display: flex; align-items: center; justify-content: center;
          color: #94a3b8;
        }
        .file-info { flex: 1; min-width: 0; }
        .file-name { font-size: 13px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-meta { font-size: 10px; color: #64748b; }
        .file-download {
          color: #64748b; transition: 0.2s;
        }
        /* Chat Loading */
        .cwb-chat-loading {
          position: fixed; inset: 0; background: #080d1a;
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .cwb-loading-box {
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .cwb-loading-circle {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(99,102,241,0.1);
          border-top-color: #6366f1;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .file-download:hover { color: #6366f1; }

        /* CHAT AREA LOCKDOWN - CHỈ LOADING KHU VỰC CHAT */
        .cwb-chat-lockdown {
          position: absolute; inset: 0; 
          background: rgba(8, 13, 26, 0.75);
          backdrop-filter: blur(15px) saturate(160%);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          color: white;
          opacity: 0; pointer-events: none;
          visibility: hidden;
          transition: opacity 0.2s ease;
        }
        .cwb-chat-lockdown.active {
          opacity: 1; pointer-events: auto; visibility: visible;
          transition: none; /* Hiện ra ngay lập tức */
        }
        .cwb-lock-content { text-align: center; }
        .cwb-loading-spinner-premium {
          width: 45px; height: 45px; margin: 0 auto 20px;
          border: 3px solid rgba(99,102,241,0.1);
          border-top-color: #6366f1; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .cwb-lock-text {
          font-size: 13px; font-weight: 800; letter-spacing: 4px;
          color: #6366f1; text-shadow: 0 0 15px rgba(99,102,241,0.5);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
