const express = require('express');
const {
  COOKIE_NAME,
  buildCookieOptions,
  buildExpiredCookie,
  createSessionToken,
  getAuthConfig,
  getSessionFromRequest,
  isAuthConfigured,
  safeCompare,
} = require('../middleware/auth');

const router = express.Router();

router.get('/auth/session', (req, res) => {
  const session = getSessionFromRequest(req);

  res.status(200).json({
    success: true,
    authenticated: Boolean(session),
    user: session ? { username: session.username } : null,
  });
});

router.post('/auth/login', (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Login nao configurado no servidor.',
    });
  }

  const { username, password } = req.body || {};
  const config = getAuthConfig();

  const validUsername = safeCompare(username, config.username);
  const validPassword = safeCompare(password, config.password);

  if (!validUsername || !validPassword) {
    return res.status(401).json({
      success: false,
      message: 'Usuario ou senha invalidos.',
    });
  }

  const token = createSessionToken(config.username);

  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${buildCookieOptions()}`);
  return res.status(200).json({
    success: true,
    user: { username: config.username },
  });
});

router.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', buildExpiredCookie());
  res.status(200).json({
    success: true,
  });
});

module.exports = router;
