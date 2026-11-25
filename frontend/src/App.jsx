import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearToken,
  deleteScan,
  getHistory,
  getMe,
  getScan,
  startScan,
} from './api.js';
import HydrogenCanvas from './components/HydrogenCanvas.jsx';
import HydrogenAtom from './components/HydrogenAtom.jsx';
import Navbar from './components/Navbar.jsx';
import ScanForm from './components/ScanForm.jsx';
import SummaryBar from './components/SummaryBar.jsx';
import VulnCard from './components/VulnCard.jsx';
import HistoryList from './components/HistoryList.jsx';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import ChecksCatalog from './components/ChecksCatalog.jsx';

const VALID_ROUTES = new Set(['/', '/login', '/signup', '/history', '/profile', '/checks']);

function readInitialRoute() {
  const path = window.location.pathname || '/';
  return VALID_ROUTES.has(path) ? path : '/';
}

function riskProfile(score, summary = {}) {
  if ((summary.critical || 0) > 0 || score < 50) {
    return { label: 'Critical Risk', color: 'var(--critical)', pct: 92 };
  }
  if ((summary.high || 0) > 0 || score < 68) {
    return { label: 'High Risk', color: 'var(--high)', pct: 74 };
  }
  if ((summary.medium || 0) > 0 || score < 85) {
    return { label: 'Medium Risk', color: 'var(--medium)', pct: 48 };
  }
  return { label: 'Low Risk', color: 'var(--accent)', pct: 18 };
}

