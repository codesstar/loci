#!/usr/bin/env python3
"""
Loci Dashboard Server
Serves static files + provides API endpoints for journal writing and data rebuild.
Usage: python3 server.py (runs on port 8766)
"""

import http.server
import json
import os
import subprocess
import urllib.parse
from pathlib import Path

PORT = 8766
DASHBOARD_DIR = Path(__file__).parent.resolve()
BRAIN_PATH = Path("/Users/callum/Desktop/loci")
JOURNAL_DIR = BRAIN_PATH / "planning" / "journal"
BUILD_SCRIPT = DASHBOARD_DIR / "build.py"


class LociHandler(http.server.SimpleHTTPRequestHandler):
    """Handles static files + API routes."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/journal":
            self._handle_journal_post()
        elif parsed.path == "/api/rebuild":
            self._handle_rebuild()
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def _json_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _handle_journal_post(self):
        try:
            body = self._read_body()
            date_str = body.get("date", "")
            content = body.get("content", "")

            if not date_str or not content:
                self._json_response(400, {"error": "date and content are required"})
                return

            # Validate date format
            parts = date_str.split("-")
            if len(parts) != 3 or len(date_str) != 10:
                self._json_response(400, {"error": "date must be YYYY-MM-DD format"})
                return

            # Ensure journal directory exists
            JOURNAL_DIR.mkdir(parents=True, exist_ok=True)

            # Write journal file
            filepath = JOURNAL_DIR / f"{date_str}.md"
            frontmatter = f"---\ndate: {date_str}\ntype: journal\n---\n\n"
            filepath.write_text(frontmatter + content, encoding="utf-8")

            self._json_response(200, {"ok": True, "path": str(filepath)})

        except json.JSONDecodeError:
            self._json_response(400, {"error": "invalid JSON"})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _handle_rebuild(self):
        try:
            result = subprocess.run(
                ["python3", str(BUILD_SCRIPT)],
                cwd=str(DASHBOARD_DIR),
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                self._json_response(200, {"ok": True, "output": result.stdout})
            else:
                self._json_response(500, {"error": result.stderr or "build failed"})
        except subprocess.TimeoutExpired:
            self._json_response(500, {"error": "build timed out"})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def log_message(self, format, *args):
        # Quieter logging - only log API calls
        if "/api/" in (args[0] if args else ""):
            super().log_message(format, *args)


if __name__ == "__main__":
    print(f"Loci Dashboard Server")
    print(f"  Static files: {DASHBOARD_DIR}")
    print(f"  Brain path:   {BRAIN_PATH}")
    print(f"  Journal dir:  {JOURNAL_DIR}")
    print(f"  Port:         {PORT}")
    print(f"  URL:          http://localhost:{PORT}")
    print()

    server = http.server.HTTPServer(("", PORT), LociHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()
