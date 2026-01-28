#!/bin/bash
# 监控 Claude Code 使用情况并在重置时通过 Telegram 发送通知

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT=$("$SCRIPT_DIR/monitor-usage.sh" 2>&1)

# 检查是否检测到重置（输出包含 "Reset notification sent"）
if echo "$OUTPUT" | grep -q "Reset notification sent"; then
  # 只提取通知消息（在 "✅ Reset notification sent" 之前）
  MESSAGE=$(echo "$OUTPUT" | sed '/✅ Reset notification sent/q' | sed '$ d')

  # 通过 Telegram 使用 clawdbot 发送
  if command -v clawdbot >/dev/null 2>&1; then
    # 使用 printf 正确处理换行符
    printf '%s' "$MESSAGE" | clawdbot message send --telegram --target 5259918241
  fi
fi
