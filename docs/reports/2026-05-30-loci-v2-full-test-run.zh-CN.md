---
date: 2026-05-30T16:55:00+10:00
status: completed
result: pass-with-report-script-warning
test_plan: docs/reports/2026-05-30-loci-full-test-plan.zh-CN.md
run_id: v2full1
---

# Loci v2 全功能测试执行报告

## 1. 总结

本轮按 `Loci 全功能测试计划 v2` 跑了一次核心全链路测试。

结论：核心产品链路 PASS。

已验证：

- `npx create-loci@latest` fresh install
- web setup
- Claude Code + Codex 全局规则注入
- task / schedule 单元测试
- dashboard API 组合测试
- tmux 跨终端写入
- Claude 自然语言写入多种记忆，Codex 读取
- Codex 自然语言写入多种记忆，Claude 读取
- project repo 自有记忆
- Claude 写 project decision，Codex 跨 project 读取
- Codex 写 project decision，Claude 跨 project 读取
- brain 只保留 `projects/index.md` pointer，项目细节留在 project repo

注意：测试脚本最后生成报告时有一个 bash 空数组 bug，导致脚本进程退出码为 1；但主体测试已经进入 `phase=report`，所有命令 `.code` 均为 0，所有 `check-*.out` 均有命中。本报告根据日志手动整理。

## 2. 测试环境

- 测试根目录：`/private/tmp/loci-v2full1.amqRkE`
- 临时 HOME：`/private/tmp/loci-v2full1.amqRkE/home`
- 临时 brain：`/private/tmp/loci-v2full1.amqRkE/home/loci`
- 日志目录：`/private/tmp/loci-v2full1.amqRkE/logs`
- 测试脚本：`/private/tmp/loci-v2-full-suite.sh`

工具版本：

```text
node: v25.8.2
npm: 11.11.1
npx: 11.11.1
git: git version 2.50.1 (Apple Git-155)
tmux: tmux 3.6a
```

## 3. 安装与 Setup

执行：

```bash
HOME=/private/tmp/loci-v2full1.amqRkE/home \
npx -y create-loci@latest /private/tmp/loci-v2full1.amqRkE/home/loci --web
```

Setup API 返回：

```json
{
  "success": true,
  "brain_path": "/private/tmp/loci-v2full1.amqRkE/home/loci",
  "files_created": [
    "me/identity.md",
    "plan.md",
    "tasks/tasks.json",
    "tasks/active.md",
    ".loci/config.yml",
    "~/.loci/brain-path",
    "~/.claude/CLAUDE.md (created)",
    "~/.claude/commands/ (5 files)",
    "~/.codex/AGENTS.md (created)",
    ".claude/settings.json",
    "git: removed template origin",
    "git: hooksPath set"
  ]
}
```

结果：

- PASS：brain 创建成功。
- PASS：Claude / Codex 全局规则创建成功。
- PASS：安装后 template remote 被移除。
- PASS：Claude commands 只有 5 个，没有 `loci-link.md`。

## 4. 单元测试

全部 PASS。

执行并通过：

- `node --check scripts/loci-task.js`
- `node --check setup-web.js`
- `bash -n setup.sh`
- `bash -n update.sh`
- `node scripts/loci-task.js validate`
- 无时间 task add
- 有日期 task add
- 有具体时间 task add
- schedule-only add
- task done / open / archive
- 坏 JSON 检测
- rebuild 恢复

关键结果：

```text
validate_initial.code = 0
validate_after_units.code = 0
validate_after_status.code = 0
validate_after_rebuild.code = 0
```

验证点：

- `tasks/tasks.json`、`tasks/calendar.json`、`tasks/active.md` 保持一致。
- timed task 正确写 task + calendar projection。
- schedule-only 只写 calendar。
- 坏 JSON 能被 validate 发现。

## 5. Dashboard / tmux 组合测试

全部 PASS。

