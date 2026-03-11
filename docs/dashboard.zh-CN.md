# Dashboard — Web 可视化面板

## 概述

Loci 内置了一个像素风格的 Web Dashboard，用于可视化你的 Memory Palace 数据。它是一个单 HTML 文件，基于 Vue 3 和 Tailwind CSS（均从 CDN 加载），无需任何构建步骤。

## 工作原理

1. `build.py` 扫描所有 Markdown 文件
2. 解析 YAML frontmatter 和 Markdown 内容
3. 将所有内容输出为 `data.json`
4. `index.html` 读取 `data.json` 并渲染 Dashboard

## 使用方法

```bash
# 生成数据
cd .loci/dashboard
python3 build.py

# 在浏览器中打开
open index.html

# 或本地启动服务
python3 -m http.server 8765
# 访问 http://localhost:8765
```

## Dashboard 页面

1. **Home** — 年度目标进度、待处理 inbox 项、活跃任务、今日计划
2. **About Me** — 个人资料和成长时间线
3. **Planning** — 日/月/季度计划，含日历视图
4. **People** — 联系人列表和会议记录
5. **Tasks** — 按优先级分类的任务及完成统计
6. **Decisions** — 决策时间线

## 自定义

### 修改标题和用户名

编辑 `build.py` 顶部的 `CONFIG` 字典：

```python
CONFIG = {
    "title": "My Dashboard",
    "username": "Your Name",
    "description": "My memory palace",
}
```

### 主题

Dashboard 默认使用像素风黑白主题。要自定义颜色，编辑 `index.html` 中的 Tailwind 配置和 CSS 变量。

### 添加新数据源

要给 Dashboard 添加新板块：

1. 在 `build.py` 中添加一个 `build_xxx()` 函数
2. 在 `main()` 中调用它并加入 `data` 字典
3. 在 `index.html` 中添加对应的 Vue 组件

## 自动刷新

CLAUDE.md 会指示 AI 在内容文件被修改时自动运行 `python3 build.py`。这样 Dashboard 就能和你的数据保持同步。

## 依赖

- Python 3.6+（用于 build.py）
- 浏览器（用于 index.html）
- 可选：`pip install markdown`，可获得更好的 HTML 渲染效果（否则回退到基于正则的转换器）
