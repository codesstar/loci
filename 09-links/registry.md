---
updated: 2026-03-05
---

# External Project Registry

| Name | Link Name | Actual Path | Purpose |
|------|-----------|-------------|---------|
| TaskFlow | `client-acme` | `~/projects/taskflow` | SaaS side project — task management for design teams |

## Connecting a New Project

```bash
# 1. Create symlink
ln -s /actual/path 09-links/link-name

# 2. Add a row to this registry

# 3. Optionally add from-hq.md and to-hq.md for bidirectional communication
```

## Notes

- TaskFlow is linked as `client-acme` (placeholder name from initial setup, should rename)
- Client project files stay in their own repos — only link if ongoing communication is needed