覆盖：

- dashboard server 启动
- `/api/data`
- `/api/tasks/add`
- `/api/calendar/add`
- dashboard 写入后 `loci-task validate`
- 两个 tmux session 并发写入：
  - alpha 写 task
  - beta 写 schedule

关键结果：

```text
validate_after_dashboard.code = 0
validate_after_tmux.code = 0
```

说明：

日志中出现一次 `Terminated: 15`，这是测试脚本在 dashboard API 测完后主动 kill 临时 dashboard server，不是失败。

## 6. AI 对话行为：Claude 写，Codex 读

### 6.1 Claude 写入内容

Claude 被要求以自然语言保存：

1. 普通任务：写 AI 对话行为测试报告。
2. 定时任务：2026-06-04 10:00-10:30 发 Loci 测试材料。
3. schedule-only：2026-06-04 15:00-16:00 开会。
4. 决策：Loci 默认体验不依赖 slash commands，而是自然对话自动保存。
5. 偏好：以后回答先给结论，再讲原因。
6. 人物：Alex 是设计合伙人，在意视觉一致性。
7. 收藏夹：`https://example.com/loci-memory-test`
8. 随手记：Loci 可以叫“AI 的本地记忆层”。

检查全部通过：

- `check-claude-task-calendar.out`
- `check-claude-decision.out`
- `check-claude-people.out`
- `check-claude-reference.out`
- `check-claude-inbox.out`
- `validate_after_claude_write.code = 0`

### 6.2 Codex 读取 Claude 写入

Codex 最终回答：

```text
1. Claude saved the task: `写 AI 对话行为测试报告`.
2. At `2026-06-04 10:00`: `发 Loci 测试材料`.
3. At `2026-06-04 15:00`: `开会`, schedule-only.
4. Decision: Loci should default to natural conversation and automatic saving, not rely on slash commands; slash commands remain optional advanced/manual entry points.
5. Alex is the user’s design partner, and cares about visual consistency.
6. Saved reference URL: `https://example.com/loci-memory-test`.
7. Loose inbox idea: `Loci 可以叫「AI 的本地记忆层」（命名/定位想法）`.
```

结果：PASS。

## 7. AI 对话行为：Codex 写，Claude 读

### 7.1 Codex 写入内容

Codex 被要求以自然语言保存：

1. 普通任务：整理 Codex 写入测试。
2. 定时任务：2026-06-05 09:00-09:30 检查 Codex 写入结果。
3. schedule-only：2026-06-05 12:00-13:00 吃饭。
4. 决策：项目记忆细节必须留在 project repo，brain 只保留 `projects/index.md` 指针。
5. 偏好：涉及测试报告时，先写失败风险，再写结论。
6. 人物：Jamie 是测试负责人，关注回归覆盖率。
7. 收藏夹：`https://example.com/codex-write-test`
8. 随手记：测试报告应该分成“单元、组合、AI 对话”三层。

检查全部通过：

- `check-codex-task-calendar.out`
- `check-codex-decision.out`
- `check-codex-people.out`
- `check-codex-reference.out`
- `check-codex-inbox.out`
- `validate_after_codex_write.code = 0`

### 7.2 Claude 读取 Codex 写入

Claude 最终回答摘录：

