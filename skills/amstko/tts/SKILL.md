---
name: tts
description: 使用 Hume AI（或 OpenAI）API 将文本转换为语音。当用户要求音频消息、语音回复或要"亲口"听到某些内容时使用。
---

# 文本转语音（TTS）

将文本转换为语音并生成音频文件（MP3）。

## Hume AI（首选）

- **首选语音**：`9e1f9e4f-691a-4bb0-b87c-e306a4c838ef`
- **密钥**：存储在环境变量 `HUME_API_KEY` 和 `HUME_SECRET_KEY` 中

### 使用方法

```bash
HUME_API_KEY="..." HUME_SECRET_KEY="..." node {baseDir}/scripts/generate_hume_speech.js --text "你好 Jonathan" --output "output.mp3"
```

## OpenAI（旧版）

- **首选语音**：`nova`
- **使用方法**：`OPENAI_API_KEY="..." node {baseDir}/scripts/generate_speech.js --text "..." --output "..."`

## 通用说明

- 脚本会打印一行 `MEDIA:` 后面跟生成文件的绝对路径
- 使用 `message` 工具将生成的文件发送给用户
