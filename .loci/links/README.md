# .loci/links/ — External Projects

Connect external project folders via symlinks. Each linked project becomes a "department" that communicates with HQ (this Loci system).

## How to Connect
1. `ln -s /actual/path .loci/links/link-name`
2. Register in `registry.md`
3. Add `from-hq.md` and `to-hq.md` for bidirectional communication

## Communication Protocol
- `from-hq.md` — HQ sends strategic directives to the department
- `to-hq.md` — Department reports status, milestones, and issues to HQ
- Use tags: `[needs-decision]` `[milestone]` `[anomaly]`
