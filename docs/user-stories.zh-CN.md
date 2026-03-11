# 用户故事 — Loci 用起来是什么感觉

> 真实场景，展示 Loci 在日常中的样子。不讲配置，不讲技术细节——只讲体验。

---

## "它知道我几点醒"

> Dev，后端工程师，多伦多

Dev 晚上 9 点提交了支付重试逻辑的修复，合上电脑走人。第二天早上 8:30，他打开终端：

```
> morning

  早，Dev。昨天你修了支付重试的 bug——指数退避
  在部分失败的时候会重置计数器，被你逮到了。

  今天的安排：
  - P0: 把重试修复部署到 staging，跑一轮负载测试
  - P1: 下午 2 点 API 评审会（你说想聊聊上周
    发现的限流问题）
  - P2: 开始梳理 webhook 重构方案

  负载测试套件上周超时挂了 3 次。
  要不要先把超时时间调大再跑？
```

不用再解释"我在做什么"，不用重新交代背景。它知道代码、bug、会议——而且能把它们串起来。

---

## "它会叫我别熬了"

> Dev，后端工程师，深夜

Dev 正在死磕一个数据迁移脚本，越写越上头。晚上 10:45：

```
> this foreign key constraint keeps failing on the legacy data

  旧数据里 user_id 有 NULL 值——那些记录是在 2024
  年那次 schema 变更之前的。迁移查询加个 WHERE
  过滤掉，NULL 值的单独回填就行。

  另外——快 11 点了。要我先把进度存下来，
  明天接着搞吗？
```

他没理，继续干。晚上 11:40：

```
> ok now the backfill script is throwing a deadlock

  这个迁移你已经啃了 4 个小时了。死锁大概率是
  因为回填的时候在原地 UPDATE。不过说真的——
  明天脑子清醒的时候，20 分钟就能搞定。

  要我存一下当前进度吗？明天你从这里接：
  迁移脚本写完了，回填脚本需要改成批量处理来
  避免死锁。
```

它不说教。先帮你解决问题，然后轻轻推一把。你选择继续干，它也不会纠缠。

---

## "它从我离开的地方接着来"

> Amara，开发者，拉各斯

Amara 花了一上午研究怎么优化用户上传。她想通了方案——在客户端压缩图片再传到服务器——但代码还没动手。到午饭时间了。

下午 2:15 她回来：

```
> continue

  欢迎回来。你在解决上传慢的问题。
  方案定了：上传前客户端压缩图片
  （今早你测过——4MB 的照片能压到 800KB 左右）。

  你正要在上传表单里加压缩这步。
  文件是 src/components/UploadForm.tsx，第 32 行。
  开搞？
```

不是"咱们刚才在干嘛来着？"——它知道具体哪个文件、什么问题、她选的什么方案。

---

## "它帮我规划早上，回顾晚上"

> Sasha，独立开发者，柏林

Sasha 醒了，打开终端：

```
> morning

  早，Sasha。现在情况是这样的：

  - P0: 移动端的 auth token 刷新还没修好
    （昨天卡在这了——问题是 secure storage
    在 Android 上的行为不一致）
  - P1: 周四要给客户演示。Dashboard 能跑，
    但图表组件碰到大数据集会崩
  - P2: 你之前提过想试试新的 API 框架
    ——已经存到 someday 了

  提个醒：Android 存储这个问题，可能跟你
  两周前在副项目里碰到的是同一个 bug。
  要不要我把当时的解决方案调出来？
```

当晚 11 点：

```
> done for today

  今天挺有效率的。auth 刷新搞定了（副项目里
  那个 Android 的修复方案直接管用），
  图表崩溃也修了。

  明天重点：
  - P0: 准备周四客户演示（完整跑一遍流程）
  - P1: auth 修复写个文档——一个月后你肯定
    忘了它为什么管用

  一天干掉俩阻塞项，效率拉满。
```

---

## "它能跨项目调记忆"

> Kai，同时在搞 3 个项目的开发者，首尔

周一，Kai 花了 2 小时跟 API 项目的 CORS 问题死磕。最后终于摸清楚了——得指定具体 origin、设置 credentials 模式、加 preflight 缓存：

```
> finally got CORS working. The issue was that wildcard origins
  don't work with credentials. Had to list specific origins and
  add caching to avoid preflight on every request.

  记下了，CORS 方案和完整踩坑过程都存好了。
```

周四，他在给客户项目搭另一个 API：

```
> I need to add CORS headers to this API

  你周一在个人项目里踩过一个 CORS 的坑。
  关键点：用 credentials 的时候通配符 origin
  不好使，还得加缓存防止每次请求都走 preflight。

  要不要直接套同样的配置？两边场景几乎一样。
```

他压根没提另一个项目。2 小时摸出来的经验，自动就迁移过来了。

---

## "它能从零散的决策里找到规律"

> Priya，创业公司 CTO，班加罗尔

Priya 整周都在做技术决策。周五早上，周报自动生成了：

