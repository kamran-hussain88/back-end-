# FORK. — Backend

FastAPI backend for **FORK.** — a members-only build-in-public network for Jamshedpur CS students.

Matches the frontend exactly: no passwords — you "join" with a name, college, and
optional GitHub username, and get a membership token back (stored in the browser,
same trust model as the original prototype, just shared across everyone now instead
of living only in one browser's localStorage).

## Stack
- **FastAPI** (Python)
- **SQLAlchemy** ORM — **SQLite** by default, one env var away from **PostgreSQL**
- **JWT** membership tokens (no passwords)
- **httpx** to pull live GitHub stats on join and on refresh

## Setup

```bash
cd fork-backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit JWT_SECRET_KEY before going live
uvicorn app.main:app --reload
```

Runs on **http://localhost:8000** by default — the frontend expects it there
unless you set `VITE_API_URL`. Interactive API docs: http://localhost:8000/docs

## Deploying for free (Render)

This repo includes `render.yaml` — a Render Blueprint that provisions both the
web service and a free PostgreSQL database in one step, with `DATABASE_URL`
and `JWT_SECRET_KEY` wired automatically. You still need to do the actual
clicking yourself (I can't create accounts or push code on your behalf):

1. Push this `fork-backend` folder to a GitHub repo (public or private).
2. Go to **render.com** → sign up (no card needed) → **New** → **Blueprint**.
3. Connect the repo. Render reads `render.yaml` and shows you the web
   service + database it's about to create — click **Apply**.
4. Wait for the build (a couple minutes). Your API is live at the URL Render
   gives you, e.g. `https://fork-backend-xxxx.onrender.com`.
5. Copy that URL into the frontend's `.env` as `VITE_API_URL`.

Free-tier caveat: the service sleeps after 15 minutes of no traffic and takes
~30-50 seconds to wake on the next request. Fine for a class project, not for
instant response at all hours.

## Switching to PostgreSQL later

One line in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/fork_db
```

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/join` | – | `{name, college, github?}` → creates member, fetches GitHub stats if given, returns `{access_token, user, warning?}` |
| GET | `/me` | ✅ | Your profile + `reactedPostIds` |
| POST | `/me/github/refresh` | ✅ | Re-pulls repo/follower counts from GitHub |
| DELETE | `/me` | ✅ | Leave — deletes your profile and posts |
| GET | `/users` | – | All members (for feed author lookups + leaderboard) |
| POST | `/posts` | ✅ | `{type, content}` — type is `build`/`achievement`/`referral`/`confession` |
| GET | `/posts` | – | All posts, newest first |
| POST | `/posts/{id}/react` | ✅ | Co-sign a post (once per member, can't react to your own) |

Points/tier math (Bronze/Silver/Gold/Platinum) stays on the frontend exactly as
before — the backend just serves the raw data (`repoCount`, `github`, posts,
reaction counts) it's computed from.

## CORS

Wide open (`allow_origins=["*"]`) for local dev. **Tighten this to your real
frontend domain in `app/main.py` before deploying.**
