#!/usr/bin/env python3
"""
Loci Lite — Dashboard Data Builder

Reads tasks, daily plans, and journal entries from ~/.loci/lite/
and outputs data.json for the dashboard.

No dependencies beyond Python stdlib.
"""

import os
import re
import json
import datetime

# ─── Configuration ───────────────────────────────────────────────────────────

# Default brain path
LITE_ROOT = os.environ.get("LOCI_LITE_PATH", os.path.expanduser("~/.loci/lite"))
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown."""
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
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip().strip("'\"")
    return meta, body


def md_to_html(text):
    """Minimal markdown to HTML conversion."""
    if not text:
        return ""
    html = text
    # Headings
    for i in range(6, 0, -1):
        html = re.sub(r"^" + "#" * i + r"\s+(.+)$", rf"<h{i}>\1</h{i}>", html, flags=re.MULTILINE)
    # Bold / italic
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)
    # Checkbox list items
    html = re.sub(r"^- \[x\]\s+(.+)$",
                  r'<li class="done"><input type="checkbox" checked disabled> \1</li>',
                  html, flags=re.MULTILINE)
    html = re.sub(r"^- \[ \]\s+(.+)$",
                  r'<li><input type="checkbox" disabled> \1</li>',
                  html, flags=re.MULTILINE)
    # Plain list items
    html = re.sub(r"^- (.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)
    # Wrap consecutive <li> in <ul>
    html = re.sub(r"((?:<li[^>]*>.*</li>\n?)+)", r"<ul>\1</ul>", html)
    # Paragraphs for remaining plain lines
    lines = html.split("\n")
    result = []
    for line in lines:
        s = line.strip()
        if not s:
            result.append("")
        elif s.startswith("<"):
            result.append(line)
        else:
            result.append(f"<p>{s}</p>")
    return "\n".join(result).strip()


def read_md(filepath):
    """Read a markdown file, return meta + html content."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (FileNotFoundError, PermissionError):
        return None
    meta, body = parse_frontmatter(content)
    return {
        "meta": meta,
        "content": md_to_html(body),
        "raw": body,
        "filename": os.path.basename(filepath),
    }


def scan_md(directory):
    """Scan directory for .md files, return list sorted by filename."""
    results = []
    if not os.path.isdir(directory):
        return results
    for fname in sorted(os.listdir(directory)):
        if fname.endswith(".md") and fname != "README.md":
            parsed = read_md(os.path.join(directory, fname))
            if parsed:
                del parsed["raw"]
                results.append(parsed)
    return results


# ─── Data Builders ───────────────────────────────────────────────────────────

def build_tasks():
    """Parse active.md into structured task data."""
    filepath = os.path.join(LITE_ROOT, "tasks", "active.md")
    result = read_md(filepath)
    tasks = {"P0": [], "P1": [], "P2": []}

    if result:
        current_p = None
        for line in result["raw"].split("\n"):
            p_match = re.match(r"^##\s+P(\d)", line)
            if p_match:
                current_p = f"P{p_match.group(1)}"
                continue
            t_match = re.match(r"^- \[([ x])\]\s+(.+)$", line)
            if t_match and current_p and current_p in tasks:
                tasks[current_p].append({
                    "text": t_match.group(2),
                    "done": t_match.group(1) == "x",
                })

    total = sum(len(v) for v in tasks.values())
    done = sum(1 for v in tasks.values() for t in v if t.get("done"))

    return {
        "active_tasks": tasks,
        "total": total,
        "done": done,
    }


def build_daily_plans():
    """Scan tasks/daily/ for daily plan files."""
    return scan_md(os.path.join(LITE_ROOT, "tasks", "daily"))


def build_journal():
    """Scan journal/ for entries."""
    entries = scan_md(os.path.join(LITE_ROOT, "journal"))
    entries.reverse()  # newest first
    return entries


def build_week_overview():
    """Build a 7-day view centered on today."""
    today = datetime.date.today()
    weekday = today.weekday()  # Monday=0
    monday = today - datetime.timedelta(days=weekday)
    days = []
    for i in range(7):
        d = monday + datetime.timedelta(days=i)
        ds = d.strftime("%Y-%m-%d")
        daily_file = os.path.join(LITE_ROOT, "tasks", "daily", f"{ds}.md")
        journal_file = os.path.join(LITE_ROOT, "journal", f"{ds}.md")
        day_data = {
            "date": ds,
            "weekday": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
            "is_today": d == today,
            "has_plan": os.path.exists(daily_file),
            "has_journal": os.path.exists(journal_file),
        }
        # Read daily plan summary if exists
        if day_data["has_plan"]:
            parsed = read_md(daily_file)
            if parsed:
                # Extract task count from raw
                tasks_total = len(re.findall(r"^- \[[ x]\]", parsed["raw"], re.MULTILINE))
                tasks_done = len(re.findall(r"^- \[x\]", parsed["raw"], re.MULTILINE))
                day_data["tasks_total"] = tasks_total
                day_data["tasks_done"] = tasks_done
        days.append(day_data)
    return days


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    if not os.path.isdir(LITE_ROOT):
        print(f"Loci Lite directory not found: {LITE_ROOT}")
        print("The AI will create it on first conversation.")
        return

    print(f"Building from: {LITE_ROOT}")

    data = {
        "config": {
            "title": "Loci Lite",
            "description": "Your daily command center",
        },
        "tasks": build_tasks(),
        "daily_plans": build_daily_plans(),
        "journal": build_journal(),
        "week": build_week_overview(),
        "build_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Output: {OUTPUT_PATH}")
    t = data["tasks"]
    print(f"Tasks: {t['done']}/{t['total']} done")
    print(f"Journal entries: {len(data['journal'])}")


if __name__ == "__main__":
    main()
