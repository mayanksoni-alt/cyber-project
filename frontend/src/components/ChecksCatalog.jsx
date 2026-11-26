const CHECKS = [
  {
    title: 'Security Headers Audit',
    severity: 'medium',
    owasp: 'A05:2021 Security Misconfiguration',
    summary:
      'Checks for CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.',
  },
  {
    title: 'Exposed Sensitive Files',
    severity: 'critical',
    owasp: 'A01:2021 Broken Access Control',
    summary:
      'Looks for accidentally public paths such as .env, .git/HEAD, backup archives, and config files.',
  },
  {
    title: 'HTTPS & Redirect Enforcement',
    severity: 'high',
    owasp: 'A02:2021 Cryptographic Failures',
    summary:
      'Verifies that plain HTTP requests redirect cleanly to HTTPS.',
  },
  {
    title: 'Cookie Security Flags',
    severity: 'medium',
    owasp: 'A05:2021 Security Misconfiguration',
    summary:
      'Inspects Set-Cookie headers for Secure, HttpOnly, and SameSite attributes across crawled pages.',
  },
  {
    title: 'Form CSRF & Credential Transport',
    severity: 'high',
    owasp: 'A01 / A02',
    summary:
      'Checks HTML forms for anti-CSRF tokens and catches password forms submitting over plain HTTP.',
  },
  {
    title: 'Reflected Input (XSS Indicator)',
    severity: 'medium',
    owasp: 'A03:2021 Injection',
    summary:
      'Tests benign canary query strings to detect unencoded reflection in server responses.',
  },
  {
    title: 'Directory Listing Exposure',
    severity: 'medium',
    owasp: 'A05:2021 Security Misconfiguration',
    summary:
      'Detects Apache or Nginx auto-index pages exposing directory contents.',
  },
  {
    title: 'Mixed Content Detection',
    severity: 'low',
    owasp: 'A02:2021 Cryptographic Failures',
    summary:
      'Finds insecure http:// scripts, stylesheets, or media loaded inside HTTPS pages.',
  },
  {
    title: 'Outdated Frontend Libraries',
    severity: 'low',
    owasp: 'A06:2021 Vulnerable Components',
    summary:
      'Flags legacy client-side script versions (such as older jQuery releases) with known issues.',
  },
  {
    title: 'Server & Stack Disclosure',
    severity: 'low',
    owasp: 'A05:2021 Security Misconfiguration',
    summary:
      'Identifies verbose Server and X-Powered-By headers that reveal framework versions.',
  },
];

export default function ChecksCatalog({ navigate }) {
  return (
    <section>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>OWASP-Based Security Checks</h2>
          <p className="muted" style={{ margin: 0, maxWidth: 660 }}>
            NetHawk runs passive and safe detection checks across crawled pages without executing
            destructive exploitation payloads.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Open scanner →
        </button>
      </div>

      <div className="checks-grid">
        {CHECKS.map((c) => (
          <article key={c.title} className="card check-tile">
            <div className="check-tile-top">
              <span className={`sev-tag sev-${c.severity}`}>{c.severity}</span>
              <span className="owasp" style={{ fontSize: 12 }}>
                {c.owasp}
              </span>
            </div>
            <h4>{c.title}</h4>
            <p>{c.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
