---
date: 2026-02-15
tags: [cloudmetrics, technical, architecture]
status: active
---

# Decision: CloudMetrics Tech Stack

## Background

Needed to pick a stack for CloudMetrics (my SaaS — real-time infrastructure monitoring for small dev teams). Requirements: fast to build as a solo dev, good DX, handles time-series data well, can scale to ~1000 users without re-architecting.

## Options Considered

1. **Next.js + Supabase (Postgres) + Vercel** — Full-stack JS, auth/db/storage included, generous free tier
2. **Go + ClickHouse + self-hosted** — Purpose-built for metrics, but more ops burden as a solo dev
3. **Next.js + TimescaleDB + Railway** — Best of both: familiar stack + time-series optimized storage
4. **Rust (Axum) + ClickHouse** — Maximum performance, but I don't know Rust well enough yet

## Decision

Going with **Option 3: Next.js + TimescaleDB + Railway**, with Supabase for auth only.

### Reasoning
- I know Next.js deeply from client work — zero ramp-up time on the frontend
- TimescaleDB is Postgres under the hood, so I get all the Postgres ecosystem (RLS, pg_cron, extensions) plus native time-series capabilities (continuous aggregates, compression, retention policies)
- Railway gives me simple deploys without Vercel's serverless limitations (I need persistent connections for metrics ingestion)
- Supabase Auth is excellent and free — no reason to build auth from scratch
- I can always add a Rust ingestion service later for performance-critical paths

### Trade-offs Accepted
- TimescaleDB is less proven than plain Postgres for non-time-series queries
- Railway is smaller than Vercel/AWS — vendor risk
- Not as cutting-edge as a Go/Rust stack, but shipping matters more than tech cred

## Follow-up

- [x] Set up TimescaleDB on Railway + initial schema (hypertables, retention policies)
- [x] Configure GitHub Actions CI pipeline
- [x] Supabase Auth integration with Next.js middleware
- [ ] Evaluate tRPC vs REST for API layer (Jake recommended tRPC)
- [ ] Set up Stripe Checkout for billing (in progress as of March)
