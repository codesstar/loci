---
date: 2026-03-19
type: test-report
tester: Claude AI
---

# API 全面测试报告

## 测试概要

| 指标 | 数值 |
|------|------|
| 测试时间 | 2026-03-19 凌晨 |
| 测试端点 | 10 个 API 端点 |
| 测试用例 | 18 个（含 edge cases） |
| 通过 | 18/18 |
| 发现 Bug | 1 个（严重，已修复） |

## Round 1: API 端点基础测试

### 1. GET /api/data
- **结果**: PASS
- **响应**: 返回 15 个顶级 key（config, plan, inbox, me, tasks, planning, people, decisions, finance, content, learning, links, references, stats, build_time）
- **tasks.active_tasks**: 正确解析 active.md 为 {P0: [...], P1: [...], P2: [...], P3: [...]} 结构

### 2. POST /api/tasks/add
- **请求**: `{"text":"API测试任务-tasks","priority":"P1"}`
- **结果**: PASS — 任务正确写入 active.md 的 ## P1 section
- **注意**: 字段名是 `text`（不是 `task`），前端代码一致

### 3. POST /api/tasks/toggle
- **请求**: `{"task":"API测试任务-tasks","checked":true}`
- **结果**: PASS — `- [ ]` → `- [x]` 正确切换
- **反向测试**: `checked:false` 也正常工作

### 4. POST /api/tasks/move
- **P1→P0**: PASS — 任务从 ## P1 移到 ## P0
- **P0→done**: PASS — 标记 [x]，留在原 section
- **done→P0**: PASS — 取消 [x]，移到 ## P0

### 5. POST /api/daily/add-task
- **请求**: `{"date":"2026-03-19","task":"API测试任务"}`
- **结果**: PASS — 任务追加到日计划文件
- **新日期测试**: 自动创建文件（含 frontmatter）—— PASS

### 6. POST /api/daily/toggle
- **请求**: `{"date":"2026-03-19","taskText":"API测试任务","done":true}`
- **结果**: PASS — 正确切换 checkbox 状态

### 7. POST /api/daily/remove-task
- **请求**: `{"date":"2026-03-19","task":"API测试任务"}`
- **结果**: PASS — 任务行被完全移除

### 8. POST /api/calendar/add
- **请求**: `{"title":"测试日历事件","date":"2026-03-20","time":"14:00"}`
- **结果**: PASS — 返回事件对象

## Round 2: Edge Cases

| # | 测试 | 结果 | 说明 |
|---|------|------|------|
| 1 | Toggle 不存在的任务 | PASS | 返回 `{"error":"Task not found: ..."}` |
| 2 | 添加特殊字符任务 `"quotes" & <tags> 🎉` | PASS | 正确写入文件 |
| 3 | 空 text 字段 | PASS | 返回 `{"error":"Missing task text"}` |
| 4 | 缺少必填字段 `{}` | PASS | 返回错误信息 |
| 5 | Malformed JSON | PASS | 返回 `{"error":"Invalid JSON: ..."}` |
| 6 | 不存在的端点 | PASS | 返回 404 |
| 7 | 中文任务内容 | PASS | UTF-8 编码无问题 |
| 8 | 新日期自动创建文件 | PASS | 正确生成 frontmatter + 标题 |

## Round 3: 数据完整性

- active.md frontmatter 完好
- daily plan 文件格式正确
- 无重复条目
- 测试后数据已恢复

## 发现的 Bug

### BUG-001: 拖拽期间自动刷新导致 UI 不响应（严重）

**症状**: 用户拖拽任务从 Focus→Queue 时，偶尔"拖不动"
**根因**: 5 秒自动刷新 `data.value = await r.json()` 替换了整个数据对象，`draggingTask.value` 持有的旧对象引用失效，`srcArr.indexOf(task)` 返回 -1
**影响**: UI 乐观更新失败（任务看起来没动），但 API 调用实际成功，5 秒后下次刷新任务才出现在正确位置
**修复**: 在 setInterval 刷新逻辑中加入 `if (draggingTask.value) return;` 跳过拖拽期间的刷新
**状态**: ✅ 已修复

## 总结

API 层面功能完整、错误处理到位。唯一的严重 bug 在前端的自动刷新机制与拖拽交互的冲突，已修复。
