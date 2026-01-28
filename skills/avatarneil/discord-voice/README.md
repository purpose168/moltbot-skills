# Clawdbot的Discord语音插件

在Discord语音频道中进行实时语音对话。加入一个语音频道，说话，你的文字会被转录，由Claude处理，然后说出来。

## 功能特性

- **加入/离开语音频道**：通过斜杠命令、CLI或代理工具
- **语音活动检测(VAD)**：自动检测用户何时说话
- **语音转文本**：Whisper API (OpenAI) 或 Deepgram
- **流式STT**：使用Deepgram WebSocket进行实时转录(延迟降低约1秒)
- **代理集成**：转录的语音通过Clawdbot代理路由
- **文本转语音**：OpenAI TTS 或 ElevenLabs
- **音频播放**：回复在语音频道中被说出来
- **打断支持**：当用户开始说话时立即停止说话
- **自动重连**：断开连接时自动心跳监控和重连

## 系统要求

- 具有语音权限的Discord机器人(连接、说话、使用语音活动)
- STT和TTS提供商的API密钥
- 语音系统依赖：
  - `ffmpeg`(音频处理)
  - 用于 `@discordjs/opus` 和 `sodium-native` 的本地构建工具

## 安装

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg build-essential python3

# Fedora/RHEL
sudo dnf install ffmpeg gcc-c++ make python3

# macOS
brew install ffmpeg
```

### 2. 安装Node依赖

```bash
cd ~/.clawdbot/extensions/discord-voice
npm install
```

### 3. 在clawdbot.json中配置

```json5
{
  "plugins": {
    "entries": {
      "discord-voice": {
        "enabled": true,
        "config": {
          "sttProvider": "whisper",
          "ttsProvider": "openai",
          "ttsVoice": "nova",
          "vadSensitivity": "medium",
          "allowedUsers": [],  // 为空 = 允许所有用户
          "silenceThresholdMs": 1500,
          "maxRecordingMs": 30000,
          "openai": {
            "apiKey": "sk-..."  // 或使用 OPENAI_API_KEY 环境变量
          }
        }
      }
    }
  }
}
```

### 4. Discord机器人设置

确保你的Discord机器人具有以下权限：
- **连接** - 加入语音频道
- **说话** - 播放音频
- **使用语音活动** - 检测用户何时说话

将这些添加到机器人的OAuth2 URL或在Discord开发者门户中配置。

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 启用/禁用插件 |
| `sttProvider` | string | `"whisper"` | `"whisper"` 或 `"deepgram"` |
| `streamingSTT` | boolean | `true` | 使用流式STT(仅Deepgram，快约1秒) |
| `ttsProvider` | string | `"openai"` | `"openai"` 或 `"elevenlabs"` |
| `ttsVoice` | string | `"nova"` | TTS的语音ID |
| `vadSensitivity` | string | `"medium"` | `"low"`、`"medium"` 或 `"high"` |
| `bargeIn` | boolean | `true` | 用户说话时停止说话 |
| `allowedUsers` | string[] | `[]` | 允许的用户ID(为空 = 全部) |
| `silenceThresholdMs` | number | `1500` | 处理前的静音时间(毫秒) |
| `maxRecordingMs` | number | `30000` | 最大录音长度(毫秒) |
| `heartbeatIntervalMs` | number | `30000` | 连接健康检查间隔 |
| `autoJoinChannel` | string | `undefined` | 启动时自动加入的频道ID |

### 提供商配置

#### OpenAI (Whisper + TTS)
```json5
{
  "openai": {
    "apiKey": "sk-...",
    "whisperModel": "whisper-1",
    "ttsModel": "tts-1"
  }
}
```

#### ElevenLabs (仅TTS)
```json5
{
  "elevenlabs": {
    "apiKey": "...",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",  // Rachel
    "modelId": "eleven_multilingual_v2"
  }
}
```

#### Deepgram (仅STT)
```json5
{
  "deepgram": {
    "apiKey": "...",
    "model": "nova-2"
  }
}
```

## 使用方法

### 斜杠命令(Discord)

在Discord注册后，使用以下命令：
- `/voice join <channel>` - 加入语音频道
- `/voice leave` - 离开当前语音频道
- `/voice status` - 显示语音连接状态

### CLI命令

```bash
# 加入语音频道
clawdbot voice join <channelId>

# 离开语音
clawdbot voice leave --guild <guildId>

# 检查状态
clawdbot voice status
```

### 代理工具

代理可以使用 `discord_voice` 工具：
```
Join voice channel 1234567890
```

该工具支持以下操作：
- `join` - 加入语音频道(需要channelId)
- `leave` - 离开语音频道
- `speak` - 在语音频道中说话
- `status` - 获取当前语音状态

## 工作原理

1. **加入**：机器人加入指定的语音频道
2. **监听**：VAD检测用户何时开始/停止说话
3. **录音**：用户说话时缓冲音频
4. **转录**：静音时，音频被发送到STT提供商
5. **处理**：转录的文本发送到Clawdbot代理
6. **合成**：代理响应通过TTS转换为音频
7. **播放**：音频在语音频道中播放

## 流式STT (Deepgram)

当使用Deepgram作为STT提供商时，默认启用流式模式。这提供：

- **快约1秒** 的端到端延迟
- **实时反馈** 带有临时转录结果
- **自动保活** 防止连接超时
- **回退** 到批量转录(如果流式失败)

使用流式STT：
```json5
{
  "sttProvider": "deepgram",
  "streamingSTT": true,  // 默认
  "deepgram": {
    "apiKey": "...",
    "model": "nova-2"
  }
}
```

## 打断支持

启用时(默认)，如果用户开始说话，机器人将立即停止说话。这创造了更自然的对话流程，你可以打断机器人。

禁用时(让机器人说完)：
```json5
{
  "bargeIn": false
}
```

## 自动重连

该插件包括自动连接健康监控：

- **心跳检查** 每30秒(可配置)
- **自动重连** 断开时使用指数退避
- **最多3次尝试** 后放弃

如果连接断开，你会看到如下日志：
```
[discord-voice] Disconnected from voice channel
[discord-voice] Reconnection attempt 1/3
[discord-voice] Reconnected successfully
```

## VAD灵敏度

- **低**：可以拾取安静的言语，可能会被背景噪音触发
- **中等**：平衡(推荐)
- **高**：需要更大声、更清晰的语音

## 故障排除

### "Discord客户端不可用"
确保Discord频道已配置，机器人在使用语音前已连接。

### Opus/Sodium构建错误
安装构建工具：
```bash
npm install -g node-gyp
npm rebuild @discordjs/opus sodium-native
```

### 听不到音频
1. 检查机器人有连接+说话权限
2. 检查机器人没有被服务器静音
3. 验证TTS API密钥有效

### 转录不工作
1. 检查STT API密钥有效
2. 检查音频正在被录制(见调试日志)
3. 尝试调整VAD灵敏度

### 启用调试日志
```bash
DEBUG=discord-voice clawdbot gateway start
```

## 环境变量

| 变量 | 描述 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API密钥(Whisper + TTS) |
| `ELEVENLABS_API_KEY` | ElevenLabs API密钥 |
| `DEEPGRAM_API_KEY` | Deepgram API密钥 |

## 限制

- 每个服务器每次只能使用一个语音频道
- 最大录音长度：30秒(可配置)
- 实时音频需要稳定的网络
- TTS输出可能因合成而有轻微延迟

## 许可证

与Clawdbot相同。
