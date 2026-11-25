import crypto from 'crypto';

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  'sentryscan-hydrogen-dev-secret-change-in-prod';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash a plaintext password using scrypt with a random 16-byte salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` string.
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

/**
 * Create a compact HMAC-SHA256 signed session token.
 */
export function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL_MS,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verify and decode an HMAC-SHA256 token. Returns null if invalid or expired.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from the Authorization header.
 */
export function extractBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

/**
 * Middleware: attaches `req.user` if a valid Bearer token is present, otherwise continues.
 */
export function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload?.sub) {
      req.user = { id: payload.sub, email: payload.email, name: payload.name };
    }
  }
  next();
}

/**
 * Middleware: requires a valid Bearer token; responds 401 otherwise.
 */
export function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  const payload = verifyToken(token);
  if (!payload?.sub) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  req.user = { id: payload.sub, email: payload.email, name: payload.name };
  next();
}

/**
 * Strip sensitive fields before sending a user object to clients.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash: _ignored, ...safe } = user;
  return safe;
}
