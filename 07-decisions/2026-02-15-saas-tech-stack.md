---
date: 2026-02-15
tags: [taskflow, technical, architecture]
status: active
---

# Decision: TaskFlow Tech Stack

## Background

Needed to pick a stack for TaskFlow (my SaaS side project — a project management tool for small design teams). Requirements: fast to build as a solo dev, good DX, can scale to ~1000 users without re-architecting.

## Options Considered

1. **Next.js + Supabase + Vercel** — Full-stack JS, auth/db/storage included, generous free tier
2. **Remix + PlanetScale + Fly.io** — More control, slightly more setup, better data mutation patterns
3. **SvelteKit + Firebase** — Fastest UI, but Firebase pricing gets unpredictable at scale
4. **Rust (Axum) + HTMX + SQLite** — Lean and fast, but I don't know Rust well enough yet

## Decision

Going with **Option 1: Next.js + Supabase + Vercel**.

### Reasoning
- I already know Next.js deeply from client work — zero ramp-up time
- Supabase gives me auth, Postgres, real-time subscriptions, and row-level security out of the box
- Vercel's preview deployments are great for iterating fast
- The ecosystem is huge — if I get stuck, there's always a blog post or Discord answer
- I can always add Rust microservices later for performance-critical features

### Trade-offs Accepted
- Vendor lock-in with Vercel (acceptable for now, can self-host Next.js if needed)
- Supabase is still maturing — some rough edges in their JS client
- Not as "cool" as building in Rust, but shipping matters more than tech cred

## Follow-up

- [x] Set up Supabase project and initial schema
- [x] Configure Vercel deployment pipeline
- [x] Set up GitHub Actions for CI
- [ ] Evaluate tRPC vs REST for API layer (Jake recommended tRPC)
- [ ] Set up Stripe Checkout for billing (after core features work)
