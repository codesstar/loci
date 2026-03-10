# Loci Roadmap

## v0.1.0 (Current) — Foundation
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

## v0.2.0 — Polish
- Search across brain (full-text grep + fuzzy match)
- Auto-compression for memory.md (200 line threshold)
- Troubleshooting guide + FAQ
- More example brains (designer, student, researcher)
- Brain health check script
- Improved setup.sh (conflict detection, dry-run mode)

## v1.0.0 — Power User
- Multiple routing modes (open, manual, silent)
- Privacy boundary configuration (blocked_tags, custom rules)
- Distillation level presets (verbose/balanced/minimal)
- Retention policy (auto-archive after N days)
- Nested @import support in adapt.sh
- CI test suite (GitHub Actions)
- Landing page

## v2.0.0 — Scale
- Cloud sync (git remote based, free tier = own repo, paid = managed)
- Embedding-based semantic search
- Mobile-friendly dashboard (PWA)
- Team/multi-user brain with permissions
- Plugin system for custom extensions
- Native support for Cursor/Windsurf/Cline (beyond adapt.sh)
- AI memory API (commercial offering)
- Shareable brain stats card (/loci-stats)

## Design Decisions Deferred
These were discussed and designed but deliberately cut from v0.1 to ship faster:
- Routing modes were fully designed (see git history) but only tag-routed ships in v0.1
- Compression was designed (>200 lines, >30 days → summarize) but removed for simplicity
- Privacy boundaries were designed (blocklist mode) but not exposed in v0.1
- Distillation levels were designed (verbose/balanced/minimal/custom) but v0.1 uses balanced only
