# Behavior Rules (imported by CLAUDE.md)

## Quick Add Reminders/Events

When the user mentions something to do, **add immediately** without confirmation:
- Add to `tasks/active.md` (default P2)
- If a time is mentioned, also add to `tasks/calendar.json`
- Format details → `tasks/README.md`

## Reference Collection (references/)

When the user mentions external content (articles, tweets, videos, quotes, products, ideas from others):

1. **Route**: External content → `references/inbox.md`. Own thoughts/tasks → root `inbox.md`
2. **Zero friction**: User says "save this" + content → append to `references/inbox.md` immediately. No classification needed, no confirmation
3. **Format**: `## [Short title]` + content + source + date
4. **On "organize references"**: Split inbox entries into individual files in `references/entries/`, auto-generate frontmatter (date, type, source, tags)
5. **On "what did I save about X"**: Search `references/inbox.md` + `entries/` for matches

## Department Communication Protocol

External projects ("departments") connect via `.loci/links/`. Two-way communication:
- `from-hq.md` (HQ→Dept): Write on strategic decisions, execute one-off tasks directly
- `to-hq.md` (Dept→HQ): Scan Active section at conversation start, watch for `[needs-decision]` `[milestone]` `[anomaly]`
- Monthly: archive entries older than 30 days or completed

## Daily Summary (Journal)

- During conversations, append decisions/insights/important topics to `tasks/journal/buffer.md`
- On "summarize" trigger, read buffer + review conversation → generate `tasks/journal/YYYY-MM-DD.md` → clear buffer
- Check for yesterday's journal at conversation start; remind to backfill if missing
- Proactively offer to summarize when user seems to be wrapping up
- Full mechanism → `tasks/journal/README.md`

## Activity Log

File changes are automatically recorded to `.loci/activity-log.md` via `.loci/hooks/on-file-change.sh` (registered as a Claude Code PostToolUse hook). This log tracks what happened across sessions so new conversations can pick up where old ones left off.

- **On session start**: Read `.loci/activity-log.md` (last 7 days) to understand recent context
- **Retention**: On the 1st of each month, remove entries older than 14 days. Important info should already be distilled to proper files; the log is just a timeline index

## Extension Rules

- **New module**: `mkdir name` → Create README.md → Update directory map
- **Connect external project**: `ln -s /actual/path .loci/links/name` → Register in `.loci/links/registry.md`
- **New template**: Place in `templates/`
- Loci is the main entry point; all external projects managed through `.loci/links/`
