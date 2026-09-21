# Aurex — Quick Deploy Instructions (30 seconds)

## 1. Download the code
- From the sandbox: download `aurex797-deploy.tar.gz` (just presented in the UI) and extract it:
  ```bash
  tar -xzf aurex797-deploy.tar.gz -C aurex797
  cd aurex797
  ```
- Or clone from GitHub after pushing (recommended for your team).

## 2. Install & Build locally (optional verification)
```bash
npm install
cp .env.example .env        # edit JWT_SECRET to a long random string
npm run seed                # optional; seeds demo accounts & content
npm run build
npm start                   # opens on http://localhost:4000
```

## 3. Deploy to Vercel (serverless)
```bash
npm install -g vercel
vercel --prod --token YOUR_TOKEN
```
Your project already contains:
- `vercel.json` — routes everything through a single serverless function
- `api/index.js` — boots the Express app, auto-seeds a demo DB on cold start
- Prebuilt `dist/` folders for web + API

**Environment variable:** set `JWT_SECRET` to a long random string (dashboard → Settings → Environment Variables).

> Note: Vercel serverless has an ephemeral filesystem. The SQLite DB resets on cold starts (demo accounts work every time; for production persistence, swap to Supabase Postgres).

## 4. Deploy to Render (recommended, persistent, zero code changes)
1. Push the project to a new GitHub repo
2. Open https://render.com/deploy and select the repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variable `JWT_SECRET=<random>`
6. Click Deploy. Done.

## 5. Demo credentials (after seed)
- admin@aurex.local / admin123
- organizer@aurex.local / organizer123
- learner@aurex.local / learner123 (has a real verifiable certificate)

## 6. Verify
- Open the deployed URL
- Log in as learner → Certificates page shows a seeded certificate
- Visit `/verify/<cert_number>` to see public certificate verification
