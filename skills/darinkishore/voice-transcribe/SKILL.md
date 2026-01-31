---
name: voice-transcribe
description: 使用 OpenAI 的 gpt-4o-mini-transcribe 模型转录音频文件，支持词汇提示和文本替换。需要 uv (https://docs.astral.sh/uv/)。
---

# voice-transcribe

使用 OpenAI 的 gpt-4o-mini-transcribe 模型转录音频文件。

## 使用场景

当收到语音备忘录时（尤其是通过 WhatsApp），只需运行：
```bash
uv run /Users/darin/clawd/skills/voice-transcribe/transcribe <audio-file>
```
然后根据转录内容进行回复。

## 修复转录错误

如果 darin 说某个词转录错误，将其添加到 `vocab.txt`（用于提示）或 `replacements.txt`（用于保证修复）。请参阅下面的部分。

## 支持的格式

- mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, opus

## 示例

```bash
# 转录语音备忘录
transcribe /tmp/voice-memo.ogg

# 管道传输到其他工具
transcribe /tmp/memo.ogg | pbcopy
```

## 设置

1. 将您的 OpenAI API 密钥添加到 `/Users/darin/clawd/skills/voice-transcribe/.env`：
   ```
   OPENAI_API_KEY=sk-...
   ```

## 自定义词汇

将单词添加到 `vocab.txt`（每行一个）以帮助模型识别名称/行话：
```
Clawdis
Clawdbot
```

## 文本替换

如果模型仍然弄错了什么，将替换添加到 `replacements.txt`：
```
错误拼写 -> 正确拼写
```

## 注意事项

- 假设为英文（无语言检测）
- 专门使用 gpt-4o-mini-transcribe 模型
- 按音频文件的 sha256 缓存结果
