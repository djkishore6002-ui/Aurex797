# Deployment

Aurex builds to a single Node process that serves both the REST API and the static React web app.

## Requirements
- Node 22+ (needed for the built-in `node:sqlite` module).
- Persistent disk for `./storage/` (holds the SQLite DB and uploads).

## Build & Run
```bash
npm install
cp .env.example .env     # set JWT_SECRET, OPENROUTER_API_KEY if desired
npm run seed            # creates demo accounts + seed content
npm run build           # builds packages/shared, services/api, apps/web
PORT=4000 npm start     # node services/api/dist/index.js
```

The server listens on `0.0.0.0:$PORT`. Point a reverse proxy (nginx, Caddy, Cloudflare) at it; TLS termination is handled upstream.

## Environment
- `JWT_SECRET` — set to a long random string in production (≥32 chars).
- `OPENROUTER_API_KEY` — optional, unlocks real LLM responses. Without this, the built-in Tamil knowledge-base responds.
- `DATABASE_URL` — file path for SQLite (default `./storage/aurex.db`). For Postgres, swap the driver in `services/api/src/db/index.ts` (the schema is standard SQL).
- `STORAGE_DIR` — upload directory. For S3/Supabase Storage, replace the multer storage engine.

## Docker (example)
```Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev && npm run build
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
CMD ["node", "services/api/dist/index.js"]
```

## Free/low-cost targets
- Render / Railway / Fly.io — single-web-service dyno.
- Any VPS with Node 22.
- For mobile: the web app is installable as a PWA (manifest + theme colors + responsive design). A Capacitor wrapper can be added without API changes.

## Backups
Back up `./storage/` directory — it contains the SQLite DB and any uploaded files.

## Health check
`GET /api/health` returns 200 `{success:true,data:{status:'ok'}}`.
