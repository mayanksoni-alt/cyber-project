// Thin wrapper around fetch with a timeout and consistent return shape.
// Node 18+ has global fetch, so no extra dependency is needed.

const DEFAULT_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS) || 10000;

const USER_AGENT =
  'VulnScanner/1.0 (+educational security project; scan only authorised targets)';

export async function request(url, { method = 'GET', timeout = DEFAULT_TIMEOUT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual', // we want to inspect redirects ourselves
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    });

    // Collect headers into a plain object (keys lower-cased by fetch already)
    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Set-Cookie needs special handling (getSetCookie keeps them separate)
    const setCookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];

    let body = '';
    const contentType = headers['content-type'] || '';
    if (method === 'GET' && /text|html|json|xml|javascript/.test(contentType)) {
      body = await res.text();
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
