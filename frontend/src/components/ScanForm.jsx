import { useState } from 'react';

const MODES = [
  {
    key: 'light',
    title: 'Light Scan',
    sub: 'Fast passive check · up to 5 pages',
    pill: 'Fast',
  },
  {
    key: 'deep',
    title: 'Deep Scan',
    sub: 'Full OWASP audit · up to 25 pages',
    pill: 'Recommended',
  },
  {
    key: 'custom',
    title: 'Custom',
    sub: 'Configure crawl pages & depth',
    pill: 'Custom',
  },
];

const PRESETS = ['https://example.com', 'https://httpbin.org'];

export default function ScanForm({ onScan, busy }) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('deep');
  const [maxPages, setMaxPages] = useState(15);
  const [maxDepth, setMaxDepth] = useState(2);
  const [authorized, setAuthorized] = useState(true);

  const submit = (e) => {
    e.preventDefault();
    if (!url.trim() || busy || !authorized) return;
    onScan(url.trim(), {
      mode,
      ...(mode === 'custom' ? { maxPages, maxDepth } : {}),
    });
  };

  return (
    <div className="card pt-scanner-card">
      <div className="pt-mode-tabs" role="tablist" aria-label="Scan profile">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            className={`pt-mode-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => setMode(m.key)}
            disabled={busy}
          >
            <div>
              <span className="pt-mode-title">{m.title}</span>
              <span className="pt-mode-sub">{m.sub}</span>
            </div>
            <span className="pt-mode-pill">{m.pill}</span>
          </button>
        ))}
      </div>

      <form className="pt-scanner-body" onSubmit={submit}>
        <label htmlFor="target-url-input" className="pt-target-label">
          Target URL
        </label>

        <div className="pt-scan-row">
          <div className="pt-url-box">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <input
              id="target-url-input"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
          </div>

          <button
            type="submit"
            className="pt-start-btn"
            disabled={busy || !url.trim() || !authorized}
          >
            {busy ? 'Scanning…' : 'Start scan'}
          </button>
        </div>

        {mode === 'custom' && (
          <div className="pt-custom-row">
            <label className="pt-custom-field">
              <span>Max pages:</span>
              <select
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                disabled={busy}
              >
                <option value={5}>5 pages</option>
                <option value={15}>15 pages</option>
                <option value={25}>25 pages</option>
                <option value={40}>40 pages</option>
              </select>
            </label>

            <label className="pt-custom-field">
              <span>Crawl depth:</span>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                disabled={busy}
              >
                <option value={1}>Depth 1</option>
                <option value={2}>Depth 2</option>
                <option value={3}>Depth 3</option>
              </select>
            </label>
          </div>
        )}

        <div className="pt-scanner-footer">
          <label className="pt-auth-check">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              disabled={busy}
            />
            <span>I confirm I am authorized to scan this target.</span>
          </label>

          <div className="quick-targets">
            <span className="muted">Sample target:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="chip-btn"
                onClick={() => setUrl(preset)}
                disabled={busy}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
