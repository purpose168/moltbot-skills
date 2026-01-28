---
name: veo
description: 使用 Google Veo API 生成视频（支持 Veo 3.1 / Veo 3.0 版本）。
---

# Veo（Google 视频生成工具）

使用 Google Veo API 生成视频片段。

## 生成视频

```bash
uv run {baseDir}/scripts/generate_video.py --prompt "你的视频描述" --filename "output.mp4"
```

## 可选参数

- `--duration` / `-d`：视频时长（秒），默认 8 秒，取决于所选模型的最大时长
- `--aspect-ratio` / `-a`：视频宽高比（支持 16:9、9:16、1:1）
- `--model`：使用的 Veo 模型版本（如 veo-2.0-generate-001、veo-3.0-generate-001、veo-3.1-generate-preview 等）
- `--api-key`：覆盖默认的 GEMINI_API_KEY 环境变量

## API 密钥配置

- **推荐方式**：设置 `GEMINI_API_KEY` 环境变量
- **备选方式**：在 `~/.clawdbot/clawdbot.json` 中的 `skills."veo".env.GEMINI_API_KEY` 配置项设置

## 重要说明

- Veo 3.1 版本支持更高质量的输出和更长的视频时长
- 输出格式为 MP4
- 使用 `--model veo-3.1-generate-preview` 可获得最佳效果
- Veo 3.0-fast-generate-001 生成速度更快但质量略低
- 脚本会输出一行 `MEDIA:` 标记，便于 Clawdbot 在支持的聊天平台上自动附件视频
