---
created: 2026-01-15
updated: 2026-03-07
tags: [insights, patterns]
status: active
---

# Things I've Learned

> Hard-won insights. Updated when I learn something worth remembering.

## Client Communication

### The "3-Option" Framework Works Every Time
When presenting design directions, always show 3 options: one safe, one moderate, one bold. Clients almost always pick the moderate one, which is the one I actually want them to pick. If I show just one, they feel like they have no choice and start nitpicking details. Learned this after the disastrous Finley redesign — showed one option, got 14 rounds of revisions.

### Weekly Updates Kill Scope Creep
Sending a short Friday email — "Here's what I did, here's what's next, here's what I need from you" — keeps clients aligned and reduces surprise requests. The clients who go silent between updates are the ones who show up with "oh by the way, we also need..." on the last day.

### Charge for Discovery
I used to do "free consultations" that turned into 3-hour unpaid workshops. Now I charge $500 for a 90-minute discovery session with a deliverable (problem brief + rough scope). Paradoxically, clients take it more seriously and close rates went UP from 40% to 65%.

## Pricing & Business

### $120/hr Was Too Low for SF
At $120/hr, I was attracting clients who wanted cheap and fast. At $150/hr, the client quality jumped noticeably — they're more organized, have real budgets, and respect timelines. Should have raised sooner. Next raise: $175 in Q3 if pipeline stays strong.

### Fixed-Price Projects Are a Trap (For Me)
I always underestimate scope. The $3K logo + brand identity project that ended up at an effective $18/hr taught me this permanently. Never again unless the scope is absurdly well-defined AND I add a 40% buffer.

## Technical Insights

### React Server Components Changed My Architecture Thinking
After rebuilding a client project with RSC, I realized I was over-fetching on the client side for years. The mental model shift: think about where data lives, not where components render. TaskFlow is being built RSC-first because of this.

### Supabase Row-Level Security Is Worth the Setup Pain
Spent 2 days setting up RLS policies for TaskFlow. Felt like overkill at the time. Then realized it means I don't need a separate auth middleware layer, and multi-tenancy is basically free. The initial pain was front-loaded but saves ongoing complexity.

### Tailwind + Design Tokens = Speed
I was anti-Tailwind for years ("it's ugly in the HTML!"). Then I set up a proper design token system with CSS variables mapped to Tailwind classes, and now I can go from Figma mockup to styled component in 20 minutes instead of an hour. The trick is the design tokens bridge, not just raw utility classes.

## Personal Patterns

### I Overthink When I'm Anxious
When I catch myself researching the "best" approach for more than 30 minutes, it's usually anxiety, not thoroughness. The fix: set a timer, pick one, commit. I can always change it later. This insight alone saves me 3+ hours a week.

### Tuesday Is My Most Productive Day
Tracked my output for 2 months. Mondays are slow (ramp-up), Wednesdays are meeting-heavy, Thursdays I'm tired, Fridays I coast. Tuesdays consistently have the best deep work output. I now schedule my hardest design and coding tasks for Tuesday mornings.
