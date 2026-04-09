/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from 'react';
import { Send, Zap, User, RefreshCw, Bot } from 'lucide-react';
import useStore from '../store/useStore';

export default function AIAssistantPage() {
  const { projects, loadProjects, chat } = useStore();
  const [projectId, setProjectId] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Project Intelligence Assistant. Ask me anything about your tasks, project risks, timelines, or ask me to generate a summary.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-5).map(({ role, content }) => ({ role, content }));
      
      const res = await chat(userMsg.content, projectId || undefined, history);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.reply,
        confidence: res.confidence
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="page-header-left">
          <h1>🤖 AI Assistant</h1>
          <p>Context-aware project Q&A</p>
        </div>
        <div className="form-group" style={{ minWidth: 250 }}>
          <select className="select" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Global Context (All Projects)</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              <div className={`avatar avatar-sm ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`} style={{ background: msg.role === 'user' ? 'var(--bg-elevated)' : undefined }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '100%' }}>
                <div className="chat-bubble-content" style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                {msg.confidence && msg.role === 'assistant' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    Confidence: {Math.round(msg.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble ai">
              <div className="avatar avatar-sm ai-avatar"><Bot size={14} /></div>
              <div className="chat-bubble-content" style={{ display: 'flex', padding: '12px 20px' }}>
                <div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
            <input 
              className="input" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder={projectId ? "Ask about this project..." : "Ask a general question..."}
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-icon" disabled={!input.trim() || loading} style={{ width: 44, height: 44, borderRadius: 'var(--radius)' }}>
              <Send size={18} />
            </button>
          </form>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            AI can make mistakes. Always verify critical project decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
