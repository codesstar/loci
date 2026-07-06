# .loci/dashboard/ — Visualization Panel

A web dashboard that displays your Loci data visually.

## Stack
- HTML + Vue 3 + Tailwind CSS (all vendored locally in `vendor/` — works offline)
- Single-file app (`index.html`) — no build step needed
- `server.js` (Node.js, zero npm dependencies) serves live data + write-back APIs

## Usage

    node server.js

Open http://localhost:8765. The server reads your brain's markdown files on each request — always up to date, no build step. Write-back APIs let you toggle tasks, add people and notes, and save journal entries from the browser.

## API Endpoints (server.js)
- `GET  /api/data` — full dashboard JSON (live from your brain's files)
- `POST /api/tasks/toggle` — toggle a task checkbox
- `POST /api/tasks/add` — add a task
- `POST /api/journal/save` — save journal entry
- `POST /api/inbox/add` — add item to inbox

See `docs/api.md` for the full endpoint list and `schema.md` for the data shape.

## Customization
- Edit CSS variables in index.html for theme changes
- Modify CONFIG in server.js for dashboard title and settings
