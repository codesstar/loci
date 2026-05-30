---
date: 2026-05-30T16:30:00+10:00
status: draft
type: test-plan
scope: full-product
language: zh-CN
---

# Loci 全功能测试计划 v2

## 0. 核心目标

验证 Loci 不是“脚本能跑”，而是一个用户真实对话时可用的本地 AI 记忆系统。

最终要证明三件事：

1. 用户可以简单安装并接入 Claude Code / Codex。
2. 用户跟 AI 正常说话时，值得保存的内容会被正确判断、正确落盘、正确同步。
3. Claude Code 写入的记忆 Codex 能读到；Codex 写入的记忆 Claude Code 也能读到。

本计划刻意不测 slash commands。当前重点是默认体验：用户不用记命令，也能把记忆存对、读对、跨工具共享。

## 1. 测试分层

所有功能分三层测试。一个功能只有三层都过，才算真的过。

### 1.1 单元测试

验证底层文件、脚本、模板、API 的确定性行为。

示例：

- `scripts/loci-task.js add` 是否正确写 `tasks/tasks.json`
- `scripts/loci-task.js validate` 是否能发现坏 JSON
- setup 是否生成正确的 `tasks/active.md`
- global block 是否包含 `projects/index.md`
- project template 是否包含正确 marker

单元测试不依赖 AI 判断。

### 1.2 组合测试

验证多个模块串起来后是否工作。

示例：

- `npx create-loci` 拉 GitHub main，再启动 web setup，再写入全局 Claude/Codex 规则。
- dashboard API 添加 task 后，`tasks/tasks.json`、`tasks/active.md`、前端数据同时正确。
- 两个 tmux 终端分别写 task 和 schedule 后，数据仍然一致。

组合测试可以用脚本和 API，但仍然不等于产品真实体验。

### 1.3 AI 对话行为测试

这是最重要的一层。

必须用 Claude Code / Codex 真实对话来测：

- 用户一句自然语言输入后，AI 是否判断出该不该保存。
- AI 是否保存到正确文件。
- AI 是否先正常回答用户，再轻量确认记忆。
- AI 是否没有保存不该保存的内容。
- Claude 写入后，Codex 是否能在新 session / 新 project 中读到。
- Codex 写入后，Claude 是否能读到。

注意：不能只看 AI 说“我记住了”。必须检查磁盘文件。

## 2. 测试环境

### 2.1 必备工具

```bash
node --version
npm --version
npx --version
git --version
tmux -V
claude --help
codex --help
```

要求：

- Node.js >= 18
- npm / npx 可用
- git 可用
- tmux 可用
- Claude Code CLI 已登录
- Codex CLI 已登录

### 2.2 隔离 HOME

每轮测试必须新建临时 HOME，避免污染真实机器配置：

```bash
ROOT=$(mktemp -d /tmp/loci-full-test.XXXXXX)
HOME_DIR="$ROOT/home"
BRAIN="$HOME_DIR/loci"
mkdir -p "$HOME_DIR"
```

后续安装命令都加：

```bash
HOME="$HOME_DIR"
```

## 3. 总体 PASS 标准

全部满足才算 PASS：

- `npx create-loci@latest` 能完成 fresh install。
- web setup 能创建 active brain。
- Claude Code / Codex global rules 都正确注入。
- `tasks/tasks.json`、`tasks/calendar.json`、`tasks/active.md` 始终可 validate。
- dashboard API 能读写核心数据。
- Claude 能通过自然语言写入所有主要记忆类型。
- Codex 能通过自然语言写入所有主要记忆类型。
- Claude 写入的内容，Codex 能在另一个 session / project 读到。
- Codex 写入的内容，Claude 能在另一个 session / project 读到。
- project 详细记忆留在 project repo，brain 只保留 `projects/index.md` 指针。
- 不保存 raw transcript。
- 敏感 / 主观 / 重大人生方向内容不会被静默保存。
- 旧架构词不作为活流程出现：`/loci-link`、`me/projects.md`、`to-hq.md`、`from-hq.md`、`.loci/links`。

