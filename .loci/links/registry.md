---
updated:
---

# External Project Registry

| Name | Link Name | Actual Path | Purpose |
|------|-----------|-------------|---------|

<!-- One row per linked external project. -->

## Connecting a New Project

```bash
# 1. Create symlink
ln -s /actual/path .loci/links/link-name

# 2. Add a row to this registry

# 3. Optionally add from-hq.md and to-hq.md for bidirectional communication
```

## Notes

- Client project files stay in their own repos — only link if ongoing communication is needed
