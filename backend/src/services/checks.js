import { SEVERITY } from '../utils/severity.js';
import { request } from '../utils/http.js';

// Each check returns an array of findings. A finding looks like:
// { id, title, summary, impact, severity, description, evidence, remediation, exampleFix, owasp, location }

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
      title: 'No script protection rule (Missing Content-Security-Policy)',
      summary: 'Your site does not tell browsers which scripts and resources are safe to run.',
      impact:
        'If an attacker manages to inject malicious code into a page, the browser will run it freely—putting user logins, cookies, and data at risk.',
      severity: SEVERITY.MEDIUM,
      remediation:
        'Add a Content-Security-Policy (CSP) response header on your web server or CDN to allow scripts only from your own domain and trusted sources.',
      exampleFix: "Content-Security-Policy: default-src 'self'; script-src 'self'",
    },
    {
      name: 'strict-transport-security',
      title: 'Browsers are not forced to stay on HTTPS (Missing HSTS)',
      summary: 'Your site supports HTTPS, but does not instruct browsers to always connect securely.',
      impact:
        'On public Wi-Fi or untrusted networks, an attacker could briefly downgrade a visitor’s first connection to unencrypted HTTP and intercept traffic.',
      severity: SEVERITY.MEDIUM,
      remediation:
        'Enable the Strict-Transport-Security (HSTS) header so browsers automatically upgrade every visit to HTTPS.',
      exampleFix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    },
    {
      name: 'x-frame-options',
      title: 'Site can be embedded in hidden frames (Clickjacking risk)',
      summary: 'Other websites can load your pages inside an invisible frame (iframe).',
      impact:
        'An attacker could overlay a fake button on top of your real site inside an invisible frame, tricking visitors into clicking "Delete", "Pay", or changing settings without realizing it.',
      severity: SEVERITY.MEDIUM,
      remediation:
        'Block other sites from framing your pages by adding the X-Frame-Options header (or CSP frame-ancestors).',
      exampleFix: 'X-Frame-Options: SAMEORIGIN',
    },
    {
      name: 'x-content-type-options',
      title: 'Browser file-type guessing is enabled (Missing X-Content-Type-Options)',
      summary: 'Browsers are allowed to guess the file type of downloads or uploads instead of trusting your server.',
      impact:
        'A harmless-looking uploaded file (such as an image or text file) could be misinterpreted by a browser as executable script code.',
      severity: SEVERITY.LOW,
      remediation:
        'Add the X-Content-Type-Options header with the value "nosniff" so browsers strictly follow declared file types.',
      exampleFix: 'X-Content-Type-Options: nosniff',
    },
    {
      name: 'referrer-policy',
      title: 'Full page URLs may leak to external sites (Missing Referrer-Policy)',
      summary: 'When users click a link to another website, the browser may share the full URL they came from.',
      impact:
        'If your URLs contain sensitive details like search terms, user IDs, or reset tokens, third-party websites could see them in their analytics.',
      severity: SEVERITY.LOW,
      remediation:
        'Set a Referrer-Policy header so only your domain name (not full page paths or query parameters) is shared externally.',
      exampleFix: 'Referrer-Policy: strict-origin-when-cross-origin',
    },
    {
      name: 'permissions-policy',
      title: 'Browser device permissions are not restricted (Missing Permissions-Policy)',
      summary: 'The site does not explicitly restrict browser features like camera, microphone, or location.',
      impact:
        'Embedded third-party scripts or iframes could request sensitive device permissions that your site does not actually need.',
      severity: SEVERITY.INFO,
      remediation:
        'Add a Permissions-Policy header to disable unused device APIs like camera, microphone, and geolocation.',
      exampleFix: 'Permissions-Policy: camera=(), microphone=(), geolocation=()',
    },
  ];

  for (const r of required) {
    if (!h[r.name]) {
      findings.push(
        finding({
          title: r.title,
          summary: r.summary,
          impact: r.impact,
          severity: r.severity,
          description: r.summary,
          evidence: `Header "${r.name}" was not returned by ${mainPage.url}`,
          remediation: r.remediation,
          exampleFix: r.exampleFix,
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
        title: 'Website advertises its backend framework (X-Powered-By header)',
        summary: `Your server announces that it runs on "${h['x-powered-by']}".`,
        impact:
          'Knowing the exact framework makes it much easier for automated bots to look up and try known exploits tailored to that software.',
        severity: SEVERITY.LOW,
        description: `The server reveals its underlying technology ("${h['x-powered-by']}") in public response headers.`,
        evidence: `X-Powered-By: ${h['x-powered-by']}`,
        remediation:
          'Disable or remove the X-Powered-By header in your web server or framework settings (for example, `app.disable("x-powered-by")` in Express).',
        owasp: 'A05:2021 Security Misconfiguration',
        location: mainPage.url,
      })
    );
  }

  if (h['server'] && /[0-9]/.test(h['server'])) {
    findings.push(
      finding({
        title: 'Server exposes its exact software version',
        summary: `Your server header shares version details ("${h['server']}").`,
        impact:
          'Attackers scan for specific version numbers to quickly spot outdated servers with publicly known vulnerabilities.',
        severity: SEVERITY.LOW,
        description: `The Server header exposes software and version details ("${h['server']}").`,
        evidence: `Server: ${h['server']}`,
        remediation:
          'Configure Nginx, Apache, or your proxy to hide version numbers (for example, `server_tokens off;` in Nginx).',
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
        const isHttpOnlyMissing = missing.includes('HttpOnly');
        findings.push(
          finding({
            title: `Cookie "${name}" is missing safety flags (${missing.join(', ')})`,
            summary: `The browser cookie "${name}" lacks ${missing.join(', ')} protection.`,
            impact: isHttpOnlyMissing
              ? 'Because HttpOnly is missing, malicious JavaScript (if present) could read this cookie—potentially hijacking a user’s logged-in session.'
              : 'Without Secure and SameSite flags, this cookie could be sent over unencrypted connections or triggered unexpectedly from third-party sites.',
            severity: isHttpOnlyMissing ? SEVERITY.MEDIUM : SEVERITY.LOW,
            description: `Cookies without ${missing.join(', ')} flags can be exposed to scripts or cross-site requests.`,
            evidence: cookie.slice(0, 120),
            remediation: `Update the "${name}" cookie configuration to include ${missing.join(', ')} attributes.`,
            exampleFix: `Set-Cookie: ${name}=...; Secure; HttpOnly; SameSite=Lax`,
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
        title: 'Website is not encrypted (Uses plain HTTP instead of HTTPS)',
        summary: 'Data sent between visitors and this website is completely unencrypted.',
        impact:
          'Anyone on the same Wi-Fi network or internet path can read passwords, form inputs, and personal information in plain text, or alter pages in transit.',
        severity: SEVERITY.HIGH,
        description: 'Traffic is unencrypted over plain HTTP and can be intercepted or modified in transit.',
        evidence: `Target protocol: ${u.protocol}`,
        remediation: 'Install an SSL/TLS certificate (such as Let’s Encrypt) and serve the entire site over HTTPS.',
        owasp: 'A02:2021 Cryptographic Failures',
        location: targetUrl,
      })
    );
    return findings;
  }

  // HTTPS site: does the HTTP version redirect to HTTPS?
  const httpVersion = 'http://' + u.host + u.pathname;
  const res = await request(httpVersion, { timeout: 3500 });
  if (res.ok && res.status >= 200 && res.status < 300) {
    findings.push(
      finding({
        title: 'Insecure HTTP links do not automatically redirect to HTTPS',
        summary: 'If someone types http:// instead of https://, the site stays unencrypted instead of redirecting.',
        impact:
          'Visitors clicking older links or typing the domain without "https://" may end up on an unencrypted connection.',
        severity: SEVERITY.MEDIUM,
        description: 'The site is reachable over plain HTTP without redirecting visitors to HTTPS.',
        evidence: `${httpVersion} returned HTTP ${res.status} instead of a 301/302 redirect`,
        remediation: 'Configure a permanent 301 redirect from all http:// URLs to https://.',
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
  { path: '/.env', sev: SEVERITY.CRITICAL, sig: /[A-Z_]+=/, label: 'environment secrets file (.env)' },
  { path: '/.git/config', sev: SEVERITY.CRITICAL, sig: /\[core\]|repositoryformatversion/, label: 'Git repository config' },
  { path: '/config.php.bak', sev: SEVERITY.CRITICAL, sig: /<\?php/, label: 'PHP configuration backup' },
  { path: '/backup.zip', sev: SEVERITY.HIGH, sig: null, label: 'site backup archive' },
  { path: '/.htaccess', sev: SEVERITY.MEDIUM, sig: /RewriteEngine|Order allow/, label: 'Apache rules file (.htaccess)' },
  { path: '/phpinfo.php', sev: SEVERITY.HIGH, sig: /phpinfo\(\)|PHP Version/, label: 'PHP diagnostics page (phpinfo)' },
  { path: '/server-status', sev: SEVERITY.MEDIUM, sig: /Apache Server Status/, label: 'server status page' },
  { path: '/.DS_Store', sev: SEVERITY.LOW, sig: null, label: 'macOS folder metadata (.DS_Store)' },
  { path: '/wp-config.php.bak', sev: SEVERITY.CRITICAL, sig: /DB_PASSWORD/, label: 'WordPress database config backup' },
];

export async function checkExposedPaths(targetUrl) {
  const origin = new URL(targetUrl).origin;
  const results = await Promise.all(
    SENSITIVE_PATHS.map(async (item) => {
      const res = await request(origin + item.path, { timeout: 3500 });
      if (!res.ok || res.status !== 200) return null;

      const matches = item.sig ? item.sig.test(res.body || '') : true;
      if (!matches) return null;

      return finding({
        title: `Private file is publicly downloadable: ${item.path}`,
        summary: `Anyone on the internet can open ${item.path} (${item.label}).`,
        impact:
          'Files like .env, .git, or backups frequently contain database passwords, API keys, or source code that let attackers take over the server.',
        severity: item.sev,
        description: `A sensitive ${item.label} is publicly accessible and may leak secrets or source code.`,
        evidence: `${origin + item.path} returned HTTP 200`,
        remediation: `Immediately delete ${item.path} from your public folder or block access to it in your web server rules, and rotate any exposed keys.`,
        owasp: 'A01:2021 Broken Access Control',
        location: origin + item.path,
      });
    })
  );

  return results.filter(Boolean);
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
          title: 'Folder contents are publicly browseable (Directory listing)',
          summary: 'Visiting this URL displays a raw list of files and folders on the server.',
          impact:
            'Visitors and bots can browse internal scripts, backups, or uploaded files that were never meant to be discovered.',
          severity: SEVERITY.MEDIUM,
          description: 'The server exposes a directory file index to public visitors.',
          evidence: `"Index of /" found at ${page.url}`,
          remediation: 'Turn off automatic directory indexing (e.g. `Options -Indexes` in Apache or `autoindex off;` in Nginx).',
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
          title: 'Form lacks anti-forgery protection (Missing CSRF token)',
          summary: 'A form that submits data does not include a hidden security token to verify the request came from your site.',
          impact:
            'If a logged-in user visits a malicious website, that site could trick their browser into submitting this form silently on their behalf.',
          severity: SEVERITY.MEDIUM,
          description: 'A state-changing POST form has no detectable anti-CSRF token.',
          evidence: `POST form at ${form.pageUrl} (action: ${form.action || 'self'})`,
          remediation: 'Add a unique hidden CSRF token to every state-changing form and validate it on the server.',
          owasp: 'A01:2021 Broken Access Control',
          location: form.pageUrl,
        })
      );
    }

    if (form.hasPassword && actionUrl && actionUrl.startsWith('http://')) {
      findings.push(
        finding({
          title: 'Password form sends login details without encryption',
          summary: 'A password field submits to an unencrypted http:// address.',
          impact:
            'Anyone monitoring the network could capture the user’s password in plain text as soon as they click Log in.',
          severity: SEVERITY.HIGH,
          description: 'A login/password form posts credentials over an unencrypted HTTP connection.',
          evidence: `Password form posts to ${actionUrl}`,
          remediation: 'Change the form action URL and host page to use HTTPS exclusively.',
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
          title: 'Secure HTTPS page loads unencrypted HTTP files (Mixed content)',
          summary: `Found ${matches.length} script, image, or stylesheet link(s) still using http:// on an HTTPS page.`,
          impact:
            'Browsers may show a "Not Secure" warning or block those files, and unencrypted scripts could be tampered with on public networks.',
          severity: SEVERITY.LOW,
          description: 'An HTTPS page loads one or more sub-resources over plain HTTP.',
          evidence: `${matches.length} HTTP resource(s), e.g. ${matches[0].slice(0, 80)}`,
          remediation: 'Update all src and href links to use https:// instead of http://.',
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
            title: `Old JavaScript library in use: ${lib.name}`,
            summary: `The site loads ${lib.name}, which is no longer supported with security updates.`,
            impact:
              'Legacy frontend libraries often have publicly documented XSS bugs that attackers automate against older versions.',
            severity: SEVERITY.LOW,
            description: `An outdated version of ${lib.name} was detected and may contain known security flaws.`,
            evidence: src,
            remediation: `Upgrade ${lib.name} to the latest supported version and re-test your pages.`,
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
  const marker = 'vs' + Math.random().toString(36).slice(2, 8) + 'xyz';
  const candidates = [];

  for (const page of pages) {
    if (candidates.length >= 3) break;
    try {
      const u = new URL(page.url);
      if ([...u.searchParams.keys()].length === 0) continue;
      for (const key of u.searchParams.keys()) u.searchParams.set(key, marker);
      candidates.push({ originalUrl: page.url, testUrl: u.href });
    } catch {
      continue;
    }
  }

  if (candidates.length === 0) return [];

  const responses = await Promise.all(
    candidates.map(async (c) => ({ ...c, res: await request(c.testUrl, { timeout: 3500 }) }))
  );

  for (const item of responses) {
    if (item.res.ok && item.res.body && item.res.body.includes(marker)) {
      return [
        finding({
          title: 'URL text is echoed directly onto the page (Potential XSS)',
          summary: 'Values typed into the URL query string appear back inside the webpage HTML.',
          impact:
            'If special characters like < or > are not safely escaped, an attacker could craft a malicious link that runs JavaScript inside a victim’s browser.',
          severity: SEVERITY.MEDIUM,
          description:
            'A query parameter value is reflected in the response. Without proper HTML encoding, this can lead to Cross-Site Scripting (XSS).',
          evidence: `Harmless test text "${marker}" was reflected on ${item.testUrl}`,
          remediation: 'Escape/encode all user-supplied text before rendering it in HTML and use a strong Content-Security-Policy.',
          owasp: 'A03:2021 Injection',
          location: item.originalUrl,
        }),
      ];
    }
  }
  return [];
}

function resolveAction(action, base) {
  if (!action) return base;
  try {
    return new URL(action, base).href;
  } catch {
    return base;
  }
}
