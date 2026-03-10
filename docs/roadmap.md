# Loci Roadmap

## v1.0.0 (Current) — Launch

### Core
- Brain setup + conversational onboarding
- Three-layer context (L1/L2/L3)
- Signal-driven auto-persistence (auto/manual)
- Conversation distillation
- Sub-project linking (/loci-link) + Synapse
- Sub-project local persistence (.loci/memory.md)
- Tag-based sync (push_tags / local_tags)
- Cross-terminal awareness (hooks)
- Dashboard (build.py)
- Multi-tool compatibility (adapt.sh)
- Growth tracking (evolution.md)
- Extension modules on demand

### v1.0 New Features
- **Memory Consolidation（记忆整合）** — 模拟海马体睡眠整合机制：
  - 每天首次对话时，LLM 回顾过去 24h 的蒸馏结果
  - 发现跨领域模式（"你最近三个决策都在简化架构"）
  - 生成洞察追加到 `me/insights.md` 或 `me/evolution.md`
  - 灵感来源：Google Always-On Memory Agent 的 Consolidation 阶段
  - 可手动触发（`/loci-consolidate`）或自动（每日首次对话）
- **Source Citations（来源引用）** — 蒸馏时标注来源，查询时引用
- CI test suite (GitHub Actions, macOS + Ubuntu matrix)

## v2.0.0 — Power & Scale
- Search across brain (full-text grep + fuzzy match)
- Auto-compression for memory.md (200 line threshold)
- Multiple routing modes (open, manual, silent)
- Privacy boundary configuration (blocked_tags, custom rules)
- Distillation level presets (verbose/balanced/minimal)
- Retention policy (auto-archive after N days)
- Nested @import support in adapt.sh
- Cloud sync (git remote based, free tier = own repo, paid = managed)
- Embedding-based semantic search
- Mobile-friendly dashboard (PWA)
- Team/multi-user brain with permissions
- Plugin system for custom extensions
- Native support for Cursor/Windsurf/Cline (beyond adapt.sh)
- AI memory API (commercial offering)
- Shareable brain stats card (/loci-stats)
- Multi-modal inbox (文件监听目录，自动摄取非 markdown 内容)
- More example brains (designer, student, researcher)
- Brain health check script
- Improved install.sh (conflict detection, dry-run mode)
- Troubleshooting guide + FAQ
- Landing page

## Competitive Landscape
- **Google Always-On Memory Agent** (2026-03) — 通用 Agent 记忆后端，SQLite + Gemini，三阶段流水线（Ingest → Consolidate → Query）。Loci 差异：身份层 + 多项目编排 + 零基础设施。
- **Mem0** — API-first 记忆服务，向量数据库 + embedding。Loci 差异：纯 markdown、本地优先、透明可审计。
- **Letta (MemGPT)** — 自管理记忆的 Agent 框架。Loci 差异：不需要运行时，寄生在宿主工具中。
- **ChatGPT Memory** — 平台内置，扁平列表。Loci 差异：结构化三层、可导出、不锁定。

## Design Decisions Deferred
These were discussed and designed but deliberately cut from v1.0 to ship faster:
- Routing modes were fully designed (see git history) but only tag-routed ships in v1.0
- Compression was designed (>200 lines, >30 days → summarize) but removed for simplicity
- Privacy boundaries were designed (blocklist mode) but not exposed in v1.0
- Distillation levels were designed (verbose/balanced/minimal/custom) but v1.0 uses balanced only
