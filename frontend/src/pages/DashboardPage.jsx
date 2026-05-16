/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart2,
  AlertTriangle,
  CheckCircle,
  Zap,
  Calendar,
  ArrowRight,
  Shield,
  Search,
  RefreshCw,
} from "lucide-react";
import useStore from "../store/useStore";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { models } from "powerbi-client";
import { PowerBIEmbed } from "powerbi-client-react";
import api from "../lib/api";

function PowerBIPanel({ embedConfig, pageName, height = 450, loading, pbiError }) {
  const [availablePages, setAvailablePages] = useState([]);
  const [reportObj, setReportObj] = useState(null);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    if (reportObj && availablePages.length > 0) {
      const targetName = (pageName || "").toLowerCase().trim();
      const target = availablePages.find(p => 
        p.displayName.toLowerCase().trim().includes(targetName) ||
        p.name.toLowerCase().trim().includes(targetName)
      );
      if (target && currentPage !== target.name) {
        reportObj.setPage(target.name).catch(console.error);
        setCurrentPage(target.name);
      }
    }
  }, [reportObj, availablePages, pageName]);

  return (
    <div className="powerbi-embed-container" style={{ height, overflow: "hidden", position: "relative" }}>
      {/* Diagnostic Header */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, 
        background: '#f8f9fa', padding: '6px 12px', 
        display: 'flex', alignItems: 'center', gap: 12, fontSize: '12px',
        borderBottom: '1px solid #e9ecef',
        color: '#495057'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#6c757d' }}>Page:</span>
          <select 
            value={currentPage} 
            onChange={(e) => {
              const name = e.target.value;
              setCurrentPage(name);
              if (reportObj) reportObj.setPage(name);
            }}
            style={{ 
              fontSize: '11px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: '#fff',
              outline: 'none'
            }}
          >
            <option value="">-- Select Page --</option>
            {availablePages.map(p => (
              <option key={p.name} value={p.name}>{p.displayName}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#adb5bd' }}>Target:</span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pageName}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="ai-thinking">
            {[1, 2, 3].map(i => <div key={i} className="ai-dot" />)}
            <span>Loading...</span>
          </div>
        </div>
      ) : pbiError ? (
        <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pbiError}</div>
        </div>
      ) : (
        <div style={{ width: "100%", height: "calc(100% - 34px)", marginTop: '34px' }}>
          <PowerBIEmbed
            embedConfig={{
              ...embedConfig,
              settings: {
                ...embedConfig?.settings,
                pageNavigation: { visible: false }
              }
            }}
            cssClassName="powerbi-embed"
            getEmbeddedComponent={(embeddedReport) => {
              setReportObj(embeddedReport);
              embeddedReport.on("rendered", async () => {
                const pages = await embeddedReport.getPages();
                setAvailablePages(pages);
                const active = await embeddedReport.getActivePage();
                if (active) setCurrentPage(active.name);
              });
            }}
            eventHandlers={new Map([
              ["error", (e) => console.error("PowerBI error:", e)]
            ])}
          />
        </div>
      )}
    </div>
  );
}

