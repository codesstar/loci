# Personalization Guide

## Making Loci Yours

Loci comes with a fictional persona (Alex Rivera) as an example. Here's how to make it truly yours.

## Essential Customizations

### 1. Personal Identity (`me/identity.md`)

This is the most important file to customize. Your AI reads this to understand who you are.

Include:
- Name, occupation, location
- Work style and preferences
- Tools you use
- Communication preferences
- Current focus areas

### 2. Values & Principles (`me/values.md`)

Your decision-making framework. The AI uses this to give aligned advice.

Examples of good principles:
- "Quality > Speed — Never ship work I'm not proud of"
- "One project at a time — Finish before starting something new"
- "Health first — Sleep and exercise are non-negotiable"

### 3. Life Direction (`plan.md`)

Your north star. Set your mission, annual goals, and current quarter focus.

### 4. Tasks (`tasks/tasks.json`)

Your daily command center. Just tell the AI what you need to do — tasks live in `tasks/tasks.json`, written through the guarded writer (`node scripts/loci-task.js` or the Dashboard API). `tasks/active.md` is a generated read-only snapshot; don't hand-edit either file.

## Advanced Customizations

### Adding AI Behavior Rules

Edit `CLAUDE.md` to add personalized behavior rules. Some examples:

**For someone who tends to overcommit:**
```markdown
## Personal Reminders
- User tends to say yes to everything — always ask "does this align with your Q1 goals?"
- If they mention a new project idea, suggest parking it in projects/side.md first
```

**For someone building a business:**
```markdown
## Business Context
- Company: Acme Inc, Series A, 12 employees
- Current priority: Product-market fit
- Key metric: Weekly active users
- When discussing features, always consider impact on WAU
```

**For a student:**
```markdown
## Academic Context
- University: MIT, Computer Science, graduating May 2026
- Current courses: [list]
- Thesis topic: [topic]
- Academic deadlines take priority over side projects
```

### Connecting Projects

If you manage multiple projects, just tell the AI to remember one ("remember this project") — or let it offer when a project gets serious. The project keeps its own memory in its repo (`.loci/memory.md` + `.loci/decisions/`), and your brain keeps only a one-line index in `projects/index.md`. See the multi-project section in `docs/how-it-works.md`.

### Dashboard Theming

The Clean theme is the default — a calm light theme with a single emerald accent. See `docs/dashboard.md`.

## Tips

1. **Start small** — Don't try to fill everything at once. Let your system grow organically.
2. **Use the distillation** — Chat naturally and let the AI extract information. You don't need to manually edit files.
3. **Review weekly** — Spend 10 minutes weekly clearing inbox and reviewing tasks.
4. **Trust the layers** — Not everything needs to be in Layer 1. Let details live in Layer 2 and 3.

## What NOT to Customize

- Don't rename `CLAUDE.md` — it's the entry point for AI tools
- Don't delete `plan.md` or `inbox.md` — they're Layer 1 essentials
- Don't hand-edit `tasks/tasks.json` or `tasks/calendar.json` — always go through the guarded writer or Dashboard API
