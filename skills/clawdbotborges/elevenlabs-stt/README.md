# 🎙️ ElevenLabs 语音转文本技能

一个用于使用 ElevenLabs Scribe v2 模型转录音频文件的 [Clawdbot](https://github.com/clawdbot/clawdbot) 技能。

## 功能特点

- 🌍 **支持 90+ 种语言** 并自动检测
- 👥 **说话人分离** — 识别不同说话者
- 🎵 **音频事件标记** — 检测笑声、音乐、掌声等
- 📝 **词级时间戳** — JSON 输出中的精确时间
- 🎧 **支持所有主流格式** — mp3、m4a、wav、ogg、webm、mp4 等

## 安装

### 对于 Clawdbot

添加到您的 `clawdbot.json`：

```json5
{
  skills: {
    entries: {
      "elevenlabs-stt": {
        source: "github:clawdbotborges/elevenlabs-stt",
        apiKey: "sk_your_api_key_here"
      }
    }
  }
}
```

### 独立运行

```bash
git clone https://github.com/clawdbotborges/elevenlabs-stt.git
cd elevenlabs-stt
export ELEVENLABS_API_KEY="sk_your_api_key_here"
```

## 使用方法

```bash
# 基本转录
./scripts/transcribe.sh audio.mp3

# 说话人分离
./scripts/transcribe.sh meeting.mp3 --diarize

# 指定语言以提高准确性
./scripts/transcribe.sh voice_note.ogg --lang en

# 带时间戳的完整 JSON
./scripts/transcribe.sh podcast.mp3 --json

# 标记音频事件（笑声、音乐等）
./scripts/transcribe.sh recording.wav --events
```

## 选项

| 标志 | 描述 |
|------|-------------|
| `--diarize` | 启用说话人分离 |
| `--lang CODE` | ISO 语言代码（例如 `en`、`pt`、`es`、`fr`） |
| `--json` | 输出带词级时间戳的完整 JSON 响应 |
| `--events` | 标记音频事件（如笑声、音乐、掌声） |
| `-h, --help` | 显示帮助信息 |

## 示例

### 转录语音消息

```bash
./scripts/transcribe.sh ~/Downloads/voice_note.ogg
# 输出: "嘿只是想确认一下明天的会议。"
```

### 多人会议

```bash
./scripts/transcribe.sh meeting.mp3 --diarize --lang en --json
```

```json
{
  "text": "大家好。我们开始更新。",
  "words": [
    {"text": "大家", "start": 0.0, "end": 0.5, "speaker": "speaker_0"},
    {"text": "好", "start": 0.5, "end": 1.0, "speaker": "speaker_0"}
  ]
}
```

### 使用 jq 处理

```bash
# 仅获取文本
./scripts/transcribe.sh audio.mp3 --json | jq -r '.text'

# 获取词数
./scripts/transcribe.sh audio.mp3 --json | jq '.words | length'
```

## 要求

- `curl` — 用于 API 请求
- `jq` — 用于 JSON 解析（可选，但推荐）
- 具有语音转文本访问权限的 ElevenLabs API 密钥

## API 密钥

从 [ElevenLabs](https://elevenlabs.io) 获取您的 API 密钥：

1. 注册或登录
2. 转到个人资料 → API 密钥
3. 创建新密钥或复制现有密钥

## 许可证

MIT

## 链接

- [ElevenLabs 语音转文本](https://elevenlabs.io/speech-to-text)
- [API 文档](https://elevenlabs.io/docs/api-reference/speech-to-text)
- [Clawdbot](https://github.com/clawdbot/clawdbot)
