#!/usr/bin/env python3
"""
build.py — Loci Dashboard Data Builder

Scans all markdown files in the Loci directory, parses YAML frontmatter
and markdown content, converts to HTML, and outputs a single data.json.
"""

import os
import re
import json
import datetime
import glob as glob_mod

# ─── Configuration ──────────────────────────────────────────────────────────

# build.py lives at .loci/dashboard/build.py — go up 3 levels to reach brain root
LOCI_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

# Customize these for your dashboard
CONFIG = {
    "title": "Loci Dashboard",
    "username": "User",
    "description": "Memory Palace for AI",
}

# ─── Markdown to HTML converter ─────────────────────────────────────────────

try:
    import markdown as md_lib
    def md_to_html(text):
        return md_lib.markdown(text, extensions=["tables", "fenced_code"])
except ImportError:
    def md_to_html(text):
        """Regex-based markdown to HTML fallback."""
        if not text:
            return ""
        html = text

        # Strip HTML comments early
        html = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)

        # Fenced code blocks
        def replace_fenced_code(m):
            lang = m.group(1) or ""
            code = m.group(2).strip()
            code = code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            cls = f' class="language-{lang}"' if lang else ""
            return f"<pre><code{cls}>{code}</code></pre>"
        html = re.sub(r"```(\w*)\n(.*?)```", replace_fenced_code, html, flags=re.DOTALL)

        # Inline code
        html = re.sub(r"`([^`]+)`", r"<code>\1</code>", html)

        # Blockquotes
        def replace_blockquote(m):
            lines = m.group(0).split("\n")
            inner = "\n".join(re.sub(r"^>\s?", "", line) for line in lines)
            return f"<blockquote>{inner}</blockquote>"
        html = re.sub(r"(?:^>.*\n?)+", replace_blockquote, html, flags=re.MULTILINE)

        # Tables
        def replace_table(m):
            rows = m.group(0).strip().split("\n")
            if len(rows) < 2:
                return m.group(0)
            result = "<table>"
            headers = [c.strip() for c in rows[0].strip().strip("|").split("|")]
            result += "<thead><tr>"
            for h in headers:
                result += f"<th>{h}</th>"
            result += "</tr></thead><tbody>"
            for row in rows[2:]:
                cells = [c.strip() for c in row.strip().strip("|").split("|")]
                result += "<tr>"
                for c in cells:
                    result += f"<td>{c}</td>"
                result += "</tr>"
            result += "</tbody></table>"
            return result
        html = re.sub(r"(?:^\|.+\|$\n?)+", replace_table, html, flags=re.MULTILINE)

        # Headings
        for i in range(6, 0, -1):
            pattern = r"^" + r"#" * i + r"\s+(.+)$"
            html = re.sub(pattern, rf"<h{i}>\1</h{i}>", html, flags=re.MULTILINE)

        # Horizontal rule
        html = re.sub(r"^---+\s*$", "<hr>", html, flags=re.MULTILINE)

        # Bold / Italic / Strikethrough
        html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
        html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)
        html = re.sub(r"~~(.+?)~~", r"<del>\1</del>", html)

        # Links and images
        html = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', html)
        html = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", r'<img src="\2" alt="\1">', html)

        # Checkbox list items
        html = re.sub(
            r"^- \[x\]\s+(.+)$",
            r'<li class="task done"><input type="checkbox" checked disabled> \1</li>',
            html, flags=re.MULTILINE
        )
        html = re.sub(
            r"^- \[ \]\s+(.+)$",
            r'<li class="task"><input type="checkbox" disabled> \1</li>',
            html, flags=re.MULTILINE
        )

        # List items
        html = re.sub(r"^- (.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)
        html = re.sub(r"^\d+\.\s+(.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)

        # Wrap consecutive <li> in <ul>
        html = re.sub(r"((?:<li[^>]*>.*</li>\n?)+)", r"<ul>\1</ul>", html)

        # Paragraphs
        lines = html.split("\n")
        result = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                result.append("")
            elif stripped.startswith("<"):
                result.append(line)
            else:
                result.append(f"<p>{stripped}</p>")
        html = "\n".join(result)
        html = re.sub(r"<p>\s*</p>", "", html)

        return html.strip()


# ─── YAML frontmatter parser ────────────────────────────────────────────────

def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    yaml_block = content[3:end].strip()
    body = content[end + 3:].strip()

    meta = {}
    for line in yaml_block.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()

            if value.startswith("[") and value.endswith("]"):
                items = value[1:-1].split(",")
                meta[key] = [item.strip().strip("'\"") for item in items if item.strip()]
            elif value.lower() in ("true", "false"):
                meta[key] = value.lower() == "true"
            elif re.match(r"^-?\d+$", value):
                meta[key] = int(value)
            elif re.match(r"^-?\d+\.\d+$", value):
                meta[key] = float(value)
            else:
                meta[key] = value.strip("'\"")

    return meta, body


# ─── File reading helpers ────────────────────────────────────────────────────

def read_md_file(filepath):
    """Read a markdown file, return dict with meta, raw content, and html."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (FileNotFoundError, PermissionError, UnicodeDecodeError):
        return None

    meta, body = parse_frontmatter(content)
    html = md_to_html(body)

    return {
        "meta": meta,
        "content": html,
        "raw": body,
        "filename": os.path.basename(filepath),
        "path": os.path.relpath(filepath, LOCI_ROOT),
    }


def read_md_file_simple(filepath):
    """Read a markdown file, return just content+meta (no raw)."""
    result = read_md_file(filepath)
    if result:
        del result["raw"]
    return result


def scan_md_files(directory):
    """Scan a directory for .md files (non-recursive)."""
    results = []
    if not os.path.isdir(directory):
        return results
    for fname in sorted(os.listdir(directory)):
        if fname.lower().endswith(".md") and fname != "README.md":
            filepath = os.path.join(directory, fname)
            parsed = read_md_file_simple(filepath)
            if parsed:
                results.append(parsed)
    return results


def scan_md_files_recursive(directory):
    """Scan a directory recursively for .md files."""
    results = []
    if not os.path.isdir(directory):
        return results
    for root, dirs, files in os.walk(directory):
        for fname in sorted(files):
            if fname.lower().endswith(".md") and fname != "README.md":
                filepath = os.path.join(root, fname)
                parsed = read_md_file_simple(filepath)
                if parsed:
                    results.append(parsed)
    return results


# ─── Data builders ───────────────────────────────────────────────────────────

def build_plan():
    filepath = os.path.join(LOCI_ROOT, "plan.md")
    result = read_md_file_simple(filepath)
    return result or {"content": "", "meta": {}}


def build_inbox():
    root_inbox = read_md_file_simple(os.path.join(LOCI_ROOT, "inbox.md"))
    inbox_items = []  # 00-inbox removed; root inbox.md is sufficient
    return {
        "content": root_inbox["content"] if root_inbox else "",
        "meta": root_inbox["meta"] if root_inbox else {},
        "items": inbox_items,
    }


def build_me():
    me_dir = os.path.join(LOCI_ROOT, "me")
    identity = read_md_file_simple(os.path.join(me_dir, "identity.md"))
    goals = read_md_file_simple(os.path.join(me_dir, "goals.md"))
    values = read_md_file_simple(os.path.join(me_dir, "values.md"))
    learned = read_md_file_simple(os.path.join(me_dir, "learned.md"))
    evolution = read_md_file_simple(os.path.join(me_dir, "evolution.md"))

    evolution_entries = []
    if evolution:
        raw_result = read_md_file(os.path.join(me_dir, "evolution.md"))
        if raw_result:
            raw = raw_result["raw"]
            raw = re.sub(r"<!--.*?-->", "", raw, flags=re.DOTALL)
            entries = re.findall(
                r"###\s+(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\n(.*?)(?=\n###|\Z)",
                raw, re.DOTALL
            )
            for date, etype, body in entries:
                cleaned_body = body.strip()
                if cleaned_body:
                    evolution_entries.append({
                        "date": date,
                        "type": etype.strip(),
                        "content": md_to_html(cleaned_body),
                    })

    return {
        "identity": identity or {"content": "", "meta": {}},
        "goals": goals or {"content": "", "meta": {}},
        "values": values or {"content": "", "meta": {}},
        "learned": learned or {"content": "", "meta": {}},
        "evolution": evolution or {"content": "", "meta": {}},
        "evolution_entries": evolution_entries,
    }


def build_tasks():
    tasks_dir = os.path.join(LOCI_ROOT, "tasks")
    active = read_md_file_simple(os.path.join(tasks_dir, "active.md"))
    someday = read_md_file_simple(os.path.join(tasks_dir, "someday.md"))

    active_tasks = {"P0": [], "P1": [], "P2": [], "P3": []}
    if active:
        raw_result = read_md_file(os.path.join(tasks_dir, "active.md"))
        if raw_result:
            raw = raw_result["raw"]
            current_priority = None
            for line in raw.split("\n"):
                p_match = re.match(r"^##\s+P(\d)", line)
                if p_match:
                    current_priority = f"P{p_match.group(1)}"
                    continue
                task_match = re.match(r"^- \[([ x])\]\s+(.+)$", line)
                if task_match and current_priority:
                    done = task_match.group(1) == "x"
                    text = task_match.group(2)
                    active_tasks[current_priority].append({
                        "text": text,
                        "done": done,
                    })

    return {
        "active": active or {"content": "", "meta": {}},
        "someday": someday or {"content": "", "meta": {}},
        "active_tasks": active_tasks,
    }


def build_planning():
    tasks_dir = os.path.join(LOCI_ROOT, "tasks")
    journal_files = [f for f in scan_md_files(os.path.join(tasks_dir, "journal")) if 'buffer' not in f.get('filename', '')]

    calendar_events = {}
    cal_path = os.path.join(tasks_dir, "calendar.json")
    if os.path.exists(cal_path):
        try:
            with open(cal_path, "r", encoding="utf-8") as f:
                calendar_events = json.load(f)
        except Exception:
            pass

    return {
        "daily": scan_md_files(os.path.join(tasks_dir, "daily")),
        "monthly": [],
        "quarterly": [],
        "reviews": [],
        "journal": journal_files,
        "calendar_events": calendar_events,
    }


def build_people():
    people_dir = os.path.join(LOCI_ROOT, "people")
    return {
        "contacts": scan_md_files(people_dir),
        "meetings": scan_md_files(os.path.join(people_dir, "meetings")),
    }


def build_decisions():
    decisions_dir = os.path.join(LOCI_ROOT, "decisions")
    decisions = scan_md_files(decisions_dir)
    decisions.sort(key=lambda d: d.get("meta", {}).get("date", ""), reverse=True)
    return decisions


def build_finance():
    finance_dir = os.path.join(LOCI_ROOT, "finance")
    return {"files": scan_md_files(finance_dir)}


def build_content():
    """Read content files and platform data from content/."""
    content_dir = os.path.join(LOCI_ROOT, "content")
    files = scan_md_files(content_dir)

    # Read platforms from platforms.md instead of hardcoding
    platforms = {"brands": [], "accounts": []}
    platforms_file = os.path.join(content_dir, "platforms.md")
    if os.path.isfile(platforms_file):
        result = read_md_file(platforms_file)
        if result:
            raw = result["raw"]
            # Parse table rows for accounts
            table_rows = re.findall(r"^\|(.+)\|$", raw, re.MULTILINE)
            if len(table_rows) >= 3:
                headers = [h.strip().lower() for h in table_rows[0].split("|")]
                for row in table_rows[2:]:
                    cells = [c.strip() for c in row.split("|")]
                    cells = [c for c in cells if c]
                    if len(cells) >= 4:
                        platforms["accounts"].append({
                            "platform": cells[0],
                            "name": cells[1],
                            "content": cells[2] if len(cells) > 2 else "",
                            "frequency": cells[3] if len(cells) > 3 else "",
                            "status": cells[4] if len(cells) > 4 else "active",
                        })

    return {"files": files, "platforms": platforms}


def build_links():
    """Scan .loci/links/ for connected sub-projects."""
    links_dir = os.path.join(LOCI_ROOT, ".loci", "links")
    links = []
    if not os.path.isdir(links_dir):
        return links

    # Read registry if it exists
    registry_path = os.path.join(links_dir, "registry.md")
    registry = read_md_file_simple(registry_path)

    for entry in os.listdir(links_dir):
        entry_path = os.path.join(links_dir, entry)
        if entry == "registry.md" or entry.startswith("."):
            continue

        # Could be a directory or symlink
        if os.path.isdir(entry_path):
            profile = read_md_file_simple(os.path.join(entry_path, "profile.md"))
            to_hq = read_md_file_simple(os.path.join(entry_path, "to-hq.md"))
            from_hq = read_md_file_simple(os.path.join(entry_path, "from-hq.md"))

            # Count recent activity (entries in to-hq.md)
            recent_count = 0
            if to_hq:
                raw = read_md_file(os.path.join(entry_path, "to-hq.md"))
                if raw:
                    recent_count = len(re.findall(r"^\d{4}-\d{2}-\d{2}", raw["raw"], re.MULTILINE))

            link_data = {
                "name": entry,
                "path": os.path.realpath(entry_path) if os.path.islink(entry_path) else entry_path,
                "is_symlink": os.path.islink(entry_path),
                "profile": profile.get("meta", {}) if profile else {},
                "profile_content": profile.get("content", "") if profile else "",
                "recent_activity": recent_count,
                "has_to_hq": to_hq is not None,
                "has_from_hq": from_hq is not None,
            }
            links.append(link_data)

    return links


def build_references():
    """Scan references/ folder for collected articles, links, ideas."""
    refs_dir = os.path.join(LOCI_ROOT, "references")
    if not os.path.isdir(refs_dir):
        return {"files": [], "total": 0}
    files = scan_md_files_recursive(refs_dir)
    files.sort(key=lambda f: f.get("meta", {}).get("date", ""), reverse=True)
    return {"files": files, "total": len(files)}


def build_learning():
    learning_dir = os.path.join(LOCI_ROOT, "content", "learning")
    entries = scan_md_files(learning_dir)
    entries.sort(key=lambda e: e.get("meta", {}).get("date", ""), reverse=True)
    return entries


# ─── Statistics ──────────────────────────────────────────────────────────────

def count_total_files():
    count = 0
    for root, dirs, files in os.walk(LOCI_ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if f.endswith(".md"):
                count += 1
    return count


def build_stats(data):
    tasks = data.get("tasks", {}).get("active_tasks", {})
    total_tasks = sum(len(v) for v in tasks.values())
    done_tasks = sum(1 for v in tasks.values() for t in v if t.get("done"))

    return {
        "total_files": count_total_files(),
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "total_people": len(data.get("people", {}).get("contacts", [])),
        "total_decisions": len(data.get("decisions", [])),
        "total_daily_plans": len(data.get("planning", {}).get("daily", [])),
        "total_monthly_plans": len(data.get("planning", {}).get("monthly", [])),
        "total_quarterly_plans": len(data.get("planning", {}).get("quarterly", [])),
    }


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print(f"Scanning Loci directory: {LOCI_ROOT}")

    data = {"config": CONFIG}

    sections = [
        ("plan", build_plan),
        ("inbox", build_inbox),
        ("me", build_me),
        ("tasks", build_tasks),
        ("planning", build_planning),
        ("people", build_people),
        ("decisions", build_decisions),
        ("finance", build_finance),
        ("content", build_content),
        ("learning", build_learning),
        ("links", build_links),
        ("references", build_references),
    ]

    for name, builder in sections:
        print(f"  Building {name}...")
        data[name] = builder()

    print("  Computing statistics...")
    data["stats"] = build_stats(data)
    data["build_time"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Output: {OUTPUT_PATH}")
    print(f"  Build time: {data['build_time']}")
    print(f"  Total files: {data['stats']['total_files']}")
    print(f"  Active tasks: {data['stats']['total_tasks']}")


if __name__ == "__main__":
    main()