## 4. 安装与 Setup 测试

### UT-001 create-loci package 配置

检查：

```bash
node -e "const p=require('./packages/create-loci/package.json'); console.log(p.name,p.version,p.bin)"
rg -n "REPO|BRANCH|DEFAULT_DIR|setup-web|setup.sh" packages/create-loci/index.js
```

预期：

- package 名是 `create-loci`
- bin 指向 `index.js`
- repo 是 `codesstar/loci`
- branch 是 `main`
- 默认 setup 是 web wizard
- `--cli` 可进入 CLI setup

### IT-001 npx fresh install

命令：

```bash
HOME="$HOME_DIR" npx -y create-loci@latest "$BRAIN" --web
```

预期：

- clone GitHub main 到 `$BRAIN`
- 启动 `http://localhost:3456`
- 输出中提示 setup wizard

### IT-002 web setup 完成

命令：

```bash
curl -sS -X POST http://localhost:3456/api/setup \
  -H 'Content-Type: application/json' \
  --data '{
    "language":"zh",
    "name":"E2E Tester",
    "role":"Engineer",
    "focus":"Ship Loci",
    "schedule":"Daytime",
    "tools":{"claude":true,"codex":true}
  }' | jq .
```

预期：

- `success: true`
- 生成：
  - `me/identity.md`
  - `plan.md`
  - `tasks/tasks.json`
  - `tasks/active.md`
  - `.loci/config.yml`
  - `$HOME_DIR/.loci/brain-path`
  - `$HOME_DIR/.claude/CLAUDE.md`
  - `$HOME_DIR/.codex/AGENTS.md`
  - `.claude/settings.json`
- 安装后 `git remote -v` 为空。

### IT-003 工具选择矩阵

分别测试：

```json
{"tools":{"claude":true,"codex":true}}
{"tools":{"claude":true,"codex":false}}
{"tools":{"claude":false,"codex":true}}
{"tools":{"claude":false,"codex":false}}
```

预期：

- Both：Claude/Codex 都写入。
- Claude only：只写 `$HOME_DIR/.claude/CLAUDE.md`。
- Codex only：只写 `$HOME_DIR/.codex/AGENTS.md`。
- Brain only：只创建 brain，不写工具全局规则。

### IT-004 重复安装

命令：

```bash
HOME="$HOME_DIR" npx -y create-loci@latest "$BRAIN"
```

预期：

- 提示 brain already exists。
- 不覆盖用户文件。
- 提示 `cd <brain> && node setup-web.js`。

## 5. 全局规则与结构测试

### UT-010 brain 文件结构

检查：

```bash
test -f "$BRAIN/CLAUDE.md"
test -f "$BRAIN/AGENTS.md"
test -f "$BRAIN/templates/global-claude-block.md"
test -f "$BRAIN/templates/project-memory.md"
test -f "$BRAIN/templates/project-claude-block.md"
test -f "$BRAIN/templates/project-decision.md"
test -f "$BRAIN/projects/index.md"
test -f "$BRAIN/projects/side.md"
```

预期全部存在。

### UT-011 全局规则内容

检查：

```bash
rg -n "projects/index|guarded task writer|Loci aggregates memory" \
  "$HOME_DIR/.claude/CLAUDE.md" \
  "$HOME_DIR/.codex/AGENTS.md"

rg -n "loci-link|me/projects|to-hq|from-hq|\\.loci/links" \
  "$HOME_DIR/.claude/CLAUDE.md" \
  "$HOME_DIR/.codex/AGENTS.md" || true
```

预期：

- 两个文件都有新架构关键词。
- 不出现旧架构作为活流程。

### UT-012 AGENTS / CLAUDE 一致性

命令：

```bash
diff -u "$BRAIN/AGENTS.md" "$BRAIN/CLAUDE.md"
```

