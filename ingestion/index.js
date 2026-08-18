// Interaction Server: does no heavy work. Authenticates, validates,
// publishes the event to RabbitMQ, and responds immediately. All actual
// persistence/side effects happen in the Event Worker.
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const config = require('../common/config');
const { httpLoggerMiddleware } = require('../common/logger');
const { requireAuth } = require('../common/auth');
const { publishInteractionEvent } = require('../common/queue');
const healthRouter = require('../common/health');

const TRACKED_EVENT_TYPES = new Set([
  'SONG_COMPLETED',
  'SONG_SKIPPED',
  'SONG_LIKED',
  'SONG_UNLIKED',
  'SEARCH_PERFORMED',
  'PLAYLIST_CREATED',
  'PLAYLIST_PLAYED',
  'PLAYLIST_ADDED',
]);

// Explicitly ignored per spec - accepted so the frontend doesn't need to
// special-case them, but never published to the queue.
const IGNORED_EVENT_TYPES = new Set(['PAUSE', 'RESUME', 'SEEK', 'HEARTBEAT']);

const app = express();
app.use(cors({ origin: config.http.frontendUrl, credentials: true }));
app.use(httpLoggerMiddleware('interaction-server'));
app.use(express.json());
app.use(cookieParser());
app.use('/health', healthRouter);

app.post('/events', requireAuth, async (req, res) => {
  const { eventType, videoId, metadata } = req.body || {};

  if (!eventType) {
    return res.status(400).json({ success: false, message: 'eventType is required' });
  }

  if (IGNORED_EVENT_TYPES.has(eventType)) {
    return res.status(202).json({ success: true, ignored: true });
  }

  if (!TRACKED_EVENT_TYPES.has(eventType)) {
    return res.status(400).json({ success: false, message: `Unknown eventType: ${eventType}` });
  }

  try {
    await publishInteractionEvent({
      userId: req.user.id,
      videoId: videoId || null,
      eventType,
      metadata: metadata || {},
    });
    res.status(202).json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'failed to publish interaction event');
    res.status(503).json({ success: false, message: 'Could not accept event right now' });
  }
});

app.listen(config.http.interactionServerPort, () => {
  console.log(`Interaction Server running on port ${config.http.interactionServerPort}`);
});

module.exports = app;
