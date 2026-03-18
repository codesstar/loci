<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: `<brain-path>`
- These rules apply **in every project and directory**, not just the brain folder.

### Automatic Context
- On session start, read `<brain-path>/plan.md` for life direction and current goals
- Read `<brain-path>/tasks/active.md` for current priorities
- Check `<brain-path>/inbox.md` for pending items (latest 7 only)

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → `<brain-path>/tasks/active.md`
- Decisions → `<brain-path>/decisions/YYYY-MM-DD-slug.md`
- Personal info → `<brain-path>/me/`
- Quick thoughts → `<brain-path>/inbox.md`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.
- **Dashboard**: if `server.js` is running (`node <brain-path>/.loci/dashboard/server.js`), no action needed — it reads markdown live. Otherwise, update `<brain-path>/.loci/dashboard/data.json` directly. See `<brain-path>/.loci/dashboard/schema.md` for format.

### Cross-Project Memory
- In projects with `.loci/` directory: read `.loci/memory.md` for project context, use `.loci/to-hq.md` / `.loci/from-hq.md` for cross-project sync
- Tags: `[decision]` `[architecture]` `[insight]` `[milestone]` auto-push to brain; `[local]` `[debug]` `[wip]` stay local

### Commands
/loci-sync, /loci-link, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
