/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, X, Play, RefreshCw, TrendingUp, AlertTriangle, Users, Clock } from 'lucide-react';
import useStore from '../store/useStore';

export default function SimulationPage() {
  const { id } = useParams();
  const { loadProject, currentProject, runSimulation, aiProcessing } = useStore();
  const [scenario, setScenario] = useState('');
  const [simName, setSimName] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const EXAMPLE_SCENARIOS = [
    "If we delay Task A by 5 days, what happens to the overall timeline?",
    "What if Dev Alpha is unavailable for 2 weeks?",
    "If we reduce scope by removing testing tasks, what's the impact?",
    "What happens if we add one more developer to the team?",
    "If the deadline is moved forward by 2 weeks, what risks increase?",
  ];

  useEffect(() => {
    loadProject(id).finally(() => setLoading(false));
    import('../lib/api').then(({ default: api }) => {
      api.get(`/ai/simulations/${id}`).then(r => setHistory(r.data.simulations || [])).catch((err) => { console.error(err); });
    });
  }, [id]);

  const handleRun = async () => {
    if (!scenario.trim()) return;
    const data = await runSimulation({ scenario, project_id: id, name: simName || `Sim ${Date.now()}` });
    setResult(data.result);
    import('../lib/api').then(({ default: api }) => {
      api.get(`/ai/simulations/${id}`).then(r => setHistory(r.data.simulations || [])).catch((err) => { console.error(err); });
    });
  };

  if (loading) return <div className="empty-state"><div className="ai-thinking"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>🔬 What-If Simulation</h1>
          <p>{currentProject?.project?.name} · Model scenarios before committing</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>⚙️ Configure Scenario</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Simulation Name (optional)</label>
                <input className="input" value={simName} onChange={e => setSimName(e.target.value)} placeholder="e.g. Dev Unavailability Scenario" />
              </div>
              <div className="form-group">
                <label className="form-label">Describe Your Scenario *</label>
                <textarea
                  className="textarea"
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  placeholder="Describe what you want to simulate in natural language..."
                  style={{ minHeight: 120 }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleRun} disabled={aiProcessing || !scenario.trim()}>
                {aiProcessing ? <><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /> Simulating...</> : <><Play size={16} /> Run Simulation</>}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>💡 Example Scenarios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLE_SCENARIOS.map((ex, i) => (
                <button
                  key={i}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScenario(ex)}
                  style={{ textAlign: 'left', justifyContent: 'flex-start', height: 'auto', padding: '8px 12px', fontWeight: 400, lineHeight: 1.4 }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>📜 Past Simulations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 5).map(s => {
                  const r = typeof s.result === 'string' ? JSON.parse(s.result || '{}') : (s.result || {});
                  return (
                    <div
                      key={s.id}
                      style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', border: '1px solid var(--border)' }}
                      onClick={() => { setScenario(s.scenario); setResult(r); }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="truncate">{s.scenario}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          {!result ? (
            <div className="card empty-state" style={{ minHeight: 400 }}>
              <div style={{ fontSize: 48 }}>🔬</div>
              <div className="empty-state-title">Run a simulation</div>
              <div className="empty-state-desc">Describe a scenario to see its impact on your project timeline, resources, and risk.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(79,142,247,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 24 }}>🤖</div>
                  <div className="card-title">AI Analysis</div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.scenario_summary}</div>
                {result.trade_off_summary && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{result.trade_off_summary}"
                  </div>
                )}
              </div>

              {result.timeline_impact && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}><Clock size={16} /> Timeline Impact</div>
                  <div className="grid-2">
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: result.timeline_impact.days_added > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {result.timeline_impact.days_added > 0 ? '+' : ''}{result.timeline_impact.days_added}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Days Impact</div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {result.timeline_impact.new_end_date || 'See details'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>New End Date</div>
                    </div>
                  </div>
                  {result.timeline_impact.critical_path_changed && (
                    <div style={{ marginTop: 12, background: 'var(--danger-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠ Critical path changes under this scenario
                    </div>
                  )}
                </div>
              )}

              {result.risk_delta && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}><AlertTriangle size={16} /> Risk Delta</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{result.risk_delta.before}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Risk</div>
                    </div>
                    <div style={{ fontSize: 24, color: result.risk_delta.change === 'increased' ? 'var(--danger)' : 'var(--success)' }}>
                      {result.risk_delta.change === 'increased' ? '↑' : result.risk_delta.change === 'decreased' ? '↓' : '→'}
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: result.risk_delta.change === 'increased' ? 'var(--danger)' : 'var(--success)' }}>{result.risk_delta.after}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Projected Risk</div>
                    </div>
                  </div>
                </div>
              )}

              {result.alternative_options?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>💡 Alternative Options</div>
                  {result.alternative_options.map((opt, i) => (
                    <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                        Option {i + 1}: {opt.option}
                        {opt.timeline_impact_days !== 0 && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: opt.timeline_impact_days > 0 ? 'var(--warning)' : 'var(--success)' }}>
                            {opt.timeline_impact_days > 0 ? `+${opt.timeline_impact_days}d` : `${opt.timeline_impact_days}d`}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', marginBottom: 4, textTransform: 'uppercase' }}>Pros</div>
                          {opt.pros?.map((p, j) => <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✓ {p}</div>)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', marginBottom: 4, textTransform: 'uppercase' }}>Cons</div>
                          {opt.cons?.map((c, j) => <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✗ {c}</div>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 12 }}>📌 Recommendations</div>
                  {result.recommendations.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < result.recommendations.length - 1 ? '1px solid var(--border)' : undefined }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{i + 1}.</span>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
