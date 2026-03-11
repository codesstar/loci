# 个性化指南

## 把 Loci 变成你自己的

Loci 自带了一个虚构人物（Alex Rivera）当示例。下面说说怎么换成你自己的东西。

## 基础定制

### 1. 个人身份（`me/identity.md`）

这是最关键的文件。AI 读这个来了解你是谁。

建议写上：
- 姓名、职业、坐标
- 干活风格和习惯
- 常用工具
- 沟通偏好
- 当前在忙什么

### 2. 价值观和原则（`me/values.md`）

你做决策的底层逻辑。AI 会参考这些给你提建议。

好的原则长这样：
- "质量大于速度——自己不满意的东西绝不发"
- "一次只做一个项目——做完再开新的"
- "健康第一——睡眠和运动没得商量"

### 3. 人生方向（`plan.md`）

你的北极星。写上使命、年度目标、当前季度重点。

### 4. 活跃任务（`tasks/active.md`）

日常指挥中心。P0 不超过 3 个。

## 进阶玩法

### 给 AI 加行为规则

改 `CLAUDE.md` 就行。几个场景：

**什么都想答应的人：**
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

### 连接多个项目

如果你手上有好几个项目要管，部门系统很好用。详见 `docs/departments.md`。

### Dashboard 换皮

默认是像素风，你可以自己改。详见 `docs/dashboard.md`。

## 几条建议

1. **别一上来就填满** — 先搞最基本的，让系统跟着你自然长出来。
2. **多用蒸馏** — 正常聊天就行，让 AI 自己把信息捞出来。不用手动改文件。
3. **每周理一理** — 花 10 分钟清 inbox、过一遍任务。
4. **信任分层机制** — 不是所有东西都得塞进 Layer 1。细节放 Layer 2 和 Layer 3 就好。

## 别动这些

- 不要改 `CLAUDE.md` 的文件名 — AI 工具靠它当入口
- 不要删 `plan.md` 或 `inbox.md` — Layer 1 的核心文件，删了就断了
