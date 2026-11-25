import { useEffect, useState } from 'react';
import { getMe, updateProfile } from '../api.js';
import HydrogenAtom from './HydrogenAtom.jsx';

export default function ProfilePage({ user, onUserUpdated, onLogout, navigate }) {
  const [stats, setStats] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [role, setRole] = useState(user?.role || 'Security Analyst');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then((res) => {
        if (res?.stats) setStats(res.stats);
        if (res?.user) {
          setName(res.user.name || '');
          setOrganization(res.user.organization || '');
          setRole(res.user.role || 'Security Analyst');
        }
      })
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <HydrogenAtom size={88} />
        <h2>Sign in required</h2>
        <p className="muted">Log in or create an account to view and manage your profile.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </div>
      </section>
    );
  }

  const initials = (user.name || user.email || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const saveDetails = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setBusy(true);
    try {
      const payload = { name: name.trim(), organization: organization.trim(), role: role.trim() };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await updateProfile(payload);
      onUserUpdated(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Account details updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={showSettings ? 'profile-grid' : 'profile-single'}>
      <div className="card">
        <div className="profile-header">
          <div className="profile-avatar-lg">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13.5 }}>
              {user.email}
              {user.organization ? ` · ${user.organization}` : ''}
            </p>
            <span className="role-pill">{user.role || 'Security Analyst'}</span>
          </div>
        </div>

        <div className="stat-grid">
          <div className="mini-stat">
            <strong>{stats?.totalScans ?? '—'}</strong>
            <span>Total scans run</span>
          </div>
          <div className="mini-stat">
            <strong>{stats?.avgScore != null ? `${stats.avgScore}/100` : '—'}</strong>
            <span>Average score</span>
          </div>
          <div className="mini-stat">
            <strong>{stats?.totalIssues ?? '—'}</strong>
            <span>Issues detected</span>
          </div>
          <div className="mini-stat">
            <strong>{stats?.criticalIssues ?? '—'}</strong>
            <span>Critical findings</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outlook btn-sm"
            onClick={() => {
              setMessage('');
              setError('');
              setShowSettings((s) => !s);
            }}
          >
            {showSettings ? 'Hide account details' : 'Account details'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
            View scan history
          </button>
          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="card">
          <div className="section-head" style={{ marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>Account Details</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSettings(false)}
              aria-label="Close account details"
            >
              ✕
            </button>
          </div>
          <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
            Update your profile information or password.
          </p>

          <form className="auth-form" style={{ marginTop: 0 }} onSubmit={saveDetails}>
            <div className="field">
              <label htmlFor="prof-name">Display name</label>
              <div className="input-wrap">
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="prof-org">Organization</label>
              <div className="input-wrap">
                <input
                  id="prof-org"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="prof-role">Role</label>
              <div className="input-wrap">
                <input
                  id="prof-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', width: '100%' }} />
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Change password (leave blank to keep current password)
            </p>

            <div className="field">
              <label htmlFor="prof-cur-pw">Current password</label>
              <div className="input-wrap">
                <input
                  id="prof-cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={busy}
                  placeholder="Required only when changing password"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="prof-new-pw">New password</label>
              <div className="input-wrap">
                <input
                  id="prof-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={busy}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
