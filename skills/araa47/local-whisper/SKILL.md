---
name: local-whisper
description: 使用 OpenAI Whisper 进行本地语音转文字。模型下载后完全离线运行。支持多种模型尺寸的高质量转录。
metadata: {"clawdbot":{"emoji":"🎙️","requires":{"bins":["ffmpeg"]}}}
---

# 本地 Whisper 语音转文字

使用 OpenAI 的 Whisper 进行本地语音转文字。**首次下载模型后完全离线运行**。

## 使用方法

```bash
# 基本用法
~/.clawdbot/skills/local-whisper/scripts/local-whisper audio.wav

# 使用更好的模型
~/.clawdbot/skills/local-whisper/scripts/local-whisper audio.wav --model turbo

# 带时间戳输出
~/.clawdbot/skills/local-whisper/scripts/local-whisper audio.wav --timestamps --json
```

## 模型选择

| 模型 | 大小 | 说明 |
|------|------|------|
| `tiny` | 39M | 最快 |
| `base` | 74M | **默认** |
| `small` | 244M | 良好平衡 |
| `turbo` | 809M | 最佳速度/质量 |
| `large-v3` | 1.5GB | 最高精度 |

## 选项参数

- `--model/-m` — 模型大小（默认：base）
- `--language/-l` — 语言代码（省略时自动检测）
- `--timestamps/-t` — 包含单词级别的时间戳
- `--json/-j` — JSON 格式输出
- `--quiet/-q` — 隐藏进度消息

## 设置

使用 uv 管理的虚拟环境，位于 `.venv/`。重新安装方法：
```bash
cd ~/.clawdbot/skills/local-whisper
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python click openai-whisper torch --index-url https://download.pytorch.org/whl/cpu
```
