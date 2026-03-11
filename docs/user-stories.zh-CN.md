# 用户故事 — Loci 用起来是什么感觉

> 真实场景，展示 Loci 在日常中的样子。没有配置指南，没有技术细节——只有体验。

---

## "它知道我什么时候醒来"

> Dev，后端工程师，多伦多

Dev 晚上 9 点提交了支付重试逻辑的修复，然后合上了电脑。第二天早上 8:30，他打开终端：

```
> morning

  早上好，Dev。昨天你修了支付重试的 bug——指数退避在
  部分失败时会重置。好眼力。

  今天的计划：
  - P0: 把重试修复部署到 staging + 跑负载测试套件
  - P1: 下午 2 点 API 评审会（你说想提上周发现的
    限流问题）
  - P2: 开始梳理 webhook 重构方案

  负载测试套件上周超时失败了 3 次。
  要不要在跑之前先调大超时配置？
```

不用再问"你在做什么？"不用重新解释上下文。它知道代码、bug、会议——并且把它们串起来。

---

## "它叫我停下来"

> Dev，后端工程师，深夜

Dev 正沉浸在一个数据迁移脚本里。夜越来越深。晚上 10:45：

```
> this foreign key constraint keeps failing on the legacy data

  旧数据的 user_id 有 NULL 值——那些记录早于 2024 年的
  schema 变更。给迁移查询加个 WHERE 子句，然后单独回填
  NULL 值。

  另外——快 11 点了。要我保存你的进度，
  明天接着弄吗？
```

他继续干。晚上 11:40：

```
> ok now the backfill script is throwing a deadlock

  你已经在这个迁移上花了 4 小时了。死锁大概是因为
  回填时你在原地更新。但说实话——明天精神好的时候
  20 分钟就能解决。

  要我保存当前进度吗？明天你从这里接着来：
  迁移脚本完成，回填脚本需要批量处理来避免死锁。
```

它不说教。先帮忙，再轻推一下。而当他选择继续时，它尊重他的决定。

---

## "它从我离开的地方接着来"

> Amara，开发者，拉各斯

Amara 上午花了一上午重新设计应用处理用户上传的方式。她想通了方案——在客户端压缩图片后再发送到服务器——但还没开始写代码。午餐时间。

下午 2:15 她回来了：

```
> continue

  欢迎回来。你在解决上传慢的问题。
  方案是：上传前在客户端压缩图片
  （你今早测过了——4MB 的照片能压到约 800KB）。

  你刚要在上传表单里加上压缩步骤。
  文件是 src/components/UploadForm.tsx，第 32 行。
  准备好了吗？
```

不是"我们刚才在做什么？"——它知道确切的文件、确切的问题、以及她选择的确切方案。

---

## "它规划我的白天，回顾我的夜晚"

> Sasha，独立开发者，柏林

Sasha 醒来，打开终端：

```
> morning

  早上好，Sasha。目前情况如下：

  - P0: 移动端的 auth token 刷新还没修好
    （你昨天卡在这了——问题是 secure storage
    在 Android 上行为不一致）
  - P1: 周四客户演示。Dashboard 能加载，但图表组件
    在大数据集下会崩溃
  - P2: 你提过想试试新的 API 框架
    ——已存到 someday 列表

  提醒：Android 存储的问题可能和你两周前在
  副项目里遇到的是同一个 bug。要我调出来看看
  你当时怎么解决的吗？
```

当晚 11 点：

```
> done for today

  不错的一天。你修好了 auth 刷新（副项目里的
  Android 修复方案管用了），也修了图表崩溃。

  明天的优先级：
  - P0: 准备周四的客户演示（跑一遍完整流程）
  - P1: 把 auth 修复写个文档——一个月后你会忘掉
    它为什么管用的

  一天干掉两个阻塞项，干得漂亮。
```

---

## "它跨项目记忆"

> Kai，同时做 3 个项目的开发者，首尔

周一，Kai 花了 2 小时调试 API 项目的 CORS 问题。他终于搞清楚了正确的配置——指定具体 origin、credentials 模式、preflight 缓存：

```
> finally got CORS working. The issue was that wildcard origins
  don't work with credentials. Had to list specific origins and
  add caching to avoid preflight on every request.

  记下了——已保存你的 CORS 方案和完整上下文。
```

周四，他在给客户项目搭建另一个 API：

```
> I need to add CORS headers to this API

  你周一在个人项目里解决了一个棘手的 CORS 问题。
  关键发现：使用 credentials 时通配符 origin 会失效，
  还需要缓存来避免每次请求都做 preflight。

  要我把同样的配置用在这里吗？设置几乎一模一样。
```

他从没提过另一个项目。他花了 2 小时学到的经验自动迁移过来了。

---

## "它发现了我没注意到的规律"

> Priya，创业公司 CTO，班加罗尔

Priya 整周都在做技术决策。周五早上，周报自动生成：

