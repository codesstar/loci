# 隐私与数据保护

## 理念

**默认：便捷。可选：安全。**

Loci 存储你的整个生活上下文——身份、目标、财务、人脉、决策。这些数据是敏感的。但如果强制每个用户都加密，会严重影响使用体验。因此 Loci 采用分层策略：基础保护自动生效，高级保护按需启用。

> 权衡是明确的：更多隐私 = 更多摩擦。你来选择自己想要的平衡点。

---

## Layer 0：结构性安全（默认，零配置）

每个 Loci 用户自动获得以下保护，无需任何设置。

### Git 远程仓库断开

在安装过程中（无论是 `install.sh` 还是对话式引导），Loci 会自动断开与公开模板仓库的连接。这可以防止个人数据被意外推送到公开仓库。

如果你想备份自己的 brain，请推送到一个**私有**远程仓库——因为只有你有访问权限，数据是安全的。

> **重要提示**：请 clone，不要 fork。如果你 fork 了，你的 fork 是公开的。请立即将其设为私有。

### .gitignore

已预配置为排除系统状态文件（`.loci/status.yml`、`.loci/activity-log.md`、`.loci/last-consolidation.txt`、`.loci/dashboard/data.json`）和编辑器/操作系统生成的文件。你的内容文件（`me/`、`tasks/`、`decisions/` 等）**会被 git 跟踪**——这是有意为之的，这样你就能通过 `git log` 获得完整的记忆版本历史。

由于安装时已断开模板远程仓库，被跟踪的文件会保留在本地，除非你主动添加自己的远程仓库。

### 数据分类标签

每个文件都可以在 frontmatter 中标注敏感度元数据：

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

## Layer 1：AI 上下文控制（按需启用）

最大的隐私隐患是：**当 AI 读取你的文件时，内容会被发送到 API 提供商**（例如 Claude Code 使用的 Anthropic）。

### 方案 A：文件级拒绝（零依赖）

使用 Claude Code 内置的 `permissions.deny` 来阻止 AI 读取敏感文件：

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

AI 在物理层面无法读取这些文件。简单、有效、零依赖。

### 方案 B：工具网关访问（推荐进阶用户使用）

AI 不能直接读取敏感文件，但可以调用一个本地工具来处理数据，只返回必要的信息。

```
Cloud LLM (Claude)
  → "我的预算情况如何？"
  → 调用本地工具: query_finance()
  ↓
本地 MCP Server（在你的机器上运行）
  → 在本地读取 finance/budget.md（永远不会发送到 API）
  → 处理后生成："月预算已使用 80%，剩余 20%"
  → 只返回摘要
  ↓
Cloud LLM 收到: "你已使用了每月预算的 80%"
  （从未看到：账号、余额、交易明细）
```

工作原理：
1. `permissions.deny` 阻止直接文件访问
2. 本地 MCP server 拥有敏感文件的读取权限
3. 服务器在本地处理查询，只返回脱敏结果
4. LLM 获得有用的回答，但看不到原始敏感数据

### 方案 C：本地 LLM 安全代理（最高隐私）

将所有敏感数据操作通过本地 LLM 路由。Cloud LLM 完全不接触敏感内容。

```
Cloud LLM (Claude)
  → 检测到敏感查询
  → 调用工具: secure_query()
  ↓
本地 LLM（Mac Mini / 本地机器上的 Ollama）
  → 在本地读取加密文件
  → 拥有完整上下文进行处理
  → 返回脱敏结果
  ↓
Cloud LLM 收到: 处理后的安全结果
```

这让你同时拥有 Cloud LLM 的智能和本地 LLM 的隐私。你的 Mac Mini（或任何本地机器）充当记忆的"安全飞地"。

要求：
- 一台能运行本地 LLM 的机器（例如 48GB RAM 的 Mac Mini）
- Ollama 或类似的本地 LLM 运行时
- Loci 的安全代理 MCP server（计划在 v2 发布）

---

## Layer 2：静态加密（按需启用）

防范设备被盗或丢失的场景。

### 方案 A：加密磁盘映像（推荐——最简单）

```bash
# macOS
hdiutil create -size 2g -encryption AES-256 -fs APFS \
  -volname "LociVault" ~/loci-vault.dmg

# 使用 Loci 时挂载
hdiutil attach ~/loci-vault.dmg
# 你的 Loci 数据存放在加密卷中

# 合盖或关机时自动锁定
```

- 零依赖（macOS 原生功能）
- 对 AI 工具完全透明（挂载后就是普通文件）
- 笔记本关机或被盗时处于锁定状态

### 方案 B：文件级加密（进阶）

使用 `age`（单个二进制文件，无依赖）：

```bash
# 加密敏感文件
age -p finance/assets.md > finance/assets.md.age

# 需要时临时解密（输出到 stdout，永远不写入磁盘）
age -d finance/assets.md.age
```

Git 只跟踪 `.age` 文件——静态加密，按需解密。

---

## Layer 3：高威胁模式（记者、社会活动人士）

适用于不能让任何数据离开自己机器的用户：

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

- 所有 AI 处理在本地完成（Ollama）
- 没有任何数据离开你的机器
- 全盘加密 + 加密保险库
- 有完整文档说明，但不是默认方案

---

## 与其他工具的对比

| 功能 | Loci | ChatGPT Memory | Mem0 | Cursor |
|---------|------|----------------|------|--------|
| 数据保留在本地 | 是（默认） | 否（OpenAI 服务器） | 否（其 API） | 部分 |
| 静态加密 | 可选（保险库） | 无法控制 | 无法控制 | 否 |
| AI 上下文过滤 | 是（deny + 工具） | 否 | 否 | 否 |
| 敏感度标签 | 是（frontmatter） | 否 | 否 | 否 |
| 本地 LLM 支持 | 是（Ollama） | 否 | 否 | 否 |
| 可迁移/可导出 | 是（复制文件夹即可） | 否 | 否 | 否 |
| 开源 | 是 | 否 | 部分 | 否 |

---

## Loci 不做的事

- **默认不加密**——便捷优先，安全按需启用
- **不阻止 AI API 传输**，除非你配置了 `permissions.deny` 或使用本地 LLM
- **不保证零数据留存**——这取决于你的 AI 提供商的隐私政策
- **不替代全盘加密**——请使用 FileVault / LUKS 作为基础防线

---

## 快速设置指南

### "我只要基本保护就行"（0 分钟）

1. 已经完成了。安装程序已断开模板远程仓库——你的数据不会意外泄露到公开仓库。如果你推送到自己的私有远程仓库，所有文件都可以安全跟踪。

### "我想控制 AI 的访问范围"（5 分钟）

1. 在 `.claude/settings.json` 中添加 `permissions.deny` 规则
2. 在敏感文件的 frontmatter 中标注 `sensitivity: high` 和 `ai-context: deny`
3. 完成。AI 无法读取你的敏感文件。

### "我想要加密"（10 分钟）

1. 创建一个加密磁盘映像
2. 将你的 Loci 数据目录移入其中
3. 完成。设备被盗 = 一个加密数据块，而不是你的人生故事。

### "我需要最高级别的隐私"（30 分钟）

1. 安装 Ollama + 本地模型
2. 在配置中设置 `paranoid_mode: true`
3. 禁用所有远程 API 访问
4. 参考上方 Layer 3 文档
