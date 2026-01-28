#!/bin/bash
# Claude Code 使用情况监控脚本
# 检测使用量重置并通过 Clawdbot 发送通知

set -euo pipefail

# 状态文件路径（默认: /tmp/claude-usage-state.json）
STATE_FILE="${STATE_FILE:-/tmp/claude-usage-state.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 获取当前使用情况（JSON 格式）
CURRENT=$("$SCRIPT_DIR/claude-usage.sh" --json --fresh 2>/dev/null)

if [ -z "$CURRENT" ]; then
  echo "❌ 无法获取使用情况" >&2
  exit 1
fi

# 使用更好的 JSON 解析提取当前值
SESSION_NOW=$(echo "$CURRENT" | grep -A3 '"session"' | grep '"utilization"' | grep -o '[0-9]*')
WEEKLY_NOW=$(echo "$CURRENT" | grep -A3 '"weekly"' | grep '"utilization"' | grep -o '[0-9]*')
SESSION_RESETS=$(echo "$CURRENT" | grep -A3 '"session"' | grep '"resets_in"' | sed 's/.*"resets_in": "//;s/".*//')
WEEKLY_RESETS=$(echo "$CURRENT" | grep -A3 '"weekly"' | grep '"resets_in"' | sed 's/.*"resets_in": "//;s/".*//')

SESSION_NOW=${SESSION_NOW:-0}
WEEKLY_NOW=${WEEKLY_NOW:-0}

# 检查状态文件是否存在
if [ ! -f "$STATE_FILE" ]; then
  # 首次运行 - 保存状态并退出
  cat > "$STATE_FILE" <<EOF
{
  "session": $SESSION_NOW,
  "weekly": $WEEKLY_NOW,
  "last_check": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "📊 已保存初始状态。监控已启动。"
  exit 0
fi

# 读取之前的状态
SESSION_PREV=$(grep '"session"' "$STATE_FILE" | grep -o '[0-9]*')
WEEKLY_PREV=$(grep '"weekly"' "$STATE_FILE" | grep -o '[0-9]*')

SESSION_PREV=${SESSION_PREV:-0}
WEEKLY_PREV=${WEEKLY_PREV:-0}

# 检测重置（使用量显著下降）
SESSION_RESET=0
WEEKLY_RESET=0

# 会话重置：如果使用量下降超过 10% 且现在 <10%，或者下降 >20%
if [ "$SESSION_NOW" -lt "$SESSION_PREV" ]; then
  if ([ "$SESSION_NOW" -lt 10 ] && [ "$SESSION_PREV" -gt 15 ]) || [ "$SESSION_NOW" -lt $((SESSION_PREV - 20)) ]; then
    SESSION_RESET=1
  fi
fi

# 每周重置：如果使用量下降超过 10% 且现在 <10%，或者下降 >20%
if [ "$WEEKLY_NOW" -lt "$WEEKLY_PREV" ]; then
  if ([ "$WEEKLY_NOW" -lt 10 ] && [ "$WEEKLY_PREV" -gt 15 ]) || [ "$WEEKLY_NOW" -lt $((WEEKLY_PREV - 20)) ]; then
    WEEKLY_RESET=1
  fi
fi

# 如果检测到重置，发送通知
if [ "$SESSION_RESET" -eq 1 ] || [ "$WEEKLY_RESET" -eq 1 ]; then
  MESSAGE=""

  if [ "$SESSION_RESET" -eq 1 ]; then
    MESSAGE="🎉 *Claude Code 会话已重置！*\n\n"
    MESSAGE+="⏱️  您的5小时配额已重置\n"
    MESSAGE+="📊 使用量: *${SESSION_NOW}%*\n"
    MESSAGE+="⏰ 下次重置: ${SESSION_RESETS}\n"
  fi

  if [ "$WEEKLY_RESET" -eq 1 ]; then
    if [ -n "$MESSAGE" ]; then
      MESSAGE+="\n---\n\n"
    fi
    MESSAGE+="🎊 *Claude Code 每周已重置！*\n\n"
    MESSAGE+="📅 您的7天配额已重置\n"
    MESSAGE+="📊 使用量: *${WEEKLY_NOW}%*\n"
    MESSAGE+="⏰ 下次重置: ${WEEKLY_RESETS}\n"
  fi

  MESSAGE+="\n新的使用量已可用！🦞"

  # 通过 clawdbot 消息工具发送
  # 注意：此脚本通常由 Clawdbot cron 运行，它会自动捕获输出
  # 并作为通知发送。对于手动测试，打印到 stdout。
  echo -e "$MESSAGE"

  echo "✅ 重置通知已发送"
fi

# 更新状态文件
cat > "$STATE_FILE" <<EOF
{
  "session": $SESSION_NOW,
  "weekly": $WEEKLY_NOW,
  "last_check": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# 记录当前状态
if [ "$SESSION_RESET" -eq 1 ]; then
  echo "📊 会话: ${SESSION_PREV}% → ${SESSION_NOW}% (重置)"
else
  echo "📊 会话: ${SESSION_PREV}% → ${SESSION_NOW}%"
fi

if [ "$WEEKLY_RESET" -eq 1 ]; then
  echo "📊 每周: ${WEEKLY_PREV}% → ${WEEKLY_NOW}% (重置)"
else
  echo "📊 每周: ${WEEKLY_PREV}% → ${WEEKLY_NOW}%"
fi
