export default function Sidebar({
  route,
  navigate,
  user,
  history = [],
  onSelectScan,
  onNewScan,
}) {
  const hostOf = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <aside className="outlook-sidebar" aria-label="Workspace navigation">
      <button type="button" className="sidebar-cta" onClick={onNewScan}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New scan
      </button>

      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-item ${route === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <span className="sidebar-item-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Scanner
          </span>
        </button>

        <button
          type="button"
          className={`sidebar-item ${route === '/history' ? 'active' : ''}`}
          onClick={() => navigate('/history')}
        >
          <span className="sidebar-item-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Scan History
          </span>
          <span className="sidebar-count">{history.length}</span>
        </button>

        <button
          type="button"
          className={`sidebar-item ${route === '/checks' ? 'active' : ''}`}
          onClick={() => navigate('/checks')}
        >
          <span className="sidebar-item-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            OWASP Checks
          </span>
          <span className="sidebar-count">10</span>
        </button>

        {user ? (
          <button
            type="button"
            className={`sidebar-item ${route === '/profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <span className="sidebar-item-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`sidebar-item ${route === '/login' ? 'active' : ''}`}
              onClick={() => navigate('/login')}
            >
              <span className="sidebar-item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Log in
              </span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${route === '/signup' ? 'active' : ''}`}
              onClick={() => navigate('/signup')}
            >
              <span className="sidebar-item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Sign up
              </span>
            </button>
          </>
        )}
      </nav>

      {history.length > 0 && (
        <>
          <hr className="sidebar-divider" />
          <div className="sidebar-section-label">Recent Targets</div>
          <div className="sidebar-recent">
            {history.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className="sidebar-recent-item"
                onClick={() => onSelectScan(item.id)}
                title={item.target_url}
              >
                <span className="sidebar-recent-host">{hostOf(item.target_url)}</span>
                {item.grade && (
                  <span className={`mini-grade grade-${item.grade}`}>{item.grade}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
