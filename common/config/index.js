// Central configuration. All configurable values must come from environment
// variables — never hardcode secrets, TTLs, scheduler intervals, or retention
// periods anywhere else in the codebase.
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  env: process.env.NODE_ENV || 'development',

  http: {
    dashboardPort: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
    interactionServerPort: parseInt(process.env.INTERACTION_SERVER_PORT || '3001', 10),
    frontendUrl: process.env.FRONTEND_URL,
    dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:3000',
  },

  postgres: {
    connectionString: required('DATABASE_URL'),
    poolMax: parseInt(process.env.PG_POOL_MAX || '10', 10),
  },

  redis: {
    url: required('REDIS_URL', 'redis://localhost:6379'),
    ttl: {
      song: parseInt(process.env.SONG_CACHE_TTL_SECONDS || '3600', 10),
      search: parseInt(process.env.SEARCH_CACHE_TTL_SECONDS || '1800', 10),
      homeFeed: parseInt(process.env.HOME_FEED_CACHE_TTL_SECONDS || '86400', 10),
      playlist: parseInt(process.env.PLAYLIST_CACHE_TTL_SECONDS || '86400', 10),
      profile: parseInt(process.env.PROFILE_CACHE_TTL_SECONDS || '3600', 10),
    },
  },

  rabbitmq: {
    url: required('RABBITMQ_URL', 'amqp://localhost:5672'),
    queues: {
      interactionEvents: 'interaction_events',
      feedGeneration: 'feed_generation',
      maintenance: 'maintenance',
    },
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '5', 10),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    cookieName: process.env.AUTH_COOKIE_NAME || 'token',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  scheduler: {
    hourlyCron: process.env.SCHEDULER_HOURLY_CRON || '0 * * * *',
    dailyCron: process.env.SCHEDULER_DAILY_CRON || '0 3 * * *',
    homeFeedStaleHours: parseInt(process.env.HOME_FEED_STALE_HOURS || '24', 10),
    playlistStaleHours: parseInt(process.env.PLAYLIST_STALE_HOURS || '24', 10),
  },

  songs: {
    statsStaleHours: parseInt(process.env.SONG_STATS_STALE_HOURS || '24', 10),
    retentionDays: parseInt(process.env.SONG_RETENTION_DAYS || '180', 10),
  },

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
