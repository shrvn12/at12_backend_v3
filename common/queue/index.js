// RabbitMQ setup shared by all publishers (Interaction Server, Scheduler)
// and consumers (Event/Feed/Maintenance Workers).
//
// Every queue gets a matching dead-letter queue. Consumers only ack after
// successful processing; on failure the message is nacked, requeued up to
// `maxRetries` times (tracked via the x-retry-count header), then routed
// to the DLQ.
const amqp = require('amqplib');
const { randomUUID } = require('crypto');
const config = require('../config');
const { logger } = require('../logger');

const QUEUES = config.rabbitmq.queues;

let connection;
let channel;

async function getChannel() {
  if (channel) return channel;
  connection = await amqp.connect(config.rabbitmq.url);
  connection.on('error', (err) => logger.error({ err }, 'rabbitmq connection error'));
  connection.on('close', () => {
    logger.warn('rabbitmq connection closed, will reconnect on next use');
    channel = null;
    connection = null;
  });
  channel = await connection.createChannel();
  await setupTopology(channel);
  return channel;
}

async function setupTopology(ch) {
  for (const queueName of Object.values(QUEUES)) {
    const dlq = `${queueName}_dlq`;
    await ch.assertQueue(dlq, { durable: true });
    await ch.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: dlq,
    });
  }
}

async function publish(queueName, message) {
  const ch = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  ch.sendToQueue(queueName, payload, {
    persistent: true,
    headers: { 'x-retry-count': 0 },
  });
}

/**
 * Consume a queue with idempotent-friendly retry semantics. `handler`
 * should be safe to run more than once for the same message (upsert by
 * natural key, not blind insert).
 */
async function consume(queueName, handler) {
  const ch = await getChannel();
  await ch.prefetch(1);
  ch.consume(queueName, async (msg) => {
    if (!msg) return;
    const retryCount = msg.properties.headers['x-retry-count'] || 0;
    let message;
    try {
      message = JSON.parse(msg.content.toString());
      await handler(message);
      ch.ack(msg);
    } catch (err) {
      logger.error({ err, queueName, retryCount }, 'message processing failed');
      ch.nack(msg, false, false); // never requeue in place — republish with incremented count
      if (retryCount < config.rabbitmq.maxRetries) {
        ch.sendToQueue(queueName, msg.content, {
          persistent: true,
          headers: { 'x-retry-count': retryCount + 1 },
        });
      }
      // else: message already routed to DLQ by broker via dead-letter config
      // once retries are exhausted and it's rejected without republish.
    }
  });
}

async function publishInteractionEvent(event) {
  return publish(QUEUES.interactionEvents, { eventId: randomUUID(), ...event });
}

async function publishFeedGenerationJob(job) {
  return publish(QUEUES.feedGeneration, job);
}

async function publishMaintenanceJob(job) {
  return publish(QUEUES.maintenance, job);
}

module.exports = {
  QUEUES,
  getChannel,
  publish,
  consume,
  publishInteractionEvent,
  publishFeedGenerationJob,
  publishMaintenanceJob,
};
