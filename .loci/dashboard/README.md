# .loci/dashboard/ — Visualization Panel

A static web dashboard that displays your Loci data visually.

## Stack
- HTML + Vue 3 (CDN) + Tailwind CSS (CDN)
- Single-file app — no build step needed
- `python3 build.py` generates `data.json` from your markdown files

## Usage
1. Run `python3 build.py` to generate/update data.json
2. Open `index.html` in a browser
3. Or serve locally: `python3 -m http.server 8765`

## Customization
- Edit CSS variables in index.html for theme changes
- Modify build.py CONFIG section for dashboard title and settings
