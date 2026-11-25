import { useEffect, useRef, useState } from 'react';
import HydrogenAtom from './HydrogenAtom.jsx';

export default function Navbar({
  route,
  navigate,
  user,
  onLogout,
  theme,
  onToggleTheme,
  historyCount = 0,
  busy,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="pt-navbar">
      <div className="pt-navbar-inner">
        <button type="button" className="pt-brand" onClick={() => navTo('/')}>
          <HydrogenAtom size={34} scanning={busy} label="SentryScan Logo" />
          <div className="pt-brand-text">
            <strong>SentryScan</strong>
            <span>Website Vulnerability Scanner</span>
          </div>
        </button>

        <nav className="pt-nav-links" aria-label="Primary navigation">
          <button
            type="button"
            className={`pt-nav-link ${route === '/' ? 'active' : ''}`}
            onClick={() => navTo('/')}
          >
            Website Scanner
          </button>
          <button
            type="button"
            className={`pt-nav-link ${route === '/history' ? 'active' : ''}`}
            onClick={() => navTo('/history')}
          >
            Scan History
            {historyCount > 0 && <span className="pt-nav-badge">{historyCount}</span>}
          </button>
          <button
            type="button"
            className={`pt-nav-link ${route === '/checks' ? 'active' : ''}`}
            onClick={() => navTo('/checks')}
          >
            Checks Coverage
          </button>
        </nav>

        <div className="pt-nav-actions">
          <button
            type="button"
            className="pt-theme-btn"
            onClick={onToggleTheme}
            title={theme === 'night' ? 'Switch to light workspace' : 'Switch to night mode'}
            aria-label="Toggle day and night mode"
          >
            {theme === 'night' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === 'night' ? 'Light' : 'Night'}</span>
          </button>

          {user ? (
            <div className="user-pill-wrap" ref={menuRef}>
              <button
                type="button"
                className="user-pill"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
              >
                <span className="user-avatar">{initials}</span>
                <span>{user.name?.split(' ')[0] || 'Account'}</span>
              </button>

              {menuOpen && (
                <div className="user-menu" role="menu">
                  <div className="user-menu-head">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => navTo('/profile')}
                    role="menuitem"
                  >
                    Profile &amp; Settings
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => navTo('/history')}
                    role="menuitem"
                  >
                    Scan History
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    className="user-menu-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="pt-nav-login"
                onClick={() => navTo('/login')}
              >
                Log in
              </button>
              <button
                type="button"
                className="pt-nav-signup"
                onClick={() => navTo('/signup')}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
