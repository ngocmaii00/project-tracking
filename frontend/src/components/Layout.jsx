/* eslint-disable react-hooks/exhaustive-deps */
import {
  Outlet,
  NavLink,
  useLocation,
  Link,
  useNavigate,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useStore from "../store/useStore";
import { Bell, Brain, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const navItems = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/projects", label: "Projects" },
    ],
  },
  {
    section: "Collaboration",
    items: [
      { to: "/chat", label: "Chat" },
      { to: "/meetings", label: "Meetings" },
    ],
  },
  {
    section: "Tools",
    items: [
      { to: "/ai/extract", label: "Action Extraction" },
      { to: "/ai/assistant", label: "Planning" },
    ],
  },
];

function NavItemComp({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
      title={collapsed ? item.label : ""}
    >
      {collapsed && <span className="nav-letter">{item.label.charAt(0)}</span>}
      {!collapsed && <span>{item.label}</span>}
      {item.badge && !collapsed && (
        <span className="nav-badge">{item.badge}</span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const {
    user,
    logout,
    loadNotifications,
    loadUsers,
    unreadCount,
    notifications,
    markRead,
    markAllRead,
    sidebarOpen,
    toggleSidebar,
    activeMeeting,
  } = useStore();
  const [wsConnected, setWsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);
  const wsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = !sidebarOpen;

  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001/ws";
    const ws = new WebSocket(`${WS_URL}?userId=${user.id}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "notification") {
          loadNotifications();
          window.dispatchEvent(
            new CustomEvent("new_notification", { detail: msg.notification }),
          );
          toast.success(msg.notification?.message || "Bạn có thông báo mới", {
            duration: 5000,
          });
        } else if (msg.type === "task_comment") {
          const { handleRealtimeComment } = useStore.getState();
          handleRealtimeComment(msg.taskId, msg.comment);
          if (msg.comment.author_id !== user.id) {
            toast.success(`${msg.comment.author_name} commented on a task`);
          }
        } else if (msg.type === "task_update") {
          const { handleRealtimeTaskUpdate } = useStore.getState();
          handleRealtimeTaskUpdate(msg.task);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);

    return () => {
      ws.close();
      clearInterval(ping);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?";

  const handleNotificationClick = (n) => {
    if (!n.is_read) markRead(n.id);
    setShowNotifications(false);

    // Navigation logic based on type
    if (n.type === "meeting_invite") {
      navigate("/meetings");
    } else if (n.type === "risk_alert" || n.type === "task_assignment") {
      const data = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
      if (data?.projectId) {
        navigate(`/projects/${data.projectId}`);
      }
    }
  };

  return (
    <div className="app-layout">
      <aside
        className="sidebar"
        style={{ width: collapsed ? "72px" : "var(--sidebar-width)" }}
      >
        <div className="sidebar-logo">
          <div className="logo-icon"><Brain size={16} /></div>
          {!collapsed && (
            <div>
              <div className="logo-text">PM Intelligence</div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  marginTop: "1px",
                }}
              >
                {wsConnected ? "Live" : "Offline"}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section}>
              {!collapsed && (
                <div className="nav-section-label">{section.section}</div>
              )}
              {section.items.map((item) => (
                <NavItemComp key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}

          {!collapsed && <div className="nav-section-label">Settings</div>}
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            style={{ width: "100%", textDecoration: "none" }}
          >
            {collapsed && <span className="nav-letter">P</span>}
            {!collapsed && <span>Profile</span>}
          </NavLink>
          <button
            className="nav-item"
            onClick={logout}
            style={{
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            {collapsed && <span className="nav-letter">L</span>}
            {!collapsed && <span>Logout</span>}
          </button>
        </nav>

        {!collapsed && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              className="avatar avatar-sm"
              style={{
                backgroundColor: `hsl(${user?.name?.charCodeAt(0) * 40}, 50%, 50%)`,
                overflow: "hidden",
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
              ) : (
                initials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  truncate: true,
                }}
              >
                {user?.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "capitalize",
                }}
              >
                {user?.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        )}
      </aside>

      <header
        className="topbar"
        style={{ left: collapsed ? "72px" : "var(--sidebar-width)" }}
      >
        <button className="btn btn-ghost btn-icon" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <span className="topbar-title">
          {location.pathname
            .split("/")
            .filter(Boolean)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" / ")}
        </span>

        <div className="topbar-right">
          {activeMeeting && !location.pathname.includes("/room") && (
            <Link
              to={`/meetings/${activeMeeting.id}/room`}
              className="ongoing-meet-pill"
            >
              <Headphones size={12} className="beat-animation" />
              <span>Meeting đang diễn ra</span>
            </Link>
          )}

          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              className={`btn btn-ghost btn-icon ${showNotifications ? "active" : ""}`}
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: "relative" }}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-dot" />}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notif-header">
                  <h3>Thông báo</h3>
                  {unreadCount > 0 && (
                    <button className="btn-link" onClick={markAllRead}>
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                <div className="notif-list">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.is_read ? "unread" : ""}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="notif-content">
                          <div className="notif-message">{n.message}</div>
                          <div className="notif-time">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-empty">
                      <p>Không có thông báo nào</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="notif-footer">
                    <span
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      Bạn đã xem hết thông báo
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className="avatar"
            title={user?.name}
            style={{
              backgroundColor: `hsl(${user?.name?.charCodeAt(0) * 40}, 50%, 50%)`,
              overflow: "hidden",
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
            ) : (
              initials
            )}
          </div>
        </div>
      </header>

      <main className={`main-content${collapsed ? " sidebar-collapsed" : ""}`}>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
