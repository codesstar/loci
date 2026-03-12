#!/usr/bin/env python3
"""
Loci Dashboard Server
Serves static files + provides API endpoints for journal writing and data rebuild.
Usage: python3 server.py (runs on port 8766)
"""

import base64
import http.server
import json
import os
import subprocess
import time
import urllib.parse
from pathlib import Path

PORT = 8766
DASHBOARD_DIR = Path(__file__).parent.resolve()
BRAIN_PATH = Path("/Users/callum/Desktop/loci")
JOURNAL_DIR = BRAIN_PATH / "tasks" / "journal"
PERSONAL_DIR = JOURNAL_DIR / "personal"
ASSETS_DIR = JOURNAL_DIR / "assets"
BUILD_SCRIPT = DASHBOARD_DIR / "build.py"


class LociHandler(http.server.SimpleHTTPRequestHandler):
    """Handles static files + API routes."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # Serve personal journal entries
        if parsed.path.startswith("/api/journal/personal/"):
            date_str = parsed.path.split("/")[-1]
            self._handle_personal_get(date_str)
        # Serve journal assets (images)
        elif parsed.path.startswith("/api/journal/assets/"):
            filename = parsed.path.split("/")[-1]
            self._serve_asset(filename)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/journal":
            self._handle_journal_post()
        elif parsed.path == "/api/journal/personal":
            self._handle_personal_save()
        elif parsed.path == "/api/journal/upload-image":
            self._handle_image_upload()
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

    # --- AI journal (markdown) ---
    def _handle_journal_post(self):
        try:
            body = self._read_body()
            date_str = body.get("date", "")
            content = body.get("content", "")

            if not date_str or not content:
                self._json_response(400, {"error": "date and content are required"})
                return

            parts = date_str.split("-")
            if len(parts) != 3 or len(date_str) != 10:
                self._json_response(400, {"error": "date must be YYYY-MM-DD format"})
                return

            JOURNAL_DIR.mkdir(parents=True, exist_ok=True)
            filepath = JOURNAL_DIR / f"{date_str}.md"
            frontmatter = f"---\ndate: {date_str}\ntype: journal\n---\n\n"
            filepath.write_text(frontmatter + content, encoding="utf-8")
            self._json_response(200, {"ok": True, "path": str(filepath)})

        except json.JSONDecodeError:
            self._json_response(400, {"error": "invalid JSON"})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    # --- Personal journal (HTML) ---
    def _handle_personal_get(self, date_str):
        filepath = PERSONAL_DIR / f"{date_str}.html"
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")
            self._json_response(200, {"ok": True, "content": content, "date": date_str})
        else:
            self._json_response(200, {"ok": True, "content": "", "date": date_str})

    def _handle_personal_save(self):
        try:
            body = self._read_body()
            date_str = body.get("date", "")
            content = body.get("content", "")

            if not date_str:
                self._json_response(400, {"error": "date is required"})
                return

            parts = date_str.split("-")
            if len(parts) != 3 or len(date_str) != 10:
                self._json_response(400, {"error": "date must be YYYY-MM-DD format"})
                return

            PERSONAL_DIR.mkdir(parents=True, exist_ok=True)
            filepath = PERSONAL_DIR / f"{date_str}.html"

            if content and content.strip() and content.strip() != "<br>":
                filepath.write_text(content, encoding="utf-8")
                self._json_response(200, {"ok": True, "path": str(filepath)})
            else:
                # Empty content: remove file if exists
                if filepath.exists():
                    filepath.unlink()
                self._json_response(200, {"ok": True, "deleted": True})

        except json.JSONDecodeError:
            self._json_response(400, {"error": "invalid JSON"})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    # --- Image upload ---
    def _handle_image_upload(self):
        try:
            body = self._read_body()
            data_uri = body.get("data", "")
            filename = body.get("filename", "")

            if not data_uri:
                self._json_response(400, {"error": "data is required"})
                return

            # Parse data URI: data:image/png;base64,xxxxx
            if data_uri.startswith("data:"):
                header, b64data = data_uri.split(",", 1)
                mime = header.split(":")[1].split(";")[0]
                ext = mime.split("/")[1].replace("jpeg", "jpg")
            else:
                self._json_response(400, {"error": "invalid data URI"})
                return

            ASSETS_DIR.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            ts = str(int(time.time() * 1000))
            if filename:
                name = Path(filename).stem[:30]
                safe_name = "".join(c for c in name if c.isalnum() or c in "-_")
                out_name = f"{ts}-{safe_name}.{ext}" if safe_name else f"{ts}.{ext}"
            else:
                out_name = f"{ts}.{ext}"

            filepath = ASSETS_DIR / out_name
            filepath.write_bytes(base64.b64decode(b64data))

            # Return URL relative to server
            url = f"/api/journal/assets/{out_name}"
            self._json_response(200, {"ok": True, "url": url, "path": str(filepath)})

        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _serve_asset(self, filename):
        filepath = ASSETS_DIR / filename
        if not filepath.exists():
            self.send_error(404, "Not Found")
            return
        ext = filepath.suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml"}
        mime = mime_map.get(ext, "application/octet-stream")
        data = filepath.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(data)

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
