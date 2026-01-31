---
name: xkcd
description: 获取 xkcd 漫画 - 最新、随机、按编号搜索，或按关键词搜索漫画。显示漫画的标题、图片和 alt 文本（隐藏的笑话）。使用图像生成功能创建自定义风格的 xkcd 简笔画漫画。非常适合通过 cron 每日自动发送漫画、按需请求查询，或创建原创的 xkcd 风格内容。
homepage: https://xkcd.com
metadata: {"clawdbot":{"emoji":"📊","requires":{"bins":["uv"]}}}
---

# xkcd 漫画获取器

从 xkcd.com 获取漫画，或生成 xkcd 风格的图像。

## 命令

### 获取最新漫画
```bash
uv run {baseDir}/scripts/xkcd.py
```

### 获取随机漫画
```bash
uv run {baseDir}/scripts/xkcd.py --random
```

### 获取指定编号的漫画
```bash
uv run {baseDir}/scripts/xkcd.py 327         # Bobby Tables 妈妈的笑料
uv run {baseDir}/scripts/xkcd.py 353         # Python
uv run {baseDir}/scripts/xkcd.py 1053        # 一万
```

### 按关键词搜索
```bash
uv run {baseDir}/scripts/xkcd.py --search "python"
uv run {baseDir}/scripts/xkcd.py --search "space" --limit 3
```

### JSON 格式输出
```bash
uv run {baseDir}/scripts/xkcd.py --format json
uv run {baseDir}/scripts/xkcd.py --random --format json
```

## 输出格式

默认的 Markdown 输出包含以下内容：
- **标题**：带编号的漫画标题
- **图片**：直接图片链接
- **Alt 文本**：鼠标悬停显示的隐藏文本（通常是最有趣的部分！）
- **链接**：到 xkcd.com 的永久链接

## 生成自定义 xkcd 风格漫画

使用图像生成技能（例如 nano-banana-pro），按以下模式提供提示词：

```
Create an xkcd-style comic: [您的场景描述]

风格：简单的黑白简笔画，手绘颤抖线条，
极简背景，干净白色背景，连环漫画面板布局
```

提示词示例：
```
Create an xkcd-style comic: Two programmers at computers. First says
"I spent 6 hours automating a task." Second: "How long did the task take?"
First: "5 minutes." Second: "How often do you do it?" First: "Once a year."
```

翻译成中文提示词：
```
创建一幅 xkcd 风格的漫画：两个程序员在电脑前。第一个说
"我花了 6 个小时自动化一个任务。"第二个问："这个任务花了多长时间？"
第一个回答："5 分钟。"第二个问："你多久做一次？"第一个说："一年一次。"
```

## Cron 定时任务示例

```bash
# 每天上午 9 点获取最新漫画并通过 Telegram 发送
cron add --schedule "0 9 * * *" --task "获取最新 xkcd 漫画并通过 Telegram 发送"

# 每周一上午 10 点获取随机经典漫画并分享
cron add --schedule "0 10 * * 1" --task "获取随机 xkcd 漫画并分享"
```

## 经典漫画推荐

- **#327** "妈妈的冒险" — Bobby Tables / SQL 注入
- **#353** "Python" — import antigravity（引入反重力）
- **#303** "编译中" — 剑术决斗，当代码编译时
- **#386** "职责召唤" — 互联网上有人错了
- **#1053** "一万" — 幸运的 10000 学到了新东西
- **#979** "古人的智慧" — 无人回复的论坛帖子
- **#927** "标准" — 标准如何普及

## API 说明

使用官方 [xkcd JSON API](https://xkcd.com/json.html)（无需认证）：
- 最新漫画：`https://xkcd.com/info.0.json`
- 特定漫画：`https://xkcd.com/{num}/info.0.json`

## 搜索功能说明

搜索功能会并发检查最近 200 期漫画，在标题和 alt 文本中匹配关键词。由于需要逐个请求漫画数据，搜索可能需要几秒钟时间。建议使用 `--limit` 参数限制返回结果数量以加快搜索速度。
