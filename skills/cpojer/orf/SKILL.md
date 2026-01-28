---
name: orf-digest
description: "按需获取奥地利 ORF 新闻文摘（德语）。当用户说 'orf'、'pull orf' 或 'orf 10' 时使用。聚焦奥地利政治（国内）和国际政治（国外）+ 重大头条；排除体育。每个项目作为单独消息发送（标题 + 时间 + 链接）。然后在卡通 ZiB 演播室中生成 Nano Banana 图片，主持人播报新闻，并基于所选故事添加微妙的彩蛋。"
---

# ORF 文摘 (news.orf.at)

## 命令格式

将用户以 `orf` 开头的消息解释为 ORF 新闻文摘请求。

支持的形式：

- `orf` → 默认 5 条
- `orf <n>` → n 条（最多 15 条）
- `orf inland` / `orf ausland` → 偏重选择
- `orf <n> inland|ausland` → 两者都包含

## 来源和范围

- 主要来源：`news.orf.at`（德语）
- 优先：**国内**政治、**国外**/国际政治和重大头条。
- 排除：体育（Sport）。

## 输出要求

- **不要** 发送任何额外的评论/前言/结语。
- 将结果作为**单独消息**发送。
- 每个项目消息必须恰好是：
  - 第一行：标题（德语）
  - 第二行：`<时间>`（例如 `45分钟前`、`6小时前`、`2天前`）
  - 第三行：ORF 链接
- 在项目消息之后，发送**最后一条消息**即生成的图片。
  - 图片必须在环绕演播室视频墙上直观地整合所拉取的新闻，使用 **4-6 个不同的故事面板**。
  - **面板布局（必须）：**
    - 顶部：大的粗体主题标签（2-3 个词，全部大写）
    - 中部：较小的 3-6 词迷你标题（新闻风格）
    - 底部：恰好 1-2 个简单图标（不要地图，不要繁忙拼贴）
  - **可读性：** 保持文字最小且足够大，以便清晰渲染。
  - 无徽标/水印。
  - 如果聊天提供商需要媒体有非空文本，使用最小标题 `.`。

## 流程

1. 从用户消息中解析 `n` 和可选的 `focus`（`inland`|`ausland`）。
2. 运行 `python3 skills/orf-digest/scripts/orf.py --count <n> --focus <focus> --format json`。
3. 将每个返回的项目作为自己的消息发送（3 行格式）。
4. 通过 Nano Banana 生成 ZiB 演播室氛围图片：
   - 从项目构建提示：`python3 skills/orf-digest/scripts/orf.py --count <n> --focus <focus> --format json | node skills/orf-digest/scripts/zib_prompt.mjs`
   - 生成：`skills/orf-digest/scripts/generate_zib_nano_banana.sh ./tmp/orf-zib/zib.png`
   - 将图片作为最后一条消息发送。

如果获取/解析失败或返回 0 个项目：
- 使用浏览器工具打开 `https://news.orf.at/`，通过判断选择 N 个非体育头条，并按相同的 3 行格式发送。
- 仍然生成 ZiB 演播室图片，并带有一些通用的政治新闻彩蛋。
