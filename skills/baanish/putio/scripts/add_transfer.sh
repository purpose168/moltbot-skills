#!/usr/bin/env bash
# put.io 添加传输脚本
set -euo pipefail

# 导入 kaput 工具函数
source "$(dirname "$0")/_kaput.sh"

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "用法: $0 <磁力链接或URL>" >&2
  exit 2
fi

"$KAPUT" transfers add "$URL"
