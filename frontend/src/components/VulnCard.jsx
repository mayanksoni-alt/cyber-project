import { useEffect, useState } from 'react';

export default function VulnCard({ finding, expandSignal }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (expandSignal?.version) {
      setOpen(Boolean(expandSignal.open));
    }
  }, [expandSignal]);

  const copyEvidence = (e) => {
    e.stopPropagation();
    if (!finding.evidence) return;
    navigator.clipboard?.writeText(finding.evidence).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const shortOwasp = finding.owasp ? finding.owasp.split(' ')[0] : 'OWASP';

  return (
    <div className={`vuln-card ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="vuln-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`sev-tag sev-${finding.severity}`}>{finding.severity}</span>
        <span className="vuln-title">{finding.title}</span>
        <span className="vuln-owasp-pill">{shortOwasp}</span>
        <span className="vuln-loc-preview" title={finding.location}>
          {finding.location}
        </span>
        <span className="confirmed-pill">Detected</span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </button>

      <div className="vuln-collapse">
        <div className="vuln-collapse-inner">
          <div className="vuln-body">
            <p className="vuln-desc">{finding.description}</p>

            <div className="vuln-row">
              <span className="vuln-key">Evidence</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <code>{finding.evidence}</code>
                {finding.evidence && (
                  <button type="button" className="chip-btn" onClick={copyEvidence}>
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            <div className="vuln-row">
              <span className="vuln-key">Location</span>
              <code>{finding.location}</code>
            </div>
            <div className="vuln-row">
              <span className="vuln-key">Reference</span>
              <span className="owasp">{finding.owasp}</span>
            </div>

            {finding.remediation && (
              <div className="vuln-fix-box">
                <strong>Remediation Guidance</strong>
                {finding.remediation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