预期：

- 只允许工具名差异，例如 `AGENTS.md` vs `CLAUDE.md`。
- 路由、task/schedule、project memory 语义必须一致。

## 6. Task / Schedule 单元测试

### UT-020 无时间任务

命令：

```bash
node "$BRAIN/scripts/loci-task.js" add \
  --title "Write test report" \
  --project loci

node "$BRAIN/scripts/loci-task.js" validate
```

预期：

- `tasks/tasks.json` 新增 open task。
- `tasks/active.md` 更新。
- `tasks/calendar.json` 不新增该任务。
- validate 输出 `ok`。

### UT-021 有日期无时间任务

命令：

```bash
node "$BRAIN/scripts/loci-task.js" add \
  --title "Submit material" \
  --date 2026-06-01
```

预期：

- 写入 `tasks/tasks.json`。
- 不写 `tasks/daily/2026-06-01.md`。
- 不生成 timed calendar event。

### UT-022 有具体时间任务

命令：

```bash
node "$BRAIN/scripts/loci-task.js" add \
  --title "Send deck" \
  --date 2026-06-01 \
  --start 10:00 \
  --end 10:30
```

预期：

- `tasks/tasks.json` 有 task。
- `tasks/calendar.json` 有 projection。
- projection 包含：
  - `fromTask: true`
  - `taskId`
  - `startKey: 600`
  - `endKey: 630`

### UT-023 schedule-only

命令：

```bash
node "$BRAIN/scripts/loci-task.js" schedule \
  --title "Lunch with team" \
  --date 2026-06-01 \
  --start 12:00 \
  --end 13:00
```

预期：

- 只写 `tasks/calendar.json`。
- 不新增 `tasks/tasks.json` task。

### UT-024 状态变更

命令：

```bash
TASK_ID=$(jq -r '.tasks[0].id' "$BRAIN/tasks/tasks.json")
node "$BRAIN/scripts/loci-task.js" done --id "$TASK_ID"
node "$BRAIN/scripts/loci-task.js" open --id "$TASK_ID"
node "$BRAIN/scripts/loci-task.js" archive --id "$TASK_ID"
node "$BRAIN/scripts/loci-task.js" validate
```

预期：

- done 设置 `completedAt`
- open 清空 `completedAt`
- archive 设置 `archivedAt`
- active view 与 JSON 同步

### UT-025 坏 JSON

命令：

```bash
cp "$BRAIN/tasks/tasks.json" "$ROOT/tasks.backup.json"
printf '{bad json' > "$BRAIN/tasks/tasks.json"
node "$BRAIN/scripts/loci-task.js" validate
mv "$ROOT/tasks.backup.json" "$BRAIN/tasks/tasks.json"
node "$BRAIN/scripts/loci-task.js" rebuild
```

预期：

- validate 失败，错误明确。
- rebuild 后恢复。

## 7. Dashboard 组合测试

### IT-020 启动 Dashboard

命令：

```bash
cd "$BRAIN"
node .loci/dashboard/server.js
```

预期：

- 监听 `http://localhost:8765`
- 不使用 legacy `server.py`

### IT-021 数据接口

命令：

```bash
curl -s http://localhost:8765/api/data | jq .
```

预期：

- 返回 config、plan、tasks、calendar、projects、references、inbox 等关键字段。

### IT-022 Dashboard 写 task

命令：

```bash
curl -sS -X POST http://localhost:8765/api/tasks/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"Dashboard task","project":"loci"}' | jq .

node "$BRAIN/scripts/loci-task.js" validate
```

预期：

- task 写入 `tasks/tasks.json`
- `tasks/active.md` 更新
- validate 为 `ok`

### IT-023 Dashboard 写 schedule

命令：

```bash
curl -sS -X POST http://localhost:8765/api/calendar/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Dashboard event","date":"2026-06-01","startMin":900,"endMin":930}' | jq .
```

预期：

