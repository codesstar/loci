# 隐私与数据保护

## 设计思路

**默认好用，安全可选。**

Loci 里存的是你的整个人生——身份、目标、财务、人脉、决策。这些东西当然敏感。但要是强制所有人都上加密，用起来就太累了。所以我们的策略是：基础保护开箱即用，高级保护你想开就开。

> 说白了就是：隐私越高，操作越麻烦。你自己选一个舒服的平衡点。

---

## Layer 0：结构性安全（默认生效，不用配置）

装好 Loci 就自动有以下保护，啥都不用设置。

### Git 远程仓库自动断开

安装过程中（不管是跑 `install.sh` 还是对话式引导），Loci 会自动把公开模板仓库的 remote 断掉。这样你的个人数据就不会一不小心 push 到公开仓库去。

想备份的话，推到你自己的**私有仓库**就行——只有你能访问，数据是安全的。

> **注意**：请 clone，别 fork。fork 出来的仓库默认是公开的。要是已经 fork 了，赶紧去设置里改成 private。

### .gitignore

已经预配置好了，会排除系统状态文件（`.loci/status.yml`、`.loci/activity-log.md`、`.loci/last-consolidation.txt`、`.loci/dashboard/data.json`）和编辑器/系统生成的临时文件。你的内容文件（`me/`、`tasks/`、`decisions/` 等）**会被 git 跟踪**——这是故意的，这样你就能通过 `git log` 查看记忆的完整变更历史。

因为安装时已经断开了模板仓库的 remote，这些被跟踪的文件只会留在本地，除非你自己主动加了 remote。

### 数据分类标签

每个文件都可以在 frontmatter 里标记敏感等级：

```yaml
---
sensitivity: high    # high / medium / low / public
ai-context: deny     # allow / summary-only / deny
---
```

各目录的默认敏感度：

| 目录 | 默认敏感度 | 默认 AI 上下文 |
|-----------|--------------------|--------------------|
| `me/` | medium | allow |
| `finance/` | high | deny |
| `tasks/` | low | allow |
| `people/` | high | summary-only |
| `content/` | low | allow |
| `decisions/` | medium | allow |
| `references/` | low | allow |

---

## Layer 1：AI 上下文控制（按需开启）

隐私方面最大的风险其实是：**AI 读你文件的时候，内容会被发送到 API 服务商**（比如 Claude Code 走的是 Anthropic）。

### 方案 A：文件级拒绝（最简单，零依赖）

用 Claude Code 自带的 `permissions.deny`，直接禁止 AI 读取敏感文件：

```json
// .claude/settings.json
{
  "permissions": {
    "deny": [
      "Read(./finance/**)",
      "Read(./people/**)",
      "Read(./.env*)",
      "Read(./.loci-secrets/**)"
    ]
  }
}
```

物理层面就读不到，简单粗暴，够用。

### 方案 B：工具网关访问（进阶玩法，推荐）

AI 不能直接读敏感文件，但可以通过一个本地工具间接查询，只拿到脱敏后的结果。

```
Cloud LLM (Claude)
  → "我这个月预算花了多少？"
  → 调用本地工具: query_finance()
  ↓
本地 MCP Server（跑在你自己机器上）
  → 在本地读取 finance/budget.md（不会发到 API）
  → 处理完生成摘要："月预算已用 80%，还剩 20%"
  → 只把摘要返回
  ↓
Cloud LLM 拿到的是: "你已经用了这个月预算的 80%"
  （账号、余额、交易明细？它一个字也没见过）
```

原理很简单：
1. `permissions.deny` 堵死直接读文件的路
2. 本地 MCP server 有权限读敏感文件
3. server 在本地处理完，只返回脱敏结果
4. LLM 拿到了有用的回答，但原始数据它根本没碰过

### 方案 C：本地 LLM 安全代理（最高隐私）

所有敏感数据的操作全部走本地 LLM，Cloud LLM 压根接触不到敏感内容。

```
Cloud LLM (Claude)
  → 检测到敏感查询
  → 调用工具: secure_query()
  ↓
本地 LLM（Mac Mini / 本地机器上跑的 Ollama）
  → 在本地读取加密文件
  → 有完整上下文，在本地处理
  → 返回脱敏结果
  ↓
Cloud LLM 拿到的是: 处理后的安全结果
```

