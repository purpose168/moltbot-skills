#!/usr/bin/env bash
# put.io 身份验证检查脚本
set -euo pipefail

# 导入 kaput 工具函数
source "$(dirname "$0")/_kaput.sh"

if "$KAPUT" whoami >/dev/null 2>&1; then
  echo "已身份验证"
  exit 0
fi

echo "未身份验证。运行: kaput login" >&2
echo "它将显示一个链接 + 短代码（设备代码流程）。在浏览器中输入代码，CLI 将自动完成。" >&2
exit 1
