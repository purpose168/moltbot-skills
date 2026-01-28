---
name: mastodon-publisher
description: 向 Mastodon 发布内容。当需要分享更新、帖子或媒体文件时使用。
author: Behrang Saeedzadeh
version: 1.0.0
triggers:
  - "发布到 mastodon"
metadata: { "clawdbot": { "emoji": "🐘" }, "requires": { "bins": ["node"] } }
---

# Mastodon 发布器

向 Mastodon 发布内容。当需要分享更新、帖子或媒体文件时使用。

## 使用方法

### 向 Mastodon 发布新状态

使用 Bun 向 Mastodon 发布新状态：

```bash
node {baseDir}/scripts/toobot.js new-status \
  --status "状态文本" \
  --visibility "public | private | unlisted | direct" \
  --language "ISO-639-1 代码" --scheduled-at "RFC3339 日期时间" \
  --quote-approval-policy "public | followers | nobody"
```

参数说明

| 名称                      | 描述                              | 类型                                              | 示例                      | 必填 | 默认值    |
| ------------------------- | -------------------------------- | ------------------------------------------------ | ------------------------ | ---- | -------- |
| `--status`                | 状态的文本内容                     | string                                          | "你好，世界"              | 是^1 | N/A      |
| `--visibility`            | 设置发布状态的可见性               | `public` 或 `private` 或 `unlisted` 或 `direct`   | "private"                | 否   | "public" |
| `--language`              | 此状态的 ISO 639-1 语言代码        | ISO-639-1 语言代码                               | "zh"                     | 否   |          |
| `--scheduled-at`          | 计划发布状态的日期时间             | RFC3339 日期时间                                 | "2029-02-03T15:30:45.000Z" | 否   |          |
| `--quote-approval-policy` | 设置谁可以引用此状态               | `public` 或 `followrs` 或 `nobody`                | "nobody"                 | 否   |          |
| `--media-path`            | 附加到状态的媒体文件               | 文件路径                                          | /path/to/foo.mpg         | 否^2 |          |

- ^1 当存在一个或多个 `--media-path` 参数时，可以省略 `--status`
- ^2 如果省略 `--status`，则必须存在一个或多个 `--media-path` 参数

## 示例

- **发布新状态**

  ```bash
  node {baseDir}/scripts/toobot.js new-status --status "你好，世界！"
  ```

  读取输出并为用户总结。

- **发布定时状态**

  ```bash
  node {baseDir}/scripts/toobot.js new-status --status "你好，世界！" --scheduled-at 2030-01-02T14:15:16.000Z
  ```

  读取输出并为用户总结。

- **发布定时状态，包含可见性、语言、引用批准策略和单个媒体附件**

  ```bash
  node {baseDir}/scripts/toobot.js new-status --status "你好，世界！" \
    --scheduled-at 2030-01-02T14:15:16.000Z \
    --visibility private \
    --quote-approval-policy nobody \
    --language en \
    --media-path /path/to/foo.jpg
  ```

  读取输出并为用户总结。

- **发布带有多个媒体附件的新状态**

  ```bash
  node {baseDir}/scripts/toobot.js new-status --status "你好，世界！" --media-path /path/to/foo.jpg --media-path /path/to/bar.jpg
  ```

- **发布带有媒体附件但没有状态文本的新状态**

  ```bash
  bun {baseDir}/scripts/toobot.js new-status --media-path /path/to/media.jpg
  ```

## 注意事项

- 需要安装 `node` 并在 PATH 中可用。