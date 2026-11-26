import { useMemo, useState } from 'react';
import { signup, setToken } from '../api.js';
import HydrogenAtom from './HydrogenAtom.jsx';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: 'Use at least 8 characters' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;

  const labels = [
    'Too short (minimum 8 characters)',
    'Weak — add uppercase, numbers, or symbols',
    'Fair — getting stronger',
    'Strong password',
    'Very strong password',
  ];
  return { score, label: labels[score] };
}

export default function SignupPage({ onAuthSuccess, navigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please confirm that you will only scan authorized targets.');
      return;
    }

    setBusy(true);
    try {
      const data = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        organization: organization.trim(),
      });
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
          New Account
        </div>

        <div className="auth-showcase-center">
          <HydrogenAtom size={160} scanning={busy} floating label="Hydrogen orbital emblem" />
          <h2>Create your NetHawk account</h2>
          <p className="muted">
            Keep a personal log of your scans, compare security grades, and export clean reports
            whenever you need them.
          </p>
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>10+ non-destructive OWASP Top 10 checks</span>
          </div>
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>Clear A–F grades with severity filters</span>
          </div>
          <div className="auth-feature">
            <span className="feature-check"><CheckIcon /></span>
            <span>Personal scan history and profile summary</span>
          </div>
        </div>
      </aside>

      <div className="card auth-card">
        <h2>Sign up</h2>
        <p className="muted">Fill in your details below to get started.</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="signup-name">Full name</label>
            <div className="input-wrap">
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-email">Email address</label>
            <div className="input-wrap">
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-org">Organization (optional)</label>
            <div className="input-wrap">
              <input
                id="signup-org"
                type="text"
                autoComplete="organization"
                placeholder="Security Team"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <div className="input-wrap has-toggle">
              <input
                id="signup-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
            <div className="strength-meter" aria-live="polite">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className={`strength-bar ${
                      strength.score >= idx ? `filled-${strength.score}` : ''
                    }`}
                  />
                ))}
              </div>
              <span className="strength-label">{strength.label}</span>
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="signup-confirm">Confirm password</label>
              {passwordsMatch && <span className="match-hint ok">Passwords match ✓</span>}
              {passwordsMismatch && <span className="match-hint bad">Does not match</span>}
            </div>
            <div className="input-wrap">
              <input
                id="signup-confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
                required
              />
            </div>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={busy}
            />
            <span>
              I confirm I will only scan websites I own or have written permission to test.
            </span>
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="link-btn" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
      </div>
    </section>
  );
}
