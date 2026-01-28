---
name: gemini-stt
description: 使用 Google Gemini API 或 Vertex AI 转录音频文件
metadata: {"clawdbot":{"emoji":"🎤","os":["linux","darwin"]}}
---

# Gemini 语音转文字技能

使用 Google Gemini API 或 Vertex AI 转录音频文件。默认使用 `gemini-2.0-flash-lite` 模型以获得最快的转录速度。

## 认证方式（选择其一）

### 方式 1：使用应用程序默认凭据的 Vertex AI（推荐）

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

脚本会在有可用时自动检测并使用 ADC。

### 方式 2：直接使用 Gemini API 密钥

在环境变量中设置 `GEMINI_API_KEY`（例如 `~/.env` 或 `~/.clawdbot/.env`）

## 依赖要求

- Python 3.10+（无外部依赖）
- 需要 GEMINI_API_KEY 或配置了 ADC 的 gcloud CLI

## 支持的格式

- `.ogg` / `.opus`（Telegram 语音消息）
- `.mp3`
- `.wav`
- `.m4a`

## 使用方法

```bash
# 自动检测认证方式（优先尝试 ADC，然后是 GEMINI_API_KEY）
python ~/.claude/skills/gemini-stt/transcribe.py /path/to/audio.ogg

# 强制使用 Vertex AI
python ~/.claude/skills/gemini-stt/transcribe.py /path/to/audio.ogg --vertex

# 使用特定模型
python ~/.claude/skills/gemini-stt/transcribe.py /path/to/audio.ogg --model gemini-2.5-pro

# Vertex AI 指定项目和区域
python ~/.claude/skills/gemini-stt/transcribe.py /path/to/audio.ogg --vertex --project my-project --region us-central1

# 用于 Clawdbot 媒体
python ~/.claude/skills/gemini-stt/transcribe.py ~/.clawdbot/media/inbound/voice-message.ogg
```

## 选项参数

| 选项 | 描述 |
|------|------|
| `<audio_file>` | 音频文件路径（必需） |
| `--model`, `-m` | 使用的 Gemini 模型（默认：`gemini-2.0-flash-lite`） |
| `--vertex`, `-v` | 强制使用带有 ADC 的 Vertex AI |
| `--project`, `-p` | GCP 项目 ID（Vertex 模式，默认为 gcloud 配置） |
| `--region`, `-r` | GCP 区域（Vertex 模式，默认：`us-central1`） |

## 支持的模型

任何支持音频输入的 Gemini 模型都可以使用。推荐的模型：

| 模型 | 说明 |
|------|------|
| `gemini-2.0-flash-lite` | **默认。** 转录速度最快。 |
| `gemini-2.0-flash` | 快速且经济实惠。 |
| `gemini-2.5-flash-lite` | 轻量级 2.5 模型。 |
| `gemini-2.5-flash` | 速度和质量平衡。 |
| `gemini-2.5-pro` | 质量更高，速度较慢。 |
| `gemini-3-flash-preview` | 最新的 flash 模型。 |
| `gemini-3-pro-preview` | 最新的 pro 模型，质量最佳。 |

查看 [Gemini API 模型](https://ai.google.dev/gemini-api/docs/models) 获取最新列表。

## 工作原理

1. 读取音频文件并进行 base64 编码
2. 自动检测认证方式：
   - 如果 ADC 可用（gcloud），使用 Vertex AI 端点
   - 否则，使用带有 GEMINI_API_KEY 的直接 Gemini API
3. 将音频发送到选定的 Gemini 模型并附上转录提示
4. 返回转录的文本

## 集成示例

用于 Clawdbot 语音消息处理：

```bash
# 转录传入的语音消息
TRANSCRIPT=$(python ~/.claude/skills/gemini-stt/transcribe.py "$AUDIO_PATH")
echo "用户说: $TRANSCRIPT"
```

## 错误处理

脚本在以下情况以退出码 1 退出并打印到 stderr：
- 没有可用的认证（既没有 ADC 也没有 GEMINI_API_KEY）
- 文件未找到
- API 错误
- 缺少 GCP 项目（使用 Vertex 时）

## 注意事项

- 默认使用 Gemini 2.0 Flash Lite 以获得最快的转录速度
- 无需外部 Python 依赖（仅使用标准库）
- 自动根据文件扩展名检测 MIME 类型
- 当 ADC 可用时优先使用 Vertex AI（无需管理 API 密钥）
