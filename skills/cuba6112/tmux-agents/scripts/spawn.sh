#!/bin/bash
# 在 tmux 会话中生成编码代理

SESSION_NAME="${1:-agent-$(date +%s)}"
TASK="$2"
AGENT="${3:-claude}"

if [ -z "$TASK" ]; then
  echo "用法: spawn.sh <会话名称> <任务> [代理]"
  echo ""
  echo "云端代理（使用 API 积分）:"
  echo "  claude        - Claude Code（默认）"
  echo "  codex         - OpenAI Codex CLI"
  echo "  gemini        - Google Gemini CLI"
  echo ""
  echo "本地代理（免费，使用 Ollama）:"
  echo "  ollama-claude - Claude Code + 本地模型"
  echo "  ollama-codex  - Codex + 本地模型"
  echo ""
  echo "示例:"
  echo "  spawn.sh fix-bug '修复登录验证' claude"
  echo "  spawn.sh experiment '重构整个代码库' ollama-claude"
  exit 1
fi

# 检查会话是否已存在
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "⚠️  会话 '$SESSION_NAME' 已存在"
  echo "使用: tmux attach -t $SESSION_NAME"
  exit 1
fi

# 确定是否使用本地模式
LOCAL_MODE=false
case "$AGENT" in
  ollama-*) LOCAL_MODE=true ;;
esac

# 创建新的分离会话
tmux new-session -d -s "$SESSION_NAME" -x 200 -y 50

# 设置环境
tmux send-keys -t "$SESSION_NAME" "cd ~/clawd" Enter
tmux send-keys -t "$SESSION_NAME" "clear" Enter
tmux send-keys -t "$SESSION_NAME" "echo '🚀 代理会话: $SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "echo '🤖 代理: $AGENT'" Enter
if [ "$LOCAL_MODE" = true ]; then
  tmux send-keys -t "$SESSION_NAME" "echo '🦙 模式: 本地 (Ollama - 免费!)'" Enter
else
  tmux send-keys -t "$SESSION_NAME" "echo '☁️  模式: 云端 (API 积分)'" Enter
fi
tmux send-keys -t "$SESSION_NAME" "echo '📋 任务: $TASK'" Enter
tmux send-keys -t "$SESSION_NAME" "echo '⏰ 开始时间: $(date)'" Enter
tmux send-keys -t "$SESSION_NAME" "echo '-------------------------------------------'" Enter
tmux send-keys -t "$SESSION_NAME" "echo ''" Enter

# 启动相应的代理
case "$AGENT" in
  claude)
    # Claude Code 自动接受权限（云端）
    tmux send-keys -t "$SESSION_NAME" "claude --dangerously-skip-permissions \"$TASK\"" Enter
    ;;
  codex)
    # OpenAI Codex CLI 自动批准（云端）
    tmux send-keys -t "$SESSION_NAME" "codex --auto-edit --full-auto \"$TASK\"" Enter
    ;;
  gemini)
    # Google Gemini CLI（云端）
    tmux send-keys -t "$SESSION_NAME" "gemini \"$TASK\"" Enter
    ;;
  ollama-claude)
    # Claude Code 配合本地 Ollama 模型（免费！）
    tmux send-keys -t "$SESSION_NAME" "echo '正在启动 Claude Code 配合本地 Ollama 模型...'" Enter
    tmux send-keys -t "$SESSION_NAME" "ollama launch claude" Enter
    sleep 2
    tmux send-keys -t "$SESSION_NAME" "\"$TASK\"" Enter
    ;;
  ollama-codex)
    # Codex 配合本地 Ollama 模型（免费！）
    tmux send-keys -t "$SESSION_NAME" "echo '正在启动 Codex 配合本地 Ollama 模型...'" Enter
    tmux send-keys -t "$SESSION_NAME" "ollama launch codex" Enter
    sleep 2
    tmux send-keys -t "$SESSION_NAME" "\"$TASK\"" Enter
    ;;
  *)
    # 自定义命令 - 将任务作为参数传递
    tmux send-keys -t "$SESSION_NAME" "$AGENT \"$TASK\"" Enter
    ;;
esac

echo "✅ 会话 '$SESSION_NAME' 已生成，使用 $AGENT"
if [ "$LOCAL_MODE" = true ]; then
  echo "🦙 本地运行 — 无 API 成本!"
else
  echo "☁️  使用云端 API"
fi
echo ""
echo "📋 任务: $TASK"
echo ""
echo "命令:"
echo "  👀 观看:   tmux attach -t $SESSION_NAME"
echo "  📊 检查:   ./skills/tmux-agents/scripts/check.sh $SESSION_NAME"
echo "  💬 发送:    tmux send-keys -t $SESSION_NAME '消息' Enter"
echo "  🛑 终止:    tmux kill-session -t $SESSION_NAME"
