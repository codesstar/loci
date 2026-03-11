# User Stories — What Loci Feels Like

> Real scenarios showing how Loci works in daily life. No setup guides, no technical details — just the experience.

---

## "It knows when I wake up"

> Dev, backend engineer, Toronto

Dev pushed a fix for the payment retry logic at 9pm, then closed his laptop. Next morning at 8:30, he opens his terminal:

```
> morning

  Morning, Dev. Yesterday you fixed the payment retry bug — the
  exponential backoff was resetting on partial failures. Good catch.

  Today's plan:
  - P0: Deploy the retry fix to staging + run the load test suite
  - P1: API review meeting at 2pm (you wanted to bring up the
    rate limiting issue you found last week)
  - P2: Start scoping the webhook refactor

  The load test suite failed 3 times last week with timeout errors.
  Want to bump the timeout config before running it again?
```

No "what are you working on?" No re-explaining context. It knows the code, the bugs, the meetings — and it connects them.

---

## "It tells me to stop"

> Dev, backend engineer, late at night

Dev is deep in a migration script. It's getting late. At 10:45pm:

```
> this foreign key constraint keeps failing on the legacy data

  The legacy records have NULL values in user_id — they predate
  the 2024 schema change. Add a WHERE clause to your migration
  query, then backfill the NULLs separately.

  Also — it's almost 11. Want me to save your progress so you
  can pick this up fresh tomorrow?
```

He keeps going. At 11:40pm:

```
> ok now the backfill script is throwing a deadlock

  You've been on this migration for 4 hours. The deadlock is
  probably because you're updating in-place during the backfill.
  But honestly — you'll solve this in 20 minutes tomorrow with
  fresh eyes.

  Want me to save where you are? Tomorrow you'll pick up right
  here: migration script done, backfill script needs batch
  processing to avoid deadlocks.
```

It doesn't lecture. It helps first, then nudges. And when he chooses to stay, it respects that.

---

## "It picks up where I left off"

> Amara, full-stack developer, Lagos

Amara spent the morning untangling a gnarly state management bug. She found the root cause — a race condition between two API calls — but hadn't written the fix yet. Lunch break.

At 2:15pm she's back:

```
> continue

  Welcome back. You were fixing the race condition in the
  checkout flow — the cart total and inventory check fire
  at the same time, and sometimes inventory returns stale data.

  You decided to chain them sequentially instead of running
  them in parallel, and you were about to update the checkout
  hook. The file is src/hooks/useCheckout.ts, line 47. Ready?
```

Not "what were we doing?" — it knows the exact file, the exact problem, and the exact approach she'd chosen.

---

## "It plans my day and reviews my night"

> Sasha, indie developer, Berlin

Sasha wakes up, opens their terminal:

```
> morning

  Morning, Sasha. Here's where things stand:

  - P0: The auth token refresh is still broken on mobile
    (you were stuck on this yesterday — the issue was the
    secure storage behaving differently on Android)
  - P1: Client demo is Thursday. The dashboard loads but
    the chart component crashes with large datasets
  - P2: You mentioned wanting to try a new API framework
    — saved in your someday list

  Heads up: the Android storage issue might be the same bug
  you hit in your side project 2 weeks ago. Want me to pull
  up what you did there?
```

That evening at 11pm:

```
> done for today

  Good day. You fixed the auth refresh (the Android fix from
  your side project worked) and patched the chart crash.

  Tomorrow's priorities:
  - P0: Prep for Thursday's client demo (test the full flow)
  - P1: Write up the auth fix — you'll forget why it works
    in a month

  Nice work shipping two blockers in one day.
```

---

## "It remembers across projects"

> Kai, developer with 3 active projects, Seoul

On Monday, Kai spends 2 hours debugging CORS issues in his API project. He finally figures out the right configuration — specific origins, credentials mode, preflight caching:

```
> finally got CORS working. The issue was that wildcard origins
  don't work with credentials. Had to list specific origins and
  add caching to avoid preflight on every request.

  Noted — saved your CORS solution with the full context.
```

