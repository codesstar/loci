---
date: 2026-10-07
status: decided
---

## Background
风铃项目第一版必须离线可用，需要确定存储方案。

## Options
- 云数据库：需要网络，不适合第一版离线需求
- SQLite：轻量级、离线可用、无需额外依赖

## Decision
采用 SQLite 作为第一版存储方案。

## Follow-up
- 更新 .loci/memory.md 状态
- 开始 SQLite 集成工作
