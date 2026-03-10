---
created: 2026-01-15
updated: 2026-03-07
tags: [insights, patterns]
status: active
---

# Things I've Learned

> Hard-won insights. Updated when I learn something worth remembering.

## Freelancing & Clients

### The "3-Option" Framework Works Every Time
When presenting technical approaches to clients, always show 3 options: one conservative, one balanced, one ambitious. Clients almost always pick the balanced one, which is the one I actually want to build. If I show just one, they second-guess everything. Learned this after the Finley project — showed one approach, got 6 weeks of scope creep.

### Weekly Updates Kill Scope Creep
Sending a short Friday email — "Here's what I shipped, here's what's next, here's what I need from you" — keeps clients aligned and reduces surprise requests. The clients who go silent between updates are the ones who show up with "oh by the way, we also need..." the day before deadline.

### Charge for Discovery
I used to do "free consultations" that turned into 3-hour unpaid architecture sessions. Now I charge $400 for a 90-minute discovery call with a deliverable (technical assessment + rough scope). Paradoxically, clients take it more seriously and close rates went UP from 35% to 60%.

### $140/hr Was Too Low for Portland
At $140/hr, I was attracting clients who wanted cheap and fast. At $165/hr, the client quality jumped noticeably — they're more organized, have real budgets, and respect timelines. Should have raised sooner. Next raise: $185 in Q3 if pipeline stays strong.

## Technical Insights

### Postgres Is Almost Always the Right Answer
After trying DynamoDB, Redis as primary store, and even SQLite for CloudMetrics, I came back to Postgres every time. RLS for multi-tenancy, JSONB for flexible schemas, pg_cron for background jobs. The boring choice is boring because it works.

### Supabase Row-Level Security Is Worth the Setup Pain
Spent 2 days setting up RLS policies for CloudMetrics. Felt like overkill at the time. Then realized it means I don't need a separate auth middleware layer, and multi-tenancy is basically free. The initial pain was front-loaded but saves ongoing complexity.

### Don't Abstract Too Early
I spent a week building a "generic metrics ingestion pipeline" for CloudMetrics before I had a single real user. Then the first 3 alpha testers all wanted slightly different things. Ripped out the abstraction and hardcoded the first use case. Ship the specific thing, abstract when you see the pattern repeat 3 times.

### The Rust Compiler Is the Best Teacher I've Had
Learning Rust's ownership model didn't just teach me Rust — it retroactively explained half the memory bugs I'd seen in Node.js. The borrow checker forces you to think about data flow in a way that JavaScript actively hides from you. Even if I never ship production Rust, learning it made me a better TypeScript developer.

## Building a Product

### Your First 10 Users Will Use It Wrong (And That's the Feature)
My first CloudMetrics alpha testers used it to monitor their CI pipelines, not their production infrastructure. I almost "corrected" them. Instead, I watched what they did and realized CI monitoring was a better wedge market — smaller scope, faster feedback loops, easier to show value.

### Pricing Pages Are a Product Decision, Not a Marketing One
I spent 3 weeks agonizing over CloudMetrics pricing tiers. Then I talked to 5 indie devs and they all said the same thing: "I'd pay $29/mo if it just works and I don't have to think about it." One tier, one price, no feature gates. Decision made in one conversation.

## Personal Patterns

### I Overthink When I'm Anxious
When I catch myself researching the "best" approach for more than 30 minutes, it's usually anxiety, not thoroughness. The fix: set a timer, pick one, commit. I can always refactor later. This insight alone saves me 3+ hours a week.

### Wednesday Is My Most Productive Day
Tracked my output for 2 months. Mondays are slow (ramp-up), Tuesdays are meeting-heavy, Thursdays I'm tired, Fridays I coast. Wednesdays consistently have the best deep work output. I now schedule my hardest coding tasks for Wednesday mornings.

### Running Fixes My Brain
When I'm stuck on an architecture problem, a 30-minute run solves it more reliably than another hour of staring at code. Something about the combination of movement and not-thinking. I keep a voice memo app on my phone for the inevitable mid-run breakthrough.
