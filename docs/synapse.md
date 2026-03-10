# Synapse — Cross-Project Information Flow

## What is Synapse?

Synapse is how information flows between your Loci brain and connected sub-projects — like synapses between neurons, selectively transmitting what matters.

## Signal-Driven Persistence

Loci doesn't save on a fixed schedule. It watches every conversation turn for **signals** — meaningful information worth storing:

| Signal | Example | Destination |
|--------|---------|-------------|
| New task | "I need to update the API docs" | `05-tasks/active.md` |
| Decision | "Let's go with PostgreSQL" | `07-decisions/` |
| Insight/lesson | "Never deploy on Fridays" | `01-me/learned.md` |
| Personal info change | "I just moved to Berlin" | `01-me/identity.md` |
| Goal update | "Pushing launch to April" | `plan.md` |

**No signal = no save.** Five turns of chitchat produce zero writes. One turn with a major decision saves immediately.

### Notification Format

After each auto-save, you see a one-line notification:

```
[Loci] Stored: new task "Update API docs" → active.md
[Loci] Synced: decision "Use PostgreSQL" → from-hq.md (project-alpha)
```

This is a notification, not a question. Your conversation flow is never interrupted.

### Undo

Say "undo" or "撤销" to reverse the last auto-save. The AI will revert the file change and confirm.

### Manual Trigger

Run `/loci-sync` anytime for a full manual sync:

```
/loci-sync              → Distill + sync (default)
/loci-sync --local      → Distill only, don't sync to sub-projects
/loci-sync --dry-run    → Preview what would be saved, don't execute
```

## Two Modes

Configure via `/loci-brain-settings`:

| Mode | Behavior | Best for |
|------|----------|----------|
| **Auto** (default) | Signal-driven save + one-line notifications | Most users |
| **Manual** | Only saves on `/loci-sync` or explicit request | Power users who want full control |

## How Routing Works

When information is saved in the brain, Synapse decides which sub-projects should know about it:

```
Information detected
       ↓
   [Filter] — Does it match any category? (task, decision, insight...)
       ↓
  [Transform] — Apply distillation level (verbose / balanced / minimal)
       ↓
    [Route] — Send to the right place(s)
```

### Routing Modes

| Mode | How it works |
|------|-------------|
| **Tag-routed** (default) | Auto-tag items (urgent/decision/fyi/log), match to sub-project `interest_tags` |
| **Open** | All info visible to all sub-projects, each pulls what it needs |
| **Manual** | You choose which projects get each item |
| **Silent** | Brain keeps everything to itself |

### Privacy

Some information should never leave the brain. Privacy rules are configured in `/loci-brain-settings`:

- **Default blocked**: medical info, financial details, credentials/passwords
- **Custom rules**: You can add any category (e.g., "never share relationship details")
- **Hard boundary**: Privacy rules cannot be overridden by sub-projects

## Configuration Inheritance

```
Loci defaults → Brain settings → Sub-project settings → User override
```

Privacy is always a hard boundary — sub-projects cannot weaken it.

## File Format

### Brain side: `loci-brain-settings.yml`

```yaml
version: 1

persistence:
  mode: auto        # auto | manual
  notify: true      # show one-line notification after each save

privacy:
  blocked_tags: [medical, financial, credentials]
  custom_rules: []

distillation:
  level: balanced   # verbose | balanced | minimal

routing:
  mode: tag-routed  # open | tag-routed | manual | silent
  tags: [urgent, decision, fyi, log]

retention:
  archive_after_days: 90
```

### Sub-project side: `.loci-config.json`

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
