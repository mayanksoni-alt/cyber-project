import { useState } from 'react';
import { login, setToken } from '../api.js';
import HydrogenAtom from './HydrogenAtom.jsx';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function LoginPage({ onAuthSuccess, navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setBusy(true);
    try {
      const data = await login({ email: email.trim(), password });
      setToken(data.token);
      onAuthSuccess(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-shell">
      <aside className="auth-showcase">
        <div className="eyebrow-tag">
          <span className="status-dot" />
          Account Access
        </div>

        <div className="auth-showcase-center">
          <HydrogenAtom size={160} scanning={busy} floating label="Hydrogen orbital emblem" />
          <h2>Welcome back to SentryScan</h2>
          <p className="muted">
            Sign in to view your saved scan reports, track security scores over time, and export
            findings.
          </p>
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>Same-origin crawler with OWASP security checks</span>
          </div>
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>Saved scan history with JSON &amp; Markdown export</span>
          </div>
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>Salted scrypt passwords &amp; signed session tokens</span>
          </div>
        </div>
      </aside>

      <div className="card auth-card">
        <h2>Log in</h2>
        <p className="muted">Enter your email and password to continue.</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <div className="input-wrap">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrap has-toggle">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-switch">
          Don&apos;t have an account?{' '}
          <button type="button" className="link-btn" onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </div>
      </div>
    </section>
  );
}
