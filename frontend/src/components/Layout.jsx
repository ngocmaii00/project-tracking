/* eslint-disable react-hooks/exhaustive-deps */
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import {
  LayoutDashboard, FolderKanban, Brain, Calendar, AlertTriangle,
  Users, Settings, Bell, ChevronLeft, ChevronRight, Zap,
  MessageSquare, GitMerge, Shield, Target, LogOut, Search
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
  ]},
  { section: 'Collaboration', items: [
    { to: '/chat', icon: MessageSquare, label: 'Chat Workspace' },
    { to: '/meetings', icon: Calendar, label: 'Meetings Hub' },
  ]},
  { section: 'AI Tools', items: [
    { to: '/ai/extract', icon: Brain, label: 'AI Extraction' },
    { to: '/ai/assistant', icon: Zap, label: 'AI Assistant' },
  ]},
];

function NavItemComp({ item, collapsed }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      title={collapsed ? item.label : ''}
    >
      <Icon className="nav-icon" size={18} />
      {!collapsed && <span>{item.label}</span>}
      {item.badge && !collapsed && <span className="nav-badge">{item.badge}</span>}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout, loadNotifications, loadUsers, unreadCount, sidebarOpen, toggleSidebar } = useStore();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const location = useLocation();
  const collapsed = !sidebarOpen;

  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
    const ws = new WebSocket(`${WS_URL}?userId=${user.id}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'notification') loadNotifications();
      } catch (err) {
        console.error(err);
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);

    return () => { ws.close(); clearInterval(ping); };
  }, [user]);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ width: collapsed ? '72px' : 'var(--sidebar-width)' }}>
        <div className="sidebar-logo">
          <div className="logo-icon">🧠</div>
          {!collapsed && (
            <div>
              <div className="logo-text">CWB Intelligence</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {wsConnected ? '● Live' : '○ Offline'}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div key={section.section}>
              {!collapsed && <div className="nav-section-label">{section.section}</div>}
              {section.items.map(item => <NavItemComp key={item.to} item={item} collapsed={collapsed} />)}
            </div>
          ))}

          {!collapsed && <div className="nav-section-label">Settings</div>}
          <button className="nav-item" onClick={logout} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </nav>

        {!collapsed && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar avatar-sm">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', truncate: true }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        )}
      </aside>

      <header className="topbar" style={{ left: collapsed ? '72px' : 'var(--sidebar-width)' }}>
        <button className="btn btn-ghost btn-icon" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <span className="topbar-title">
          {location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' › ')}
        </span>

        <div className="topbar-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <Zap size={12} style={{ color: 'var(--primary)' }} />
            AI Ready
          </div>

          <NavLink to="/dashboard" style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-dot" />}
            </button>
          </NavLink>

          <div className="avatar" title={user?.name}>{initials}</div>
        </div>
      </header>

      <main className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