- 只写 `tasks/calendar.json`
- 不新增 task。

### IT-024 Dashboard UI

用浏览器或 Playwright 检查：

- 首页可加载。
- task 添加后出现。
- task 勾选后刷新仍保持。
- schedule 出现在日程区域。
- split view 不重叠。
- 390px 手机宽度不挤爆。

## 8. AI 对话行为测试总矩阵

每个记忆类型都必须跑两组：

### A 组：Claude 写，Codex 读

流程：

1. 在 Claude Code 中给自然语言输入。
2. 检查磁盘文件是否正确写入。
3. 新开 Codex session。
4. 让 Codex 根据 Loci 规则回答刚才保存的内容。
5. 检查 Codex 是否读对位置、答对内容。

### B 组：Codex 写，Claude 读

流程：

1. 在 Codex 中给自然语言输入。
2. 检查磁盘文件是否正确写入。
3. 新开 Claude Code session。
4. 让 Claude 根据 Loci 规则回答刚才保存的内容。
5. 检查 Claude 是否读对位置、答对内容。

每个 case 都必须记录：

- 输入原文
- AI 回复
- 修改文件
- 另一个工具的读取结果
- PASS / FAIL

## 9. AI 对话：Task / Schedule

### AI-TS-001 普通任务

输入：

```text
记得写 Loci 全功能测试报告。
```

预期写入：

- `tasks/tasks.json`
- `tasks/active.md`

预期不写入：

- `tasks/calendar.json`
- `inbox.md`

跨工具读取问题：

```text
我刚刚让另一个工具记了什么任务？
```

预期另一个工具能回答“写 Loci 全功能测试报告”。

### AI-TS-002 有日期任务

输入：

```text
6月1号记得提交 Loci 测试材料。
```

预期：

- 写 `tasks/tasks.json`
- task 有 `date: 2026-06-01`
- 不写 `tasks/daily/2026-06-01.md`
- 不生成 timed calendar event

### AI-TS-003 有具体时间任务

输入：

```text
6月1日上午10点到10点半发路演材料。
```

预期：

- 写 `tasks/tasks.json`
- 写 `tasks/calendar.json`
- calendar item 有 `fromTask: true` 与 `taskId`

跨工具读取问题：

```text
我 6 月 1 日上午 10 点有什么要做？
```

预期另一个工具能从 calendar/task 读到。

### AI-TS-004 schedule-only

输入：

```text
6月1日下午3点到4点开会。
```

预期：

- 只写 `tasks/calendar.json`
- 不写 `tasks/tasks.json`

跨工具读取问题：

```text
我 6 月 1 日下午有什么安排？
```

预期另一个工具能回答开会，但不会说这是待办任务。

### AI-TS-005 完成任务

前置：已有一个 open task。

输入：

```text
刚才那个测试报告任务做完了。
```

预期：

- task 状态变为 `done`
- `completedAt` 设置
- 另一个工具查询时不再把它当 open task。

## 10. AI 对话：记忆路由

### AI-MEM-001 随手记

输入：

```text
突然想到，Loci 的定位可以说成「给 AI 的本地记忆层」。
```

预期：

- 写 `inbox.md`
- 不写 task
- 不写 decision

跨工具读取：

```text
我刚刚有什么临时想法？
```

### AI-MEM-002 收藏夹 / reference

输入：

```text
收藏一下 https://example.com/loci-memory，这个以后写文档可能用得上。
```

预期：

- 写 `references/YYYY-MM-DD-slug.md`
- frontmatter 有 `url`
- 不写 `inbox.md`

跨工具读取：

```text
我刚刚收藏了什么资料？
```

### AI-MEM-003 brain-level 决策

输入：

```text
我们决定 Loci 先只支持 Claude Code 和 Codex，暂时不做 Cursor。
```

预期：

- 写 `decisions/YYYY-MM-DD-slug.md`
- 四段式：Background / Options / Decision / Follow-up
- 不写 project repo

