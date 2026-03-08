---
date: 2026-03-05
tags: [learning, rust, technical]
status: active
---

# Decision: Rust Learning Path

## Background

I've been curious about Rust for a year. Jake's been learning it too, which gives me an accountability partner. The question isn't "should I learn Rust" (yes), but "how do I learn it without it becoming a procrastination vehicle that takes time away from TaskFlow?"

## Options

1. **Full immersion** — Dedicate Fridays to Rust, build TaskFlow's backend in Rust from the start
2. **Steady drip** — 30 min/day, follow The Rust Book, build small CLI projects on the side
3. **Project-first** — Skip the book, jump into building something real (Axum web app)
4. **Defer entirely** — Focus on shipping TaskFlow in JS/TS first, learn Rust after launch

## Decision

Going with **Option 2: Steady drip**.

### Reasoning
- Full immersion would derail TaskFlow (I know myself — I'd spend 3 weeks on Rust and forget about the SaaS)
- Project-first without fundamentals leads to frustration with Rust specifically (ownership/borrowing need proper understanding)
- Deferring entirely means I lose the momentum and Jake accountability
- 30 min/day is sustainable, doesn't compete with client work or TaskFlow
- The Rust Book is excellent and free

### Concrete Plan
- **Daily:** 30 min after dinner, The Rust Book chapters 1-12
- **Weekly:** One small exercise or mini-project to reinforce the chapter
- **Monthly:** Build one small CLI tool (March: a task list parser, April: a markdown linter)
- **Q3 goal:** Comfortable enough to prototype a Rust microservice for TaskFlow if needed

### What "Done" Looks Like for 2026
- Finished The Rust Book through chapter 15
- Built 3-4 small CLI tools
- Can read and understand Rust codebases (even if I'm slow writing it)
- Have an informed opinion on whether TaskFlow should use Rust for anything

## Follow-up

- [x] Buy The Rust Book (physical copy — I read technical books better on paper)
- [x] Set up Rust toolchain (rustup, cargo, rust-analyzer in VS Code)
- [x] Finish chapter 4 (ownership) — the mental model shift
- [ ] Chapter 5-8 by end of March
- [ ] First CLI project: task list parser that reads my active.md
