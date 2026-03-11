# Loci 路线图

## v1.0.0（当前版本）— 发布

### 核心功能
- Brain 初始化 + 对话式引导
- 三层上下文系统（L1/L2/L3）
- 信号驱动的自动持久化（自动/手动）
- 对话蒸馏
- 子项目链接（/loci-link）+ Synapse
- 子项目本地持久化（.loci/memory.md）
- 基于标签的同步（push_tags / local_tags）
- 跨终端感知（hooks）
- Dashboard（build.py）
- 多工具兼容（adapt.sh）
- 成长轨迹追踪（evolution.md）
- 按需扩展模块

### v1.0 新功能
- **Memory Consolidation（记忆整合）** — 模拟海马体睡眠整合机制：
  - 每天首次对话时，LLM 回顾过去 24h 的蒸馏结果
  - 发现跨领域模式（"你最近三个决策都在简化架构"）
  - 生成洞察追加到 `me/insights.md` 或 `me/evolution.md`
  - 灵感来源：Google Always-On Memory Agent 的 Consolidation 阶段
  - 可手动触发（`/loci-consolidate`）或自动（每日首次对话）
- **Source Citations（来源引用）** — 蒸馏时标注来源，查询时引用
- CI 测试套件（GitHub Actions，macOS + Ubuntu 矩阵）

## v2.0.0 — 能力与规模

- Brain 全文搜索（全文 grep + 模糊匹配）
- memory.md 自动压缩（200 行阈值）
- 多种路由模式（open、manual、silent）
- 隐私边界配置（blocked_tags、自定义规则）
- 蒸馏级别预设（verbose / balanced / minimal）
- 留存策略（N 天后自动归档）
- adapt.sh 中的嵌套 @import 支持
- 云同步（基于 git remote，免费版 = 自有仓库，付费版 = 托管服务）
- 基于 Embedding 的语义搜索
- 移动端友好的 Dashboard（PWA）
- 团队/多用户 brain 及权限管理
- 插件系统，支持自定义扩展
- 原生支持 Cursor / Windsurf / Cline（不再依赖 adapt.sh）
- AI 记忆 API（商业化产品）
- 可分享的 Brain 统计卡片（/loci-stats）
- 多模态收件箱（文件监听目录，自动摄取非 Markdown 内容）
- 更多示例 brain（设计师、学生、研究者）
- Brain 健康检查脚本
- 改进 install.sh（冲突检测、dry-run 模式）
- 故障排除指南 + FAQ
- 官方落地页

## 竞品格局

- **Google Always-On Memory Agent**（2026-03）— 通用 Agent 记忆后端，SQLite + Gemini，三阶段流水线（Ingest → Consolidate → Query）。Loci 差异：身份层 + 多项目编排 + 零基础设施。
- **Mem0** — API-first 记忆服务，向量数据库 + embedding。Loci 差异：纯 Markdown、本地优先、透明可审计。
- **Letta (MemGPT)** — 自管理记忆的 Agent 框架。Loci 差异：不需要运行时，寄生在宿主工具中。
- **ChatGPT Memory** — 平台内置，扁平列表。Loci 差异：结构化三层、可导出、不锁定。

## 被推迟的设计决策

以下功能已经过讨论和设计，但为了尽快发布 v1.0 而被有意裁剪：
- 路由模式已完整设计（见 git 历史），但 v1.0 只发布了基于标签的路由
- 压缩机制已设计（>200 行、>30 天 → 自动摘要），但为简化而移除
- 隐私边界已设计（黑名单模式），但未在 v1.0 中暴露
- 蒸馏级别已设计（verbose / balanced / minimal / custom），但 v1.0 仅使用 balanced