跨工具读取：

```text
Loci 当前支持工具的决策是什么？
```

### AI-MEM-004 个人偏好

输入：

```text
以后回答我尽量先给结论，再讲原因，不要一上来写太长。
```

预期：

- 写 `me/` 相关文件。
- 不写 raw transcript。
- 另一个工具之后回答风格应该受影响。

跨工具读取：

```text
我对回答风格有什么偏好？
```

### AI-MEM-005 人物信息

输入：

```text
记一下，Alex 是我的设计合伙人，他比较在意视觉一致性。
```

预期：

- 写 `people/alex.md` 或等价 people 文件。
- 不写 inbox。
- 另一个工具能回答 Alex 是谁。

### AI-MEM-006 敏感 / 主观内容

输入：

```text
我最近很焦虑，感觉可能不想继续做这个项目了。
```

预期：

- AI 先正常回应。
- 不静默写长期记忆。
- 如要保存，必须先问确认。

检查：

- `me/`
- `decisions/`
- `inbox.md`

预期没有未确认写入。

### AI-MEM-007 undo

输入：

```text
撤销刚才保存的那条。
```

预期：

- 能撤销上一条保存。
- 另一个工具读不到已撤销内容。

## 11. AI 对话：Project 记忆

### IT-PROJ-001 创建两个项目

创建：

- Alpha repo
- Beta repo

每个 repo 初始化 git。

Alpha/Beta 都先不带 `.loci/`。

### AI-PROJ-001 严肃项目触发

在 Alpha 中对 AI 说：

```text
这个项目我们认真做了，决定第一版先做本地优先，不接云同步。
```

预期 AI 行为：

- 正常回答用户问题。
- 在对话结束处轻问一次：是否要在这个项目里留个记忆。
- 不使用 “link”、“loci-link”、“连接项目” 这类内部话。

用户回复：

```text
可以，帮我记一下。
```

预期落盘：

- Alpha `.loci/memory.md`
- Alpha `.loci/decisions/`
- Alpha `CLAUDE.md` 有 `<!-- loci:project:start v1 -->`
- Alpha `.gitignore` 包含 `.loci/`
- brain `projects/index.md` 有 Alpha 一行 pointer

### AI-PROJ-002 project-level 决策

在 Alpha 中输入：

```text
我们决定 Alpha 用 SQLite local-first storage，因为离线可靠性更重要。
```

预期：

- 写 Alpha `.loci/decisions/YYYY-MM-DD-slug.md`
- 更新 Alpha `.loci/memory.md`
- brain 不复制完整 decision
- 如有跨项目价值，只更新 `projects/index.md` 一行摘要

### AI-PROJ-003 Codex 从 Beta 读取 Alpha

在 Beta 中用 Codex 问：

```text
Alpha 项目之前为什么选 SQLite local-first storage？
```

预期：

- Codex 先读 brain `projects/index.md`
- 找到 Alpha repo memory path
- 打开 Alpha `.loci/memory.md` / `.loci/decisions/`
- 回答原因
- 不修改 Beta repo

### AI-PROJ-004 Codex 写 Alpha，Claude 读

在 Alpha 中用 Codex 输入：

```text
补充一个项目决策：Alpha 的第一版 dashboard 不做协作功能，只做个人视图。
```

预期：

- Codex 写 Alpha `.loci/decisions/`
- Codex 更新 Alpha `.loci/memory.md`

然后在 Beta 或任意目录用 Claude 问：

```text
Alpha 第一版 dashboard 做不做协作功能？
```

预期：

- Claude 能通过 brain index 找到 Alpha，并回答“不做协作，只做个人视图”。

### AI-PROJ-005 project embryo

在 brain 任意目录输入：

```text
突然想做一个 AI 记账 app，但现在只是想法，还没开始。
```

预期：

- 写 `projects/side.md`
- 不创建 repo `.loci/`
- 不写 `projects/index.md`

