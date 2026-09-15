# Ship It — classroom room

Static page (`public/index.html`) + one serverless function (`api/kv.js`) that
reads/writes Vercel KV. No framework, no build step.

## One-time setup

1. **Push this folder to a new GitHub repo.**
   ```
   cd ship-it-vercel
   git init
   git add .
   git commit -m "Phase 2: facilitator roster setup + start room"
   gh repo create ship-it-classroom --private --source=. --push
   ```
   (No `gh` CLI? Create the repo on github.com, then `git remote add origin <url>` and `git push -u origin main`.)

2. **Import the repo into Vercel** (vercel.com → Add New → Project → pick the repo). Framework preset: "Other". No build command needed.

3. **Add a KV database**: in the Vercel project → Storage tab → Create Database → KV. Connect it to this project — Vercel wires up the `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars automatically, nothing to copy by hand.

4. **Redeploy** once the KV database is connected (Vercel usually triggers this itself; if not, hit Redeploy in the dashboard).

From then on, every push to `main` auto-deploys.

## URLs

- Student link (QR code): `https://your-project.vercel.app/`
- Your facilitator link (bookmark this one): `https://your-project.vercel.app/?role=facilitator`
- Facilitator PIN: `2358` (hardcoded in `public/index.html` as `FACILITATOR_PIN` — change it there before class if you want a different one).

## What's live so far

- Landing + team join/claim flow (Phase 1), now backed by real shared storage instead of the artifact's `window.storage`.
- Facilitator roster setup: add / rename / remove teams, then "Start room" to open sign-in for students (Phase 2).

## Not built yet

Commit screens, round resolution, timers, leaderboard — build-order steps 3 onward.