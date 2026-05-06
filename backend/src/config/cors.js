const parseAllowedOrigins = () =>
  String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseAllowedOrigins();

const isOriginAllowed = (origin = '') => {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
};

const buildCorsHeaders = (origin = '') => {
  const allowedOrigin = isOriginAllowed(origin)
    ? origin || allowedOrigins[0] || '*'
    : 'null';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
};

module.exports = {
  allowedOrigins,
  isOriginAllowed,
  buildCorsHeaders,
};