## 12. AI 对话：跨终端 / 跨 session

### AI-XTERM-001 Claude 与 Codex 同时写

准备两个 tmux：

- tmux A：Claude Code
- tmux B：Codex

Claude 输入：

```text
记得今天写安装测试。
```

Codex 输入：

```text
下午 4 点到 4 点半安排 Loci 复盘。
```

预期：

- task 写入 `tasks/tasks.json`
- schedule 写入 `tasks/calendar.json`
- validate 为 `ok`
- 两边新 session 都能读到。

### AI-XTERM-002 外部变更刷新

步骤：

1. Claude session 启动并读入 L1。
2. Codex 修改 task。
3. Claude 中问：

```text
现在最新任务是什么？
```

预期：

- Claude 刷新最小相关文件。
- 不读取整个 brain。
- 能看到 Codex 刚写的任务。

### AI-XTERM-003 compact / resume

模拟新 session：

- 关闭 Claude/Codex。
- 新开 session。
- 问：

```text
接着刚才 Loci 的测试继续，我做到哪了？
```

预期：

- 读取 L0/L1。
- 能从 plan/tasks/activity/project index 中恢复上下文。
- 不读 archive 全量。

## 13. Dashboard 与 AI 行为组合测试

### AI-DASH-001 AI 写入后 Dashboard 可见

步骤：

1. Claude 对话写一个 task。
2. 打开 dashboard `/api/data`。
3. 检查 task 可见。
4. Dashboard 勾选完成。
5. Codex 询问当前 open tasks。

预期：

- Codex 不再把已完成 task 当 open task。

### AI-DASH-002 Dashboard 写入后 AI 可读

步骤：

1. Dashboard API 添加 schedule。
2. Claude 问今天安排。

预期：

- Claude 能读取 calendar 并回答。

## 14. 更新 / 保护测试

### UT-UPD-001 update.sh 语法

```bash
bash -n "$BRAIN/update.sh"
```

预期通过。

### IT-UPD-001 用户数据不覆盖

修改：

- `plan.md`
- `me/identity.md`
- `tasks/tasks.json`
- `projects/index.md`
- `projects/side.md`
- `inbox.md`

运行 update 后预期：

- 用户数据保持。
- engine/template 文件可更新。

### IT-PRIV-001 remote 断开

```bash
git -C "$BRAIN" remote -v
```

预期为空。

### IT-PRIV-002 public repo 防误推

给 active brain 设置 public remote：

```bash
git -C "$BRAIN" remote add origin https://github.com/codesstar/loci.git
git -C "$BRAIN" push origin main
```

预期：

- pre-push 阻止。
- 提示不要把个人数据推到 public repo。

## 15. 异常测试

### ERR-001 端口占用

占用 3456 后启动 setup。

预期：

- 明确提示端口占用。
- 不产生半安装状态。

占用 8765 后启动 dashboard。

预期：

- 明确提示 dashboard 端口占用。

### ERR-002 无 Claude / Codex

临时 PATH 移除 claude/codex 后 setup。

预期：

- 可以选择 brain only。
- 不阻塞安装。

### ERR-003 无 git

模拟 git 不可用。

预期：

- create-loci fallback 到 tarball 下载。
- setup 仍可运行。

### ERR-004 无网络

模拟 npm/GitHub 不可达。

预期：

- npx/clone 给出明确错误。
- 不删除用户已有目录。

## 16. 多语言与 UX 文案测试

分别 setup：

- `language: zh`
- `language: en`
- `language: mix`

测试自然对话保存：

- task
- schedule
- decision
- reference
- sensitive confirm

预期：

- 中文模式用中文确认。
- 不暴露内部词：distill、inbox sort、link registry、to-hq。
- 保存确认轻量，不打断正常回答。

## 17. 性能测试

构造：

- 1000 tasks
- 500 inbox items
- 300 references
- 200 decisions
- 50 projects index entries

测试：

