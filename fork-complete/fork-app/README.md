# FORK. — Frontend

A members-only, build-in-public social network for Jamshedpur's CS builders.
React + Vite frontend, wired to the FastAPI backend in `fork-backend/`.

## Setup

```bash
npm install
cp .env.example .env      # points at your backend, defaults to localhost:8000
npm run dev
```

Make sure the backend (`fork-backend/`) is running first — see its README.

## How it's wired

All data — members, posts, reactions, GitHub stats — lives on the backend now,
not in this browser's localStorage. `src/lib/api.js` is the only place that talks
to the network; it stores your membership token in localStorage (`fork-token`) so
you stay logged in on refresh, same as before, but the actual profile/post data is
shared with every other member hitting the same backend.

To point at a deployed backend instead of your local one, set `VITE_API_URL` in `.env`.
