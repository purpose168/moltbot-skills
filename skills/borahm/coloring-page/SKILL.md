---
name: coloring-page
description: 将上传的照片转换为可打印的黑白涂色页。
metadata:
  clawdbot:
    config:
      requiredEnv:
        - GEMINI_API_KEY
---

# coloring-page

从照片创建可打印的黑白轮廓涂色页。

此技能设计为对话式使用：
- 您上传一张图片
- 您说："创建涂色页"
- 助手运行此技能并返回生成的 PNG 图片

底层使用 Nano Banana Pro（Gemini 3 Pro Image）图像模型。

## 环境要求

- 设置 `GEMINI_API_KEY`（建议放在 `~/.clawdbot/.env` 中）
- 可用 `uv`（底层 nano-banana-pro 技能使用）

## 助手如何使用此技能

当用户消息包含：
- 附加的图片（jpg/png/webp）
- 用户要求"涂色页"

运行：
- `bin/coloring-page --in <上传图片路径> [--out <输出.png>] [--resolution 1K|2K|4K]`

然后将输出图片发送回用户。

## 命令行工具

### 基本用法

```bash
coloring-page --in photo.jpg
```

### 选择输出名称

```bash
coloring-page --in photo.jpg --out coloring.png
```

### 分辨率

```bash
coloring-page --in photo.jpg --resolution 2K
```

## 注意事项

- 输入必须是光栅图像（`.jpg`、`.png`、`.webp`）。
- 输出是白色背景上的 PNG 涂色页。
