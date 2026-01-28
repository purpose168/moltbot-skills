#!/usr/bin/env bash
# put.io 状态脚本 - 显示传输列表和可选账户信息
set -euo pipefail

# 导入 kaput 工具函数
source "$(dirname "$0")/_kaput.sh"

# 隐私：whoami 可能会打印您的账户邮箱。仅在明确请求时显示。
if [[ "${SHOW_ACCOUNT:-0}" == "1" ]]; then
  echo "=== 账户 ==="
  "$KAPUT" whoami
  echo ""
fi

echo "=== 传输 ==="
"$KAPUT" transfers list
