#!/usr/bin/env bash
set -euo pipefail

# ElevenLabs 语音转文本转录脚本
# 用法: transcribe.sh <音频文件> [选项]

show_help() {
    cat << EOF
用法: $(basename "$0") <音频文件> [选项]

选项:
  --diarize     启用说话人分离
  --lang CODE   ISO 语言代码（例如 en、pt、es、fr）
  --json        输出完整 JSON 响应
  --events      标记音频事件（笑声、音乐等）
  -h, --help    显示此帮助

环境变量:
  ELEVENLABS_API_KEY  必需的 API 密钥

示例:
  $(basename "$0") voice_note.ogg
  $(basename "$0") meeting.mp3 --diarize --lang en
  $(basename "$0") podcast.mp3 --json > transcript.json
EOF
    exit 0
}

# 默认值
DIARIZE="false"
LANG_CODE=""
JSON_OUTPUT="false"
TAG_EVENTS="false"
FILE=""

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help) show_help ;;
        --diarize) DIARIZE="true"; shift ;;
        --lang) LANG_CODE="$2"; shift 2 ;;
        --json) JSON_OUTPUT="true"; shift ;;
        --events) TAG_EVENTS="true"; shift ;;
        -*) echo "未知选项: $1" >&2; exit 1 ;;
        *) FILE="$1"; shift ;;
    esac
done

# 验证
if [[ -z "$FILE" ]]; then
    echo "错误: 未指定音频文件" >&2
    show_help
fi

if [[ ! -f "$FILE" ]]; then
    echo "错误: 文件不存在: $FILE" >&2
    exit 1
fi

# API 密钥（检查环境变量，然后回退到技能配置）
API_KEY="${ELEVENLABS_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
    echo "错误: 未设置 ELEVENLABS_API_KEY" >&2
    exit 1
fi

# 构建 curl 命令
CURL_ARGS=(
    -s
    -X POST
    "https://api.elevenlabs.io/v1/speech-to-text"
    -H "xi-api-key: $API_KEY"
    -F "file=@$FILE"
    -F "model_id=scribe_v2"
    -F "diarize=$DIARIZE"
    -F "tag_audio_events=$TAG_EVENTS"
)

if [[ -n "$LANG_CODE" ]]; then
    CURL_ARGS+=(-F "language_code=$LANG_CODE")
fi

# 发送请求
RESPONSE=$(curl "${CURL_ARGS[@]}")

# 检查错误
if echo "$RESPONSE" | grep -q '"detail"'; then
    echo "API 错误:" >&2
    echo "$RESPONSE" | jq -r '.detail.message // .detail' >&2
    exit 1
fi

# 输出
if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$RESPONSE" | jq .
else
    # 仅提取文本
    TEXT=$(echo "$RESPONSE" | jq -r '.text // empty')
    if [[ -n "$TEXT" ]]; then
        echo "$TEXT"
    else
        echo "$RESPONSE"
    fi
fi
