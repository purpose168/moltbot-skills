#!/usr/bin/env bash
# put.io 文件搜索脚本
set -euo pipefail

# 导入 kaput 工具函数
source "$(dirname "$0")/_kaput.sh"

QUERY="${1:-}"
if [[ -z "$QUERY" ]]; then
  echo "用法: $0 <查询词>" >&2
  exit 2
fi

"$KAPUT" files search "$QUERY"
