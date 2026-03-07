# Dashboard — Web Visualization

## Overview

Loci includes a pixel-art styled web dashboard that visualizes your memory palace data. It's a single HTML file powered by Vue 3 and Tailwind CSS (both loaded from CDN), requiring zero build steps.

## How It Works

1. `build.py` scans all your markdown files
2. Parses YAML frontmatter and markdown content
3. Outputs everything as `data.json`
4. `index.html` reads `data.json` and renders the dashboard

## Usage

```bash
# Generate data
cd 10-dashboard
python3 build.py

# Open in browser
open index.html

# Or serve locally
python3 -m http.server 8765
# Visit http://localhost:8765
```

## Dashboard Pages

1. **Home** — Annual goals progress, pending inbox items, active tasks, today's plan
2. **About Me** — Personal profile and growth timeline
3. **Planning** — Daily/monthly/quarterly plans with calendar view
4. **People** — Contact list and meeting records
5. **Tasks** — Tasks by priority with completion stats
6. **Decisions** — Decision timeline

## Customization

### Changing the Title and Username

Edit the `CONFIG` dictionary at the top of `build.py`:

```python
CONFIG = {
    "title": "My Dashboard",
    "username": "Your Name",
    "description": "My memory palace",
}
```

### Theming

The dashboard uses a pixel-art black & white theme by default. To customize colors, edit the Tailwind config and CSS variables in `index.html`.

### Adding New Data Sources

To add a new section to the dashboard:

1. Add a `build_xxx()` function in `build.py`
2. Call it in `main()` and add to the `data` dict
3. Add the Vue component in `index.html`

## Auto-Refresh

CLAUDE.md instructs the AI to run `python3 build.py` automatically whenever content files are modified. This keeps the dashboard in sync with your data.

## Dependencies

- Python 3.6+ (for build.py)
- A web browser (for index.html)
- Optional: `pip install markdown` for better HTML rendering (falls back to regex-based converter)
