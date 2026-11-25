import { useEffect, useState } from 'react';

export default function FindingsPane({
  findings = [],
  totalCount = 0,
  severityFilter = '',
  onClearSeverity,
  searchQuery = '',
  onSearchChange,
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedIdx(0);
  }, [findings.length, severityFilter, searchQuery]);

  const active = findings[selectedIdx] || findings[0] || null;

  const copyEvidence = () => {
    if (!active?.evidence) return;
    navigator.clipboard?.writeText(active.evidence).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className="card outlook-findings">
      <div className="outlook-toolbar">
        <div className="outlook-toolbar-left">
          <h3>Findings</h3>
          <span className="count">{findings.length}</span>
          {severityFilter && (
            <button type="button" className="chip-btn" onClick={onClearSeverity}>
              Filter: {severityFilter} ✕
            </button>
          )}
        </div>

        <input
          type="search"
          className="findings-search"
          placeholder="Search findings, OWASP, URL…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filter findings"
        />
      </div>

      {findings.length === 0 ? (
        <div className="empty">
          {totalCount === 0
            ? 'No security issues detected by these checks.'
            : 'No findings match the current filter.'}
        </div>
      ) : (
        <div className="outlook-split">
          <div className="outlook-list" role="listbox" aria-label="Findings list">
            {findings.map((f, idx) => {
              const isSelected = idx === selectedIdx;
              const shortOwasp = f.owasp ? f.owasp.split(' ')[0] : '';
              return (
                <button
                  key={f.id || idx}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`outlook-row sev-border-${f.severity} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setCopied(false);
                  }}
                >
                  <div className="outlook-row-top">
                    <span className={`sev-tag sev-${f.severity}`}>{f.severity}</span>
                    {shortOwasp && <span className="vuln-owasp-pill">{shortOwasp}</span>}
                  </div>
                  <div className="outlook-row-title">{f.title}</div>
                  <div className="outlook-row-sub">{f.location}</div>
                </button>
              );
            })}
          </div>

          {active && (
            <div key={active.id || selectedIdx} className="outlook-detail">
              <div className="outlook-detail-head">
                <div>
                  <span className={`sev-tag sev-${active.severity}`}>{active.severity}</span>
                  <h3>{active.title}</h3>
                </div>
                {active.owasp && <span className="owasp">{active.owasp}</span>}
              </div>

              <p className="vuln-desc">{active.description}</p>

              <div className="vuln-row">
                <span className="vuln-key">Evidence</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <code>{active.evidence}</code>
                  {active.evidence && (
                    <button type="button" className="chip-btn" onClick={copyEvidence}>
                      {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              <div className="vuln-row">
                <span className="vuln-key">Location</span>
                <code>{active.location}</code>
              </div>

              {active.remediation && (
                <div className="vuln-fix-box">
                  <strong>Recommended Fix</strong>
                  {active.remediation}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
