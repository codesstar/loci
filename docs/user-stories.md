# User Stories — What Loci Feels Like

> Real scenarios showing how Loci works in daily life. No setup guides, no technical details — just the experience.

---

## "It knows when I wake up"

> Zhang Wei, developer, Shanghai

Zhang Wei worked until 9pm, closed his laptop, went to bed. Next morning at 9:15, he opens the same terminal:

```
> hi

  Morning, Zhang Wei. Yesterday you finished the auth module —
  nice progress. Today's plan:

  - P0: API integration testing (3 endpoints left)
  - P1: Design review meeting at 2pm
  - P2: Refactor Dashboard components

  Want to adjust anything?
```

No "what are you working on?" No re-explaining context. It just knows.

---

## "It tells me to stop"

> Zhang Wei, developer, late at night

Zhang Wei is deep in a bug fix. It's getting late. At 10:45pm:

```
> can you check why this test is flailing

  Found it — your mock isn't resetting between tests. Add
  `afterEach(() => vi.restoreAllMocks())` to the describe block.

  By the way, it's almost 11. Want to wrap up and list
  tomorrow's priorities?
```

He keeps going. At 11:30pm:

```
> ok one more thing, this type error...

  The issue is the generic constraint — change `T extends object`
  to `T extends Record<string, unknown>`.

  Seriously though, go sleep. This'll still be here tomorrow.
```

After that, it stops nagging. He chose to stay — it respects that.

---

## "It picks up where I left off"

> Sarah, product designer, Sydney

Sarah had a design session in the morning, went to lunch, came back at 2:30pm:

```
> continue

  Welcome back. We were working on the color system —
  you picked #FF6B6B as the accent color and wanted to
  finalize the typography scale. Ready?
```

No "what were we doing?" No scrolling through history. It just continues.

---

## "It plans my day and reviews my night"

> Alex, indie hacker, Berlin

Alex wakes up, opens Loci:

```
> morning

  Morning, Alex. Here's what's on your plate:

  - P0: Ship the billing page (2 days overdue)
  - P1: Reply to investor email
  - New from side-project: v0.3 deployed successfully yesterday

  The billing page has been P0 for 4 days — want to break it
  into smaller tasks?
```

That evening at 11pm:

```
> ok I'm done

  Good day — you shipped the billing page and replied to the
  investor. Want to plan tomorrow before you go?

  Suggested:
  - Follow up on investor response
  - Start user onboarding flow (next P0)
  - Side-project: review v0.3 feedback
```

---

## "It remembers across projects"

> Marcus, full-stack developer, 3 active projects

Marcus decides to use PostgreSQL in his main project on Monday. On Wednesday, he's working in a different project:

```
> should I use MySQL or Postgres for this service?

  You chose PostgreSQL on Monday for the main service
  (better JSONB support + team familiarity). Unless this
  service has different requirements, staying consistent
  makes sense.
```

He never told this project about Monday's decision. Loci synced it automatically.

---

## "It finds patterns I missed"

> Rina, startup founder, Tokyo

Rina has been making decisions all week. Friday morning, Loci's daily consolidation runs:

```
  Weekly insight: You made 5 architecture decisions this week,
  and 4 of them simplified your stack. You're shifting from
  "more features" to "fewer, better ones."

  Also: "Set up CI/CD" has been P1 for 9 days with no progress.
  Archive it or schedule it?
```

She didn't ask for this. Loci noticed the pattern and surfaced it at the right time.

---

## "I can configure it my way"

Loci's wellbeing features are on by default, but fully configurable:

```yaml
# .loci/config.yml
wellbeing:
  enabled: true
  wind_down_time: "23:00"    # night owl? push it back
  wake_up_time: "06:00"      # early riser? pull it forward
  max_reminders: 2           # max nudges per night, then silence
```

Or turn it off entirely:

```yaml
wellbeing:
  enabled: false
```

---

## "It remembers what I read"

> Rina, startup founder, researching pricing

Rina reads a great article about open-core pricing. She's in the middle of coding:

```
> save this — https://opencoreventures.com/blog/...
  interesting take on usage-based pricing for dev tools

  [Loci] Saved to references/inbox.md
```

Two weeks later, she's designing her own pricing page:

```
> what pricing models should I consider?

  Based on your product type, here are the main options...

  By the way, you saved an article about open-core pricing
  two weeks ago that argued usage-based pricing grows 3x
  faster for dev tools. Want me to pull up the details?
```

She never asked Loci to find that article. It connected the dots automatically.

---

## "It just works with Markdown"

Everything Loci stores is a plain Markdown file in a git repo:

```
my-brain/
├── me/identity.md          ← who you are
├── plan.md                 ← your goals
├── tasks/active.md         ← what you're doing
├── decisions/              ← why you chose X over Y
└── .loci/                  ← system internals
```

`git diff` shows what your AI learned today. `git log` is your memory timeline. No database, no server, no account.
