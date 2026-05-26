# Deploy Charity Day to Render (free, ~15 min)

The whole stack runs on Render's free tier:

| Resource | What it is | Free tier limits |
|---|---|---|
| **Backend** | Docker web service (Quarkus + Java 17) | 512 MB RAM · sleeps after 15 min idle (~30 s wake) |
| **Frontend** | Static site on Render's CDN | 100 GB bandwidth/month · always-on |
| **Database** | Managed PostgreSQL 16 | 1 GB storage · expires after 90 days |

Total cost: **$0**. You need a Render account (credit card required for verification but never charged on free tier) and your Groq API key (you already have it locally in `infra/.env`).

---

## 1. Push to GitHub
Already done — your repo is at:
`https://github.com/Khaled-Dridi/hackathon-starter-kit-MEKSY` on `main`.

If you've made local changes since the last push:
```powershell
cd D:\Inetum\Hackathon\hackathon-starter-kit-MEKSY
git add -A
git commit -m "your message"
git push
```

## 2. Create a Render account
1. Go to **https://render.com**
2. Click **Get Started** → sign up with **GitHub**
3. Authorize Render to read your repos (you can scope to just this one repo if you want)

## 3. Import the blueprint
1. In the Render dashboard, click **New** (top right) → **Blueprint**
2. Pick your repo `hackathon-starter-kit-MEKSY`
3. Render reads the `render.yaml` at the repo root and proposes 3 resources:
   - `charity-day-db` (PostgreSQL)
   - `charity-day-backend` (Docker web service)
   - `charity-day-frontend` (static site)
4. Give the blueprint group a name (e.g. `charity-day`) and click **Apply**

## 4. Set the Groq API key (the only secret)
The blueprint marks `OPENAI_API_KEY` as `sync: false` — Render won't pull it from `render.yaml`, you have to paste it manually so it never lands in git.

1. Once the backend service is created (you'll see it in the dashboard), click its name
2. Go to the **Environment** tab
3. Find the `OPENAI_API_KEY` row (it'll be empty)
4. Click **Edit** → paste your Groq key (starts with `gsk_…` — it's in your local `infra/.env`)
5. Click **Save Changes** → the backend redeploys with the key (~3 min)

## 5. Wait for first deploy
Timings on the free tier:
- **DB:** <1 min
- **Backend Docker build:** ~8 min the first time (Maven downloads + Quarkus packaging + image push). Subsequent deploys are faster thanks to Docker layer caching.
- **Frontend build:** ~3 min (npm install + Angular production build)

Watch the **Events** tab on each service to follow progress. The backend is "Live" once Quarkus prints the `Listening on http://0.0.0.0:8080` line and the `/q/health/ready` healthcheck returns 200.

## 6. Test it
Once both web services show **Live** with a green dot:

1. Open the frontend URL (something like `https://charity-day-frontend.onrender.com`)
2. **First page load:** wait ~30 s for the backend cold-start. You'll see the login screen render immediately (it's a static page) but the AI assistant widget and the Actions list will spin for ~30 s while the backend boots.
3. Sign in with the seeded creds:
   - **Admin:** `admin@local` / `admin`
   - **User:** `user@local` / `user`
   - Or use the **Créer un compte / Create an account** toggle to sign up fresh.
4. Switch language with the **FR / EN** pill in the header.

## 7. Share with the jury
Send them:
- **URL:** `https://charity-day-frontend.onrender.com` (your exact subdomain shows in the dashboard)
- **Demo accounts:**
  - `admin@local` / `admin` (sees the Admin panel)
  - `user@local` / `user` (regular volunteer view)
  - Or they can sign up themselves

Tell them the **first hit takes ~30 s** while the backend wakes up; everything is snappy after that until 15 min of inactivity.

---

## Things to know (caveats for the demo)

- **Backend cold-start.** After 15 min of no traffic the backend container sleeps. The next visitor pays a ~30 s penalty while Quarkus reboots. Keep the URL warm by pinging `/q/health/ready` every 10 min if you want zero cold-starts during judging hours.
- **DB expires in 90 days.** Render emails you a warning. For a hackathon judging period this is plenty.
- **Uploaded files don't persist.** Render's free tier has no persistent disk, so files uploaded via the admin form vanish on each redeploy. The seed actions use external LoremFlickr photos so they survive deploys fine. If you want persistent uploads, switch the file storage to Cloudinary or S3 (out of scope for this demo).
- **JWT keys regenerate on every deploy.** All logged-in users have to sign in again after a backend redeploy. Acceptable for a demo.
- **CORS is wide-open (`*`).** Fine for a public demo. To tighten, set `CORS_ORIGINS` to your real frontend URL in the backend's Environment tab.

## How to update after the first deploy

Render auto-deploys on every `git push` to `main`. So:
```powershell
git add -A && git commit -m "your fix" && git push
```
Backend rebuilds in ~5 min (faster than first deploy due to Docker layer cache), frontend in ~2 min.

## How to roll back

Render keeps every deploy. In the service's **Deploys** tab, click any prior green deploy → **Rollback to this deploy**. Takes ~30 s.

Code-side, you can also `git revert` and push:
```powershell
git revert d8e7b3b   # the Inetum-theme commit
git push
```

## How to wipe and start over

In each service, click **Settings** → scroll to bottom → **Delete Service**. Then re-import the blueprint. The DB is the one you'll want to keep if you have real test data in it.

## Troubleshooting

**Backend won't start, logs say "Failed to obtain JDBC Connection"**
The DB_HOST/DB_PORT env vars aren't wired. Check the backend's Environment tab — you should see five `DB_*` rows all marked "from database". If not, re-import the blueprint.

**Frontend says "Couldn't sign you in" or shows network errors**
The frontend's `API_URL` wasn't injected at build time. Trigger a manual redeploy on the frontend service (Manual Deploy → Deploy latest commit) — the build script picks up `API_URL` from `fromService`.

**AI assistant returns 500 / "service unavailable"**
The Groq API key isn't set. See step 4 above.

**Everything's slow**
Free tier has shared CPU. First hit after sleep is always ~30 s. If the second hit is also slow, check the backend's RAM usage — if it's near 512 MB the JVM is GC-thrashing. The `-Xmx384m` in the Dockerfile keeps headroom.
