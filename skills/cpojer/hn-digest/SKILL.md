---
name: hn-digest
description: "按需获取并发送 Hacker News 首页帖子。当用户询问 HN、说 'hn'、'pull HN'、'hn 10' 或指定主题（如 'hn health'、'hn hacking' 或 'hn tech'）时使用。发送 N 条（默认 5 条）帖子作为单独消息，包含标题和链接。不包含加密货币内容。"
---

# HN 文摘

## 命令格式

将用户以 `hn` 开头的消息解释为 Hacker News 首页文摘请求。

支持的形式：

- `hn` → 默认 5 条帖子
- `hn <n>` → n 条帖子
- `hn <主题>` → 按主题筛选/提升
- `hn <n> <主题>` → 两者都包含
- 如果用户在已经看到一些后要求"更多"（例如"显示我们之前做了 top 10 后的 top 10-15"），将其视为偏移请求并使用 `--offset`（例如偏移 10，计数 10）。

主题：

- `tech`（默认）
- `health`
- `hacking`
- `life` / `lifehacks`

## 输出要求

- **不要** 发送任何额外的评论/前言/结语。
- 将结果作为**单独消息**发送。
- 每条帖子消息必须恰好是：
  - 第一行：帖子标题
  - 第二行：`<时间> · <评论数> 条评论`（时间如 `45分钟前`、`6小时前`、`3天前`）
  - 第三行：Hacker News 评论链接（`https://news.ycombinator.com/item?id=...`）
- 在帖子消息之后，发送**最后一条消息**即生成的图片。
  - 如果聊天提供商需要媒体有非空文本，使用最小标题 `.`。
- 硬性排除加密货币。

## 流程

1. 从用户消息中解析 `n` 和 `topic`。
2. 获取并排序项目：
   - 运行 `node skills/hn-digest/scripts/hn.mjs --count <n> --offset <offset> --topic <topic> --format json`。
   - 默认 `offset` 为 0，除非用户在上一批后明确要求"更多/下一个"。
3. 按要求的 3 行格式发送 **N 条单独消息**。
4. 然后通过 Nano Banana 生成**精美的氛围图片**，灵感来自您刚发送的帖子：
   - 使用 `skills/hn-digest/scripts/mood_prompt.mjs` 从 JSON 项目构建提示。
   - 添加 3-4 个从帖子主题衍生的微妙彩蛋（无文字/徽标；保持趣味性）。
   - 通过运行以下命令生成并附加图片：
     - `skills/hn-digest/scripts/generate_mood_nano_banana.sh ./tmp/hn-mood/hn-mood.png <topic> <n> <offset>`
   - 将生成的图片作为一条额外消息发送。

如果获取/排序失败或返回 0 个项目：
- 在浏览器工具中使用 `https://news.ycombinator.com/`，通过判断选择 N 个非加密货币项目，并按相同的 3 行格式发送。
- 仍然生成氛围图片（通用的"HN 技术深度"氛围）并带有香蕉彩蛋。