这个方案的好处是两头都占了——Cloud LLM 的聪明劲 + 本地 LLM 的隐私性。你的 Mac Mini（或者别的本地机器）就相当于记忆的"安全飞地"。

要求：
- 一台能跑本地模型的机器（比如 48GB 内存的 Mac Mini）
- Ollama 或其他本地 LLM 运行时
- Loci 的安全代理 MCP server（计划 v2 发布）

---

## Layer 2：静态加密（按需开启）

主要防的是设备丢了或被偷的情况。

### 方案 A：加密磁盘映像（推荐，最省事）

```bash
# macOS
hdiutil create -size 2g -encryption AES-256 -fs APFS \
  -volname "LociVault" ~/loci-vault.dmg

# 用 Loci 的时候挂载
hdiutil attach ~/loci-vault.dmg
# Loci 数据放在加密卷里

# 合盖或关机自动锁定
```

- 零依赖（macOS 自带功能）
- AI 工具完全无感（挂载之后就是普通文件夹）
- 笔记本关机或者被偷了，数据是锁住的

### 方案 B：文件级加密（更细粒度）

用 `age`（一个单文件二进制，无依赖）：

```bash
# 加密敏感文件
age -p finance/assets.md > finance/assets.md.age

# 需要时临时解密（输出到 stdout，不落盘）
age -d finance/assets.md.age
```

Git 只跟踪 `.age` 文件——存的时候是密文，用的时候再解。

---

## Layer 3：高威胁模式（给记者、社会活动人士准备的）

适合那些一个字节都不能离开自己机器的人：

```yaml
# .loci/config.yml
paranoid_mode: true
ai:
  provider: local
  model: llama3.3:70b
  remote_api: disabled
sync:
  method: local_only    # 或 Syncthing P2P
  cloud: disabled
encryption:
  method: vault
  auto_lock: 5m
```

- 所有 AI 处理在本地跑（Ollama）
- 没有任何数据出你的机器
- 全盘加密 + 加密保险库
- 文档写得很清楚，但不是默认配置

---

## 跟其他工具比一下

| 功能 | Loci | ChatGPT Memory | Mem0 | Cursor |
|---------|------|----------------|------|--------|
| 数据在本地 | 是（默认） | 否（OpenAI 服务器） | 否（走它的 API） | 部分 |
| 静态加密 | 可选（保险库） | 没法控制 | 没法控制 | 否 |
| AI 上下文过滤 | 有（deny + 工具网关） | 没有 | 没有 | 没有 |
| 敏感度标签 | 有（frontmatter） | 没有 | 没有 | 没有 |
| 本地 LLM 支持 | 有（Ollama） | 没有 | 没有 | 没有 |
| 可迁移/导出 | 直接复制文件夹 | 不行 | 不行 | 不行 |
| 开源 | 是 | 否 | 部分 | 否 |

---

## Loci 不做的事

- **默认不加密**——好用优先，安全你自己按需开
- **不拦 AI API 传输**，除非你配了 `permissions.deny` 或者用本地 LLM
- **不保证零数据残留**——这取决于你用的 AI 服务商的隐私政策
- **不替代全盘加密**——FileVault / LUKS 该开还是得开

---

## 快速上手

### "基本保护就够了"（0 分钟）

1. 已经搞定了。安装程序自动断开了模板仓库的 remote——你的数据不会跑到公开仓库去。推到自己的私有仓库就更稳了。

### "我想控制 AI 能看哪些文件"（5 分钟）

1. 在 `.claude/settings.json` 里加 `permissions.deny` 规则
2. 给敏感文件的 frontmatter 加上 `sensitivity: high` 和 `ai-context: deny`
3. 搞定。AI 读不到你的敏感文件了。

### "我要加密"（10 分钟）

1. 建一个加密磁盘映像
2. 把 Loci 数据目录挪进去
3. 搞定。电脑丢了 = 一个加密数据块，不是你的人生档案。

### "我要最高级别隐私"（30 分钟）

1. 装 Ollama + 本地模型
2. 配置里设 `paranoid_mode: true`
3. 关掉所有远程 API
4. 参考上面 Layer 3 的文档
