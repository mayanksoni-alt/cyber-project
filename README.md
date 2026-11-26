# 🛡️ NetHawk — Web Vulnerability Scanner

A full-stack web vulnerability scanner. Enter a URL; it crawls the site and runs
a battery of **detection** checks (security headers, insecure cookies, exposed
files, weak forms, mixed content, outdated libraries, reflected input and more),
then gives each site a security score and graded report.

> ⚠️ **Authorised use only.** This tool is for education and for testing sites you
> own or have **written permission** to test. It detects misconfigurations — it
> does not exploit them. Scanning systems without permission may be illegal.

```
vuln-scanner/
├── backend/     Node + Express API (crawler + detection engine + Supabase)
└── frontend/    React + Vite single-page app (Blinkit-style UI)
```

## Tech stack
- **Backend:** Node.js, Express, Cheerio (HTML parsing), native fetch
- **Database:** Supabase (optional — falls back to in-memory if not configured)
- **Frontend:** React 18, Vite

## Quick start

Open **two terminals** — one for the backend, one for the frontend.

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env     # optional: add Supabase keys
npm run dev              # starts http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev              # starts http://localhost:5173
```

Open **http://localhost:5173** and scan a URL.

The frontend proxies `/api` to the backend automatically (see `vite.config.js`),
so you don't need to touch CORS during development.

## Supabase (optional but recommended)
1. Create a project at https://supabase.com
2. In **SQL Editor**, run the script in `backend/supabase/schema.sql`
3. In **Settings → API**, copy the Project URL and the `service_role` key
4. Paste them into `backend/.env`:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
Without these, scans still work but are only kept in memory until the server restarts.

## What it checks
| Check | Severity | OWASP |
|-------|----------|-------|
| Missing security headers (CSP, HSTS, X-Frame-Options…) | Low–Medium | A05 |
| Technology / version disclosure | Low | A05 |
| Insecure cookies (no Secure/HttpOnly/SameSite) | Low–Medium | A05 |
| Plain HTTP / no HTTPS redirect | Medium–High | A02 |
| Exposed sensitive files (.env, .git, backups…) | High–Critical | A01 |
| Directory listing enabled | Medium | A05 |
| Forms without CSRF token | Medium | A01 |
| Passwords posted over HTTP | High | A02 |
| Mixed content | Low | A02 |
| Outdated JS libraries | Low | A06 |
| Reflected input (XSS indicator) | Medium | A03 |

## How it works
1. **Crawl** — breadth-first, same-origin, depth/page limited, polite.
2. **Analyse** — each page + the whole site is run through the detection checks.
3. **Score** — findings are weighted by severity into a 0–100 score and A–F grade.
4. **Store** — results saved to Supabase (or memory) and polled by the UI.

## Tuning
Edit `backend/.env`:
- `MAX_PAGES` — how many pages to crawl (default 25)
- `MAX_DEPTH` — crawl depth (default 2)
- `REQUEST_TIMEOUT_MS` — per-request timeout (default 10000)
# cyber-project
# cyber-project
