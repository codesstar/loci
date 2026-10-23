"""Isolated timing probe, not a native-agent or notification-delivery test."""
import hashlib
import json
import shutil
import statistics
import subprocess
import tempfile
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO = next(p for p in Path(__file__).resolve().parents if (p / "scripts/loci-task.js").exists())
NODE = shutil.which("node")
result = {
    "timestamp": datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(),
    "scope": "ten sequential add commands against an initially empty temporary brain; includes Node startup, file write, generated view, activity append and process return; excludes model, network, native client and notification delivery",
    "node": NODE,
    "source_sha256": hashlib.sha256((REPO / "scripts/loci-task.js").read_bytes()).hexdigest(),
    "samples": [],
}

with tempfile.TemporaryDirectory(prefix="loci-latency-") as tmp:
    brain = Path(tmp)
    (brain / "scripts").mkdir()
    lib = brain / ".loci/dashboard/lib"
    lib.mkdir(parents=True)
    shutil.copy2(REPO / "scripts/loci-task.js", brain / "scripts/loci-task.js")
    shutil.copy2(REPO / ".loci/dashboard/lib/store.js", lib / "store.js")
    for i in range(10):
        title = f"Isolated benchmark {i}"
        started = time.perf_counter()
        proc = subprocess.run(
            [NODE, str(brain / "scripts/loci-task.js"), "add", "--title", title,
             "--date", "2026-10-09", "--start", "09:00"],
            capture_output=True, text=True, cwd=brain, timeout=10,
        )
        elapsed = round((time.perf_counter() - started) * 1000, 3)
        if proc.returncode:
            raise RuntimeError(proc.stderr)
        output = json.loads(proc.stdout)
        result["samples"].append({"ms": elapsed, "ok": output.get("ok"), "task": output["task"]})
    parsed = json.loads((brain / "tasks/tasks.json").read_text())
    tasks = parsed if isinstance(parsed, list) else parsed["tasks"]
    logs = list((brain / ".loci/activity").glob("*.md"))
    calendar_path = brain / "tasks/calendar.json"
    calendar = json.loads(calendar_path.read_text()) if calendar_path.exists() else None
    result["verification"] = {
        "saved_tasks": len(tasks),
        "expected_titles_match": {t["title"] for t in tasks} == {f"Isolated benchmark {i}" for i in range(10)},
        "date_time_match": all(t.get("date") == "2026-10-09" and t.get("startTime") == "09:00" for t in tasks),
        "activity_lines": sum(1 for p in logs for line in p.read_text().splitlines() if line.startswith("- ")),
        "calendar": calendar,
    }

values = [s["ms"] for s in result["samples"]]
result["timing_ms"] = {"min": min(values), "median": round(statistics.median(values), 3), "max": max(values)}
output_path = Path(__file__).with_name("writer-benchmark.json")
output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: v for k, v in result.items() if k != "samples"}, ensure_ascii=False, indent=2))
print("first_saved_task", json.dumps(result["samples"][0]["task"], ensure_ascii=False))
