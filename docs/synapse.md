# Synapse — Cross-Project Information Flow

## What is Synapse?

Synapse is how information flows between your Loci brain and connected sub-projects — like synapses between neurons, selectively transmitting what matters.

## Signal-Driven Persistence

Loci doesn't save on a fixed schedule. It watches every conversation turn for **signals** — meaningful information worth storing:

| Signal | Example | Destination |
|--------|---------|-------------|
| New task | "I need to update the API docs" | `tasks/active.md` |
| Decision | "Let's go with PostgreSQL" | `decisions/` |
| Insight/lesson | "Never deploy on Fridays" | `me/learned.md` |
| Personal info change | "I just moved to Berlin" | `me/identity.md` |
| Goal update | "Pushing launch to April" | `plan.md` |

**No signal = no save.** Five turns of chitchat produce zero writes. One turn with a major decision saves immediately.

### Signal Detection Checklist

The AI checks each conversation turn against these patterns:

- **Task signal**: user mentions something to do ("need to", "should", "要做", "记得")
- **Decision signal**: user makes a choice ("decided", "going with", "chose", "定了", "选")
- **Insight signal**: user expresses a realization ("learned", "realized", "turns out", "原来", "发现")
- **Identity signal**: user states personal info ("I am", "I moved to", "my job is", "我是", "我住")
- **Goal signal**: user updates objectives ("pushing to", "new target", "目标改成")
- **Reference signal**: user mentions external content to save ("save this article", "记一下这个链接")

If none match, no save. If multiple match, save all categories in one operation.

### Notification Format

After each auto-save, you see a one-line notification:

```
Got it — added task "Update API docs"
Noted — synced decision "Use PostgreSQL" to project-alpha
```

Notifications use natural language, not system jargon. Your conversation flow is never interrupted.

### Undo

Say "undo" or "撤销" to reverse the last auto-save. The AI will revert the file change and confirm.

### Manual Trigger

Run `/loci-sync` anytime for a full manual sync:

```
/loci-sync              → Distill + sync (default)
/loci-sync --local      → Distill only, don't sync to sub-projects
/loci-sync --dry-run    → Show what would be saved, don't execute
```

## Two Modes

Configure via `/loci-brain-settings`:

| Mode | Behavior | Best for |
|------|----------|----------|
| **Auto** (default) | Signal-driven save + one-line notifications | Most users |
| **Manual** | Only saves on `/loci-sync` or explicit request | Power users who want full control |

## Tag-Based Routing

When information is saved in the brain, Synapse uses tags to decide which sub-projects should know about it:

1. Each piece of information is auto-tagged: `urgent`, `decision`, `fyi`, `log`
2. Each sub-project declares `interest_tags` in `.loci/config.json`
3. Synapse matches tags to interests — only relevant items are routed
4. Projects with no matching tags receive nothing (no noise)

Example: A decision tagged `[decision, backend]` routes to projects whose `interest_tags` include `decision` or `backend`, but skips a frontend-only project.

Sensitive files (medical, financial, credentials) are never synced to sub-projects by default.

## File Format

### Brain side: `.loci/config.yml` (tracked in git)

```yaml
version: 1
persistence:
  mode: auto    # auto | manual
  notify: true  # show one-line notification after each save
```

### Sub-project side: `.loci/config.json`

```json
{
  "enabled": true,
  "projectType": "code",
  "sync": {
    "decisions": true,
    "milestones": true,
    "lessons": true,
    "codeDetails": false,
    "architecture": true,
    "blockers": true
  }
}
```

### Sub-project side: `.loci/memory.md`

Local persistence layer for project-specific knowledge. The AI appends distilled facts, decisions, and lessons relevant to this project here. Unlike brain-level memory, this stays within the project and loads as L1 context when working in this project.

```markdown
# Project Memory

## Facts
- Using PostgreSQL with Prisma ORM
- Deployed on Railway

## Decisions
- 2026-03-10: Switched from REST to tRPC for type safety

## Lessons
- Connection pooling required for serverless deployment
```

### Sub-project communication: `.loci/to-hq.md` and `.loci/from-hq.md`

Two-way communication files between the sub-project and the brain:

- **`.loci/to-hq.md`** (project → brain): Milestones, blockers, questions needing decision
- **`.loci/from-hq.md`** (brain → project): Strategic decisions, priority changes, cross-project info

These files live inside the sub-project's `.loci/` directory. From the brain's perspective, they are accessed via symlinks: `.loci/links/<project-name>/.loci/to-hq.md`. The brain scans all linked projects at session start.
