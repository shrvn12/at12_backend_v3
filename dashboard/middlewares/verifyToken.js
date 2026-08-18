// Delegates to common/auth so Dashboard and the Interaction Server validate
// JWTs identically (same secret, same verification logic).
const { requireAuth } = require('../../common/auth');

module.exports = requireAuth;
