import { SEVERITY } from '../utils/severity.js';
import { request } from '../utils/http.js';

// Each check returns an array of findings. A finding looks like:
// { id, title, severity, description, evidence, remediation, owasp, location }

let counter = 0;
const finding = (f) => ({ id: `F-${++counter}`, ...f });

/* ------------------------------------------------------------------ *
 * 1. Security headers (checked against the main page response)
 * ------------------------------------------------------------------ */
export function checkSecurityHeaders(mainPage) {
  const h = mainPage.headers || {};
  const findings = [];

  const required = [
    {
      name: 'content-security-policy',
      title: 'Missing Content-Security-Policy header',
      severity: SEVERITY.MEDIUM,
      remediation: 'Add a Content-Security-Policy to restrict which scripts/styles can load and mitigate XSS.',
    },
    {
      name: 'strict-transport-security',
      title: 'Missing HTTP Strict-Transport-Security (HSTS)',
      severity: SEVERITY.MEDIUM,
      remediation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to force HTTPS.',
    },
    {
      name: 'x-frame-options',
      title: 'Missing X-Frame-Options (clickjacking protection)',
      severity: SEVERITY.MEDIUM,
      remediation: 'Add "X-Frame-Options: DENY" or a CSP frame-ancestors directive.',
    },
    {
      name: 'x-content-type-options',
      title: 'Missing X-Content-Type-Options header',
      severity: SEVERITY.LOW,
      remediation: 'Add "X-Content-Type-Options: nosniff" to stop MIME-type sniffing.',
    },
    {
      name: 'referrer-policy',
      title: 'Missing Referrer-Policy header',
      severity: SEVERITY.LOW,
      remediation: 'Add "Referrer-Policy: strict-origin-when-cross-origin".',
    },
    {
      name: 'permissions-policy',
      title: 'Missing Permissions-Policy header',
      severity: SEVERITY.INFO,
      remediation: 'Add a Permissions-Policy to limit access to camera, microphone, geolocation, etc.',
    },
  ];

  for (const r of required) {
    if (!h[r.name]) {
      findings.push(
        finding({
          title: r.title,
          severity: r.severity,
          description: `The response does not set the "${r.name}" header.`,
          evidence: `Header "${r.name}" not present on ${mainPage.url}`,
          remediation: r.remediation,
          owasp: 'A05:2021 Security Misconfiguration',
          location: mainPage.url,
        })
      );
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 2. Information disclosure via headers
 * ------------------------------------------------------------------ */
export function checkInfoDisclosure(mainPage) {
  const h = mainPage.headers || {};
  const findings = [];

  if (h['x-powered-by']) {
    findings.push(
      finding({
        title: 'Technology disclosure via X-Powered-By',
        severity: SEVERITY.LOW,
        description: 'The server reveals its underlying technology, which helps attackers target known flaws.',
        evidence: `X-Powered-By: ${h['x-powered-by']}`,
        remediation: 'Remove or obscure the X-Powered-By header.',
        owasp: 'A05:2021 Security Misconfiguration',
        location: mainPage.url,
      })
    );
  }

  if (h['server'] && /[0-9]/.test(h['server'])) {
    findings.push(
      finding({
        title: 'Server version disclosure',
        severity: SEVERITY.LOW,
        description: 'The Server header exposes software and version details.',
        evidence: `Server: ${h['server']}`,
        remediation: 'Configure the server to suppress version information in the Server header.',
        owasp: 'A05:2021 Security Misconfiguration',
        location: mainPage.url,
      })
    );
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 3. Cookie security flags
 * ------------------------------------------------------------------ */
export function checkCookies(pages) {
  const findings = [];
  const seen = new Set();

  for (const page of pages) {
    for (const cookie of page.setCookies || []) {
      const name = cookie.split('=')[0];
      if (seen.has(name)) continue;
      seen.add(name);

      const lower = cookie.toLowerCase();
      const missing = [];
      if (!lower.includes('secure')) missing.push('Secure');
      if (!lower.includes('httponly')) missing.push('HttpOnly');
      if (!lower.includes('samesite')) missing.push('SameSite');

      if (missing.length) {
        findings.push(
          finding({
            title: `Cookie "${name}" missing ${missing.join(', ')} flag(s)`,
            severity: missing.includes('HttpOnly') ? SEVERITY.MEDIUM : SEVERITY.LOW,
            description: 'Cookies without protective flags can be stolen via XSS or sent over insecure channels.',
            evidence: cookie.slice(0, 120),
            remediation: `Set the ${missing.join(', ')} attribute(s) on this cookie.`,
            owasp: 'A05:2021 Security Misconfiguration',
            location: page.url,
          })
        );
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 4. HTTPS / transport security
 * ------------------------------------------------------------------ */
export async function checkHttps(targetUrl) {
  const findings = [];
  const u = new URL(targetUrl);

  if (u.protocol === 'http:') {
    findings.push(
      finding({
        title: 'Site served over plain HTTP',
        severity: SEVERITY.HIGH,
        description: 'Traffic is unencrypted and can be intercepted or modified in transit.',
        evidence: `Target protocol: ${u.protocol}`,
        remediation: 'Serve the site exclusively over HTTPS with a valid TLS certificate.',
        owasp: 'A02:2021 Cryptographic Failures',
        location: targetUrl,
      })
    );
    return findings;
  }

  // HTTPS site: does the HTTP version redirect to HTTPS?
  const httpVersion = 'http://' + u.host + u.pathname;
  const res = await request(httpVersion);
  if (res.ok && res.status >= 200 && res.status < 300) {
    findings.push(
      finding({
        title: 'HTTP version does not redirect to HTTPS',
        severity: SEVERITY.MEDIUM,
        description: 'The site is reachable over plain HTTP without being forced to the secure version.',
        evidence: `${httpVersion} returned ${res.status} instead of a redirect`,
        remediation: 'Add a 301 redirect from HTTP to HTTPS for all paths.',
        owasp: 'A02:2021 Cryptographic Failures',
        location: httpVersion,
      })
    );
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 5. Exposed sensitive files / paths (detection only, polite probe)
 * ------------------------------------------------------------------ */
const SENSITIVE_PATHS = [
  { path: '/.env', sev: SEVERITY.CRITICAL, sig: /[A-Z_]+=/ },
  { path: '/.git/config', sev: SEVERITY.CRITICAL, sig: /\[core\]|repositoryformatversion/ },
  { path: '/config.php.bak', sev: SEVERITY.CRITICAL, sig: /<\?php/ },
  { path: '/backup.zip', sev: SEVERITY.HIGH, sig: null },
  { path: '/.htaccess', sev: SEVERITY.MEDIUM, sig: /RewriteEngine|Order allow/ },
  { path: '/phpinfo.php', sev: SEVERITY.HIGH, sig: /phpinfo\(\)|PHP Version/ },
  { path: '/server-status', sev: SEVERITY.MEDIUM, sig: /Apache Server Status/ },
  { path: '/.DS_Store', sev: SEVERITY.LOW, sig: null },
  { path: '/wp-config.php.bak', sev: SEVERITY.CRITICAL, sig: /DB_PASSWORD/ },
];

export async function checkExposedPaths(targetUrl) {
  const origin = new URL(targetUrl).origin;
  const findings = [];

  for (const item of SENSITIVE_PATHS) {
    const res = await request(origin + item.path);
    if (!res.ok || res.status !== 200) continue;

    // If a signature is defined, confirm the body actually matches it to
    // avoid false positives from catch-all 200 pages.
    const matches = item.sig ? item.sig.test(res.body || '') : true;
    if (!matches) continue;

    findings.push(
      finding({
        title: `Exposed sensitive file: ${item.path}`,
        severity: item.sev,
        description: 'A sensitive file or endpoint is publicly accessible and may leak secrets or source code.',
        evidence: `${origin + item.path} returned HTTP 200`,
        remediation: 'Remove the file from the web root or block access to it at the server level.',
        owasp: 'A01:2021 Broken Access Control',
        location: origin + item.path,
      })
    );
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 6. Directory listing enabled
 * ------------------------------------------------------------------ */
export function checkDirectoryListing(pages) {
  const findings = [];
  for (const page of pages) {
    if (/<title>Index of \/|Directory listing for/i.test(page.body || '')) {
      findings.push(
        finding({
          title: 'Directory listing enabled',
          severity: SEVERITY.MEDIUM,
          description: 'The server lists directory contents, exposing file structure to attackers.',
          evidence: `"Index of /" found at ${page.url}`,
          remediation: 'Disable automatic directory indexing on the web server.',
          owasp: 'A05:2021 Security Misconfiguration',
          location: page.url,
        })
      );
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 7. Form security (CSRF token, HTTP submission, password over HTTP)
 * ------------------------------------------------------------------ */
export function checkForms(forms) {
  const findings = [];
  for (const form of forms) {
    const actionUrl = resolveAction(form.action, form.pageUrl);

    if (form.method === 'post' && !form.hasCsrfToken) {
      findings.push(
        finding({
          title: 'Form without CSRF protection',
          severity: SEVERITY.MEDIUM,
          description: 'A state-changing POST form has no detectable anti-CSRF token.',
          evidence: `POST form at ${form.pageUrl} (action: ${form.action || 'self'})`,
          remediation: 'Add a per-session anti-CSRF token to the form and validate it server-side.',
          owasp: 'A01:2021 Broken Access Control',
          location: form.pageUrl,
        })
      );
    }

    if (form.hasPassword && actionUrl && actionUrl.startsWith('http://')) {
      findings.push(
        finding({
          title: 'Password submitted over insecure HTTP',
          severity: SEVERITY.HIGH,
          description: 'A login/password form posts credentials over an unencrypted connection.',
          evidence: `Password form posts to ${actionUrl}`,
          remediation: 'Submit all credential forms over HTTPS.',
          owasp: 'A02:2021 Cryptographic Failures',
          location: form.pageUrl,
        })
      );
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 8. Mixed content (HTTP resources on an HTTPS page)
 * ------------------------------------------------------------------ */
export function checkMixedContent(pages) {
  const findings = [];
  for (const page of pages) {
    if (!page.url.startsWith('https://') || !page.body) continue;
    const matches = page.body.match(/(?:src|href)=["']http:\/\/[^"']+/gi) || [];
    if (matches.length) {
      findings.push(
        finding({
          title: 'Mixed content on secure page',
          severity: SEVERITY.LOW,
          description: 'An HTTPS page loads one or more resources over plain HTTP, weakening the secure context.',
          evidence: `${matches.length} HTTP resource(s), e.g. ${matches[0].slice(0, 80)}`,
          remediation: 'Load all resources over HTTPS (or protocol-relative URLs).',
          owasp: 'A02:2021 Cryptographic Failures',
          location: page.url,
        })
      );
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 9. Outdated JavaScript library fingerprinting (version in filename)
 * ------------------------------------------------------------------ */
const OLD_LIBS = [
  { re: /jquery[-.]?(1\.[0-9]|2\.[0-9])/i, name: 'jQuery 1.x/2.x' },
  { re: /angular(?:js)?[-.]?1\./i, name: 'AngularJS 1.x' },
  { re: /bootstrap[-.]?(2|3)\./i, name: 'Bootstrap 2.x/3.x' },
];

export function checkOutdatedLibraries(scripts) {
  const findings = [];
  for (const src of scripts) {
    for (const lib of OLD_LIBS) {
      if (lib.re.test(src)) {
        findings.push(
          finding({
            title: `Potentially outdated library: ${lib.name}`,
            severity: SEVERITY.LOW,
            description: 'An old front-end library version was detected and may contain known vulnerabilities.',
            evidence: src,
            remediation: `Upgrade ${lib.name} to a currently supported release.`,
            owasp: 'A06:2021 Vulnerable and Outdated Components',
            location: src,
          })
        );
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * 10. Reflected input detection (non-destructive XSS indicator)
 *     Injects a harmless unique marker into query params and checks
 *     whether it is reflected unencoded. Detection only — no payloads.
 * ------------------------------------------------------------------ */
export async function checkReflectedInput(pages) {
  const findings = [];
  const marker = 'vs' + Math.random().toString(36).slice(2, 8) + 'xyz';

  for (const page of pages.slice(0, 5)) {
    let u;
    try {
      u = new URL(page.url);
    } catch {
      continue;
    }
    if ([...u.searchParams.keys()].length === 0) continue;

    // Replace each existing param value with the harmless marker
    for (const key of u.searchParams.keys()) u.searchParams.set(key, marker);

    const res = await request(u.href);
    if (res.ok && res.body && res.body.includes(marker)) {
      findings.push(
        finding({
          title: 'Reflected user input detected',
          severity: SEVERITY.MEDIUM,
          description:
            'A query parameter value is reflected in the response. If not properly encoded this can enable reflected XSS.',
          evidence: `Marker reflected from parameters on ${u.href}`,
          remediation: 'Context-encode all user input on output and validate inputs server-side.',
          owasp: 'A03:2021 Injection',
          location: page.url,
        })
      );
      break; // one finding is enough to flag the pattern
    }
  }
  return findings;
}

function resolveAction(action, base) {
  if (!action) return base;
  try {
    return new URL(action, base).href;
  } catch {
    return base;
  }
}
