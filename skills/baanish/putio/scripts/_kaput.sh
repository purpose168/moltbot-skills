#!/usr/bin/env bash
# kaput CLI 工具函数脚本
# 解析 kaput CLI 的位置并设置全局变量

set -euo pipefail

# 解析 kaput CLI 位置的函数
# 优先级：
# 1. 显式指定 KAPUT_BIN 环境变量
# 2. PATH 中的 kaput
# 3. ~/.cargo/bin/kaput
kaput_resolve() {
  # 如果设置了 KAPUT_BIN 环境变量，优先使用
  if [[ -n "${KAPUT_BIN:-}" ]]; then
    echo "$KAPUT_BIN"
    return 0
  fi

  # 检查 PATH 中是否有 kaput
  if command -v kaput >/dev/null 2>&1; then
    echo "kaput"
    return 0
  fi

  # 检查 ~/.cargo/bin 下的 kaput
  if [[ -x "${HOME}/.cargo/bin/kaput" ]]; then
    echo "${HOME}/.cargo/bin/kaput"
    return 0
  fi

  echo "错误: 找不到 kaput CLI。使用以下命令安装: cargo install kaput-cli（并确保 ~/.cargo/bin 在 PATH 中）" >&2
  return 127
}

# 解析 kaput 位置
KAPUT="$(kaput_resolve)"
