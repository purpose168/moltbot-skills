#!/bin/bash
# 检查 tmux 代理会话

SESSION_NAME="$1"
LINES="${2:-50}"

if [ -z "$SESSION_NAME" ]; then
  echo "运行中的会话:"
  tmux list-sessions 2>/dev/null || echo "没有运行的会话"
  exit 0
fi

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "未找到会话 '$SESSION_NAME'"
  echo ""
  echo "运行中的会话:"
  tmux list-sessions 2>/dev/null || echo "没有运行的会话"
  exit 1
fi

echo "=== 会话: $SESSION_NAME (最后 $LINES 行) ==="
echo ""
tmux capture-pane -t "$SESSION_NAME" -p -S -$LINES
