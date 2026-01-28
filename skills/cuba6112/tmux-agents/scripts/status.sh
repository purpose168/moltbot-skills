#!/bin/bash
# 显示所有 tmux 代理会话的状态

echo "🖥️  Tmux 代理会话"
echo "========================"
echo ""

SESSIONS=$(tmux list-sessions -F "#{session_name}" 2>/dev/null)

if [ -z "$SESSIONS" ]; then
  echo "没有活动的会话"
  exit 0
fi

for session in $SESSIONS; do
  echo "📍 会话: $session"
  echo "   创建时间: $(tmux display-message -t "$session" -p '#{session_created}' | xargs -I{} date -r {} '+%Y-%m-%d %H:%M')"
  
  # 获取最后几行以显示当前状态
  LAST_LINE=$(tmux capture-pane -t "$session" -p | grep -v '^$' | tail -1)
  if [ -n "$LAST_LINE" ]; then
    echo "   状态: ${LAST_LINE:0:60}..."
  fi
  echo ""
done

echo "命令:"
echo "  检查:  ./skills/tmux-agents/scripts/check.sh <名称>"
echo "  附加: tmux attach -t <名称>"
echo "  终止: tmux kill-session -t <名称>"