```
  本周洞察：你这周做了 6 个架构决策。
  其中 5 个用简单性换取可靠性——你选择了
  更简单的方案，即使"聪明"的方案理论性能更好。

  规律：你在优化可维护性而非速度。
  也许值得把这个明确写成工程原则，
  这样你的团队也能遵循同样的思路。

  另外："评估监控工具"已经在你的列表上待了
  11 天了。你的 staging 环境这周出了 3 次故障，
  没有任何告警。这件事正在变得紧急。
```

她没有主动要求这些。Loci 从一周散落的决策中注意到了规律，并在合适的时机提了出来。

---

## "它记得我读过的东西"

> Tomas，开发者，墨西哥城

Tomas 在做别的事情时读了一篇比较 Python Web 框架的博客。他随口提了一句：

```
> interesting post — apparently FastAPI is 3x faster than Flask
  for the kind of endpoints we're building. save this:
  https://example.com/python-framework-benchmarks

  已保存——FastAPI vs Flask 在 API 密集型项目中的基准测试。
```

三周后，他要开始一个新的 Python 项目：

```
> I need to build an API for this. Flask or Django?

  你 3 周前保存过一篇比较 Python 框架的文章。
  关键发现：对于像这样的 API 密集型项目，
  FastAPI 比 Flask 快 3 倍。

  也许值得考虑用 FastAPI 而不是 Flask 或 Django。
  要我调出完整文章吗？
```

他完全忘了保存过那篇文章。但那正是能让他避免选错框架的关键信息。

---

## "它帮我把遗忘的点串起来"

> Kai，开发者，首尔

上个月 Kai 花了两天搞清楚为什么他的应用首次加载特别慢。结果是首页一次性加载了所有图片，而不是只加载屏幕可见区域的。他用懒加载修好了。这周，他开始做一个新应用：

```
> I'm building a photo gallery page. Lots of images.

  提醒——你上个月花了 2 天修另一个项目的页面加载慢
  问题。原因是一次性加载了所有图片，而不是在用户滚动
  时懒加载。

  这个图片墙建议：从一开始就设置懒加载，
  这样就不会碰到同样的问题。要我展示上次有效的
  方案吗？
```

他压根没想到旧项目。但他当时经历的痛苦正是这次需要的经验——Loci 在他重蹈覆辙之前就把两者串了起来。

---

## "三周过去了，它还记得第一天"

> Lin，开发者，台北

Lin 在同一个项目上连续做了三周——公司管理后台的完全重写。第一天，她和 AI 花了一个小时决定技术栈和页面结构。从那以后，她重启了终端无数次。上下文丢失又恢复，反反复复。

第 18 天：

```
> I'm building the reports page. Should I use the same layout
  as the other pages?

  第一天你决定了所有详情页用两栏布局（侧边栏 + 内容），
  列表页用单栏全宽表格。报表是列表类型的，
  所以用全宽表格——和用户页、订单页保持一致。

  你还提到过侧边栏只在查看单条记录时出现。
  这里也按同样的规则来吗？
```

她已经重置上下文十几次了。她自己都记不清第一天定的方案。但她的 AI 从未忘记。

---

## "我可以按自己的方式配置它"

Loci 的健康关怀功能默认开启，但完全可配置：

```yaml
# .loci/config.yml
wellbeing:
  enabled: true
  wind_down_time: "23:00"    # 夜猫子？往后调
  wake_up_time: "06:00"      # 早起鸟？往前调
  max_reminders: 2           # 每晚最多提醒几次，之后不再打扰
```

或者完全关闭：

```yaml
wellbeing:
  enabled: false
```

---

## "上下文满了？没问题。"

> Jake，开发者，正在一个长会话中

Jake 和 AI 连续工作了 3 个小时。上下文窗口快满了。AI 开始重复自己、忘记之前的决策。

没有 Loci 的话，他得关掉终端，开个新的，然后花 10 分钟重新解释一切。

有了 Loci：

```
> save everything before I restart

  搞定——已同步 3 个决策、2 个任务和今天的进度
  到你的 brain。随时可以关终端。

（Jake 打开了新终端）

> hey, picking up where I left off

  欢迎回来。你在调试 webhook handler 为什么在高负载下
  丢事件。你定位到了 async queue——当 payload 超过
  256KB 时会失败。你正要加 payload 分片。继续吗？
```

10 秒恢复完整上下文。不用重新解释。AI 读取你的 brain 文件，精确知道你刚才在哪里。

---

## "它就是用 Markdown"

Loci 存储的一切都是 git 仓库里的纯 Markdown 文件：

```
my-brain/
├── me/identity.md          <- 你是谁
├── plan.md                 <- 你的目标
├── tasks/active.md         <- 你在做什么
├── decisions/              <- 你为什么选了 X 而不是 Y
└── .loci/                  <- 系统内部文件
```

`git diff` 展示你的 AI 今天学到了什么。`git log` 是你的记忆时间线。没有数据库，没有服务器，没有账号。
