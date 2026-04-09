import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import api from '../lib/api';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'contributor' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);
  const { login, register } = useStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    try {
      await api.post('/seed');
      setSeeded(true);
      setForm({ email: 'admin@cwb.com', password: 'password123', name: '', role: 'contributor' });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" style={{ width: 500, height: 500, background: '#4f8ef7', top: -100, left: -100 }} />
      <div className="auth-bg-glow" style={{ width: 400, height: 400, background: '#7c3aed', bottom: -100, right: -100 }} />

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: '0 0 40px var(--primary-glow)' }}>
            🧠
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            CWB Intelligence
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            AI-Powered Project Intelligence Platform
          </p>
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <div className={`tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Sign In</div>
          <div className={`tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>Register</div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--danger)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {seeded && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--success)', marginBottom: 16 }}>
            ✅ Demo data seeded! Use: admin@cwb.com / password123
          </div>
        )}

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="project_manager">Project Manager</option>
              </select>
            </div>
          )}

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>New installation? Load demo data</p>
          <button className="btn btn-secondary w-full" onClick={seedData}>
            🚀 Seed Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
