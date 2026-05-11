/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from "react";
import { Send, Zap, User, Bot, X, Menu } from "lucide-react";
import useStore from "../store/useStore";
import api from "../lib/api";

export default function AIAssistantPage() {
  const {
    projects,
    loadProjects,
    chat,
    aiConversations,
    activeAiConversationId,
    createNewAiChat,
    setActiveAiChat,
    updateAiChatMessages,
    deleteAiChat,
  } = useStore();
  const [projectId, setProjectId] = useState("");

  const activeChat =
    aiConversations?.find((c) => c.id === activeAiConversationId) ||
    aiConversations?.[0];
  const messages = activeChat?.messages || [];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [proposal, setProposal] = useState(null);
  const [showProposal, setShowProposal] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (aiConversations && aiConversations.length === 0) {
      createNewAiChat();
    } else if (!activeAiConversationId && aiConversations && aiConversations.length > 0) {
      setActiveAiChat(aiConversations[0].id);
    }
  }, [aiConversations, activeAiConversationId, createNewAiChat, setActiveAiChat]);

  useEffect(() => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChat) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];

    let newTitle = activeChat.title;
    // Update title only on the first message
    if (messages.length === 0) {
      newTitle = input.substring(0, 30) + (input.length > 30 ? "..." : "");
    }

    updateAiChatMessages(activeChat.id, newMessages, newTitle);
    setInput("");
    setLoading(true);

    try {
      const historyItems = messages.slice(-5).map(({ role, content }) => ({ role, content }));
      const res = await chat(userMsg.content, projectId || undefined, historyItems);

      updateAiChatMessages(
        activeChat.id,
        [
          ...newMessages,
          {
            role: "assistant",
            content: res.reply,
            confidence: res.confidence,
          },
        ],
        newTitle,
      );
    } catch {
      updateAiChatMessages(
        activeChat.id,
        [
          ...newMessages,
          {
            role: "assistant",
            content:
              "Sorry, I encountered an error processing your request. Please try again.",
          },
        ],
        newTitle,
      );
    } finally {
      setLoading(false);
    }
  };

  const applyAIProposal = async () => {
    if (!proposal) return;
    setLoading(true);
    try {
      await api.post("/ai/apply-proposal", {
        tasks: proposal.tasks,
        project_id: projectId,
      });
      updateAiChatMessages(activeChat.id, [
        ...messages,
        {
          role: "assistant",
          content:
            "Success! I have updated the project schedule based on the proposed plan.",
        },
      ]);
      setShowProposal(false);
      setProposal(null);
    } catch (err) {
      alert("Failed to apply changes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanTextLine = (text) => {
    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .trim();
  };

  const SmartMarkdown = ({ content }) => {
    let cleanContent = content;
    const proposalMatch = content.match(/\[PROPOSAL\]([\s\S]*?)\[\/PROPOSAL\]/);

    useEffect(() => {
      if (proposalMatch && !proposal) {
        try {
          const rawStr = proposalMatch[1]
            .replace(/```json/i, "")
            .replace(/```/g, "")
            .trim();
          const data = JSON.parse(rawStr);
          setProposal(data);
        } catch (e) {
          console.error("AI Proposal parse error:", e);
        }
      }
    }, [content]);

    if (proposalMatch) {
      cleanContent = content.replace(/\[PROPOSAL\][\s\S]*?\[\/PROPOSAL\]/, "");
    }

    const blocks = [];
    let currentBlock = { type: "default", title: "", lines: [] };
    const lines = cleanContent.split("\n");
    let inTable = false;
    let tableRows = [];

    const pushCurrentBlock = () => {
      if (currentBlock.lines.length > 0 || currentBlock.title) {
        blocks.push(currentBlock);
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes("|") && line.trim().startsWith("|")) {
        if (!inTable) {
          pushCurrentBlock();
          currentBlock = { type: "default", title: "", lines: [] };
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        continue;
      } else if (inTable) {
        if (line.trim() === "") continue;
        inTable = false;
        blocks.push({
          type: "table",
          title: "📋 Kế hoạch Draft",
          lines: tableRows,
        });
        tableRows = [];
      }

      if (line.startsWith("### ")) {
        pushCurrentBlock();
        const lowerLine = line.toLowerCase();
        let type = "default";
        let title = line.replace(/^###\s*/, "").trim();

        if (
          lowerLine.includes("nguyên nhân") ||
          lowerLine.includes("root cause")
        )
          type = "cause";
        else if (lowerLine.includes("rủi ro") || lowerLine.includes("risk"))
          type = "risk";
        else if (
          lowerLine.includes("giải pháp") ||
          lowerLine.includes("solution")
        )
          type = "solution";
        else if (
          lowerLine.includes("dự toán") ||
          lowerLine.includes("estimate") ||
          lowerLine.includes("deadline")
        )
          type = "estimate";
        else if (
          lowerLine.includes("tiếp theo") ||
          lowerLine.includes("next step") ||
          lowerLine.includes("next")
        )
          type = "next";

        currentBlock = { type, title, lines: [] };
      } else {
        currentBlock.lines.push(line);
      }
    }

    if (inTable)
      blocks.push({
        type: "table",
        title: "📋 Kế hoạch Draft",
        lines: tableRows,
      });
    else pushCurrentBlock();

    return (
      <div className="smart-markdown">
        {blocks.map((block, idx) => {
          if (block.type === "table") {
            return (
              <div
                key={idx}
                className="ai-card ai-card-table"
                style={{ marginTop: 20, marginBottom: 16 }}
              >
                <h3 className="ai-card-title">{block.title}</h3>
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                  <table className="ai-table">
                    <thead>
                      <tr>
                        {block.lines[0]
                          .split("|")
                          .filter((c) => c.trim())
                          .map((c, j) => (
                            <th key={j}>{cleanTextLine(c)}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.lines
                        .slice(2)
                        .filter((r) => r.includes("|"))
                        .map((row, j) => (
                          <tr key={j}>
                            {row
                              .split("|")
                              .filter((c) => c.trim())
                              .map((c, k) => (
                                <td key={k}>{cleanTextLine(c)}</td>
                              ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          if (block.type !== "default") {
            return (
              <div
                key={idx}
                className={`ai-card ai-card-${block.type}`}
                style={{ marginBottom: 16 }}
              >
                <h3 className="ai-card-title">{cleanTextLine(block.title)}</h3>
                <div className="ai-card-body">
                  {block.lines
                    .filter((l) => l.trim())
                    .map((line, k) => {
                      let cleanLine = cleanTextLine(line);
                      if (cleanLine.startsWith("- "))
                        cleanLine = "• " + cleanLine.slice(2);
                      return (
                        <div
                          key={k}
                          style={{ marginBottom: 6, display: "flex", gap: 8 }}
                        >
                          {cleanLine}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              style={{
                padding: "0 8px",
                marginBottom: 16,
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              {block.lines
                .filter((l) => l.trim())
                .map((line, k) => {
                  let cleanLine = cleanTextLine(line);
                  if (cleanLine.startsWith("- "))
                    cleanLine = "• " + cleanLine.slice(2);
                  return <div key={k}>{cleanLine}</div>;
                })}
            </div>
          );
        })}

        {proposalMatch && (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 142, 247, 0.15))",
              borderRadius: 16,
              border: "2px solid var(--accent)",
              boxShadow: "var(--shadow-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "pulse 2s infinite",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>
                  AI Plan Optimization Ready
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Click to review and apply the new project schedule
                  automatically.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowProposal(true)}
              className="btn btn-primary"
              style={{
                background: "var(--accent)",
                height: 44,
                padding: "0 24px",
                fontWeight: 700,
              }}
            >
              Review & Apply
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="ai-assistant-layout"
      style={{
        height: "calc(100vh - 100px)",
        display: "flex",
        gap: 0,
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      {/* SIDEBAR: History Panel */}
      {isSidebarOpen && (
        <div
          className="ai-history-sidebar"
          style={{
            width: isSidebarOpen ? 300 : 0,
            minWidth: isSidebarOpen ? 300 : 0,
            opacity: isSidebarOpen ? 1 : 0,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(20, 30, 53, 0.8)",
            backdropFilter: "blur(20px)",
            borderRight: isSidebarOpen ? "1px solid var(--border)" : "none",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={createNewAiChat}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <Zap size={18} fill="white" /> New Intelligence
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 12,
                paddingLeft: 8,
              }}
            >
              Recent Activity
            </div>
            {aiConversations?.length === 0 ? (
              <div
                style={{
                  padding: "20px 8px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                Chưa có hoạt động gần đây. Hãy tạo Intelligence mới để bắt đầu.
              </div>
            ) : (
              aiConversations?.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveAiChat(c.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    cursor: "pointer",
                    background:
                      activeAiConversationId === c.id
                        ? "var(--bg-elevated)"
                        : "transparent",
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s",
                    border:
                      activeAiConversationId === c.id
                        ? "1px solid var(--border-active)"
                        : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: activeAiConversationId === c.id ? 600 : 500,
                      color:
                        activeAiConversationId === c.id
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {c.title}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAiChat(c.id);
                    }}
                    className="delete-chat-btn"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      opacity: 0.6,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT: Chat Area */}
      <div
        className="ai-chat-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-base)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {showProposal && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: 800,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid var(--accent)",
                boxShadow: "0 0 80px rgba(124, 58, 237, 0.4)",
                borderRadius: 24,
              }}
            >
              <div className="card-header" style={{ padding: "24px 32px" }}>
                <h2
                  className="card-title"
                  style={{ fontSize: 22, color: "var(--text-primary)" }}
                >
                  ✨ Proposed Schedule Optimization
                </h2>
                <button
                  disabled={loading}
                  onClick={() => setShowProposal(false)}
                  className="btn-ghost"
                  style={{ padding: 8 }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "0 32px 32px 32px" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 24,
                    fontSize: 16,
                  }}
                >
                  I've analyzed the current project state and recommend the
                  following timeline adjustments:
                </p>
                <table
                  className="ai-table"
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: "0 8px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                      <th
                        style={{ padding: 14, borderRadius: "12px 0 0 12px" }}
                      >
                        Task
                      </th>
                      <th style={{ padding: 14 }}>Timeline</th>
                      <th
                        style={{ padding: 14, borderRadius: "0 12px 12px 0" }}
                      >
                        Reasoning
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal?.tasks.map((t, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background: "var(--bg-elevated)",
                          borderRadius: 12,
                        }}
                      >
                        <td
                          style={{ padding: 16, borderRadius: "12px 0 0 12px" }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {t.title || t.id}
                          </div>
                        </td>
                        <td style={{ padding: 16 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-muted)",
                                textDecoration: "line-through",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.old_date}
                            </span>
                            <span style={{ color: "var(--primary)" }}>➔</span>
                            <span
                              style={{
                                color: "var(--warning)",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.new_date}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: 16,
                            borderRadius: "0 12px 12px 0",
                            fontSize: 13,
                          }}
                        >
                          {t.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    justifyContent: "flex-end",
                    marginTop: 32,
                  }}
                >
                  <button
                    onClick={() => setShowProposal(false)}
                    className="btn-secondary"
                    style={{ padding: "12px 24px", borderRadius: 12 }}
                  >
                    Reject Changes
                  </button>
                  <button
                    onClick={applyAIProposal}
                    disabled={loading}
                    className="btn-primary"
                    style={{
                      padding: "12px 32px",
                      borderRadius: 12,
                      background: "var(--success)",
                    }}
                  >
                    {loading ? "Processing..." : "Apply System Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER: Internal Page Header */}
        <div
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15, 22, 41, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 10,
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              <Menu size={20} />
            </button>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, var(--primary), var(--accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: "var(--shadow-glow)",
              }}
            >
              🤖
            </div>
            <div>
              <h1 style={{ fontSize: 18, marginBottom: 2, fontWeight: 800 }}>
                CWB Project Intelligence
              </h1>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--success)",
                    borderRadius: "50%",
                    boxShadow: "0 0 8px var(--success)",
                  }}
                ></div>{" "}
                AI Foundry Online
              </div>
            </div>
          </div>

          <div style={{ minWidth: 260 }}>
            <select
              className="select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                height: 44,
                width: "100%",
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              <option value="">Global Project Context</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MESSAGES VIEW */}
        <div
          className="chat-messages"
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background:
                    "linear-gradient(135deg, var(--primary), var(--accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  marginBottom: 24,
                  boxShadow: "var(--shadow-glow)",
                  animation: "float 6s ease-in-out infinite",
                }}
              >
                🤖
              </div>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  marginBottom: 12,
                  background: "linear-gradient(to right, #fff, var(--accent))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Bắt đầu một trí tuệ mới
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  maxWidth: 500,
                  lineHeight: 1.6,
                  fontSize: 16,
                  marginBottom: 32,
                }}
              >
                Tôi có thể giúp bạn phân tích rủi ro, dự đoán tiến độ, tối ưu hóa
                nguồn lực hoặc đơn giản là trả lời các câu hỏi về dự án.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  width: "100%",
                  maxWidth: 800,
                }}
              >
                {[
                  "Phân tích rủi ro dự án này?",
                  "Dự báo ngày hoàn thành?",
                  "Ai đang bị quá tải công việc?",
                  "Tóm tắt các quyết định gần đây?",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    style={{
                      padding: "16px 20px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--bg-card)";
                    }}
                  >
                    <Zap size={14} style={{ color: "var(--warning)" }} />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 32,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  background:
                    msg.role === "user"
                      ? "var(--bg-elevated)"
                      : "linear-gradient(135deg, var(--primary), var(--accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    msg.role === "assistant" ? "var(--shadow-glow)" : "none",
                }}
              >
                {msg.role === "user" ? (
                  <User size={20} />
                ) : (
                  <Bot size={20} color="white" />
                )}
              </div>
              <div
                style={{
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    background:
                      msg.role === "user" ? "var(--primary)" : "var(--bg-card)",
                    padding: "16px 20px",
                    borderRadius:
                      msg.role === "user"
                        ? "20px 4px 20px 20px"
                        : "4px 20px 20px 20px",
                    border:
                      msg.role === "assistant"
                        ? "1px solid var(--border)"
                        : "none",
                    color:
                      msg.role === "user" ? "white" : "var(--text-primary)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {msg.role === "assistant" ? (
                    <SmartMarkdown content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.confidence && msg.role === "assistant" && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Zap size={10} style={{ color: "var(--warning)" }} />{" "}
                    Confidence: {Math.round(msg.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, var(--primary), var(--accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={20} color="white" />
              </div>
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "16px 24px",
                  borderRadius: "4px 20px 20px 20px",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="ai-thinking-container">
                  <div className="ai-thinking">
                    <div className="ai-dot" />
                    <div className="ai-dot" />
                    <div className="ai-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* INPUT BOX */}
        <div style={{ padding: "0 32px 32px 32px", background: "transparent" }}>
          <form
            onSubmit={handleSend}
            style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query project records or ask for plan updates..."
              style={{
                width: "100%",
                height: 60,
                padding: "0 80px 0 24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                fontSize: 16,
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-float)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                position: "absolute",
                right: 10,
                top: 10,
                bottom: 10,
                width: 40,
                borderRadius: 14,
                background: "var(--primary)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={18} />
            </button>
          </form>
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 11,
              marginTop: 16,
            }}
          >
            CWB Intelligence Engine 2.1 • Decision Support System
          </div>
        </div>
      </div>
    </div>
  );
}
