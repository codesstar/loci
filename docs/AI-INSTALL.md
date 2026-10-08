# 给 AI 的 Loci 安装与升级指南

你正在协助用户安装 Loci。本文件是唯一安装流程；运行时行为由根目录 `LOCI.md` 和 `LOCI-RULES.md` 定义。按用户语言沟通，执行后根据实际结果报告。不要仅回复安装教程。

## 1. 检查环境与已有安装

- 需要 Node.js 18+、Git，以及能读写本地文件和执行命令的 Agent。用 `node --version`、`git --version` 检查。缺少运行环境时说明具体缺项，按用户授权安装依赖；不能声称纯网页聊天也能访问用户磁盘。
- 读取用户主目录下 `.loci/brain-path`（如果存在），检查指向的大脑。先区分用户要**新装、仅连接新 Agent、还是升级**：已有可用大脑且只新增 Agent 时走第3节，不默认下载、升级或重建；用户要升级或旧版本缺少必要文件时，再按第4节处理。路径冲突或多个大脑时先辨认，不静默切换。
- 主目录、临时目录和目标路径由当前系统确定；所有示例占位符都须替换。不要假设 Windows 有 Bash，不要把含空格或特殊字符的路径/用户文本拼进未经转义的 Shell 命令。优先用参数数组调用进程。
- 默认新大脑目录为用户主目录下 `loci`。目标非空且不是刚下载的 Loci 时停止覆盖，选择空目录或明确已有安装的用途。可直接使用已知称呼和语言，不必进行个人信息问卷。

## 2. 下载与新装

官方仓库：`https://github.com/codesstar/loci.git`。把仓库完整克隆到选定的空目录：

```text
git clone --depth 1 https://github.com/codesstar/loci.git <brain-path>
node <brain-path>/scripts/loci-install.js --brain <brain-path> --connect auto --lang zh
```

`--connect auto` 仅接入主目录中已存在配置目录的 Claude Code、Codex、WorkBuddy。明确接入可用 `--connect claude,codex,workbuddy`，单个名称也可；`--connect none` 仅准备大脑。可选 `--name`、`--role`、`--focus`、`--about`、`--lang zh|en|mix`，不要替用户编造资料。

安装器会：初始化仍为空或标记为模板的个人文件；将 `LOCI.md` 替换大脑路径后合并到原生指令入口；登记大脑路径；可用时配置 Hook。它保留入口标记区外的用户内容，备份被修改的文件。重复安装保留已经启用的个人资料和数据；`--force` 只是旧参数兼容，不会重置数据。

**不需要 npm/npx，不需要安装 npm 包。** Node.js 是运行脚本和本地 Dashboard 的运行环境。

## 3. 接入不同 Agent

**大脑装一份，Agent 分别接入。** 已经连接 Claude Code/Codex，后来新装千问、豆包等，按 [已有大脑接入指南](connect-existing-brain.md) 操作；其中有给原 Agent、给新 Agent 的可复制指令，以及新会话验收方法。

对当前版本已有大脑，只刷新一个现成适配入口，例如新增 WorkBuddy：

```text
node "<existing-brain-path>/scripts/loci-install.js" --brain "<existing-brain-path>" --connect workbuddy --refresh
node "<existing-brain-path>/scripts/loci-install.js" --brain "<existing-brain-path>" --connect workbuddy --check
```

`--refresh` 跳过初始资料/空数据池准备，但会刷新托管入口和配置；检查返回的备份与警告。它不下载新版本。发现旧版缺文件时说明需要升级，不强行覆盖。自动适配器只接受下表前三个名称，不支持 `--connect qwen` 或 `--connect doubao`。

