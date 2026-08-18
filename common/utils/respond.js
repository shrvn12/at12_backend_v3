// Consistent success/error envelope for new endpoints. Existing endpoints
// (music/*, auth/*, user/*) were left with their original response shapes —
// changing those would ripple into every frontend fetch() call that reads
// them today; that's a larger, separate migration. New endpoints added
// alongside the gap-closing pass (home feed, playlists, autocomplete) use
// this envelope consistently from the start.
function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

module.exports = { sendSuccess, sendError };
