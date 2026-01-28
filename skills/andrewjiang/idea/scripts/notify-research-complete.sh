#!/bin/bash
# notify-research-complete.sh - 发送研究文件并唤醒 Clawdbot 进行通知
#
# 用法: notify-research-complete.sh <文件路径> <标题>

set -e

FILE_PATH="$1"
TITLE="$2"

# 参数验证
if [ -z "$FILE_PATH" ] || [ -z "$TITLE" ]; then
    echo "用法: notify-research-complete.sh <文件路径> <标题>"
    exit 1
fi

# 文件存在验证
if [ ! -f "$FILE_PATH" ]; then
    echo "错误: 文件未找到: $FILE_PATH"
    exit 1
fi

# 配置
HOOKS_TOKEN="17f568bf286f486c1a73956fe9112125"
GATEWAY_URL="http://localhost:18789"

echo "正在发送文件到保存的消息..."
telegram send-file "me" "$FILE_PATH" "$TITLE"

echo "正在唤醒 Clawdbot..."
# 使用简单 ASCII 文本以避免 JSON 编码问题
# 为 JSON 转义标题
SAFE_TITLE=$(echo "$TITLE" | sed 's/"/\\"/g' | tr -cd '[:print:]')
curl -s -X POST "${GATEWAY_URL}/hooks/wake" \
  -H "Content-Type: application/json" \
  -H "X-Clawdbot-Token: ${HOOKS_TOKEN}" \
  -d "{\"text\": \"RESEARCH_COMPLETE: ${SAFE_TITLE} - 文件已发送到保存的消息。\", \"mode\": \"now\"}"

echo ""
echo "完成！"
