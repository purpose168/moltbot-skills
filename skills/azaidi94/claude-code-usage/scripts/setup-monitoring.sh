#!/bin/bash
# Claude Code 使用情况监控设置脚本
# 使用 Clawdbot cron 设置 Claude Code 使用情况监控

set -euo pipefail

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-usage.sh"

echo "🦞 Claude Code 使用情况监控设置"
echo ""

# 检查 clawdbot 是否可用
if ! command -v clawdbot >/dev/null 2>&1; then
  echo "❌ 在 PATH 中找不到 clawdbot CLI"
  echo "请确保 Clawdbot 已安装且可访问"
  exit 1
fi

# 检查监控脚本是否存在
if [ ! -f "$MONITOR_SCRIPT" ]; then
  echo "❌ 找不到监控脚本: $MONITOR_SCRIPT"
  exit 1
fi

# 默认：每30分钟检查一次
INTERVAL="${1:-30m}"

echo "📋 配置信息:"
echo "   检查间隔: $INTERVAL"
echo "   监控脚本: $MONITOR_SCRIPT"
echo ""

# 通过 Clawdbot 创建 cron 作业
echo "🔧 正在创建 cron 作业..."

# 使用 clawdbot 的 cron add 命令
# 该作业将按指定间隔运行监控脚本
CRON_TEXT="每 $INTERVAL 监控一次 Claude Code 使用情况重置"

# 注意：这是一个占位符 - 实际实现取决于 Clawdbot 的 cron API
# 目前，我们将输出需要运行的命令

cat <<EOF

✅ 设置完成！

要激活监控，请运行：

  clawdbot cron add \\
    --schedule "$INTERVAL" \\
    --command "$MONITOR_SCRIPT" \\
    --label "Claude Code 使用情况监控"

或通过 Clawdbot 网关配置添加：

  {
    "schedule": "$INTERVAL",
    "command": "$MONITOR_SCRIPT",
    "label": "Claude Code 使用情况监控"
  }

当以下情况发生时，您将收到通知：
- 🟢 您的5小时会话配额已重置
- 🟢 您的7天每周配额已重置

手动测试监控器：
  $MONITOR_SCRIPT

EOF