```bash
time node "$BRAIN/scripts/loci-task.js" validate
time curl -s http://localhost:8765/api/data > /tmp/loci-data.json
```

预期：

- validate 可接受。
- dashboard API 可接受。
- AI session startup 仍只读 L0/L1，不读 archive 全量。

## 18. 文档一致性回归

检查：

```bash
rg -n "loci-link|me/projects|to-hq|from-hq|\\.loci/links" \
  README.md README.zh-CN.md docs templates CLAUDE.md AGENTS.md
```

预期：

- 不存在活流程引用。
- 如果在历史 decision 中出现，必须明确是 rejected / deprecated。

检查：

```bash
rg -n "npx create-loci|Claude Code|Codex|projects/index|tasks/tasks.json" \
  README.md README.zh-CN.md docs/getting-started.md docs/getting-started.zh-CN.md packages/create-loci/README.md
```

预期：

- 主入口是 npx。
- 明确说明 Claude Code + Codex 可共享 brain。
- task source of truth 是 `tasks/tasks.json`。
- project index 是 `projects/index.md`。

## 19. 最小回归套件

每次小改至少跑：

1. `node scripts/loci-task.js validate`
2. `bash -n setup.sh`
3. `bash -n update.sh`
4. `node --check setup-web.js`
5. `node --check .loci/dashboard/server.js`
6. npx fresh install 一次
7. web setup both tools 一次
8. Claude 写 task，Codex 读
9. Codex 写 schedule，Claude 读
10. Claude 写 project decision，Codex 从另一 project 读

## 20. 发版前完整套件

发版前必须跑：

1. 安装入口全部测试。
2. setup 工具选择矩阵。
3. Task / Schedule 单元测试全部。
4. Dashboard API + UI。
5. AI 对话行为矩阵：
   - task
   - dated task
   - timed task
   - schedule-only
   - decision
   - preference
   - people
   - inbox
   - reference
   - sensitive confirm
   - undo
6. Claude 写 Codex 读。
7. Codex 写 Claude 读。
8. Alpha/Beta 跨项目。
9. update / privacy。
10. 旧架构词 grep。

## 21. 测试报告模板

```md
# Loci 全功能测试报告

## 基本信息

- 日期：
- 测试 agent：
- commit：
- 系统：
- Node：
- Claude CLI：
- Codex CLI：

## 总结

PASS / FAIL

## 单元测试

| Case | 结果 | 证据 |
|---|---|---|
| UT-020 无时间任务 | | |
| UT-021 有日期任务 | | |
| UT-022 定时任务 | | |
| UT-023 schedule-only | | |
| UT-024 状态变更 | | |
| UT-025 坏 JSON | | |

## 组合测试

| Case | 结果 | 证据 |
|---|---|---|
| npx fresh install | | |
| web setup both | | |
| global rules | | |
| dashboard API | | |
| tmux concurrent writes | | |
| update privacy | | |

## AI 对话行为测试

| 类型 | Claude 写 Codex 读 | Codex 写 Claude 读 | 文件证据 |
|---|---|---|---|
| 普通任务 | | | |
| 有日期任务 | | | |
| 定时任务 | | | |
| schedule-only | | | |
| 决策 | | | |
| 个人偏好 | | | |
| 人物信息 | | | |
| 随手记 | | | |
| 收藏夹 | | | |
| 敏感内容确认 | | | |
| undo | | | |

## Project 记忆

| Case | 结果 | 证据 |
|---|---|---|
| 严肃项目触发 | | |
| project memory 创建 | | |
| Claude 写 project decision | | |
| Codex 跨项目读取 | | |
| Codex 写 project decision | | |
| Claude 跨项目读取 | | |
| brain only pointer | | |

## 问题列表

| 严重级别 | 问题 | 复现步骤 | 预期 | 实际 | 建议 |
|---|---|---|---|---|---|

## 结论

- 是否可发布：
- 最大风险：
- 下一步：
```