| 客户端 | 本版本接入入口 | 验证要求 |
| --- | --- | --- |
| Claude Code | `~/.claude/CLAUDE.md`，可选 SessionStart Hook | 新会话验证偏好、手册读取、写入工具权限 |
| Codex | `~/.codex/AGENTS.md`，安装器提供 Hook 配置 | Hook 是否执行取决于客户端版本与功能支持；无 Hook 时用同一入口的读取后备路径 |
| WorkBuddy | `~/.workbuddy/MEMORY.md` | 验证当前版本实际加载该入口；不承诺原生 Hook |
| 千问办公国内桌面版 | 官方文档提供“意识 → 工作手册（AGENTS.md）”；从应用确认实际位置后手动合并 | [具体步骤和依据](connect-existing-brain.md#千问办公国内桌面版通过已核实的工作手册入口)；不属于当前自动适配器，仍需本地访问和新会话实测 |
| 豆包工作及其他客户端 | 先核实该版本的自定义指令、项目规则或技能入口 | 不猜配置文件路径、不写入任意位置；必须具备本地文件和命令能力；只有会话粘贴时明确属于临时接入 |

其他客户端：把 `<brain-path>/LOCI.md` 中 `<brain-path>` 替换为实际绝对路径，将该短入口放进**已核实会加载的指令位置**；保留详细手册在大脑内。若只能手动粘贴指令，给用户生成完整、可复制的一段。若客户端不能访问本地文件/运行 Node，说明当前未接通，不声称适配完成。

只有 Hook 输出中包含有效的启动地图时才复用；没有 Hook 就按入口调用同一个 `scripts/loci-context.js`。Hook 和后备读取不得维护两套偏好或业务规则。

## 4. 升级已有大脑

不要在含个人数据的大脑里执行 `git reset --hard`、覆盖整个目录或重新初始化。先将官方最新仓库下载到另一个临时目录，然后**运行新下载版本的升级器**：

```text
git clone --depth 1 https://github.com/codesstar/loci.git <release-temp-path>
node <release-temp-path>/scripts/loci-update.js --source <release-temp-path> --brain <existing-brain-path> --connect auto
```

升级器仅复制清单管理的程序、模板和文档，迁移根入口和全局指令，刷新已索引项目的 Loci 标记区。个人任务、日程、人物、偏好、笔记等数据不在下载覆盖范围。`persistence.mode` 退出使用：明确的持久信号按统一规则保存；敏感/含糊内容仍先确认，用户明确“不记”仍服从。原 manual 用户会收到迁移提示。

记录返回的 `backup` 路径。已定制且无法识别的旧根规则、损坏的入口标记或符号链接冲突会阻止升级，并恢复已经修改的文件。此时先检查备份和实际冲突，合并用户规则后重试，不能绕过保护直接覆盖。

可预检：`node <release-temp-path>/scripts/loci-update.js --source <release-temp-path> --brain <existing-brain-path> --check`。

需要撤销本次更新时：

```text
node <release-temp-path>/scripts/loci-update.js --rollback <exact-backup-directory>
```

回滚先检查更新后文件是否又被修改；有新改动则拒绝覆盖，人工合并。备份可能含私人配置，不上传 GitHub。安装和升级过程中关闭其他正在修改大脑的 Agent；Dashboard 使用旧进程时重启后才加载新代码。

## 5. 验收后再报告成功

1. 执行 `node <brain-path>/scripts/loci-install.js --brain <brain-path> --connect <实际接入名称> --check`，检查 `ok`、路径、入口；`none` 仅验证大脑文件，不代表有客户端接通。
2. 执行 `node <brain-path>/scripts/loci-context.js <brain-path>`，确认偏好和路径正确，输出没有完整任务池或历史。不要把私人偏好发到公共渠道。
3. 在用户所用客户端开启新会话，让它“告诉我连接的大脑在哪里，读取 Loci 操作手册，然后列出已有任务，不新增数据”。确认使用了正确文件/工具；文件检查通过不等于模型一定执行规则。用户未授权新测试任务时不添加测试数据。
4. 如需要 Dashboard：`node <brain-path>/.loci/dashboard/server.js`，访问 `http://localhost:8765`。保留服务运行；提醒需要通知通道和设备权限，保存不等于送达。
5. 简短报告：大脑位置、实际接入客户端、检查结果、Hook 警告、是否还需新会话验收。不能把“配置已写入”说成“所有 Agent 均已实测”。

## 给维护者的隔离测试

安装器支持 `--home <temporary-home>`；所有测试使用临时大脑和临时 home，不触碰维护者真实配置。入口测试：`node --test tests/*.test.js`。`setup.sh` / `update.sh` 只是旧命令的 Node 包装，不再各维护一套安装逻辑。
