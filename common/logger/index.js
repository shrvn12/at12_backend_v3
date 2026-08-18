// Structured logging shared across every HTTP service and worker.
// Usage:
//   const { logger, httpLoggerMiddleware } = require('../common/logger');
//   logger.info({ userId }, 'user logged in');
//   app.use(httpLoggerMiddleware('dashboard'));
const pino = require('pino');
const { randomUUID } = require('crypto');
const config = require('../config');

const baseLogger = pino({
  level: config.logging.level,
  base: { env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Express/HTTP middleware: assigns a request ID (or reuses an incoming
 * x-correlation-id), attaches a child logger to req.log, and logs
 * start/end of every request with status + duration.
 */
function httpLoggerMiddleware(serviceName) {
  return (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req.correlationId = correlationId;
    req.log = baseLogger.child({ service: serviceName, correlationId });

    res.setHeader('x-correlation-id', correlationId);

    const start = Date.now();
    req.log.info({ method: req.method, path: req.path }, 'request received');

    res.on('finish', () => {
      req.log.info(
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
        },
        'request completed'
      );
    });

    next();
  };
}

/**
 * For workers: wraps message handling with a per-message correlation id
 * and consistent success/failure logging.
 */
function withWorkerLogging(serviceName, jobType, handler) {
  return async (message, ...args) => {
    const correlationId = randomUUID();
    const log = baseLogger.child({ service: serviceName, jobType, correlationId });
    log.info('job started');
    try {
      const result = await handler(message, { log }, ...args);
      log.info('job completed');
      return result;
    } catch (err) {
      log.error({ err }, 'job failed');
      throw err;
    }
  };
}

module.exports = {
  logger: baseLogger,
  httpLoggerMiddleware,
  withWorkerLogging,
};
