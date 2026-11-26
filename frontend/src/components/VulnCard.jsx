import { useEffect, useState } from 'react';

const SEVERITY_PLAIN = {
  critical: 'Urgent — fix immediately',
  high: 'Serious — fix soon',
  medium: 'Moderate — recommended fix',
  low: 'Minor — hardening tip',
  info: 'Good to know',
};

function fallbackImpact(finding) {
  const title = (finding.title || '').toLowerCase();
  if (title.includes('content-security-policy')) {
    return 'Without a script rule, injected malicious scripts could run freely inside visitors’ browsers.';
  }
  if (title.includes('strict-transport-security') || title.includes('hsts')) {
    return 'Without HSTS, a visitor’s initial connection could briefly fall back to unencrypted HTTP on untrusted Wi-Fi.';
  }
  if (title.includes('x-frame-options') || title.includes('clickjacking')) {
    return 'Other sites could embed your page in an invisible frame and trick users into clicking unintended buttons.';
  }
  if (title.includes('x-content-type-options')) {
    return 'Browsers might guess file types incorrectly and treat uploaded files as executable scripts.';
  }
  if (title.includes('referrer-policy')) {
    return 'Full URLs (including query parameters) may be shared with external websites when users click outbound links.';
  }
  if (title.includes('permissions-policy')) {
    return 'Embedded scripts could request device permissions like camera or location that your site does not need.';
  }
  if (title.includes('cookie')) {
    return 'Missing cookie flags make session cookies easier for scripts or unencrypted networks to access.';
  }
  return 'Leaving this misconfiguration unresolved weakens defense-in-depth and gives attackers an easier foothold.';
}

export default function VulnCard({ finding, expandSignal, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    if (expandSignal?.version) {
      setOpen(Boolean(expandSignal.open));
    }
  }, [expandSignal]);

  const copyText = (e, key, text) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1400);
    });
  };

  const shortOwasp = finding.owasp ? finding.owasp.split(' ')[0] : 'OWASP';
  const summaryText = finding.summary || finding.description;
  const impactText = finding.impact || fallbackImpact(finding);

  return (
    <div className={`vuln-card ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="vuln-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`sev-tag sev-${finding.severity}`}>{finding.severity}</span>
        <div className="vuln-title-group">
          <span className="vuln-title">{finding.title}</span>
          {summaryText && <span className="vuln-plain-sub">{summaryText}</span>}
        </div>
        <span className="vuln-owasp-pill">{shortOwasp}</span>
        <span className="vuln-loc-preview" title={finding.location}>
          {finding.location}
        </span>
        <span className="confirmed-pill">{SEVERITY_PLAIN[finding.severity] || 'Detected'}</span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </button>

      <div className="vuln-collapse">
        <div className="vuln-collapse-inner">
          <div className="vuln-body">
            <div className="vuln-explain-grid">
              <div className="vuln-explain-box">
                <span className="vuln-explain-label">What we found</span>
                <p>{summaryText}</p>
              </div>
              <div className="vuln-explain-box is-impact">
                <span className="vuln-explain-label">Why it matters</span>
                <p>{impactText}</p>
              </div>
            </div>

            {finding.remediation && (
              <div className="vuln-fix-box">
                <strong>How to fix it</strong>
                <div>{finding.remediation}</div>
                {finding.exampleFix && (
                  <div className="vuln-snippet-row">
                    <code>{finding.exampleFix}</code>
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={(e) => copyText(e, 'fix', finding.exampleFix)}
                    >
                      {copiedKey === 'fix' ? 'Copied ✓' : 'Copy header'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="vuln-tech-details">
              <div className="vuln-row">
                <span className="vuln-key">Proof</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <code>{finding.evidence}</code>
                  {finding.evidence && (
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={(e) => copyText(e, 'evidence', finding.evidence)}
                    >
                      {copiedKey === 'evidence' ? 'Copied ✓' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
              <div className="vuln-row">
                <span className="vuln-key">Page URL</span>
                <code>{finding.location}</code>
              </div>
              <div className="vuln-row">
                <span className="vuln-key">Standard</span>
                <span className="owasp">{finding.owasp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
