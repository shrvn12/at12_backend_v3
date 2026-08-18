// Runs every AT12 backend process under PM2.
//
//   pm2 start ecosystem.config.js          # start everything
//   pm2 start ecosystem.config.js --only dashboard,ingestion
//   pm2 logs
//   pm2 stop ecosystem.config.js
//   pm2 delete ecosystem.config.js
//
// Assumes Postgres/Redis/RabbitMQ are already reachable (e.g. via
// `docker compose up -d`) and that `.env` is populated - every process
// loads it independently via dotenv, same as running `node <folder>/index.js`
// directly.
module.exports = {
  apps: [
    {
      name: 'dashboard',
      script: 'dashboard/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ingestion',
      script: 'ingestion/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'event-worker',
      script: 'event-worker/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'feed-worker',
      script: 'feed-worker/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'maintenance-worker',
      script: 'maintenance-worker/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'scheduler',
      script: 'scheduler/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
  ],
};