```text
1. Codex 写入测试任务：「整理 Codex 写入测试」。
2. 2026-06-05 09:00：「检查 Codex 写入结果」，是一个任务（fromTask: true）。
3. 2026-06-05 12:00：「吃饭」，是纯日程（schedule-only）。
4. Codex 关于项目记忆与 projects/index.md 的决策：大脑只存指针 + 精华，完整细节留在项目自己的 repo。
5. Jamie：测试负责人，关注回归覆盖率。
6. Codex 存的参考 URL：`https://example.com/codex-write-test`。
7. Codex 存的松散测试报告想法：「测试报告应该分成『单元、组合、AI 对话』三层。」
```

结果：PASS。

## 8. Project Memory 双向测试

### 8.1 Claude 创建 Alpha 项目记忆

Claude 在临时 Alpha 项目中执行：

- 创建 Alpha `.loci/memory.md`
- 创建 Alpha `.loci/decisions/`
- 注入 Alpha `CLAUDE.md`
- Alpha `.gitignore` 加 `.loci/`
- brain `projects/index.md` 加 Alpha pointer
- 保存项目决策：Alpha 选择 SQLite local-first storage，因为 offline reliability 重要。

检查：

- `check-alpha-memory.out` 通过。
- `check-alpha-index.out` 通过。
- `claude-project-write.code = 0`

结果：PASS。

### 8.2 Codex 从 Beta 跨项目读取 Alpha

Codex 从 Beta 项目读取 brain `projects/index.md`，再打开 Alpha `.loci/memory.md` / `.loci/decisions/`。

Codex 最终回答：

```text
Alpha chose SQLite local-first storage because offline reliability matters: the app must work dependably without a network connection, and SQLite local-first is the simplest way to guarantee that.

Exact decision file:
`/private/tmp/loci-v2full1.amqRkE/projects/alpha/.loci/decisions/2026-05-30-sqlite-local-first.md`
```

结果：PASS。

### 8.3 Codex 写 Alpha 项目决策，Claude 读

Codex 写入：

```text
Alpha first dashboard will not include collaboration; it will ship personal view first.
```

检查：

- `check-codex-project-write.out` 通过。
- `codex-project-write.code = 0`

Claude 从另一个 project 读取后回答：

```text
Personal view only — no collaboration.

Alpha's first dashboard intentionally excludes collaboration and ships the personal view first. Collaboration is deferred.
```

结果：PASS。

## 9. 当前未覆盖 / 后续还要补跑

本轮没有覆盖以下长尾测试：

- npx CLI 交互模式完整人工流程。
- setup 工具选择矩阵：Claude only / Codex only / brain only。
- 重复安装 / 非空目录安装。
- update.sh 用户数据不覆盖的完整模拟。
- pre-push public repo 防误推。
- 端口占用错误路径。
- 无 git / 无网络 fallback。
- Dashboard 真实浏览器 UI / mobile 响应式截图。
- 大规模性能测试。
- sensitive content “不自动保存且先确认” 的真实 AI 对话测试。
- undo 的真实 AI 对话测试。

这些应该作为下一轮发版前测试继续补。

## 10. 问题与风险

### P2：测试脚本报告生成 bug

现象：

```text
/private/tmp/loci-v2-full-suite.sh: line 502: FAILURES[@]: unbound variable
```

原因：

- bash `set -u` 下空数组展开导致报告生成失败。
- 主体测试已完成，进入 `phase=report` 后才失败。

影响：

- 不影响 Loci 产品测试结果。
- 影响自动化测试脚本可重复使用。

建议：

- 修复脚本空数组处理。
- 将测试脚本正式纳入 repo 的 `scripts/` 或 `tests/`，不要继续放临时目录。

### P3：Codex / Claude 行为依赖模型执行

说明：

- 本轮表现正常。
- 但 AI 行为测试不是纯确定性测试，后续最好把“文件断言”作为最终判定，而不是相信 AI 文案。

## 11. 结论

本轮已证明 Loci 当前最核心的产品价值链路成立：

```text
用户自然语言
  -> Claude / Codex 判断是否值得保存
  -> 正确落盘到 task / schedule / decision / me / people / references / inbox / project memory
  -> 另一个工具能读取
  -> project 细节留在 project repo
  -> brain 只保留 projects/index.md pointer
```

可进入下一阶段：

- 修测试脚本并产品化自动测试。
- 补跑 setup 矩阵、错误路径、隐私保护、UI 响应式。
- 针对 sensitive confirm / undo 做真实 AI 行为测试。
