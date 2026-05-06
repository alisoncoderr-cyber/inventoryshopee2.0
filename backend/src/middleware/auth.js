const crypto = require('crypto');

const COOKIE_NAME = 'inventory_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RENDER || process.env.VERCEL);

const getAuthConfig = () => ({
  username: process.env.AUTH_USERNAME || (isProduction ? '' : 'admin'),
  password: process.env.AUTH_PASSWORD || (isProduction ? '' : 'admin123'),
  secret: process.env.AUTH_SECRET || (isProduction ? '' : 'dev-only-auth-secret'),
});

const base64UrlEncode = (value) =>
  Buffer.from(value).toString('base64url');

const base64UrlDecode = (value) =>
  Buffer.from(value, 'base64url').toString('utf8');

const signPayload = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url');

const safeCompare = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) return acc;

      const name = cookie.slice(0, separatorIndex);
      const value = cookie.slice(separatorIndex + 1);
      acc[name] = decodeURIComponent(value);
      return acc;
    }, {});

const buildCookieOptions = () => {
  const secure = isProduction;
  const sameSite = secure ? 'None' : 'Lax';

  return [
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
};

const buildExpiredCookie = () =>
  `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=${isProduction ? 'None; Secure' : 'Lax'}`;

const createSessionToken = (username) => {
  const { secret } = getAuthConfig();
  const payload = base64UrlEncode(
    JSON.stringify({
      username,
      expiresAt: Date.now() + SESSION_TTL_MS,
    })
  );
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
};

const verifySessionToken = (token = '') => {
  const { secret } = getAuthConfig();
  const [payload, signature] = String(token).split('.');

  if (!payload || !signature) return null;
  if (!safeCompare(signature, signPayload(payload, secret))) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    if (!session.expiresAt || session.expiresAt < Date.now()) return null;
    return session;
  } catch (error) {
    return null;
  }
};

const getSessionFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  return verifySessionToken(cookies[COOKIE_NAME]);
};

const isAuthConfigured = () => {
  const { username, password, secret } = getAuthConfig();
  return Boolean(username && password && secret);
};

const requireAuth = (req, res, next) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Login nao configurado no servidor.',
    });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Login necessario para acessar o sistema.',
    });
  }

  req.auth = session;
  return next();
};

module.exports = {
  COOKIE_NAME,
  buildCookieOptions,
  buildExpiredCookie,
  createSessionToken,
  getAuthConfig,
  getSessionFromRequest,
  isAuthConfigured,
  requireAuth,
  safeCompare,
};
