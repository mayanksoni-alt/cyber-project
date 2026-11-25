import * as cheerio from 'cheerio';
import { request } from '../utils/http.js';

// A polite, same-origin breadth-first crawler.
// It collects pages, forms, links, scripts and cookies for the scanner to analyse.

const DEFAULT_MAX_PAGES = Number(process.env.MAX_PAGES) || 25;
const DEFAULT_MAX_DEPTH = Number(process.env.MAX_DEPTH) || 2;

export async function crawl(startUrl, onProgress = () => {}, options = {}) {
  const maxPages = Math.max(1, Math.min(50, Number(options.maxPages) || DEFAULT_MAX_PAGES));
  const maxDepth = Math.max(0, Math.min(4, options.maxDepth ?? DEFAULT_MAX_DEPTH));

  const origin = new URL(startUrl).origin;
  const host = new URL(startUrl).host;

  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];

  const pages = [];     // { url, status, headers, body, setCookies }
  const forms = [];     // { pageUrl, action, method, hasPassword, inputs, hasCsrfToken }
  const scripts = new Set();

  while (queue.length && pages.length < maxPages) {
    const { url, depth } = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    const res = await request(url);
    if (!res.ok) continue;

    pages.push({
      url: res.finalUrl || url,
      status: res.status,
      headers: res.headers,
      setCookies: res.setCookies,
      body: res.body,
    });

    onProgress({ crawled: pages.length, current: url });

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
      if (src) scripts.add(resolve(src, url));
    });

    // Enqueue same-host links
    if (depth < maxDepth) {
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href');
        const abs = resolve(href, url);
        if (!abs) return;
        try {
          const u = new URL(abs);
          if (u.host === host && !visited.has(abs) && u.origin === origin) {
            queue.push({ url: stripHash(abs), depth: depth + 1 });
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