```
  本周复盘：你这周做了 6 个架构决策。
  其中 5 个都是在简单性和可靠性之间选了简单——
  即使"聪明"的方案理论性能更好，你还是选了
  更容易维护的。

  这说明你在优化可维护性而不是性能。
  也许值得把这个显式写成工程原则，
  这样团队也能对齐同一个思路。

  另外："评估监控工具"在你的列表上躺了
  11 天了。staging 环境这周挂了 3 次，
  一次告警都没有。这事在变得紧急。
```

她没主动要求这些。Loci 从一周零零散散的决策里观察到了规律，然后在合适的时候提了出来。

---

## "它记得我读过的东西"

> Tomas，开发者，墨西哥城

Tomas 在干别的事的时候看到一篇比较 Python Web 框架的文章，随手存了一下：

```
> interesting post — apparently FastAPI is 3x faster than Flask
  for the kind of endpoints we're building. save this:
  https://example.com/python-framework-benchmarks

  存好了——FastAPI vs Flask 在 API 密集型项目里的性能对比。
```

三周后，他要起一个新的 Python 项目：

```
> I need to build an API for this. Flask or Django?

  你 3 周前存过一篇 Python 框架的对比文章。
  核心结论：API 密集型项目的话，FastAPI
  比 Flask 快 3 倍。

  可以考虑直接用 FastAPI，不一定非得在
  Flask 和 Django 里二选一。
  要不要我把完整文章调出来？
```

他自己都忘了存过这篇文章。但那恰好就是能帮他避免选错框架的关键信息。

---

## "它帮我把忘掉的经验串起来"

> Kai，开发者，首尔

上个月 Kai 花了两天排查为什么应用首次加载特别慢。结果是首页把所有图片一股脑全加载了，而不是只加载屏幕上看得见的。他用懒加载修好了。这周，他开始做一个新应用：

```
> I'm building a photo gallery page. Lots of images.

  提个醒——你上个月花了 2 天排查另一个项目的
  加载慢问题。原因就是一次性加载了所有图片，
  没做懒加载。

  这个图片墙建议一开始就把懒加载加上，
  免得踩同样的坑。要看看上次用的方案吗？
```

他压根没想起旧项目的事。但当时花两天踩出来的教训，正好就是这次需要的经验——Loci 在他重蹈覆辙之前就把两边串起来了。

---

## "三周过去了，它还记得第一天说的"

> Lin，开发者，台北

Lin 在同一个项目上连续干了三周——公司管理后台的完全重写。第一天，她和 AI 花了一个小时敲定技术栈和页面结构。之后她重启了终端无数次，上下文丢了又恢复，反反复复。

第 18 天：

```
> I'm building the reports page. Should I use the same layout
  as the other pages?

  第一天你们定的规则是：详情页用两栏布局
  （侧边栏 + 内容区），列表页用单栏全宽表格。
  报表属于列表类型，所以用全宽表格——
  跟用户页、订单页保持一致。

  你当时还提到侧边栏只在查看单条记录时出现。
  这里也按同样的规则来？
```

她已经重置上下文十几次了，自己都记不清第一天定的什么。但 AI 一条都没忘。

---

## "我能按自己的习惯配"

Loci 的健康关怀功能默认开启，但你完全可以调：

```yaml
# .loci/config.yml
wellbeing:
  enabled: true
  wind_down_time: "23:00"    # 夜猫子往后调
  wake_up_time: "06:00"      # 早起的往前调
  max_reminders: 2           # 每晚最多提醒几次，之后不再烦你
```

或者直接关掉：

```yaml
wellbeing:
  enabled: false
```

---

## "上下文满了？没事。"

> Jake，开发者，长 session 中

Jake 跟 AI 连续工作了 3 个小时，上下文窗口快撑满了。AI 开始翻来覆去说一样的话，之前的决策也记不住了。

没有 Loci 的话，他得关掉终端，重开一个，然后花 10 分钟重新把背景交代一遍。

有 Loci：

```
> save everything before I restart

  搞定——3 个决策、2 个任务和今天的进度
  都同步到 brain 了。随时可以关终端。

（Jake 开了个新终端）

> hey, picking up where I left off

  欢迎回来。你在调 webhook handler
  高负载下丢事件的问题。定位到了 async queue
  ——payload 超过 256KB 就会失败。
  你正要加 payload 分片。继续？
```

10 秒恢复完整上下文。不用重新解释。AI 读一遍 brain 文件就知道你刚才在哪。

---

## "它就是 Markdown"

Loci 存的一切都是 git 仓库里的纯 Markdown 文件：

```
my-brain/
├── me/identity.md          <- 你是谁
├── plan.md                 <- 你的目标
├── tasks/active.md         <- 你在做什么
├── decisions/              <- 你为什么选了 X 而不是 Y
└── .loci/                  <- 系统文件
```

`git diff` 能看 AI 今天学到了什么。`git log` 就是你的记忆时间线。没有数据库，没有服务器，没有账号。
