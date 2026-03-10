---
updated: 2026-03-09
---

# Active Tasks

> What you're working on right now. P0 = drop everything. P3 = nice to have.

## P0

- [ ] **CloudMetrics: Stripe billing integration** — need checkout flow + webhook handler before beta invites go out
- [x] **CloudMetrics: fix alert deduplication bug** — users getting 5x duplicate Slack notifications
- [ ] **Client: DataForge API migration** — move their ingestion pipeline from REST to gRPC, due Mar 14

## P1

- [ ] Write "Monitoring Your SaaS With Your Own SaaS" blog post
- [x] Set up GitHub Actions CI for CloudMetrics (lint + test + deploy preview)
- [ ] Record demo video for CloudMetrics landing page (under 90 seconds)
- [ ] Review and merge PR #38 — dashboard time-range selector

## P2

- [ ] Refactor CloudMetrics alerting engine to support custom thresholds
- [ ] Update LinkedIn headline and project links
- [x] Research ClickHouse vs TimescaleDB for metrics storage (decided: TimescaleDB)
- [ ] Write newsletter issue #8 — "Why I chose Postgres over everything"
- [ ] Reply to 3 HN comments from the "Show HN" thread

## P3

- [ ] Explore Grafana plugin SDK — could CloudMetrics be a Grafana data source?
- [ ] Rust rewrite of the metrics ingestion worker (learning project, not urgent)
- [x] Fix dark mode toggle on personal blog
- [ ] Read "Designing Data-Intensive Applications" chapters 10-12
