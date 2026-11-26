// Thin wrapper around fetch with a tight timeout and consistent return shape.
// Node 18+ has global fetch, so no extra dependency is needed.

const DEFAULT_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS) || 4500;
const MAX_BODY_CHARS = 512_000;

const USER_AGENT =
  'Mozilla/5.0 (compatible; NetHawk/1.0; +educational-security-scanner)';

export async function request(url, { method = 'GET', timeout = DEFAULT_TIMEOUT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual', // inspect redirects explicitly
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
    });

    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const setCookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];

    let body = '';
    const contentType = headers['content-type'] || '';
    if (method === 'GET' && /text|html|json|xml|javascript/.test(contentType)) {
      const text = await res.text();
      body = text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text;
    }

    return {
      ok: true,
      url,
      status: res.status,
      headers,
      setCookies,
      body,
      finalUrl: res.url || url,
    };
  } catch (err) {
    return { ok: false, url, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeUrl(input) {
  let value = (input || '').trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  try {
    const u = new URL(value);
    return u.href;
  } catch {
    return null;
  }
}
