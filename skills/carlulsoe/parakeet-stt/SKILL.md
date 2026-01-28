---
name: parakeet-stt
description: >-
  本地语音转文字，使用 NVIDIA Parakeet TDT 0.6B v3 模型（ONNX 格式，CPU 运行）。
  比 Whisper 快 30 倍，支持 25 种语言，自动检测，OpenAI 兼容 API。
  当需要转录音频文件、将语音转换为文字或在本地处理语音录音（不使用云 API）时使用。
homepage: https://github.com/groxaxo/parakeet-tdt-0.6b-v3-fastapi-openai
metadata: {"clawdbot":{"emoji":"🦜","env":["PARAKEET_URL"]}}
---

# Parakeet TDT（语音转文字）

使用 NVIDIA Parakeet TDT 0.6B v3 和 ONNX Runtime 进行本地转录。
在 CPU 上运行 — 无需 GPU。比实时速度快约 30 倍。

## 安装

```bash
# 克隆仓库
git clone https://github.com/groxaxo/parakeet-tdt-0.6b-v3-fastapi-openai.git
cd parakeet-tdt-0.6b-v3-fastapi-openai

# 使用 Docker 运行（推荐）
docker compose up -d parakeet-cpu

# 或直接使用 Python 运行
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

默认端口是 `5000`。设置 `PARAKEET_URL` 覆盖（例如 `http://localhost:5092`）。

## API 端点

OpenAI 兼容的 API 在 `$PARAKEET_URL`（默认：`http://localhost:5000`）。

## 快速开始

```bash
# 转录音频文件（纯文本）
curl -X POST $PARAKEET_URL/v1/audio/transcriptions \
  -F "file=@/path/to/audio.mp3" \
  -F "response_format=text"

# 获取时间戳和片段
curl -X POST $PARAKEET_URL/v1/audio/transcriptions \
  -F "file=@/path/to/audio.mp3" \
  -F "response_format=verbose_json"

# 生成字幕（SRT）
curl -X POST $PARAKEET_URL/v1/audio/transcriptions \
  -F "file=@/path/to/audio.mp3" \
  -F "response_format=srt"
```

## Python / OpenAI SDK

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url=os.getenv("PARAKEET_URL", "http://localhost:5000") + "/v1",
    api_key="not-needed"
)

with open("audio.mp3", "rb") as f:
    transcript = client.audio.transcriptions.create(
        model="parakeet-tdt-0.6b-v3",
        file=f,
        response_format="text"
    )
print(transcript)
```

## 输出格式

| 格式 | 输出 |
|------|------|
| `text` | 纯文本 |
| `json` | `{"text": "..."}` |
| `verbose_json` | 带时间戳和单词的片段 |
| `srt` | SRT 字幕 |
| `vtt` | WebVTT 字幕 |

## 支持的语言（25 种）

英语、西班牙语、法语、德语、意大利语、葡萄牙语、波兰语、俄语、
乌克兰语、荷兰语、瑞典语、丹麦语、芬兰语、挪威语、希腊语、捷克语、
罗马尼亚语、匈牙利语、保加利亚语、斯洛伐克语、克罗地亚语、立陶宛语、
拉脱维亚语、爱沙尼亚语、斯洛文尼亚语

语言自动检测 — 无需配置。

## Web 界面

在浏览器中打开 `$PARAKEET_URL` 获取拖放式转录 UI。

## Docker 管理

```bash
# 检查状态
docker ps --filter "name=parakeet"

# 查看日志
docker logs -f <容器名称>

# 重启
docker compose restart

# 停止
docker compose down
```

## 为什么选择 Parakeet 而不是 Whisper？

- **速度**：在 CPU 上比实时快约 30 倍
- **准确性**：与 Whisper large-v3 相当
- **隐私**：100% 本地运行，无云调用
- **兼容性**：可作为 OpenAI 转录 API 的直接替代品