On Thursday, he's setting up a different API for a client project:

```
> I need to add CORS headers to this API

  You solved a tricky CORS issue in your personal project on Monday.
  Key findings: wildcard origins break when credentials are involved,
  and you need caching to avoid constant preflight requests.

  Want me to apply the same configuration here? The setup is
  almost identical.
```

He never mentioned the other project. The lesson he spent 2 hours learning transferred automatically.

---

## "It finds patterns I missed"

> Priya, startup CTO, Bangalore

Priya has been making technical decisions all week. Friday morning, the weekly review runs:

```
  Weekly insight: You made 6 architecture decisions this week.
  5 of them traded complexity for reliability — you chose
  simpler solutions even when the "clever" approach had
  better theoretical performance.

  Pattern: you're optimizing for maintainability over speed.
  Might be worth making that an explicit engineering principle
  so your team follows the same instinct.

  Also: "Evaluate monitoring tools" has been on your list for
  11 days. Your staging environment had 3 incidents this week
  with no alerts. This is becoming urgent.
```

She didn't ask for this. Loci noticed the pattern across a week of scattered decisions and surfaced it at the right time.

---

## "It remembers what I read"

> Tomas, developer, Mexico City

Tomas reads a blog post about database connection pooling while debugging something unrelated. He mentions it in passing:

```
> interesting post — apparently PgBouncer in transaction mode
  breaks prepared statements. save this:
  https://example.com/pgbouncer-gotchas

  Saved — PgBouncer transaction mode breaks prepared statements.
```

Three weeks later, he's setting up a new project's database:

```
> should I use PgBouncer for connection pooling?

  You saved an article 3 weeks ago about PgBouncer gotchas.
  The key issue: transaction pooling mode breaks prepared
  statements, which your ORM relies on heavily.

  You'd need to either use session mode (less efficient) or
  switch to a different pooler. Want me to pull up the full
  article?
```

He'd completely forgotten saving that. But it was exactly the thing that would have cost him a day of debugging.

---

## "It connects dots I forgot about"

> Amara, full-stack developer, starting a new service

Amara spent three days last month fighting memory leaks in a Node.js service. She found the culprit — event listeners not being cleaned up in a long-running connection. This week, she starts a new project:

```
> I'm building a real-time notification service with WebSockets

  Heads up — you spent 3 days last month debugging memory leaks
  in your other project. The root cause was event listeners piling
  up on long-running connections.

  For this service: set up listener cleanup from day one, and add
  a memory usage monitor to your health check endpoint. Want me to
  outline the pattern that worked?
```

She wasn't thinking about the old project at all. But the pain she went through there was exactly the lesson she needed here — and Loci made the connection before she repeated the mistake.

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

## "Context full? No problem."

> Jake, developer, deep in a long session

Jake has been working with his AI for 3 hours straight. The context window is almost full. His AI is starting to repeat itself and forget earlier decisions.

Without Loci, he'd close the terminal, open a new one, and spend 10 minutes re-explaining everything.

With Loci:

```
> save everything before I restart

  Done — synced 3 decisions, 2 tasks, and today's progress
  to your brain. You can close this terminal anytime.

(Jake opens a new terminal)

> hey, picking up where I left off

  Welcome back. You were debugging why the webhook handler
  drops events under load. You narrowed it to the async queue
  — it fails when the payload exceeds 256KB. You were about
  to add payload chunking. Ready to continue?
```

10 seconds to full context recovery. No re-explaining. The AI reads your brain files and knows exactly where you were.

---

## "It just works with Markdown"

Everything Loci stores is a plain Markdown file in a git repo:

```
my-brain/
├── me/identity.md          <- who you are
├── plan.md                 <- your goals
├── tasks/active.md         <- what you're doing
├── decisions/              <- why you chose X over Y
└── .loci/                  <- system internals
```

`git diff` shows what your AI learned today. `git log` is your memory timeline. No database, no server, no account.
