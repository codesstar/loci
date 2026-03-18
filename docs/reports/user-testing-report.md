---
date: 2026-03-19
type: user-testing-report
---

# 用户测试报告

## 测试方法

模拟 10 类用户画像，从各自视角体验 Loci 系统，记录痛点和建议。

---

## 用户 1: 新手小白

**画像**: 第一次接触 Loci，不了解系统
**体验路径**: 看 README → 尝试 setup

**发现**:
- ✅ README.md 存在，有基本说明
- ⚠️ 缺少 quick start guide（5分钟上手教程）
- ⚠️ `loci init` 命令的文档不够清晰
- ❌ 新用户不知道 Dashboard 怎么启动（需要知道去 `.loci/dashboard/` 运行 `node server.js`）

**建议**:
1. 在 README 顶部加一行命令就能跑起来的 quick start
2. 添加 `loci dashboard` 命令或在 README 说明启动方式

---

## 用户 2: 效率达人

**画像**: 重度任务管理用户，想快速操作
**测试**: 通过 API 快速增删任务

**发现**:
- ✅ API 响应快速（<50ms），适合自动化
- ✅ 所有 CRUD 操作都有 API 端点
- ⚠️ 没有批量操作 API（如一次添加多个任务）
- ⚠️ 没有搜索/过滤 API
- ❌ API 没有认证机制，本地使用无所谓，但远程访问有安全风险

**建议**:
1. 添加 `POST /api/tasks/batch` 批量操作
2. 添加 `GET /api/search?q=关键词` 全文搜索

---

## 用户 3: 日记爱好者

**画像**: 每天写日记/总结
**检查**: Journal 系统、daily plan、buffer

**发现**:
- ✅ journal 文件结构清晰（daily/weekly/monthly 分层）
- ✅ buffer.md 机制合理
- ✅ daily plan 支持 checkbox
- ⚠️ Journal 在 Dashboard 上只有查看，没有编辑功能
- ⚠️ 缺少 journal 模板自定义

**建议**:
1. Dashboard Journal 页面增加编辑功能
2. 支持 journal 标签/情绪标记

---

## 用户 4: 规划控

**画像**: 喜欢做周计划、月计划
**检查**: Week Plan、Month Plan、Planning 页面

**发现**:
- ✅ Week/Month Plan 卡片已实现
- ✅ 周/月切换按钮工作正常
- ✅ smartMerge 防止刷新丢状态
- ⚠️ Week Plan 的任务存储在周一的 daily plan 里，概念上有些混淆
- ⚠️ 没有"拖拽任务到具体日期"的功能

**建议**:
1. 考虑为 week/month plan 使用独立的存储文件
2. 增加从 Week Plan 拖拽到 Daily Plan 的功能

---

## 用户 5: 开发者

**画像**: 想基于 Loci 做二次开发
**检查**: 代码质量、API 文档、扩展性

**发现**:
- ✅ server.js 零依赖，代码清晰
- ✅ Markdown-as-database 概念简单易懂
- ⚠️ index.html 单文件 ~9000+ 行，维护困难
- ⚠️ 没有 API 文档（OpenAPI/Swagger）
- ⚠️ 没有单元测试
- ❌ 前端 Vue 组件没有拆分，所有逻辑在一个 setup() 里

**建议**:
1. 添加 API 文档到 docs/api.md
2. 拆分 index.html 为多个组件（长期）
3. 添加基础测试套件

---

## 用户 6: 数据备份狂

**画像**: 担心数据丢失
**检查**: 数据格式、Git 友好度、备份策略

**发现**:
- ✅ 所有数据都是纯 Markdown，可以 Git 版本控制
- ✅ 文件结构清晰，可以用任何文本编辑器查看
- ✅ 没有二进制数据库依赖
- ✅ 已推送到两个 GitHub 仓库（主仓库 + 备份）
- ⚠️ 没有自动备份机制（如定时 git commit）

**建议**:
1. 添加 `loci backup` 命令（自动 git commit + push）
2. 考虑 cron job 自动备份

---

## 用户 7: 中文用户

**画像**: 主要使用中文
**检查**: 中文内容处理、编码

**发现**:
- ✅ 中文任务内容正确处理（API 测试验证）
- ✅ Dashboard UI 支持中英文切换
- ✅ 文件名使用日期（不含中文），无编码问题
- ⚠️ 部分 UI 文案硬编码为英文

**建议**: 无重大问题

---

## 用户 8: 多项目用户

**画像**: 管理多个项目
**检查**: links 系统、跨项目功能

**发现**:
- ✅ `09-links/` 符号链接设计合理
- ✅ `from-hq.md` / `to-hq.md` 双向通信协议设计好
- ⚠️ Dashboard 没有跨项目视图
- ⚠️ links 注册需要手动操作

**建议**:
1. Dashboard 添加项目概览面板
2. `loci link` 命令自动化注册流程

---

## 用户 9: 移动端用户

**画像**: 想在手机上查看 Dashboard
**检查**: 响应式设计

**发现**:
- ⚠️ index.html 有一些响应式 CSS，但主要为桌面设计
- ⚠️ 拖拽在触屏上不好用
- ❌ 没有 PWA 支持

**建议**:
1. 优化移动端布局
2. 触屏用长按替代拖拽
3. 添加 PWA manifest（可以"添加到主屏幕"）

---

## 用户 10: API 集成者

**画像**: 想用 API 做自动化
**检查**: API 一致性、错误处理

**发现**:
- ✅ 错误返回格式一致 `{"error": "..."}`
- ✅ 成功返回 `{"ok": true, ...}`
- ✅ JSON 解析错误有友好提示
- ⚠️ 没有 API 版本控制（`/api/v1/...`）
- ⚠️ 没有 rate limiting
- ⚠️ 返回的 HTTP 状态码不够精确（部分错误返回 200 + error body）

**建议**:
1. 统一使用 HTTP 状态码（400 for bad request, 404 for not found）
2. 添加 API 版本前缀

---

## 痛点汇总（按严重程度排序）

| 优先级 | 痛点 | 影响用户 |
|--------|------|----------|
| P0 | 拖拽期间自动刷新导致操作失败 | 效率达人、规划控 |
| P1 | 新用户不知道如何启动 Dashboard | 新手小白 |
| P1 | index.html 单文件太大，难维护 | 开发者 |
| P2 | 缺少 API 文档 | 开发者、API 集成者 |
| P2 | 移动端体验差 | 移动端用户 |
| P3 | 没有批量操作 API | 效率达人 |
| P3 | Journal 页面没有编辑功能 | 日记爱好者 |
