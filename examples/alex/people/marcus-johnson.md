---
created: 2026-02-10
updated: 2026-03-04
tags: [client, bloom, active]
status: active
---

# Marcus Johnson

## Info

- **Role:** Co-founder & CTO at Bloom Health
- **Company:** Bloom Health — early-stage startup building a wellness/habit tracking app. Pre-seed, 5-person team.
- **Location:** Portland, OR
- **Email:** marcus@bloomhealth.app
- **How we met:** Portland Tech Meetup. He liked my talk on "Postgres for Everything."
- **Working together since:** February 2026

## Relationship

Marcus is Client B. He's enthusiastic, technically strong (former Netflix engineer), and has strong opinions about architecture — sometimes too strong. I need to push back occasionally or he'll over-engineer things in the meeting. Good guy though. Genuinely cares about building a product that helps people.

## Communication Style

- Prefers quick Zoom calls over long Slack threads (opposite of Sarah)
- Sends voice memos at 11pm with "just one more idea" — I've set a boundary: I respond next business day
- Needs to see things working. Don't send him a design doc; send a running prototype.
- Gets excited easily — I need to temper expectations and be clear about scope

## Current Project

**Bloom Health Backend** — Building the core backend infrastructure: user auth, habit tracking data model, push notification system, and basic analytics. They were on Firebase and it was getting expensive and inflexible. Budget: $6,000 for the migration + initial architecture. Due Mar 20.

## Key Details

- His co-founder Priya handles product/design. She's practical and a good counterbalance to Marcus's big ideas.
- They're on a tight runway (8 months). Everything needs to be lean and shippable.
- He wants the architecture to be "boring but scalable" — I showed him the Postgres-for-everything approach and he was sold.
- Potential for ongoing retainer if the migration goes well. He mentioned needing help with their analytics pipeline next.

## Meeting Notes

### 2026-03-04 — Architecture Review
- Walked through the migration plan (Firebase → Supabase + custom Node.js backend)
- Main concern: real-time sync for habit check-ins. Supabase Realtime should handle it.
- Marcus wants: event-sourcing for habit data (I pushed back — YAGNI for their stage, simple CRUD with audit log is enough)
- He agreed to start simple. Wants to see a working prototype by Mar 15.
- Follow-up: Priya will send the current Firebase schema export.

### 2026-02-10 — Intro Call
- Liked my Portland Tech Meetup talk
- Discussed rate ($165/hr), he was fine with it
- Agreed on retainer structure starting March: 15 hrs/month guaranteed
