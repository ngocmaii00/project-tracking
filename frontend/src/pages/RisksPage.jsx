/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Shield, CheckCircle, Zap } from 'lucide-react';
import useStore from '../store/useStore';

export default function RisksPage() {
  const { id } = useParams();
  const { loadProject, currentProject, risks, loadRisks, runRiskAnalysis, aiProcessing, loadUsers } = useStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, mitigated

  useEffect(() => {
    Promise.all([loadProject(id), loadRisks(id), loadUsers()]).finally(() => setLoading(false));
  }, [id]);

  const handleAnalysis = async () => {
    await runRiskAnalysis(id);
    await loadRisks(id);
  };

  const filteredRisks = risks.filter(r => filter === 'all' || r.status === filter);
  
  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Risk Register</h1>
          <p>{currentProject?.project?.name} · Active risk tracking</p>
        </div>
        <button className="btn btn-primary" onClick={handleAnalysis} disabled={aiProcessing}>
          {aiProcessing ? <><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /> Analyzing...</> : <><Zap size={16} /> AI Risk Scan</>}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card danger card-sm">
          <div className="stat-label">Project Risk Score</div>
          <div className="stat-value">{Math.round(currentProject?.project?.risk_score || 0)}/100</div>
        </div>
        <div className="stat-card warning card-sm">
          <div className="stat-label">High Risks</div>
          <div className="stat-value">{risks.filter(r => r.risk_score > 60).length}</div>
        </div>
        <div className="stat-card accent card-sm">
          <div className="stat-label">Open Issues</div>
          <div className="stat-value">{risks.filter(r => r.status === 'open').length}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        <div className={`tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All Risks</div>
        <div className={`tab${filter === 'open' ? ' active' : ''}`} onClick={() => setFilter('open')}>Open</div>
        <div className={`tab${filter === 'mitigated' ? ' active' : ''}`} onClick={() => setFilter('mitigated')}>Mitigated</div>
      </div>

      {filteredRisks.length === 0 ? (
        <div className="empty-state card">
          <Shield size={48} style={{ color: 'var(--success)', opacity: 0.5, marginBottom: 16 }} />
          <div className="empty-state-title">No risks found</div>
          <div className="empty-state-desc">The project looks healthy. Run an AI Risk Scan to detect hidden issues like resource overload or schedule conflicts.</div>
          <button className="btn btn-primary" onClick={handleAnalysis}><Zap size={16} /> Run Full Scan</button>
        </div>
      ) : (
        <div className="grid-2">
          {filteredRisks.map(r => (
            <div key={r.id} className="card" style={{ border: r.risk_score > 60 ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className={`badge badge-${r.category}`} style={{ textTransform: 'capitalize' }}>{r.category}</span>
                    <span className={`badge ${r.status === 'open' ? 'badge-in_progress' : 'badge-done'}`} style={{ textTransform: 'capitalize' }}>{r.status}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</h3>
                </div>
                <div className={`risk-score ${r.risk_score > 60 ? 'risk-high' : r.risk_score > 30 ? 'risk-medium' : 'risk-low'}`} style={{ padding: '6px 12px', fontSize: 16 }}>
                  {r.risk_score}
                </div>
              </div>

              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, minHeight: 40 }}>
                {r.description}
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Probability</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(r.probability * 100)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Impact</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(r.impact * 100)}%</div>
                </div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>🛡️ AI Mitigation Strategy</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {r.mitigation || 'No strategy defined.'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
