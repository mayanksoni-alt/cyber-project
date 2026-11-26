import * as cheerio from 'cheerio';
import { request } from '../utils/http.js';

// A fast, polite, same-origin breadth-first crawler with strict time & failure limits
// so scans never hang when a site has nothing left to crawl or blocks requests.

const DEFAULT_MAX_PAGES = Number(process.env.MAX_PAGES) || 25;
const DEFAULT_MAX_DEPTH = Number(process.env.MAX_DEPTH) || 2;
const SKIP_EXT_RE = /\.(png|jpe?g|gif|svg|webp|ico|css|js|mjs|pdf|zip|gz|tar|mp4|mp3|woff2?|ttf|eot)(\?|$)/i;

export async function crawl(startUrl, onProgress = () => {}, options = {}) {
  const maxPages = Math.max(1, Math.min(40, Number(options.maxPages) || DEFAULT_MAX_PAGES));
  const maxDepth = Math.max(0, Math.min(3, options.maxDepth ?? DEFAULT_MAX_DEPTH));
  const maxDurationMs = options.mode === 'light' ? 12000 : 22000;
  const maxAttempts = maxPages * 2;
  const startedAt = Date.now();

  const origin = new URL(startUrl).origin;
  const host = new URL(startUrl).host;

  const visited = new Set();
  const queued = new Set([stripHash(startUrl)]);
  const queue = [{ url: stripHash(startUrl), depth: 0 }];

  const pages = [];     // { url, status, headers, body, setCookies }
  const forms = [];     // { pageUrl, action, method, hasPassword, inputs, hasCsrfToken }
  const scripts = new Set();

  let attempts = 0;
  let consecutiveFailures = 0;

  while (queue.length && pages.length < maxPages && attempts < maxAttempts) {
    if (Date.now() - startedAt > maxDurationMs) break;
    if (consecutiveFailures >= 4) break;
    if (options.shouldStop?.()) break;

    const { url, depth } = queue.shift();
    if (visited.has(url) || SKIP_EXT_RE.test(url)) continue;
    visited.add(url);
    attempts++;

    const res = await request(url, { timeout: 4000 });
    if (!res.ok) {
      consecutiveFailures++;
      continue;
    }

    consecutiveFailures = 0;

    // If the entry URL redirects (e.g. example.com -> www.example.com), follow once on same host/root
    if (pages.length === 0 && res.status >= 300 && res.status < 400 && res.headers.location) {
      const nextUrl = stripHash(resolve(res.headers.location, url) || '');
      if (nextUrl && !visited.has(nextUrl) && !queued.has(nextUrl)) {
        try {
          const parsedNext = new URL(nextUrl);
          if (parsedNext.protocol.startsWith('http')) {
            queued.add(nextUrl);
            queue.unshift({ url: nextUrl, depth });
          }
        } catch {
          // ignore invalid redirect URL
        }
      }
    }

    pages.push({
      url: res.finalUrl || url,
      status: res.status,
      headers: res.headers,
      setCookies: res.setCookies,
      body: res.body,
    });

    await onProgress({ crawled: pages.length, current: url });

    // Only parse HTML pages for links/forms
    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('text/html') || !res.body) continue;

    const $ = cheerio.load(res.body);

    // Collect forms
    $('form').each((_i, el) => {
      const $form = $(el);
      const inputs = [];
      let hasPassword = false;
      let hasCsrfToken = false;

      $form.find('input, textarea, select').each((_j, inp) => {
        const type = ($(inp).attr('type') || 'text').toLowerCase();
        const name = ($(inp).attr('name') || '').toLowerCase();
        inputs.push({ type, name });
        if (type === 'password') hasPassword = true;
        if (/csrf|token|authenticity|_token|nonce/.test(name)) hasCsrfToken = true;
      });

      forms.push({
        pageUrl: res.finalUrl || url,
        action: $form.attr('action') || '',
        method: ($form.attr('method') || 'get').toLowerCase(),
        hasPassword,
        hasCsrfToken,
        inputs,
      });
    });

    // Collect external/internal scripts for fingerprinting
    $('script[src]').each((_i, el) => {
      const src = $(el).attr('src');
      const absSrc = resolve(src, url);
      if (absSrc) scripts.add(absSrc);
    });

    // Enqueue unique same-origin links
    if (depth < maxDepth && queue.length < maxPages * 3) {
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href');
        const abs = resolve(href, url);
        if (!abs) return;
        const clean = stripHash(abs);
        if (SKIP_EXT_RE.test(clean)) return;
        try {
          const u = new URL(clean);
          if (
            u.host === host &&
            u.origin === origin &&
            !visited.has(clean) &&
            !queued.has(clean)
          ) {
            queued.add(clean);
            queue.push({ url: clean, depth: depth + 1 });
          }
        } catch {
          /* ignore bad URLs */
        }
      });
    }
  }

  return { pages, forms, scripts: [...scripts], pageCount: pages.length };
}

function resolve(href, base) {
  if (!href) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(href.trim())) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function stripHash(url) {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}
