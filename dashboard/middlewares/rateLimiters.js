const rateLimit = require('express-rate-limit');

// Auth endpoints - stricter, since brute-forcing login/reset is the main risk.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

// Search endpoints - looser, just enough to blunt scraping/abuse without
// getting in the way of normal typing-triggered autocomplete calls.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many search requests. Please slow down.' },
});

module.exports = { authLimiter, searchLimiter };
