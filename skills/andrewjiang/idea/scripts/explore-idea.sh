#!/bin/bash
# explore-idea.sh - 使用 Claude Code 探索商业创意
#
# 用法: explore-idea.sh "您的商业创意"
# 带通知: CLAWD_CHAT_NAME="名称" CLAWD_CHAT_ID="123" explore-idea.sh "创意"

set -e

# 参数验证
if [ $# -eq 0 ]; then
    echo "用法: explore-idea.sh '您的商业创意'"
    echo "示例: explore-idea.sh 'AI 驱动的日历助手'"
    exit 1
fi

IDEA="$1"
TIMESTAMP=$(date +%s)
# 将创意转换为 URL 友好的 slug 格式
SLUG=$(echo "$IDEA" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50)

# 创建输出目录
IDEAS_DIR="$HOME/clawd/ideas/$SLUG"
mkdir -p "$IDEAS_DIR"

# 聊天的上下文用于通知
CHAT_NAME="${CLAWD_CHAT_NAME:-}"
CHAT_ID="${CLAWD_CHAT_ID:-}"
SESSION_KEY="${CLAWD_SESSION_KEY:-main}"

# 保存元数据
cat > "$IDEAS_DIR/metadata.txt" << EOF
创意: $IDEA
日期: $(date)
Slug: $SLUG
聊天: $CHAT_NAME
聊天 ID: $CHAT_ID
会话: $SESSION_KEY
状态: 进行中
EOF

# 通知命令 - 发送文件到"我"并排队通知
NOTIFY_CMD="$HOME/clawd/scripts/notify-research-complete.sh '$IDEAS_DIR/research.md' '创意: $IDEA' '$SESSION_KEY'"

# 将提示写入文件
PROMPT_FILE="$IDEAS_DIR/prompt.txt"
cat > "$PROMPT_FILE" << PROMPT_END
我有一个想法想让你深入探索：

**创意:** $IDEA

请全面研究和分析这个创意：

## 1. 核心概念分析
- 分解核心问题/机会
- 关键假设和 hypotheses
- 什么让它有趣/独特？

## 2. 市场研究
- 谁会使用这个？（目标用户/角色）
- 市场规模和机会（如果适用，TAM/SAM/SOM）
- 现有解决方案和竞争对手
- 这个可以填补的市场空白

## 3. 技术实施
- 可能的技术栈和方法
- MVP 范围（最简单的有价值版本是什么？）
- 技术挑战和考虑因素
- 构建与购买决策
- 预估开发时间

## 4. 商业模式
- 这个如何赚钱？
- 定价策略和基准
- 单位经济学考量
- 盈利路径

## 5. 上市策略
- 发布策略和定位
- 早期采用者获取策略
- 探索增长渠道
- 考虑的合作伙伴

## 6. 风险与挑战
- 什么可能出错？
- 竞争威胁
- 监管/法律考量
- 技术和运营风险

## 7. 结论与建议

提供明确的结论：
- 🟢 **强烈建议** - 明确的机会，积极追求
- 🟡 **有条件建议** - 有前景但需要验证
- 🟠 **建议转型** - 核心洞察良好，执行需要重新思考
- 🔴 **放弃** - 太多红旗信号

包括：
- 整体评估及推理
- 如果追求，推荐的第一步
- 要运行的关键验证实验
- 30/60/90 天行动计划

---

**重要：** 将您的完整分析保存到此文件：
$IDEAS_DIR/research.md

当您保存分析后，运行此通知命令：
$NOTIFY_CMD

立即开始您的探索。
PROMPT_END

# 创建一个运行脚本，取消设置环境变量并运行 claude
RUNNER_SCRIPT="$IDEAS_DIR/run-claude.sh"
cat > "$RUNNER_SCRIPT" << 'RUNNER_END'
#!/bin/bash
# 取消设置 OAuth 以使用 Claude Max
unset CLAUDE_CODE_OAUTH_TOKEN
unset CLAUDE_CONFIG_DIR
unset ANTHROPIC_BASE_URL

# 读取提示并运行 claude
PROMPT=$(cat "$1")
cd ~/clawd
claude --dangerously-skip-permissions --model opus "$PROMPT"
echo ""
echo "会话完成。按任意键退出。"
read
RUNNER_END
chmod +x "$RUNNER_SCRIPT"

# 启动 tmux 会话
TMUX_SESSION="idea-${SLUG:0:20}-$TIMESTAMP"

echo "💡 创意探索开始"
echo "============================"
echo "📋 创意: $IDEA"
echo "📁 输出: $IDEAS_DIR/research.md"
echo "📺 会话: $TMUX_SESSION"
echo ""

tmux new-session -d -s "$TMUX_SESSION" "$RUNNER_SCRIPT '$PROMPT_FILE'"

echo "✅ 创意探索已启动！"
echo ""
echo "监控进度:"
echo "  tmux attach -t $TMUX_SESSION"
echo ""
echo "完成后您将收到通知。"
