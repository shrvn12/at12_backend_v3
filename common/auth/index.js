// Shared JWT helpers. Dashboard and Interaction Server must validate JWTs
// identically — both import from here rather than each rolling their own.
const jwt = require('jsonwebtoken');
const config = require('../config');

function sign(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry });
}

function verify(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

/**
 * Express middleware: reads the auth cookie, verifies it, attaches
 * req.user. Identical behavior wherever it's mounted.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[config.auth.cookieName] || req.headers[config.auth.cookieName];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    req.user = verify(token);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.[config.auth.cookieName] || req.headers[config.auth.cookieName];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = verify(token);
  } catch (err) {
    req.user = null; // expired/invalid token -> treat as logged out, don't 401
  }
  next();
}

module.exports = { sign, verify, requireAuth, optionalAuth, cookieName: config.auth.cookieName };
