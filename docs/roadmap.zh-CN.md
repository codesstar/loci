# Loci 路线图

## v1.0.0（当前版本）— 正式发布

### 核心功能
- Brain 初始化 + 对话式引导
- 三层上下文系统（L1/L2/L3）
- 信号驱动的自动持久化（自动/手动两种模式）
- 对话蒸馏
- 子项目链接（/loci-link）+ Synapse
- 子项目本地持久化（.loci/memory.md）
- 基于标签的同步（push_tags / local_tags）
- 跨终端感知（hooks）
- Dashboard（build.py）
- 多工具兼容（adapt.sh）
- 成长轨迹追踪（evolution.md）
- 按需扩展模块

### v1.0 新增
- **Memory Consolidation（记忆整合）** — 模拟人脑海马体的睡眠整合机制：
  - 每天第一次对话时，LLM 自动回顾过去 24 小时的蒸馏结果
  - 发现跨领域的规律（比如"你最近三个决策都在做减法"）
  - 生成洞察，追加到 `me/insights.md` 或 `me/evolution.md`
  - 灵感来源：Google Always-On Memory Agent 的 Consolidation 阶段
  - 支持手动触发（`/loci-consolidate`）和自动触发（每日首次对话）
- **Source Citations（来源引用）** — 蒸馏时记录来源，查询时可溯源
- CI 测试套件（GitHub Actions，macOS + Ubuntu 双平台矩阵）

## v2.0.0 — 能力升级 + 规模化

- Brain 全文搜索（全文 grep + 模糊匹配）
- memory.md 自动压缩（超过 200 行触发）
- 多种路由模式（open、manual、silent）
- 隐私边界配置（blocked_tags、自定义规则）
- 蒸馏粒度预设（verbose / balanced / minimal）
- 留存策略（N 天后自动归档）
- adapt.sh 支持嵌套 @import
- 云同步（基于 git remote，免费版用自己的仓库，付费版用托管服务）
- 基于 Embedding 的语义搜索
- 移动端适配 Dashboard（PWA）
- 团队/多用户 brain + 权限管理
- 插件系统，支持自定义扩展
- 原生适配 Cursor / Windsurf / Cline（不再需要 adapt.sh 过渡）
- AI 记忆 API（商业化产品）
- 可分享的 Brain 统计卡片（/loci-stats）
- 多模态收件箱（文件监听目录，自动消化非 Markdown 内容）
- 更多示例 brain（设计师、学生、研究者场景）
- Brain 健康检查脚本
- install.sh 升级（冲突检测、dry-run 模式）
- 故障排除指南 + FAQ
- 官方落地页

## 竞品格局

- **Google Always-On Memory Agent**（2026-03）— 通用 Agent 记忆后端，SQLite + Gemini，三阶段流水线（Ingest → Consolidate → Query）。Loci 的差异化：有身份层 + 多项目编排 + 零基础设施依赖。
- **Mem0** — API-first 的记忆服务，向量数据库 + embedding。Loci 的差异化：纯 Markdown、本地优先、数据完全透明可审计。
- **Letta (MemGPT)** — 自管理记忆的 Agent 框架。Loci 的差异化：不需要独立运行时，直接寄生在宿主工具里。
- **ChatGPT Memory** — 平台内置功能，扁平列表。Loci 的差异化：结构化三层架构、可导出、不锁定。

## 有意推迟的设计决策

以下功能都讨论过、设计过，但为了让 v1.0 尽快发出来，主动砍掉了：
- 路由模式完整方案已经设计好了（见 git 历史），v1.0 只放了基于标签的路由
- 压缩机制设计过（>200 行、>30 天自动摘要），为了简化先拿掉了
- 隐私边界设计过（黑名单模式），v1.0 没有暴露出来
- 蒸馏级别设计过（verbose / balanced / minimal / custom），v1.0 只用了 balanced
