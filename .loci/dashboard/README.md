# .loci/dashboard/ — Visualization Panel

A web dashboard that displays your Loci data visually.

## Stack
- HTML + Vue 3 (CDN) + Tailwind CSS (CDN)
- Single-file app — no build step needed
- `server.js` (Node.js, zero npm dependencies) serves live data + write-back APIs

## Usage (Recommended)

    node server.js

Open http://localhost:8765. The server reads markdown files on each request — always up to date, no build step. Write-back APIs let you toggle tasks, add inbox items, and save journal entries from the browser.

## Usage (Static / No Node.js)

1. Run `python3 build.py` to generate data.json
2. Open `index.html` directly in a browser, or `python3 -m http.server 8765`

Note: Static mode is read-only.

## API Endpoints (server.js)
- `GET  /api/data` — full dashboard JSON (live from markdown files)
- `POST /api/tasks/toggle` — toggle a task checkbox
- `POST /api/tasks/add` — add a task
- `POST /api/journal/save` — save journal entry
- `POST /api/inbox/add` — add item to inbox

## Customization
- Edit CSS variables in index.html for theme changes
- Modify CONFIG in server.js for dashboard title and settings

## Alternatives
- `build.py` — Python script to generate static data.json
- `server.py` — Python HTTP server with file watching
