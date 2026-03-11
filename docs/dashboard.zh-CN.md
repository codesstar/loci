# Dashboard — Web 可视化面板

## 简介

Loci 自带一个像素风的 Web Dashboard，用来可视化你的 Memory Palace 数据。就一个 HTML 文件，用了 Vue 3 和 Tailwind CSS（都从 CDN 加载），不需要任何构建步骤。

## 工作原理

1. `build.py` 扫描所有 Markdown 文件
2. 解析 YAML frontmatter 和 Markdown 内容
3. 把所有数据输出到 `data.json`
4. `index.html` 读取 `data.json` 渲染出 Dashboard

## 怎么用

```bash
# 生成数据
cd .loci/dashboard
python3 build.py

# 直接打开
open index.html

# 或者起个本地服务
python3 -m http.server 8765
# 然后访问 http://localhost:8765
```

## 页面说明

1. **Home** — 年度目标进度、待处理 inbox、活跃任务、今日计划
2. **About Me** — 个人资料和成长时间线
3. **Planning** — 日/月/季度计划，带日历视图
4. **People** — 联系人列表和会面记录
5. **Tasks** — 按优先级分类的任务 + 完成统计
6. **Decisions** — 决策时间线

## 自定义

### 改标题和用户名

编辑 `build.py` 顶部的 `CONFIG` 字典：

```python
CONFIG = {
    "title": "My Dashboard",
    "username": "Your Name",
    "description": "My memory palace",
}
```

### 主题

默认是像素风黑白主题。想换颜色的话，改 `index.html` 里的 Tailwind 配置和 CSS 变量就行。

### 加新数据源

想给 Dashboard 加新板块：

1. 在 `build.py` 里写一个 `build_xxx()` 函数
2. 在 `main()` 里调用它，塞进 `data` 字典
3. 在 `index.html` 里加对应的 Vue 组件

## 自动刷新

CLAUDE.md 里有规则让 AI 在内容文件变动时自动跑 `python3 build.py`，这样 Dashboard 就能跟你的数据保持同步。

## 依赖

- Python 3.6+（跑 build.py 用的）
- 浏览器（看 index.html 用的）
- 可选：`pip install markdown`，HTML 渲染效果更好（没装的话会用正则做基础转换）
