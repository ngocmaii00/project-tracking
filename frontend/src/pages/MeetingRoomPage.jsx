/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Video, VideoOff, MessageSquare, Settings,
  ChevronRight, MonitorUp, FileEdit, Layout, Sidebar,
  Minimize2, Grid, Monitor, GripHorizontal, Bot, Send,
  Clock, AlertTriangle, CheckCircle, Zap, X, Smile,
  AtSign, Plus, Reply, MoreVertical, Copy, Users,
  Hash, Paperclip, Phone, PhoneOff
} from "lucide-react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import useStore from "../store/useStore";
import api from "../lib/api";
import toast from "react-hot-toast";

const EMOJI_REACTIONS = ["👍", "❤️", "👏", "🔥", "🎉", "🤔", "😂", "🚀"];

function ProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/friends/search?q=${userId}`);
        const user = data.find(u => u.id === userId);
        setProfile(user);
      } catch (err) { console.error('Profile fetch error', err); }
      finally { setLoading(false); }
    };
    if (userId) fetchProfile();
  }, [userId]);

  if (loading || !profile) return null;

  return (
    <div className="meet-modal-overlay" onClick={onClose}>
      <div className="meet-modal-content profile" onClick={e => e.stopPropagation()}>
        <div className="profile-banner" style={{ background: `hsl(${profile.name.charCodeAt(0) * 40}, 60%, 40%)` }} />
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" style={{ background: `hsl(${profile.name.charCodeAt(0) * 40}, 60%, 40%)` }}>
              {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name[0]}
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
              <button className="profile-btn primary" onClick={onClose}>Nhắn tin</button>
              <button className="profile-btn ghost" onClick={onClose}>Hồ sơ đầy đủ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MeetingChatPanel({ messages, user, wsRef, onClose, onOpenProfile }) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [showEmojiFor, setShowEmojiFor] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMsg = () => {
    if (!input.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "chat_message",
      projectId: null,
      content: input.trim(),
      authorName: user.name,
      authorAvatar: user.avatar,
      ...(replyTo && { replyTo: { author: replyTo.authorName, content: replyTo.content } })
    }));
    setInput("");
    setReplyTo(null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const sendReaction = () => {
    setShowEmojiFor(null);
  };

  return (
    <div className="meet-chat-panel">
      {/* Header */}
      <div className="meet-chat-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={15} style={{ color: "#7eb8ff" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Meeting Chat</span>
          <span className="meet-chat-badge">{messages.length}</span>
        </div>
        <button className="meet-icon-btn" onClick={onClose}><ChevronRight size={15} /></button>
      </div>

      {/* Messages */}
      <div className="meet-chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="meet-chat-empty">
            <MessageSquare size={28} style={{ color: "#334155", marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Chưa có tin nhắn</div>
            <div style={{ fontSize: 11, color: "#334155" }}>Bắt đầu cuộc trò chuyện!</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.authorId === user.id || m.authorName === user.name;
            const prev = messages[i - 1];
            const hideHeader = prev && prev.authorName === m.authorName &&
              (new Date(m.createdAt) - new Date(prev.createdAt) < 60000);

            return (
              <div
                key={i}
                className={`meet-msg-row ${isMe ? "mine" : ""}`}
                onMouseEnter={() => setHoveredMsg(i)}
                onMouseLeave={() => { setHoveredMsg(null); setShowEmojiFor(null); }}
              >
                {!hideHeader && !isMe && (
                  <div
                    style={{
                      cursor: 'pointer',
                      background: `hsl(${(m.authorName || "X").charCodeAt(0) * 45}, 55%, 40%)`,
                    }}
                    onClick={() => onOpenProfile(m.authorId)}
                  >
                    {m.authorAvatar ? <img src={m.authorAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} /> : (m.authorName || "?")[0]}
                  </div>
                )}
                {(hideHeader || isMe) && <div style={{ width: 28, flexShrink: 0 }} />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  {!hideHeader && (
                    <div className={`meet-msg-meta ${isMe ? "mine" : ""}`}>
                      <span className="meet-msg-author" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(m.authorId)}>{isMe ? "You" : m.authorName}</span>
                      <span className="meet-msg-time">
                        {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {m.replyTo && (
                    <div className={`meet-reply-preview ${isMe ? "mine" : ""}`}>
                      <div className="meet-reply-bar" />
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8" }}>{m.replyTo.author}</span>
                        <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{m.replyTo.content}</p>
                      </div>
                    </div>
                  )}
                  <div className={`meet-bubble ${isMe ? "mine" : ""}`}>
                    <span>{m.content}</span>
                  </div>
                </div>

                {hoveredMsg === i && (
                  <div className={`meet-msg-actions ${isMe ? "mine" : ""}`}>
                    <button className="meet-action-btn" onClick={() => setShowEmojiFor(showEmojiFor === i ? null : i)}>
                      <Smile size={12} />
                    </button>
                    <button className="meet-action-btn" onClick={() => setReplyTo(m)}>
                      <Reply size={12} />
                    </button>
                    <button className="meet-action-btn"><MoreVertical size={12} /></button>
                    {showEmojiFor === i && (
                      <div className="meet-emoji-picker">
                        {EMOJI_REACTIONS.map(e => (
                          <button key={e} className="meet-emoji-btn" onClick={() => sendReaction(i, e)}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="meet-reply-bar-zone">
          <Reply size={11} style={{ color: "#6366f1" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 700 }}>{replyTo.authorName}</span>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content}</p>
          </div>
          <button className="meet-icon-btn sm" onClick={() => setReplyTo(null)}><X size={11} /></button>
        </div>
      )}

      {/* Input */}
      <div className="meet-chat-input-zone">
        <div className="meet-input-box">
          <button className="meet-tool-btn"><Plus size={13} /></button>
          <button className="meet-tool-btn"><Smile size={13} /></button>
          <textarea
            ref={inputRef}
            className="meet-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhắn tin trong meeting..."
            rows={1}
          />
          <button
            className={`meet-send-btn ${input.trim() ? "active" : ""}`}
            onClick={sendMsg}
            disabled={!input.trim()}
          >
            <Send size={13} />
          </button>
        </div>
        <div className="meet-input-hint">Enter gửi · Shift+Enter xuống dòng</div>
      </div>
    </div>
  );
}

function AIDeadlineTab({ userId }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/tasks?owner_id=${userId}`);
        const now = new Date();
        const tasks = (data.tasks || [])
          .filter(t => t.due_date && t.status !== "done")
          .map(t => ({ ...t, diffDays: Math.ceil((new Date(t.due_date) - now) / 86400000) }))
          .sort((a, b) => a.diffDays - b.diffDays)
          .slice(0, 6);
        setReminders(tasks);
      } catch { setReminders([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [userId]);

  const urgency = (d) => {
    if (d < 0) return { color: "#ef4444", label: "Quá hạn!", icon: AlertTriangle };
    if (d <= 2) return { color: "#ef4444", label: `${d} ngày`, icon: AlertTriangle };
    if (d <= 7) return { color: "#f59e0b", label: `${d} ngày`, icon: Clock };
    return { color: "#10b981", label: `${d} ngày`, icon: CheckCircle };
  };

  return (
    <div className="meet-ai-tab">
      <div className="meet-ai-header">
        <div className="meet-ai-glow-icon"><Bot size={14} /></div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>AI Deadline Tracker</div>
          <div style={{ fontSize: 10, color: "#475569" }}>Deadline của bạn</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div className="meet-ai-dots"><span /><span /><span /></div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>Đang phân tích...</div>
        </div>
      ) : reminders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#475569" }}>
          <CheckCircle size={24} style={{ color: "#10b981", margin: "0 auto 8px", display: "block" }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Không có deadline sắp tới</div>
        </div>
      ) : (
        <>
          <div className="meet-ai-insight">
            <Zap size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
              <b style={{ color: "#f59e0b" }}>{reminders.filter(r => r.diffDays <= 7).length}</b> task sắp đến hạn
              {reminders.filter(r => r.diffDays < 0).length > 0 && (
                <>, <b style={{ color: "#ef4444" }}>{reminders.filter(r => r.diffDays < 0).length} quá hạn</b></>
              )}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reminders.map(task => {
              const u = urgency(task.diffDays);
              const Icon = u.icon;
              return (
                <div
                  key={task.id}
                  style={{
                    padding: "8px 10px",
                    background: `${u.color}0d`,
                    border: `1px solid ${u.color}25`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                    <Icon size={12} style={{ color: u.color, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: u.color, fontWeight: 700 }}>{u.label}</span>
                        <span style={{ fontSize: 9, color: "#334155" }}>·</span>
                        <span style={{ fontSize: 9, color: "#475569" }}>{task.completion_pct || 0}%</span>
                      </div>
                      <div style={{ marginTop: 4, height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1 }}>
                        <div style={{ height: "100%", width: `${task.completion_pct || 0}%`, background: u.color, borderRadius: 1 }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TranscriptTab({ transcript }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  return (
    <div className="meet-transcript" ref={scrollRef}>
      {transcript.length === 0 ? (
        <div className="meet-chat-empty">
          <Mic size={24} style={{ color: "#334155", marginBottom: 8 }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Chưa có transcript</div>
          <div style={{ fontSize: 11, color: "#334155" }}>Nhấn "Sync AI" để bắt đầu ghi</div>
        </div>
      ) : (
        transcript.map((t, i) => (
          <div key={i} className="meet-transcript-item">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div className="meet-transcript-avatar">{t.user[0]}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7eb8ff" }}>{t.user}</span>
              <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>{t.time}</span>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, paddingLeft: 24 }}>{t.text}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function MeetingRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, processMeeting } = useStore();

  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [sharedNotes, setSharedNotes] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [layoutMode, setLayoutMode] = useState("sidebar");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ x: -1000, y: -1000 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);

  const toolbarRef = useRef(null);
  const isDragging = useRef(false);
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const recognizerRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const meetTimerRef = useRef(null);

  useEffect(() => {
    const centerToolbar = () => {
      if (toolbarRef.current) {
        const rect = toolbarRef.current.getBoundingClientRect();
        setToolbarPos({ x: (window.innerWidth - rect.width) / 2, y: window.innerHeight - rect.height - 40 });
      }
    };
    setTimeout(centerToolbar, 100);
    window.addEventListener("resize", centerToolbar);
    return () => window.removeEventListener("resize", centerToolbar);
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = videoStream;
  }, [videoStream]);

  useEffect(() => {
    if (screenRef.current) screenRef.current.srcObject = screenStream;
  }, [screenStream, isScreenSharing]);

  useEffect(() => {
    initAudio();
    initWebSocket();
    meetTimerRef.current = setInterval(() => setMeetingDuration(d => d + 1), 1000);
    return () => { cleanup(); clearInterval(meetTimerRef.current); };
  }, []);

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const cleanup = () => {
    if (recognizerRef.current) recognizerRef.current.stopContinuousRecognitionAsync();
    [videoStream, audioStream, screenStream].forEach(s => s?.getTracks().forEach(t => t.stop()));
    if (wsRef.current) wsRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const initAudio = async () => {
    try {
      const as = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
      setAudioStream(as);
      initAudioVisualizer(as);
    } catch { console.error("Mic access denied"); }
  };

  const initAudioVisualizer = (as) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(as);
    source.connect(analyser); analyser.fftSize = 256;
    audioContextRef.current = audioContext;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      setVolumeLevel(sum / dataArray.length);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const initWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//localhost:3001/ws?userId=${user.id}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "meeting_event") {
        if (msg.event === "reaction") showReaction(msg.emoji, msg.userName);
        else if (msg.event === "note_update") setSharedNotes(msg.content);
      } else if (msg.type === "chat_message") {
        setChatMessages(prev => [...prev, msg]);
      }
    };
    wsRef.current = ws;
  };

  const toggleVideo = async () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null); setIsVideoOff(true);
    } else {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        setVideoStream(vs); setIsVideoOff(false);
      } catch { console.error("Camera access denied"); }
    }
  };

  const toggleMic = () => {
    const next = !isMuted;
    audioStream?.getAudioTracks().forEach(t => (t.enabled = !next));
    setIsMuted(next);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null); setIsScreenSharing(false);
    } else {
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(ss => {
        setScreenStream(ss); setIsScreenSharing(true);
        ss.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
      });
    }
  };

  const startTranscription = async () => {
    try {
      const { data: creds } = await api.get("/meetings/azure-speech-credentials");
      const config = SpeechSDK.SpeechConfig.fromSubscription(creds.key, creds.region);
      config.speechRecognitionLanguage = "vi-VN";
      const recognizer = new SpeechSDK.SpeechRecognizer(config, SpeechSDK.AudioConfig.fromDefaultMicrophoneInput());
      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          setTranscript(prev => [...prev, {
            user: user.name,
            text: e.result.text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }]);
        }
      };
      recognizer.startContinuousRecognitionAsync();
      recognizerRef.current = recognizer;
      setIsRecording(true);
    } catch {
      toast.error("Không thể kết nối Azure Speech");
    }
  };

  const sendReaction = (emoji) => {
    wsRef.current?.send(JSON.stringify({ type: "meeting_event", event: "reaction", emoji, userName: user.name }));
  };

  const showReaction = (emoji, userName) => {
    const rid = Date.now();
    setReactions(prev => [...prev, { id: rid, emoji, userName, x: Math.random() * 70 + 15 }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== rid)), 3000);
  };

  const updateNotes = (content) => {
    setSharedNotes(content);
    wsRef.current?.send(JSON.stringify({ type: "meeting_event", event: "note_update", content }));
  };

  const stopMeeting = async () => {
    const fullText = transcript.map(t => `[${t.user}]: ${t.text}`).join("\n");
    toast.promise(processMeeting(id, fullText), {
      loading: "AI đang phân tích...",
      success: "Hoàn tất phân tích!",
      error: "Có lỗi xảy ra"
    }).then(() => navigate("/meetings"));
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    const rect = toolbarRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + 270;
    const offsetY = e.clientY - rect.top + 70;
    const onMouseMove = (em) => {
      if (!isDragging.current) return;
      setToolbarPos({ x: em.clientX - offsetX, y: em.clientY - offsetY });
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const SIDEBAR_TABS = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "ai", label: "AI", icon: Bot },
    { id: "transcript", label: "Live", icon: Mic },
    { id: "notes", label: "Notes", icon: FileEdit },
  ];

  return (
    <div className="meet-room">
      {/* Floating reactions */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }}>
        {reactions.map(r => (
          <div key={r.id} className="reaction-bubble" style={{ left: `${r.x}%` }}>
            <span style={{ fontSize: 36 }}>{r.emoji}</span>
            <div style={{ fontSize: 10, color: "white", background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: 10 }}>
              {r.userName}
            </div>
          </div>
        ))}
      </div>

      {/* Main video area */}
      <div className="meet-video-section">
        {/* Top status bar */}
        <div className="meet-status-bar">
          <div className="meet-status-left">
            <div className="meet-rec-dot" />
            <span className="meet-duration">{formatDuration(meetingDuration)}</span>
            {isRecording && (
              <span className="meet-rec-badge">
                <div className="meet-rec-anim" /> REC
              </span>
            )}
          </div>
          <div className="meet-room-name">Meeting Room #{id?.slice(0, 8) || "Live"}</div>
          <div className="meet-status-right">
            <div className="meet-participants">
              <Users size={12} />
              <span>2 người</span>
            </div>
          </div>
        </div>

        {/* Video grid */}
        <div className="meet-video-area" style={{
          gridTemplateColumns: layoutMode === "grid" && isScreenSharing ? "1.5fr 1fr" : "1fr",
          gridTemplateRows: layoutMode === "spotlight" && isScreenSharing ? "1fr 180px" : "1fr",
        }}>
          <div className="meet-video-card main">
            <div className="meet-video-inner">
              {isScreenSharing ? (
                <video ref={screenRef} autoPlay playsInline className="meet-video-el" style={{ objectFit: layoutMode === "sidebar" ? "cover" : "contain" }} />
              ) : videoStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="meet-video-el" />
              ) : (
                <div className="meet-avatar-stage">
                  <div className="meet-voice-ring" style={{ opacity: volumeLevel / 100, transform: `scale(${1 + volumeLevel / 150})` }} />
                  <div className="meet-user-avatar">
                    {user.name[0]}
                    {!isMuted && volumeLevel > 10 && <div className="meet-speaking-glow" />}
                  </div>
                  <div className="meet-user-label">
                    <span>{user.name}</span>
                    {isMuted ? <MicOff size={12} style={{ color: "#ef4444" }} /> : <Mic size={12} style={{ color: "#10b981" }} />}
                  </div>
                </div>
              )}
            </div>
            {isScreenSharing && layoutMode !== "sidebar" && (
              <div className="meet-video-pip">
                {videoStream ? (
                  <video ref={videoRef} autoPlay playsInline muted className="meet-video-el" />
                ) : (
                  <div className="meet-pip-avatar">{user.name[0]}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Layout picker floating menu */}
        {showLayoutMenu && (
          <div className="meet-layout-menu">
            {[
              { id: "sidebar", icon: Sidebar, label: "Sidebar" },
              { id: "spotlight", icon: Monitor, label: "Spotlight" },
              { id: "grid", icon: Grid, label: "Grid" },
            ].map(m => (
              <button
                key={m.id}
                className={`meet-layout-btn ${layoutMode === m.id ? "active" : ""}`}
                onClick={() => { setLayoutMode(m.id); setShowLayoutMenu(false); }}
              >
                <m.icon size={18} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Draggable Control Toolbar */}
        <div
          ref={toolbarRef}
          className="meet-toolbar-wrap"
          style={{ position: "absolute", left: toolbarPos.x, top: toolbarPos.y, zIndex: 1000 }}
        >
          {isMinimized ? (
            <button className="meet-tb-minimized" onClick={() => setIsMinimized(false)} onMouseDown={handleMouseDown}>
              <Settings size={22} />
            </button>
          ) : (
            <div className="meet-toolbar">
              <div className="meet-tb-drag" onMouseDown={handleMouseDown}>
                <GripHorizontal size={16} />
              </div>

              <div className="meet-tb-group">
                <button className={`meet-tb-btn ${isMuted ? "danger" : ""}`} onClick={toggleMic} title={isMuted ? "Bật mic" : "Tắt mic"}>
                  {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
                  <span>{isMuted ? "Mic off" : "Mic"}</span>
                </button>
                <button className={`meet-tb-btn ${isVideoOff ? "danger" : ""}`} onClick={toggleVideo} title={isVideoOff ? "Bật camera" : "Tắt camera"}>
                  {isVideoOff ? <VideoOff size={17} /> : <Video size={17} />}
                  <span>{isVideoOff ? "Cam off" : "Camera"}</span>
                </button>
                <button className={`meet-tb-btn ${isScreenSharing ? "active" : ""}`} onClick={toggleScreenShare} title="Chia sẻ màn hình">
                  <MonitorUp size={17} />
                  <span>Share</span>
                </button>
                <button className={`meet-tb-btn ${showLayoutMenu ? "active" : ""}`} onClick={() => setShowLayoutMenu(!showLayoutMenu)} title="Bố cục">
                  <Layout size={17} />
                  <span>Layout</span>
                </button>
              </div>

              <div className="meet-tb-divider" />

              <div className="meet-tb-reactions">
                {["👍", "❤️", "👏", "🔥", "🎉"].map(e => (
                  <button key={e} className="meet-react-btn" onClick={() => sendReaction(e)}>{e}</button>
                ))}
              </div>

              <div className="meet-tb-divider" />

              <button className="meet-tb-ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Sidebar size={17} style={{ color: isSidebarOpen ? "#7eb8ff" : undefined }} />
              </button>

              <button className={`meet-tb-action ${isRecording ? "rec" : "sync"}`} onClick={isRecording ? stopMeeting : startTranscription}>
                {isRecording ? <><PhoneOff size={15} /> Kết thúc</> : <><Zap size={15} /> Sync AI</>}
              </button>

              <button className="meet-tb-ghost sm" onClick={() => setIsMinimized(true)}>
                <Minimize2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Panel */}
      <div className={`meet-sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
        {/* Tab bar */}
        <div className="meet-tab-bar">
          {SIDEBAR_TABS.map(tab => (
            <button
              key={tab.id}
              className={`meet-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
              {tab.id === "chat" && chatMessages.length > 0 && (
                <span className="meet-tab-badge">{chatMessages.length}</span>
              )}
            </button>
          ))}
          <button className="meet-close-sidebar" onClick={() => setIsSidebarOpen(false)}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Tab content */}
        <div className="meet-tab-content">
          {activeTab === "chat" && (
            <MeetingChatPanel
              messages={chatMessages}
              user={user}
              wsRef={wsRef}
              onClose={() => setIsSidebarOpen(false)}
              onOpenProfile={(id) => setSelectedProfileId(id)}
            />
          )}

          {activeTab === "ai" && <AIDeadlineTab userId={user.id} />}

          {activeTab === "transcript" && <TranscriptTab transcript={transcript} />}

          {activeTab === "notes" && (
            <div className="meet-notes-tab">
              <div className="meet-notes-header">
                <Hash size={12} style={{ color: "#6366f1" }} />
                <span>Shared Notes</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#334155" }}>Sync tự động</span>
              </div>
              <textarea
                className="meet-notes-area"
                value={sharedNotes}
                onChange={e => updateNotes(e.target.value)}
                placeholder="Ghi chú cuộc họp... (đồng bộ realtime với team)"
              />
            </div>
          )}
        </div>
      </div>

      {selectedProfileId && <ProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />}

      <style>{`
        /* ── Profile Modal ── */
        .meet-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center; z-index: 3000;
          backdrop-filter: blur(8px);
        }
        .meet-modal-content.profile { width: 320px; background: #0f172a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
        .profile-banner { height: 80px; width: 100%; }
        .profile-body { padding: 16px; position: relative; }
        .profile-avatar-wrap { position: absolute; top: -40px; left: 16px; border: 3px solid #0f172a; border-radius: 16px; }
        .profile-avatar { width: 70px; height: 70px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: white; overflow: hidden; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info { margin-top: 35px; }
        .profile-name { font-size: 18px; font-weight: 800; color: white; margin-bottom: 2px; }
        .profile-email { font-size: 11px; color: #64748b; margin-bottom: 12px; }
        .profile-badges { display: flex; gap: 6px; margin-bottom: 20px; }
        .profile-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: rgba(255,255,255,0.04); color: #94a3b8; }
        .profile-badge.online { background: rgba(16,185,129,0.1); color: #10b981; }
        .profile-actions { display: flex; gap: 8px; }
        .profile-btn { flex: 1; padding: 8px; border-radius: 10px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .profile-btn.primary { background: #6366f1; color: white; }
        .profile-btn.primary:hover { background: #4f46e5; }
        .profile-btn.ghost { background: rgba(255,255,255,0.04); color: #e2e8f0; }

        /* ── Room Layout ── */
        .meet-room {
          height: calc(100vh - 64px);
          display: flex;
          background: #070c18;
          margin: -28px -32px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          color: #e2e8f0;
        }

        /* ── Video Section ── */
        .meet-video-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .meet-status-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: linear-gradient(to bottom, rgba(7,12,24,0.95), transparent);
          z-index: 20;
        }
        .meet-status-left { display: flex; align-items: center; gap: 8px; }
        .meet-rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
        .meet-duration { font-size: 13px; font-weight: 700; color: white; font-variant-numeric: tabular-nums; }
        .meet-rec-badge {
          display: flex; align-items: center; gap: 5px;
          padding: 3px 8px; border-radius: 6px;
          background: rgba(239,68,68,0.15); 
          border: 1px solid rgba(239,68,68,0.25);
          font-size: 10px; font-weight: 700; color: #ef4444;
        }
        .meet-rec-anim {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444;
          animation: recBlink 1s infinite;
        }
        @keyframes recBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .meet-room-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.6); }
        .meet-status-right { display: flex; align-items: center; }
        .meet-participants {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #64748b;
          padding: 4px 10px;
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .meet-video-area {
          flex: 1;
          display: grid;
          gap: 16px;
          padding: 60px 20px 120px;
        }
        .meet-video-card.main {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          background: #0f1629;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .meet-video-inner { width: 100%; height: 100%; }
        .meet-video-el { width: 100%; height: 100%; object-fit: cover; display: block; }

        .meet-avatar-stage {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(ellipse at center, #141e35 0%, #080d1a 70%);
          position: relative;
          flex-direction: column; gap: 12px;
        }
        .meet-voice-ring {
          position: absolute;
          width: 180px; height: 180px;
          border-radius: 50%;
          border: 2px solid #4f8ef7;
          transition: all 0.1s;
        }
        .meet-user-avatar {
          width: 120px; height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 52px; font-weight: 800; color: white;
          position: relative;
          box-shadow: 0 0 40px rgba(79,70,229,0.4);
        }
        .meet-speaking-glow {
          position: absolute; inset: -6px;
          border-radius: 50%;
          border: 2px solid #4f8ef7;
          animation: speakPulse 0.8s ease-in-out infinite;
        }
        @keyframes speakPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.04); }
        }
        .meet-user-label {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 14px;
          background: rgba(0,0,0,0.6);
          border-radius: 20px;
          font-size: 13px; font-weight: 600; color: white;
        }

        .meet-video-pip {
          position: absolute; bottom: 16px; right: 16px;
          width: 160px; height: 90px;
          border-radius: 12px; overflow: hidden;
          border: 2px solid #4f8ef7;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          background: #1e293b;
        }
        .meet-pip-avatar {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 800;
          background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;
        }

        /* ── Layout Menu ── */
        .meet-layout-menu {
          position: absolute; bottom: 130px; left: 50%;
          transform: translateX(-50%);
          background: rgba(15,22,41,0.98);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 12px;
          display: flex; gap: 8px;
          z-index: 1200;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          backdrop-filter: blur(20px);
        }
        .meet-layout-btn {
          padding: 10px 14px;
          border-radius: 10px; border: none;
          background: rgba(255,255,255,0.04);
          color: #94a3b8; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600;
          transition: 0.2s; min-width: 70px;
        }
        .meet-layout-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .meet-layout-btn.active { background: rgba(79,142,247,0.15); color: #7eb8ff; border: 1px solid rgba(79,142,247,0.25); }

        /* ── Toolbar ── */
        .meet-toolbar-wrap { z-index: 1000; }
        .meet-tb-minimized {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(79,142,247,0.15);
          border: 1px solid rgba(79,142,247,0.3);
          color: #7eb8ff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(79,142,247,0.25);
          transition: 0.2s;
        }
        .meet-tb-minimized:hover { background: rgba(79,142,247,0.25); transform: scale(1.05); }
        .meet-toolbar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          background: rgba(10,16,31,0.95);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02);
        }
        .meet-tb-drag {
          padding: 4px 6px; cursor: grab; color: #334155;
          display: flex; align-items: center;
        }
        .meet-tb-group { display: flex; gap: 4px; }
        .meet-tb-btn {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 7px 10px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.04);
          color: #94a3b8; cursor: pointer; transition: 0.2s;
          font-size: 9px; font-weight: 600; min-width: 52px;
        }
        .meet-tb-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .meet-tb-btn.danger { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.2); }
        .meet-tb-btn.active { background: rgba(79,142,247,0.12); color: #7eb8ff; border-color: rgba(79,142,247,0.2); }
        .meet-tb-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.07); margin: 0 2px; }
        .meet-tb-reactions { display: flex; gap: 2px; }
        .meet-react-btn {
          width: 32px; height: 32px;
          border: none; background: none;
          font-size: 16px; cursor: pointer;
          border-radius: 8px; transition: 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .meet-react-btn:hover { background: rgba(255,255,255,0.08); transform: scale(1.3); }
        .meet-tb-ghost {
          width: 36px; height: 36px; border-radius: 10px;
          border: none; background: none;
          color: #64748b; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.2s;
        }
        .meet-tb-ghost:hover { background: rgba(255,255,255,0.06); color: white; }
        .meet-tb-ghost.sm { width: 30px; height: 30px; border-radius: 8px; }
        .meet-tb-action {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 12px;
          border: none; cursor: pointer;
          font-size: 12px; font-weight: 700;
          transition: 0.2s;
        }
        .meet-tb-action.sync { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; box-shadow: 0 4px 16px rgba(79,70,229,0.3); }
        .meet-tb-action.sync:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,70,229,0.4); }
        .meet-tb-action.rec { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .meet-tb-action.rec:hover { background: rgba(239,68,68,0.25); }

        /* ── Reaction Bubbles ── */
        .reaction-bubble {
          position: absolute; bottom: 100px;
          display: flex; flex-direction: column; align-items: center;
          animation: floatUp 3s forwards;
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(0); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-400px); }
        }

        /* ── Sidebar Panel ── */
        .meet-sidebar-panel {
          width: 0;
          background: #070c18;
          border-left: 1px solid rgba(255,255,255,0.05);
          display: flex; flex-direction: column;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          flex-shrink: 0;
        }
        .meet-sidebar-panel.open { width: 340px; }

        .meet-tab-bar {
          display: flex;
          padding: 6px 8px;
          gap: 2px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
          background: rgba(255,255,255,0.01);
        }
        .meet-tab {
          flex: 1; padding: 7px 6px;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          background: none; border: none; border-radius: 8px;
          color: #475569; cursor: pointer; transition: 0.15s;
          font-size: 9px; font-weight: 700; position: relative;
        }
        .meet-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
        .meet-tab.active { color: #7eb8ff; background: rgba(79,142,247,0.08); }
        .meet-tab-badge {
          position: absolute; top: 4px; right: 4px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #ef4444; color: white;
          font-size: 8px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .meet-close-sidebar {
          padding: 7px 6px; border-radius: 8px;
          border: none; background: none;
          color: #334155; cursor: pointer; transition: 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .meet-close-sidebar:hover { color: #64748b; background: rgba(255,255,255,0.03); }

        .meet-tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

        /* ── Chat Panel ── */
        .meet-chat-panel { display: flex; flex-direction: column; height: 100%; }
        .meet-chat-header {
          padding: 10px 14px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0;
        }
        .meet-chat-badge {
          font-size: 9px; font-weight: 800;
          padding: 1px 5px; border-radius: 8px;
          background: rgba(79,142,247,0.12); color: #7eb8ff;
        }

        .meet-chat-messages { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
        .meet-chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px 16px; }

        .meet-msg-row {
          display: flex; gap: 8px; align-items: flex-start;
          padding: 3px 6px; border-radius: 8px;
          transition: background 0.1s; position: relative;
        }
        .meet-msg-row:hover { background: rgba(255,255,255,0.02); }
        .meet-msg-avatar {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: white;
          flex-shrink: 0; margin-top: 2px;
        }
        .meet-msg-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .meet-msg-meta.mine { flex-direction: row-reverse; }
        .meet-msg-author { font-size: 12px; font-weight: 700; color: #94a3b8; }
        .meet-msg-time { font-size: 10px; color: #334155; }
        .meet-bubble {
          display: inline-block;
          padding: 7px 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 4px 10px 10px 10px;
          font-size: 13px; color: #cbd5e1; line-height: 1.55;
          max-width: 85%; word-wrap: break-word;
        }
        .meet-bubble.mine {
          background: linear-gradient(135deg, rgba(79,70,229,0.25), rgba(124,58,237,0.2));
          border-color: rgba(79,70,229,0.25);
          border-radius: 10px 4px 10px 10px;
          color: #e2e8f0;
        }
        .meet-msg-actions {
          position: absolute; top: 50%; right: 6px;
          transform: translateY(-50%);
          display: flex; gap: 1px;
          background: rgba(7,12,24,0.95);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; padding: 2px 3px;
          z-index: 10;
        }
        .meet-msg-actions.mine { right: auto; left: 6px; }
        .meet-action-btn {
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px; border: none;
          background: none; color: #475569; cursor: pointer; transition: 0.1s;
        }
        .meet-action-btn:hover { background: rgba(255,255,255,0.07); color: #94a3b8; }
        .meet-emoji-picker {
          position: absolute; right: 0; top: 110%;
          background: #141e35;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 6px;
          display: flex; flex-wrap: wrap; gap: 3px;
          width: 160px; z-index: 30;
          box-shadow: 0 12px 28px rgba(0,0,0,0.5);
        }
        .meet-emoji-btn {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 5px; border: none;
          background: none; font-size: 15px; cursor: pointer;
        }
        .meet-emoji-btn:hover { background: rgba(255,255,255,0.07); transform: scale(1.2); }
        .meet-reply-preview {
          display: flex; gap: 6px; align-items: flex-start;
          padding: 4px 8px; margin-bottom: 3px;
          background: rgba(255,255,255,0.02);
          border-radius: 6px; border-left: 2px solid #6366f1;
        }
        .meet-reply-preview.mine { border-left: none; border-right: 2px solid #6366f1; }

        .meet-reply-bar-zone {
          padding: 6px 12px;
          display: flex; align-items: center; gap: 8px;
          background: rgba(99,102,241,0.05);
          border-top: 1px solid rgba(99,102,241,0.12);
          font-size: 11px; flex-shrink: 0;
        }
        .meet-reply-bar { width: 3px; background: #6366f1; border-radius: 2px; align-self: stretch; }

        .meet-chat-input-zone { padding: 10px 10px 12px; flex-shrink: 0; }
        .meet-input-box {
          display: flex; align-items: flex-end; gap: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 7px 10px;
          transition: border-color 0.2s;
        }
        .meet-input-box:focus-within { border-color: rgba(79,142,247,0.25); }
        .meet-tool-btn {
          width: 24px; height: 24px; border-radius: 5px;
          border: none; background: none; color: #475569;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: 0.15s;
        }
        .meet-tool-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.05); }
        .meet-textarea {
          flex: 1; background: none; border: none; outline: none;
          color: #e2e8f0; font-size: 13px;
          font-family: 'Inter', sans-serif;
          resize: none; max-height: 100px; line-height: 1.5;
        }
        .meet-textarea::placeholder { color: #334155; }
        .meet-send-btn {
          width: 28px; height: 28px; border-radius: 7px;
          border: none; background: rgba(255,255,255,0.04);
          color: #475569; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: 0.2s;
        }
        .meet-send-btn.active {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .meet-input-hint { font-size: 9px; color: #334155; text-align: center; margin-top: 5px; }
        .meet-icon-btn {
          width: 26px; height: 26px; border-radius: 6px;
          border: none; background: rgba(255,255,255,0.04);
          color: #475569; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.15s;
        }
        .meet-icon-btn:hover { background: rgba(255,255,255,0.07); color: #94a3b8; }
        .meet-icon-btn.sm { width: 22px; height: 22px; border-radius: 5px; }

        /* ── AI Tab ── */
        .meet-ai-tab { padding: 12px 10px; display: flex; flex-direction: column; gap: 10px; }
        .meet-ai-header { display: flex; align-items: center; gap: 8px; }
        .meet-ai-glow-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          color: white; box-shadow: 0 4px 10px rgba(79,70,229,0.3);
          flex-shrink: 0;
        }
        .meet-ai-dots { display: flex; justify-content: center; gap: 5px; }
        .meet-ai-dots span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4f8ef7;
          animation: aiAnim 1.4s infinite;
        }
        .meet-ai-dots span:nth-child(2) { animation-delay: 0.2s; }
        .meet-ai-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aiAnim { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .meet-ai-insight {
          display: flex; gap: 7px; align-items: flex-start;
          padding: 8px 10px;
          background: rgba(245,158,11,0.05);
          border: 1px solid rgba(245,158,11,0.1);
          border-radius: 8px;
        }

        /* ── Transcript Tab ── */
        .meet-transcript { flex: 1; overflow-y: auto; padding: 10px 10px; display: flex; flex-direction: column; gap: 10px; }
        .meet-transcript-item {
          padding: 10px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 10px;
        }
        .meet-transcript-avatar {
          width: 20px; height: 20px; border-radius: 5px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: white; flex-shrink: 0;
        }

        /* ── Notes Tab ── */
        .meet-notes-tab { display: flex; flex-direction: column; height: 100%; }
        .meet-notes-header {
          padding: 8px 14px;
          display: flex; align-items: center; gap: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 11px; font-weight: 600; color: #64748b;
          flex-shrink: 0;
        }
        .meet-notes-area {
          flex: 1; padding: 14px;
          background: transparent; border: none; resize: none;
          color: #e2e8f0; font-size: 13px;
          font-family: 'Inter', sans-serif;
          line-height: 1.8; outline: none;
        }
        .meet-notes-area::placeholder { color: #334155; }

        /* Scrollbars */
        .meet-chat-messages::-webkit-scrollbar,
        .meet-transcript::-webkit-scrollbar,
        .meet-ai-tab::-webkit-scrollbar { width: 3px; }
        .meet-chat-messages::-webkit-scrollbar-thumb,
        .meet-transcript::-webkit-scrollbar-thumb,
        .meet-ai-tab::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
      `}</style>
    </div>
  );
}
