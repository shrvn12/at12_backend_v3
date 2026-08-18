// Minimal query-param presence validation for GET routes (the existing
// validateFields middleware only handles req.body, used by /auth).
function requireQuery(paramNames) {
  return (req, res, next) => {
    const missing = paramNames.filter((name) => !req.query[name]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required query param(s): ${missing.join(', ')}` });
    }
    next();
  };
}

function requireParams(paramNames) {
  return (req, res, next) => {
    const missing = paramNames.filter((name) => !req.params[name]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required param(s): ${missing.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireQuery, requireParams };
