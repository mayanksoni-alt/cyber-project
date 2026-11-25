# Backend — SentryScan API

Express API that crawls a target and runs detection checks.

## Run
```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:4000
```

## Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/health`    | Health check |
| POST | `/api/scan`      | Start a scan. Body: `{ "url": "example.com" }` → `{ id }` |
| GET  | `/api/scan/:id`  | Poll scan status + results |
| GET  | `/api/scans`     | Recent scan history |

## Structure
```
server.js                 app entry
src/
  config/supabase.js      Supabase client (optional)
  config/store.js         save/get/list (Supabase or in-memory)
  routes/scan.js          API routes
  services/crawler.js     same-origin BFS crawler
  services/checks.js      all detection checks
  services/scanner.js     orchestrates crawl + checks + scoring
  utils/http.js           fetch wrapper + URL helpers
  utils/severity.js       severity weights + scoring
supabase/schema.sql       database table
```

## Notes
- Needs **Node 18+** (uses the built-in `fetch`).
- Crawling is same-origin only and rate/size limited for safety.
- Checks are **detection only** — no exploitation payloads.
