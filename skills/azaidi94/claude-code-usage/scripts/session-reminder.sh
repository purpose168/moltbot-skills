#!/bin/bash
# Claude Code 会话提醒脚本
# 在会话配额刷新时发送通知，然后安排下一次提醒

set -euo pipefail

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 获取当前使用情况（强制刷新以获取准确的刷新时间）
USAGE=$("$SCRIPT_DIR/claude-usage.sh" --json --fresh 2>/dev/null)

if [ -z "$USAGE" ]; then
  echo "❌ 无法获取 Claude Code 使用情况" >&2
  exit 1
fi

# 提取会话信息
SESSION_UTIL=$(echo "$USAGE" | grep -A3 '"session"' | grep '"utilization"' | grep -o '[0-9]*')
SESSION_RESETS=$(echo "$USAGE" | grep -A3 '"session"' | grep '"resets_in"' | sed 's/.*"resets_in": "//;s/".*//')
SESSION_RESETS_AT=$(echo "$USAGE" | grep -A3 '"session"' | grep '"resets_at"' | sed 's/.*"resets_at": "//;s/".*//')

SESSION_UTIL=${SESSION_UTIL:-0}

# 解析重置时间戳以获取 cron 调度时间
if [ -z "$SESSION_RESETS_AT" ] || [ "$SESSION_RESETS_AT" = "null" ]; then
  echo "❌ 无法确定会话重置时间" >&2
  exit 1
fi

# 将 ISO 时间戳转换为 cron 格式
# 示例: 2026-01-22T01:22:00.000Z → minute=22, hour=1, day=22, month=1
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS 日期解析
  RESET_TS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${SESSION_RESETS_AT%.*}" "+%s" 2>/dev/null)
else
  # Linux 日期解析
  RESET_TS=$(date -d "${SESSION_RESETS_AT}" "+%s" 2>/dev/null)
fi

if [ -z "$RESET_TS" ] || [ "$RESET_TS" -eq 0 ]; then
  echo "❌ 无法解析重置时间戳" >&2
  exit 1
fi

# 提取 cron 组件
if [[ "$OSTYPE" == "darwin"* ]]; then
  CRON_MINUTE=$(date -r "$RESET_TS" "+%-M")
  CRON_HOUR=$(date -r "$RESET_TS" "+%-H")
  CRON_DAY=$(date -r "$RESET_TS" "+%-d")
  CRON_MONTH=$(date -r "$RESET_TS" "+%-m")
else
  CRON_MINUTE=$(date -d "@$RESET_TS" "+%-M")
  CRON_HOUR=$(date -d "@$RESET_TS" "+%-H")
  CRON_DAY=$(date -d "@$RESET_TS" "+%-d")
  CRON_MONTH=$(date -d "@$RESET_TS" "+%-m")
fi

# 准备通知消息
MESSAGE="🔄 *Claude Code 会话状态*

⏱️  当前使用量: *${SESSION_UTIL}%*
⏰  下次刷新: ${SESSION_RESETS}

您的5小时配额即将重置！🦞"

# 发送通知
echo -e "$MESSAGE"

# 使用 clawdbot cron 安排下一次提醒
if command -v clawdbot >/dev/null 2>&1; then
  # 尝试移除现有的会话提醒（如果没有则忽略错误）
  EXISTING=$(clawdbot cron list 2>/dev/null | grep "Claude Code Session Reminder" | head -1 || echo "")
  if [ -n "$EXISTING" ]; then
    # 从输出中提取 ID（格式: "id: <uuid>"）
    EXISTING_ID=$(echo "$EXISTING" | grep -o 'id: [a-f0-9-]*' | sed 's/id: //')
    if [ -n "$EXISTING_ID" ]; then
      clawdbot cron remove --id "$EXISTING_ID" >/dev/null 2>&1 || true
    fi
  fi

  # 为下一次会话重置添加一次性的 cron
  # 注意：使用会话目标将结果发送回此会话
  NEXT_TIME=$(date -r "$RESET_TS" "+%Y-%m-%d %H:%M")
  clawdbot cron add \
    --cron "$CRON_MINUTE $CRON_HOUR $CRON_DAY $CRON_MONTH *" \
    --message "运行 Claude Code 会话提醒: $SCRIPT_DIR/session-reminder.sh" \
    --name "Claude Code Session Reminder" \
    --description "下次刷新于 $NEXT_TIME" \
    --delete-after-run \
    --session isolated \
    --deliver \
    --channel telegram \
    >/dev/null 2>&1

  echo ""
  echo "✅ 下次提醒已安排: $(date -r "$RESET_TS" "+%b %d at %I:%M %p")"
else
  echo "⚠️  找不到 clawdbot - 无法安排下次提醒" >&2
fi
