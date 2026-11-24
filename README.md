# InstiLite prototype (live backend)

Phone-framed web prototype of InstiLite per PRD v2. Express + SQLite; roles: student, club manager, career coordinator, admin. Shared demo workspace, scenarios D01–D11.

## Run locally
- `npm install && npm start` → http://localhost:3000
- `npm test` → 51 API scenario checks

## Deploy on Render
- Push this folder to a GitHub repo
- Render → New → Blueprint → select repo (reads `render.yaml`), or New Web Service: build `npm install`, start `node server.js`, health check `/healthz`
- Free tier: disk is ephemeral; data resets on redeploy/spin-down and workspaces re-seed on demand
- Persistent data: paid plan + disk mounted at `/var/data`, env `DB_PATH=/var/data/instilite.db`

## Demo
- Open `/`, pick a role card (S01..S06, M01, M02, C01, A01); OTP login accepts approved domains (`APPROVED_DOMAINS`), demo code `123456`
- Share the link with `?w=<workspace>` so others see the same live data; use two tabs for two roles
- Client polls every 5s; every write bumps the workspace revision

## Simulated
- Placement portal (career source) and email OTP are simulated; no push/email delivery; all data fictional
