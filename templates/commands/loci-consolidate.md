# /loci-consolidate — Memory Consolidation

Consolidate recent memories: review distilled knowledge from the past N days, find cross-domain patterns, and generate insights.

## Trigger

- Manual: user runs `/loci-consolidate` or `/loci-consolidate 7` (custom day range)
- Auto: first conversation of the day (checked via `.loci/last-consolidation.txt`)

## Process

1. **Gather recent distillations** (default: last 24 hours, configurable via argument):
   - Scan `decisions/` for files with recent dates in frontmatter
   - Scan `tasks/active.md` for recently added/completed items
   - Scan `me/` for recently updated files (check `updated` field)
   - Scan `.loci/activity-log.md` for recent entries
   - Scan `.loci/links/*/to-hq.md` Active sections for sub-project updates
   - Scan `inbox.md` for new entries

2. **If nothing found**: Skip silently (auto mode) or report "Nothing to consolidate" (manual mode)

3. **Analyze for patterns** — Look for:
   - Recurring themes across domains ("你最近三个决策都在简化架构")
   - Contradictions ("上周说要 focus，这周又加了 3 个新项目")
   - Momentum signals ("连续 5 天完成 P0 任务")
   - Cross-project connections ("Loci 的 tag 系统和 CYC 的分类策略在收敛")
   - Identity/value shifts ("从 '做更多' 转向 '做更精'")
   - **Goal progress** — compare recent activity against `plan.md` goals. Calculate rough progress % where possible ("距离 3/15 发布还有 4 天，完成度约 70%，有风险")
   - **Time allocation** — estimate time distribution across projects from activity-log. Flag mismatches with priorities ("Project A 占了 60% 时间，但它只是 P1，P0 的 Project B 本周 0 进展")
   - **Stale tasks** — scan `tasks/active.md` for items marked `[x]` more than 7 days ago or items untouched for 14+ days. Suggest archiving completed ones and reviewing stale ones

4. **Generate insight entry** — Write to `me/insights.md`:
   ```markdown
   ## YYYY-MM-DD Consolidation

   - [pattern] 观察到的模式描述
   - [momentum] 势头信号
   - [tension] 矛盾或需要注意的点
   ```
   If an insight reflects identity/value evolution, also append to `me/evolution.md`.

5. **Update checkpoint**: Write today's date to `.loci/last-consolidation.txt`

6. **Report** (one paragraph, conversational tone):
   ```
   [Loci] 记忆整合完成。发现：你最近在 X 方面有明显模式...
   ```

## Auto Consolidation (Daily)

At conversation start, check `.loci/last-consolidation.txt`:
- If file doesn't exist or date < today → run consolidation automatically (24h window)
- If date == today → skip (already consolidated today)

Auto consolidation is silent when there's nothing to report. Only surfaces insights worth mentioning.

## Source Citations

During consolidation, every insight must reference its source:

```markdown
- [pattern] 三个决策都在简化 <!-- source: decisions/2026-03-09-api-simplify.md, decisions/2026-03-10-drop-graphql.md, decisions/2026-03-11-merge-versions.md -->
```

Timestamps are included for temporal precision:

```markdown
- [pattern] 三个决策都在做减法 <!-- source: decisions/2026-03-09-api-simplify.md @2026-03-09T14:32, decisions/2026-03-10-drop-graphql.md @2026-03-10T16:05, decisions/2026-03-11-merge-versions.md @2026-03-11T09:20 -->
```

This enables traceability: any insight can be traced back to the raw decisions/entries that produced it, with temporal ordering for cause-effect analysis.

## Flags

- `/loci-consolidate 7` — consolidate last 7 days instead of 24h
- `/loci-consolidate 30` — monthly review
- No flags = default 24h window
