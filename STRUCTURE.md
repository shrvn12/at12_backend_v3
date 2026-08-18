# AT12 Backend — Folder Structure (post-reorg)

Every runtime process now has its own top-level folder. Only code that's
genuinely shared across more than one process lives in `common/`.

```
at12_backend_v2/
  common/                  # shared by 2+ processes - nothing process-specific here
    config/                # env-driven settings
    logger/                # structured logging (pino) + http/worker helpers
    db/                     # Postgres pool, query(), withTransaction()
    redis/                  # cache-only client, centralized keys/TTLs
    queue/                  # RabbitMQ client, queue setup, publish/consume + DLQ
    auth/                   # JWT sign/verify/requireAuth (Dashboard + Ingestion share this)
    health/                 # mountable /health router
    song-service/           # Redis cache-aside + Postgres persistence for songs
    search-service/         # Redis-only cache for search responses
    userRepository.js       # Postgres user/liked-songs queries (used by Dashboard, Event Worker, Feed Worker)
    trackService.js, musicClient.js, musicSearchService.js,
    artistService.js, lyricsService.js, genreService.js,
    playlistService.js      # music/business logic reused by Dashboard AND the workers
    utils/                  # appError, errorHandler

  dashboard/               # HTTP API: auth, music, user, library, playlists
    index.js
    routes/  controllers/  middlewares/  views/  public/
    services/              # DASHBOARD-ONLY logic (not shared): authService, userService, emailService

  ingestion/               # "Interaction Server" - authenticate, validate, publish, respond immediately
    index.js

  event-worker/            # consumes interaction_events -> persists + triggers song persistence
    index.js
  feed-worker/             # consumes feed_generation -> builds/persists/caches feeds & playlists
    index.js
  maintenance-worker/      # consumes maintenance -> cleanup + analytics
    index.js
  scheduler/               # cron: hourly feed/playlist jobs, daily maintenance jobs
    index.js

  migrations/              # SQL migrations + runner (shared by all processes, not a process itself)
  docker-compose.yml       # postgres, redis, rabbitmq (local infra only)
  .env.example
```

## Why this split

- **`common/`** holds only what's imported by *more than one* process. Example:
  `trackService`/`userRepository` are imported by Dashboard (serves `getInfo`,
  reads liked songs) **and** Event Worker **and** Feed Worker — so they're
  common. `authService`/`userService`/`emailService`, on the other hand, are
  only ever imported by Dashboard's controllers/middlewares — so they live in
  `dashboard/services/`, not `common/`.
- Each process folder is self-contained: you could `cd event-worker && node index.js`
  from a container that only has `common/` and `event-worker/` copied in, and
  it would run.

## Running it

```bash
docker compose up -d        # Postgres, Redis, RabbitMQ only - infra, not the app
cp .env.example .env
npm install
npm run migrate

# Option A: run each process directly, one per terminal
npm run serve               # Dashboard            (dashboard/index.js, port 3000)
npm run ingestion           # Ingestion/Interaction (ingestion/index.js, port 3001)
npm run worker:event        # event-worker/index.js
npm run worker:feed         # feed-worker/index.js
npm run worker:maintenance  # maintenance-worker/index.js
npm run scheduler           # scheduler/index.js

# Option B: run all 6 under PM2 (see ecosystem.config.js)
npm run pm2:start
npm run pm2:logs
npm run pm2:stop
```

The app processes are not containerized - `docker-compose.yml` only stands
up infra (Postgres/Redis/RabbitMQ). `ecosystem.config.js` is how the 6
processes get run/supervised together (each loads `.env` independently via
dotenv, identically to running `node <folder>/index.js` directly).

Every entrypoint was verified to have its full `require()` graph resolve
correctly against the new layout (`node <entry>.js` against a stub `.env`,
checked for `MODULE_NOT_FOUND`/`SyntaxError` — none found). Actual DB/Redis/
RabbitMQ behavior still needs a real `docker compose up` run on your end, same
caveat as before.

Note: `PHASE0_NOTES.md` and `ALL_PHASES_NOTES.md` describe the *previous*
folder layout (`shared/`, `workers/`, `services/interaction-server/`) — the
code they describe is unchanged, only these paths moved. This file is the
current source of truth for where things live.
