# User Stories — What Loci Feels Like

> Real scenarios showing how Loci works in daily life. No setup guides, no technical details — just the experience.

---

## "It knows when I wake up"

> Zhang Wei, developer, Shanghai

Zhang Wei worked until 9pm, closed his laptop, went to bed. Next morning at 9:15, he opens the same terminal:

```
> hi

  Morning, Zhang Wei. Yesterday you finished the landing page —
  nice progress. Today's plan:

  - P0: Write the launch announcement
  - P1: Meeting with designer at 2pm
  - P2: Clean up the settings page

  Want to adjust anything?
```

No "what are you working on?" No re-explaining context. It just knows.

---

## "It tells me to stop"

> Zhang Wei, developer, late at night

Zhang Wei is deep in a bug. It's getting late. At 10:45pm:

```
> can you help me figure out why this isn't working

  Found it — you're loading the config before the environment
  variables are set. Move the import below the dotenv line.

  By the way, it's almost 11. Want to wrap up and list
  tomorrow's priorities?
```

He keeps going. At 11:30pm:

```
> ok one more thing, this error message...

  That's because the file path has a space in it. Wrap it
  in quotes.

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
  you picked coral as the accent color and wanted to
  finalize the font sizes. Ready?
```

No "what were we doing?" No scrolling through history. It just continues.

---

## "It plans my day and reviews my night"

> Alex, indie maker, Berlin

Alex wakes up, opens Loci:

```
> morning

  Morning, Alex. Here's what's on your plate:

  - P0: Ship the pricing page (2 days overdue)
  - P1: Reply to that collab email
  - New from side-project: v0.3 deployed successfully yesterday

  The pricing page has been P0 for 4 days — want to break it
  into smaller tasks?
```

That evening at 11pm:

```
> ok I'm done

  Good day — you shipped the pricing page and replied to the
  collab email. Want to plan tomorrow before you go?

  Suggested:
  - Follow up on collab response
  - Start user onboarding flow (next P0)
  - Side-project: review v0.3 feedback
```

---

## "It remembers across projects"

> Marcus, creator with 3 active projects

Marcus decides to use a minimalist design style in his main project on Monday. On Wednesday, he's working in a different project:

```
> I'm designing the homepage. Any suggestions on style?

  You went with minimalist design in your main project on
  Monday — clean layout, lots of whitespace, max 2 fonts.
  Unless this project has a different vibe, staying consistent
  keeps your brand cohesive.
```

He never told this project about Monday's decision. Loci synced it automatically.

---

## "It finds patterns I missed"

> Rina, startup founder, Tokyo

Rina has been making decisions all week. Friday morning, Loci's daily review runs:

```
  Weekly insight: You made 5 product decisions this week,
  and 4 of them simplified things. You're shifting from
  "more features" to "fewer, better ones."

  Also: "Write the investor update" has been on your list
  for 9 days with no progress. Do it or drop it?
```

She didn't ask for this. Loci noticed the pattern and surfaced it at the right time.

---

## "It remembers what I read"

> Rina, startup founder, researching pricing

Rina reads a great article about pricing strategies. She's in the middle of working:

```
> save this — https://example.com/blog/pricing-strategies
  interesting take on usage-based pricing for small teams

  Got it — saved for later.
```

Two weeks later, she's designing her own pricing page:

```
> what pricing models should I consider?

  Based on your product type, here are the main options...

  By the way, you saved an article about pricing strategies
  two weeks ago that argued usage-based pricing grows 3x
  faster for small teams. Want me to pull up the details?
```

She never asked Loci to find that article. It connected the dots automatically.

---

## "It connects dots I forgot about"

> Marcus, creator, working across projects

Marcus spent all week fixing performance issues on his website — images loading slowly, pages taking too long. On Friday, he starts a new project:

```
> I want to build an image gallery feature for this one.

  Heads up — you spent 3 days this week optimizing image
  loading in your other project. Two of the issues were
  about large files slowing everything down.

  You might want to add image compression from the start
  here, so you don't hit the same problem. Want me to
  outline the approach?
```

He wasn't thinking about the other project at all. But the lesson he learned there was exactly relevant here — and Loci made the connection.

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

> Jake, indie maker, deep in a long session

Jake has been working with his AI for 3 hours straight. The context window is almost full. His AI is starting to repeat itself and forget earlier decisions.

Without Loci, he'd close the terminal, open a new one, and spend 10 minutes re-explaining everything.

With Loci:

```
> save everything before I restart

  Done — synced 3 decisions, 2 tasks, and today's progress
  to your brain. You can close this terminal anytime.

(Jake opens a new terminal)

> hey, picking up where I left off

  Welcome back. You were redesigning the checkout flow.
  You chose a single-page layout over multi-step, finished
  the cart summary, and have the payment form left.
  Ready to continue?
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
