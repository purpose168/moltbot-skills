#!/usr/bin/env bash
# put.io 传输列表脚本
set -euo pipefail

# 导入 kaput 工具函数
source "$(dirname "$0")/_kaput.sh"

"$KAPUT" transfers list
