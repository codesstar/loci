# 个性化指南

## 让 Loci 成为你自己的

Loci 附带了一个虚构的人物（Alex Rivera）作为示例。以下是如何让它真正属于你。

## 基本自定义

### 1. 个人身份（`me/identity.md`）

这是最重要的自定义文件。AI 通过读取它来了解你是谁。

建议包含：
- 姓名、职业、所在地
- 工作风格和偏好
- 使用的工具
- 沟通偏好
- 当前关注的领域

### 2. 价值观和原则（`me/values.md`）

你的决策框架。AI 会根据这些给出符合你价值观的建议。

好的原则示例：
- "质量 > 速度——绝不发布自己不满意的东西"
- "一次只做一个项目——做完再开始新的"
- "健康第一——睡眠和运动不可妥协"

### 3. 人生方向（`plan.md`）

你的北极星。设定你的使命、年度目标和当前季度重点。

### 4. 活跃任务（`tasks/active.md`）

你的日常指挥中心。P0 项保持在 3 个以内。

## 进阶自定义

### 添加 AI 行为规则

编辑 `CLAUDE.md` 来添加个性化的行为规则。一些示例：

**容易过度承诺的人：**
```markdown
## Personal Reminders
- User tends to say yes to everything — always ask "does this align with your Q1 goals?"
- If they mention a new project idea, suggest adding it to someday.md first
```

**正在创业的人：**
```markdown
## Business Context
- Company: Acme Inc, Series A, 12 employees
- Current priority: Product-market fit
- Key metric: Weekly active users
- When discussing features, always consider impact on WAU
```

**学生：**
```markdown
## Academic Context
- University: MIT, Computer Science, graduating May 2026
- Current courses: [list]
- Thesis topic: [topic]
- Academic deadlines take priority over side projects
```

### 连接项目

如果你管理多个项目，部门系统会很有用。详见 `docs/departments.md`。

### Dashboard 主题

像素风主题是默认的，但你可以自定义。详见 `docs/dashboard.md`。

## 建议

1. **从小处开始** — 不要一次填完所有东西。让你的系统自然生长。
2. **善用蒸馏** — 自然地聊天，让 AI 提取信息。不需要手动编辑文件。
3. **每周回顾** — 每周花 10 分钟清理 inbox、回顾任务。
4. **信任分层** — 不是所有东西都需要放在 Layer 1。让细节留在 Layer 2 和 Layer 3。

## 不要动的东西

- 不要重命名 `CLAUDE.md` — 它是 AI 工具的入口
- 不要删除 `plan.md` 或 `inbox.md` — 它们是 Layer 1 的核心文件