export default function App() {
  const [route, setRoute] = useState(readInitialRoute);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('sentryscan_theme');
      return saved === 'night' ? 'night' : 'light';
    } catch {
      return 'light';
    }
  });
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandSignal, setExpandSignal] = useState({ open: false, version: 0 });
  const [toast, setToast] = useState('');
  const pollRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const navigate = useCallback((nextRoute) => {
    const target = VALID_ROUTES.has(nextRoute) ? nextRoute : '/';
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(readInitialRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('sentryscan_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const refreshHistory = useCallback(() => {
    getHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getMe()
      .then((res) => {
        if (res?.user) setUser(res.user);
      })
      .catch(() => {})
      .finally(() => {
        setAuthReady(true);
        refreshHistory();
      });

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, [refreshHistory]);

  const handleAuthSuccess = (signedInUser) => {
    setUser(signedInUser);
    refreshHistory();
    showToast(`Signed in as ${signedInUser.name?.split(' ')[0] || 'Analyst'}`);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    refreshHistory();
    navigate('/login');
    showToast('Signed out');
  };

  const handleScan = async (url, options = {}) => {
    setError('');
    setScan(null);
    setSeverityFilter('');
    setSearchQuery('');
    setExpandSignal({ open: false, version: 0 });
    setLoading(true);
    clearInterval(pollRef.current);
    if (route !== '/') navigate('/');

    try {
      const { id } = await startScan(url, options);
      pollRef.current = setInterval(async () => {
        try {
          const data = await getScan(id);
          setScan(data);
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollRef.current);
            setLoading(false);
            refreshHistory();
          }
        } catch {
          clearInterval(pollRef.current);
          setLoading(false);
        }
      }, 1100);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const openHistoryScan = async (id) => {
    setError('');
    setSeverityFilter('');
    setSearchQuery('');
    setExpandSignal({ open: false, version: 0 });
    try {
      const data = await getScan(id);
      setScan(data);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHistoryScan = async (id) => {
    try {
      await deleteScan(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (scan?.id === id) setScan(null);
      showToast('Scan deleted');
    } catch (err) {
      setError(err.message);
    }
  };

  const exportReport = (format) => {
    if (!scan) return;
    let content = '';
    let mime = 'application/json';
    let ext = 'json';

    if (format === 'json') {
      content = JSON.stringify(scan, null, 2);
    } else {
      mime = 'text/markdown';
      ext = 'md';
      const lines = [
        `# SentryScan Security Report`,
        ``,
        `- **Target:** ${scan.target_url}`,
        `- **Profile:** ${scan.scan_mode || 'deep'}`,
        `- **Score:** ${scan.score}/100 (Grade ${scan.grade})`,
        `- **Pages crawled:** ${scan.pages_crawled}`,
        `- **Forms found:** ${scan.forms_found}`,
        `- **Total findings:** ${scan.summary?.total ?? scan.findings?.length ?? 0}`,
        ``,
        `## Findings`,
        ``,
        ...(scan.findings || []).map(
          (f, idx) =>
            `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n` +
            `- **Location:** \`${f.location}\`\n` +
            `- **Evidence:** \`${f.evidence}\`\n` +
            `- **Description:** ${f.description}\n` +
            `- **Remediation:** ${f.remediation}\n` +
            `- **OWASP:** ${f.owasp}\n`
        ),
      ];
      content = lines.join('\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentryscan-report-${scan.id.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported report as .${ext.toUpperCase()}`);
  };

  const filteredFindings = useMemo(() => {
    const list = scan?.findings || [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((f) => {
      if (severityFilter && f.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        f.title?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.owasp?.toLowerCase().includes(q)
      );
    });
  }, [scan, severityFilter, searchQuery]);

  const busy = loading && scan?.status !== 'completed' && scan?.status !== 'failed';
  const statusStep = scan?.status === 'scanning' ? 2 : scan?.status === 'crawling' ? 1 : 0;
  const risk = scan?.status === 'completed' ? riskProfile(scan.score, scan.summary) : null;
  const totalSummary = Math.max(1, scan?.summary?.total || 0);

  return (
    <>
      <HydrogenCanvas theme={theme} activePulse={busy} />

      <div className="app">
        <Navbar
          route={route}
          navigate={navigate}
          user={user}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'night' : 'light'))}
          historyCount={history.length}
          busy={busy}
        />

        {route === '/' && (
          <section className="pt-hero-band">
            <div className="pt-hero-inner">
              <div className="pt-hero-copy">
                <div className="pt-breadcrumb">
                  <span>Tools</span>
                  <span>/</span>
                  <span>Website Vulnerability Scanner</span>
                </div>
                <h2>Website Vulnerability Scanner</h2>
                <p>
                  Detect OWASP Top 10 risks, missing security headers, insecure cookies, exposed
                  sensitive files, weak forms, and reflected input in a single automated report.
                </p>
                <div className="pt-hero-badges">
                  <span className="pt-hero-badge">Light &amp; Deep Scan Profiles</span>
                  <span className="pt-hero-badge">OWASP Top 10 Mapped</span>
                  <span className="pt-hero-badge">Exportable .MD &amp; JSON Reports</span>
                </div>
              </div>

              <HydrogenAtom
                size={136}
                scanning={busy}
                floating
                label="Animated Hydrogen orbital emblem"
              />
            </div>
          </section>
        )}

        <main className={`pt-main ${route === '/' ? 'has-hero' : 'no-hero'}`}>
          <div key={route} className="view-stage">
            {route === '/login' && (
              <LoginPage onAuthSuccess={handleAuthSuccess} navigate={navigate} />
            )}

            {route === '/signup' && (
              <SignupPage onAuthSuccess={handleAuthSuccess} navigate={navigate} />
            )}

            {route === '/profile' && (
              <ProfilePage
                user={user}
                onUserUpdated={setUser}
                onLogout={handleLogout}
                navigate={navigate}
              />
            )}

            {route === '/checks' && <ChecksCatalog navigate={navigate} />}

            {route === '/history' && (
              <section>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px' }}>Scan History &amp; Saved Reports</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {user
                        ? `Showing scans recorded for ${user.name}. Click any target to open its full report.`
                        : 'Log in or sign up to keep a personal archive of your scans.'}
                    </p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                    + New scan
                  </button>
                </div>

                <HistoryList
                  history={history}
                  onSelectScan={openHistoryScan}
                  onDeleteScan={handleDeleteHistoryScan}
                  title={`All scans (${history.length})`}
                  showEmpty
                />
              </section>
            )}

            {route === '/' && (
              <>
                <ScanForm onScan={handleScan} busy={busy} />

                {authReady && !user && (
                  <p className="muted" style={{ fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                    Want to keep a persistent workspace archive?{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => navigate('/signup')}
                    >
                      Create an account
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => navigate('/login')}
                    >
                      log in
                    </button>
                    .
                  </p>
                )}

                {error && <div className="error-box">{error}</div>}

                {busy && (
                  <section className="card progress-card">
                    <div className="progress-left">
                      <HydrogenAtom size={56} scanning />
                      <div>
                        <strong>{labelFor(scan?.status)}</strong>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          {scan?.progress || 'Starting scan…'}
                        </p>
                      </div>
                    </div>

                    <div className="progress-phases" aria-label="Scan progress stages">
                      {['Queued', 'Crawling', 'Analysing'].map((label, idx) => (
                        <span
                          key={label}
                          className={`phase-pill ${
                            idx < statusStep ? 'is-done' : idx === statusStep ? 'is-active' : ''
                          }`}
                        >
                          {idx < statusStep ? `${label} ✓` : label}
                        </span>
                      ))}
                    </div>
                    <div className="progress-beam" />
                  </section>
                )}

                {scan?.status === 'failed' && (
                  <section className="card error-box" style={{ marginTop: 20 }}>
                    Scan failed: {scan.progress}
                  </section>
                )}

                {scan?.status === 'completed' && (
                  <section className="pt-report-wrap">
                    <div className="card pt-report-topbar">
                      <div>
                        <div className="pt-report-title-row">
                          <h3 className="target">{scan.target_url}</h3>
                          <span className="pt-status-finished">Finished</span>
                          <span className="pt-mode-chip">
                            {scan.scan_mode || 'deep'} scan
                          </span>
                        </div>
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Completed {scan.finished_at ? new Date(scan.finished_at).toLocaleString() : 'just now'}
                        </span>
                      </div>

                      <div className="export-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => exportReport('md')}
                        >
                          Export .MD
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => exportReport('json')}
                        >
                          Export JSON
                        </button>
                      </div>
                    </div>

                    <div className="pt-summary-grid">
                      <div className="card pt-metric-card">
                        <span className="pt-metric-label">Overall Risk Level</span>
                        <div className="pt-risk-value" style={{ color: risk.color }}>
                          {risk.label}
                        </div>
                        <div className="pt-risk-bar">
                          <div
                            className="pt-risk-fill"
                            style={{ width: `${risk.pct}%`, background: risk.color }}
                          />
                        </div>
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Security Score: <strong>{scan.score}/100</strong> (Grade {scan.grade})
                        </span>
                      </div>

                      <div className="card pt-metric-card">
                        <span className="pt-metric-label">Findings Distribution</span>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>
                          {scan.summary?.total ?? 0}{' '}
                          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                            total issues
                          </span>
                        </div>
                        <div className="pt-dist-bar" aria-hidden="true">
                          {['critical', 'high', 'medium', 'low', 'info'].map((sev) => {
                            const count = scan.summary?.[sev] || 0;
                            if (!count) return null;
                            return (
                              <div
                                key={sev}
                                className={`sev-${sev}`}
                                style={{ width: `${(count / totalSummary) * 100}%` }}
                              />
                            );
                          })}
                        </div>
                        <span className="muted" style={{ fontSize: 12 }}>
                          Click severity pills below to filter
                        </span>
                      </div>

                      <div className="card pt-metric-card">
                        <span className="pt-metric-label">Scan Coverage</span>
                        <div className="pt-cov-list">
                          <div className="pt-cov-row">
                            <span>Pages crawled</span>
                            <strong>{scan.pages_crawled}</strong>
                          </div>
                          <div className="pt-cov-row">
                            <span>Forms inspected</span>
                            <strong>{scan.forms_found}</strong>
                          </div>
                          <div className="pt-cov-row">
                            <span>Detection modules</span>
                            <strong>10</strong>
                          </div>
                        </div>
                      </div>

                      <div className="card pt-metric-card">
                        <span className="pt-metric-label">Scan Profile</span>
                        <div style={{ fontSize: 20, fontWeight: 800, textTransform: 'capitalize' }}>
                          {scan.scan_mode || 'deep'} Scan
                        </div>
                        <div className="pt-cov-list">
                          <div className="pt-cov-row">
                            <span>Status</span>
                            <strong style={{ color: 'var(--pt-green)' }}>Completed</strong>
                          </div>
                          <div className="pt-cov-row">
                            <span>Grade</span>
                            <strong>{scan.grade}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <SummaryBar
                      summary={scan.summary}
                      activeSeverity={severityFilter}
                      onSelectSeverity={setSeverityFilter}
                    />

                    <div className="card pt-findings-card">
                      <div className="pt-findings-toolbar">
                        <h3>
                          Vulnerabilities &amp; Findings
                          <span className="count">{filteredFindings.length}</span>
                          {severityFilter && (
                            <button
                              type="button"
                              className="chip-btn"
                              onClick={() => setSeverityFilter('')}
                            >
                              Clear: {severityFilter} ✕
                            </button>
                          )}
                        </h3>

                        <div className="findings-controls">
                          {filteredFindings.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                setExpandSignal((s) => ({
                                  open: !s.open,
                                  version: s.version + 1,
                                }))
                              }
                            >
                              {expandSignal.open ? 'Collapse all' : 'Expand all'}
                            </button>
                          )}
                          <input
                            type="search"
                            className="findings-search"
                            placeholder="Filter by title, OWASP, URL…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Filter findings"
                          />
                        </div>
                      </div>

                      {filteredFindings.length > 0 && (
                        <div className="pt-table-head">
                          <span>Severity</span>
                          <span>Vulnerability</span>
                          <span>OWASP</span>
                          <span>Affected Location</span>
                          <span>Validation</span>
                          <span />
                        </div>
                      )}

                      {filteredFindings.length === 0 ? (
                        <div className="empty">
                          {scan.findings.length === 0
                            ? 'No issues detected by these checks.'
                            : 'No findings match the current filter.'}
                        </div>
                      ) : (
                        filteredFindings.map((f, idx) => (
                          <VulnCard
                            key={f.id || idx}
                            finding={f}
                            expandSignal={expandSignal}
                          />
                        ))
                      )}
                    </div>
                  </section>
                )}

                {!busy && !scan && (
                  <section className="pt-compare-grid" aria-label="Scan modes comparison">
                    <div className="card pt-compare-card">
                      <span className="pt-mode-chip">Light Scan</span>
                      <h3>Fast Passive Reconnaissance</h3>
                      <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                        Ideal for quick checks of live headers, TLS posture, and surface configuration.
                      </p>
                      <ul className="pt-compare-list">
                        <li>✓ Inspects HTTP security headers &amp; CSP</li>
                        <li>✓ Checks HTTPS redirect &amp; cookie flags</li>
                        <li>✓ Crawls up to 5 key pages (depth 1)</li>
                      </ul>
                    </div>

                    <div className="card pt-compare-card">
                      <span className="pt-mode-chip">Deep Scan</span>
                      <h3>Comprehensive OWASP Audit</h3>
                      <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                        Full same-origin crawl with form auditing, sensitive path checks, and reflection indicators.
                      </p>
                      <ul className="pt-compare-list">
                        <li>✓ Crawls up to 25 same-origin pages (depth 2)</li>
                        <li>✓ Audits CSRF tokens, mixed content &amp; libraries</li>
                        <li>✓ Probes exposed paths (.env, .git) &amp; XSS reflection</li>
                      </ul>
                    </div>
                  </section>
                )}

                <HistoryList
                  history={history.slice(0, 6)}
                  onSelectScan={openHistoryScan}
                  onDeleteScan={handleDeleteHistoryScan}
                />
              </>
            )}
          </div>
        </main>

        <footer className="footer">
          Built for educational cybersecurity use · SentryScan Website Vulnerability Scanner
        </footer>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

function labelFor(status) {
  const map = {
    queued: 'Queued',
    crawling: 'Crawling target',
    scanning: 'Running vulnerability checks',
  };
  return map[status] || 'Working';
}
