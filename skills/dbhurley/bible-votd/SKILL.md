---
name: bible
description: 获取 Bible.com 每日经文和可分享的图片。
homepage: https://bible.com
metadata: {"clawdis":{"emoji":"📖","requires":{"bins":["python3"]}}}
---

# Bible.com 每日经文

从 Bible.com (YouVersion) 获取每日经文，包括可分享的图片。

## 快速命令

### 获取每日经文 (JSON)
```bash
python3 ~/clawd/skills/bible/votd.py
```

返回：
```json
{
  "reference": "诗篇 27:4",
  "text": "有一件事，我曾求耶和华，我仍要寻求...",
  "usfm": "PSA.27.4",
  "date": "2026-01-04T21:00:10.178Z",
  "image_url": "https://imageproxy.youversionapi.com/1280x1280/...",
  "attribution": "Bible.com / YouVersion"
}
```

### 获取每日经文并下载图片
```bash
python3 ~/clawd/skills/bible/votd.py --download /tmp/votd.jpg
```

将 1280x1280 的可分享图片下载到指定路径。

## 分享经文

分享每日经文时：
1. 使用 `image_url` 显示或发送预渲染的图片
2. 包含经文引用（例如："诗篇 27:4"）
3. 包含归属信息："Bible.com / YouVersion"

## 图片详情

- 图片为 1280x1280 高质量 JPG 格式
- 预渲染，经文文本覆盖在美丽的背景上
- 非常适合在社交媒体或消息应用中分享

## 注意事项

- 经文每天更新（基于 YouVersion 的时间表）
- 无需 API 密钥 - 抓取公开的 Bible.com 页面
- 分享时请始终注明 Bible.com/YouVersion 的归属
