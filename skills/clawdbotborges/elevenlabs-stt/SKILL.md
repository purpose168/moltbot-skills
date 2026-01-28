---
name: elevenlabs-stt
description: 使用 ElevenLabs 语音转文本（Scribe v2）转录音频文件。支持 90+ 种语言和说话人分离。
homepage: https://elevenlabs.io/speech-to-text
metadata: {"clawdbot":{"emoji":"🎙️","requires":{"bins":["curl"],"env":["ELEVENLABS_API_KEY"]},"primaryEnv":"ELEVENLABS_API_KEY"}}
---

# ElevenLabs 语音转文本

使用 ElevenLabs 的 Scribe v2 模型转录音频文件。支持 90+ 种语言和说话人分离。

## 快速开始

```bash
# 基本转录
{baseDir}/scripts/transcribe.sh /path/to/audio.mp3

# 说话人分离
{baseDir}/scripts/transcribe.sh /path/to/audio.mp3 --diarize

# 指定语言（提高准确性）
{baseDir}/scripts/transcribe.sh /path/to/audio.mp3 --lang en

# 带时间戳的完整 JSON 输出
{baseDir}/scripts/transcribe.sh /path/to/audio.mp3 --json
```

## 选项

| 标志 | 描述 |
|------|-------------|
| `--diarize` | 识别不同说话者 |
| `--lang CODE` | ISO 语言代码（例如 en、pt、es） |
| `--json` | 输出带词级时间戳的完整 JSON |
| `--events` | 标记音频事件（笑声、音乐等） |

## 支持的格式

所有主流音频/视频格式：mp3、m4a、wav、ogg、webm、mp4 等

## API 密钥

设置 `ELEVENLABS_API_KEY` 环境变量，或在 clawdbot.json 中配置：

```json5
{
  skills: {
    entries: {
      "elevenlabs-stt": {
        apiKey: "sk_..."
      }
    }
  }
}
```

## 示例

```bash
# 转录 WhatsApp 语音笔记
{baseDir}/scripts/transcribe.sh ~/Downloads/voice_note.ogg

# 多人的会议录音
{baseDir}/scripts/transcribe.sh meeting.mp3 --diarize --lang en

# 获取 JSON 以便处理
{baseDir}/scripts/transcribe.sh podcast.mp3 --json > transcript.json
```