// ─── Search Bar ──────────────────────────────────────────────────────
function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const debounceRef = useRef(null);

  const goToResult = (r) => {
    setQuery("");
    setResults([]);
    setSearchedQuery("");
    if (r.type === "task") {
      navigate(`/projects/${r.projectId}?taskId=${r.id}`);
    } else if (r.type === "meeting") {
      navigate(`/meetings`); // Or `/meetings/${r.id}` if a detail page exists
    }
  };

  const handleSearch = (q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setSearchedQuery("");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get("/search", {
          params: { q, top: 6 },
        });
        setResults(data.results || []);
        setSearchedQuery(q);
      } catch {
        setResults([]);
        setSearchedQuery(q);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "8px 14px",
        }}
      >
        <Search
          size={16}
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: 14,
          }}
        />
        {searching && (
          <RefreshCw
            size={14}
            style={{
              color: "var(--primary)",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>
      {(results.length > 0 || searchedQuery) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            marginTop: 4,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}
        >
          {results.length === 0 && searchedQuery ? (
            <div
              style={{
                padding: "14px",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No tasks or meetings found for "{searchedQuery}".
            </div>
          ) : results.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onClick={() => goToResult(r)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-elevated)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      background: "rgba(99,141,255,0.15)",
                      color: "var(--primary)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      marginRight: 6,
                    }}
                  >
                    {r.type}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {r.title}
                  </span>
                </div>
                {r.searchScore && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {(r.searchScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {r.content && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {r.content}
                </div>
              )}
              {(r.projectName || r.ownerName) && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  {[r.projectName, r.ownerName].filter(Boolean).join(" / ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { projects, loadProjects, notifications, loadNotifications, user } =
    useStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'powerbi'

  const [pbiConfig, setPbiConfig] = useState(null);
  const [pbiLoading, setPbiLoading] = useState(true);
  const [pbiError, setPbiError] = useState(null);

  useEffect(() => {
    Promise.all([loadProjects(), loadNotifications()]).then(() =>
      setLoading(false),
    );

    // Fetch Power BI token once for all panels
    const fetchPbiToken = async () => {
      try {
        const { data } = await api.get("/powerbi/embed-token");
        if (!data.configured) {
          setPbiError(data.message);
        } else {
          setPbiConfig({
            type: "report",
            id: data.reportId,
            embedUrl: data.embedUrl,
            accessToken: data.embedToken,
            tokenType: models.TokenType.Embed,
            settings: {
              panes: { filters: { visible: false }, pageNavigation: { visible: false } },
              background: models.BackgroundType.Transparent,
              layoutType: models.LayoutType.Custom,
              customLayout: { displayOption: models.DisplayOption.FitToPage },
            },
          });
        }
      } catch {
        setPbiError("Failed to load Power BI reports");
      } finally {
        setPbiLoading(false);
      }
    };
    fetchPbiToken();
  }, []);

  const stats = useMemo(() => {
    if (!projects.length)
      return {
        allTasks: 0,
        doneTasks: 0,
        blockedTasks: 0,
        activeProjects: 0,
        highRiskProjects: 0,
      };
    return {
      allTasks: projects.reduce(
        (acc, p) => acc + Number(p.total_tasks || 0),
        0,
      ),
      doneTasks: projects.reduce(
        (acc, p) => acc + Number(p.done_tasks || 0),
        0,
      ),
      blockedTasks: projects.reduce(
        (acc, p) => acc + Number(p.blocked_tasks || 0),
        0,
      ),
      activeProjects: projects.filter((p) => p.status === "active").length,
      highRiskProjects: projects.filter((p) => Number(p.risk_score || 0) > 60)
        .length,
    };
  }, [projects]);

  const recentNotifs = notifications.filter((n) => !n.is_read).slice(0, 5);
  const urgentProjects = projects
    .filter((p) => (p.risk_score || 0) > 50)
    .slice(0, 3);
  const completionRate = stats.allTasks
    ? Math.round((stats.doneTasks / stats.allTasks) * 100)
    : 0;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
        }}
      >
        <div className="ai-thinking">
          <div className="ai-dot" />
          <div className="ai-dot" />
          <div className="ai-dot" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome back, {user?.name} </h1>
          <p>
            {format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })} ·{" "}
            {stats.activeProjects} active projects
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <GlobalSearchBar />
          <Link to="/ai/extract" className="btn btn-primary">
            <Zap size={16} /> Extract Notes
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "var(--bg-elevated)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
        }}
      >
        {["overview", "powerbi"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              transition: "all 0.2s",
              background: activeTab === tab ? "var(--primary)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-muted)",
            }}
          >
            {tab === "overview" ? "Overview" : "Power BI Reports"}
          </button>
        ))}
      </div>

      {activeTab === "powerbi" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Main Task Analytics - Full Width */}
          <div
            className="card card-pbi"
            style={{
              overflow: "hidden",
              height: 720,
              backgroundColor: "white",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              className="card-header"
              style={{
                borderBottom: "1px solid #f0f0f0",
                padding: "14px 20px",
              }}
            >
              <span className="card-title-powerBI">
                <BarChart2 size={18} /> Task Distribution & Timeline
              </span>
              <span className="badge badge-primary">Main Report</span>
            </div>
            <PowerBIPanel
              embedConfig={pbiConfig}
              pageName="Task"
              height={650}
              loading={pbiLoading}
              pbiError={pbiError}
            />
          </div>

          <div className="grid-2">
            {/* Status Chart */}
            <div
              className="card card-pbi"
              style={{
                overflow: "hidden",
                height: 580,
                backgroundColor: "white",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="card-header"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "14px 20px",
                }}
              >
                <span className="card-title-powerBI">
                  <RefreshCw size={18} /> Workflow Status
                </span>
              </div>
              <PowerBIPanel
                embedConfig={pbiConfig}
                pageName="Status"
                height={420}
                loading={pbiLoading}
                pbiError={pbiError}
              />
            </div>

            {/* Priority Chart */}
            <div
              className="card card-pbi"
              style={{
                overflow: "hidden",
                height: 580,
                backgroundColor: "white",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="card-header"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "14px 20px",
                }}
              >
                <span className="card-title-powerBI">
                  <Zap size={18} /> Priority Breakdown
                </span>
              </div>
              <PowerBIPanel
                embedConfig={pbiConfig}
                pageName="Priority"
                height={420}
                loading={pbiLoading}
                pbiError={pbiError}
              />
            </div>
          </div>

          <div className="grid-2">
            {/* Risk Chart */}
            <div
              className="card card-pbi"
              style={{
                overflow: "hidden",
                height: 580,
                backgroundColor: "white",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="card-header"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "14px 20px",
                }}
              >
                <span className="card-title-powerBI">
                  <AlertTriangle size={18} /> Risk Assessment
                </span>
              </div>
              <PowerBIPanel
                embedConfig={pbiConfig}
                pageName="Risk"
                height={420}
                loading={pbiLoading}
                pbiError={pbiError}
              />
            </div>

            {/* Completed Chart */}
            <div
              className="card card-pbi"
              style={{
                overflow: "hidden",
                height: 580,
                backgroundColor: "white",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="card-header"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "14px 20px",
                }}
              >
                <span className="card-title-powerBI">
                  <CheckCircle size={18} /> Completion Velocity
                </span>
              </div>
              <PowerBIPanel
                embedConfig={pbiConfig}
                pageName="Completed"
                height={420}
                loading={pbiLoading}
                pbiError={pbiError}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <>
          <div className="stat-grid">
            <div className="stat-card primary">
              <div className="stat-label">Active Projects</div>
              <div className="stat-value">{stats.activeProjects}</div>
              <div className="stat-sub">{projects.length} total projects</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Completion Rate</div>
              <div className="stat-value">{completionRate}%</div>
              <div className="stat-sub">
                {stats.doneTasks} / {stats.allTasks} tasks done
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill success"
                  style={{ width: `${completionRate}%` }}
                />
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
              <div className="stat-value">
                {projects.reduce((a, p) => a + Number(p.open_risks || 0), 0)}
              </div>
              <div className="stat-sub">Across all projects</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Projects list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <BarChart2 size={18} /> Projects Overview
                </span>
                <Link to="/projects" className="btn btn-ghost btn-sm">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {projects.slice(0, 5).map((p) => {
                  const pct = p.total_tasks
                    ? Math.round((p.done_tasks / p.total_tasks) * 100)
                    : 0;
                  return (
                    <Link
                      to={`/projects/${p.id}`}
                      key={p.id}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          background: "var(--bg-elevated)",
                          borderRadius: 10,
                          padding: "14px 16px",
                          border: "1px solid var(--border)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--border-active)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border)")
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 14,
                                color: "var(--text-primary)",
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                marginTop: 2,
                              }}
                            >
                              {p.total_tasks} tasks · {p.done_tasks} done
                            </div>
                          </div>
                          <div
                            className={`risk-score ${(p.risk_score || 0) > 60 ? "risk-high" : (p.risk_score || 0) > 30 ? "risk-medium" : "risk-low"}`}
                          >
                            {Math.round(p.risk_score || 0)}
                          </div>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 6,
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          <span>{pct}% complete</span>
                          {p.blocked_tasks > 0 && (
                            <span style={{ color: "var(--danger)" }}>
                              ⚠ {p.blocked_tasks} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {!projects.length && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-title">No projects yet</div>
                    <Link to="/projects" className="btn btn-primary">
                      Create First Project
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <AlertTriangle size={18} /> Alerts & Notifications
                </span>
                {recentNotifs.length > 0 && (
                  <span className="badge badge-danger">
                    {recentNotifs.length} new
                  </span>
                )}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {urgentProjects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <AlertTriangle
                        size={14}
                        style={{ color: "var(--danger)" }}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--danger)",
                        }}
                      >
                        High Risk: {p.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Risk score: {Math.round(p.risk_score)} · {p.blocked_tasks}{" "}
                      blocked
                    </div>
                  </div>
                ))}
                {recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      {n.title}
                    </div>
                    {n.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {n.message}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {format(new Date(n.created_at), "dd/MM/yyyy, HH:mm", {
                        locale: vi,
                      })}
                    </div>
                  </div>
                ))}
                {!recentNotifs.length && !urgentProjects.length && (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <CheckCircle
                      size={32}
                      style={{ color: "var(--success)", opacity: 0.7 }}
                    />
                    <div
                      style={{ color: "var(--text-secondary)", fontSize: 14 }}
                    >
                      All clear! No urgent alerts.
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 10,
                  }}
                >
                  Quick Actions
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link to="/ai/extract" className="btn btn-secondary btn-sm">
                    <Zap size={14} /> Extract Notes
                  </Link>
                  <Link to="/ai/assistant" className="btn btn-secondary btn-sm">
                    <Shield size={14} /> Assistant
                  </Link>
                  <Link to="/meetings" className="btn btn-secondary btn-sm">
                    <Calendar size={14} /> Meetings
                  </Link>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab("powerbi")}
                  >
                    <BarChart2 size={14} /> Power BI
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow tip banner */}
          <div
            className="card"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,120,212,0.08), rgba(124,58,237,0.08))",
              border: "1px solid rgba(0,120,212,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #0078D4, #7C3AED)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🤖
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  Workflow automation — Tip
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Paste meeting notes in <strong>Extract Notes</strong> to
                  create tasks via Workflow automation. Use{" "}
                  <strong>Power BI tab</strong> for full analytics. Search
                  across all data with <strong>Search</strong>.
                </div>
              </div>
              <Link
                to="/ai/assistant"
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Try Assistant
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
