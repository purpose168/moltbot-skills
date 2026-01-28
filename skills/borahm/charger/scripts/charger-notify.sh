#!/usr/bin/env bash
set -euo pipefail

# charger-notify.sh
#
# 仅在可用性从 NO/UNKNOWN 变为 YES 时打印通知消息。
# 状态保存在 ~/.cache/charger-notify/<target>.state
#
# 使用方法：
#   bash charger-notify.sh <收藏夹|地点ID|查询>

if [[ $# -lt 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  cat >&2 <<'EOF'
使用方法：
  charger-notify.sh <收藏夹|地点ID|查询>

行为说明：
- 运行 `charger check <target>`
- 如果检测到 `Any free: YES` 且上次状态不是 YES，打印一行通知。
- 否则不打印任何内容。

状态文件：
- ~/.cache/charger-notify/<target>.state
EOF
  exit 2
fi

target="$1"

export PATH="/home/claw/clawd/bin:$PATH"

cache_dir="${HOME}/.cache/charger-notify"
mkdir -p "$cache_dir"

# 安全的文件名（替换特殊字符）
safe_target="${target//[^a-zA-Z0-9_.-]/_}"
state_file="$cache_dir/${safe_target}.state"

last=""
if [[ -f "$state_file" ]]; then
  last="$(cat "$state_file" 2>/dev/null || true)"
fi

out="$(charger check "$target" 2>&1 || true)"

# 检测当前可用性状态
current="UNKNOWN"
if echo "$out" | grep -q "^\- Any free: YES$"; then
  current="YES"
elif echo "$out" | grep -q "^\- Any free: NO$"; then
  current="NO"
fi

# 始终记录当前状态（UNKNOWN 不会产生垃圾通知，但仍然更新状态）
echo "$current" > "$state_file"

if [[ "$current" == "YES" && "$last" != "YES" ]]; then
  # 从充电器输出中提取详细信息
  name="$(echo "$out" | head -n 1)"
  address="$(echo "$out" | sed -n 's/^\- Address: //p' | head -n 1)"
  availability="$(echo "$out" | sed -n 's/^\- Availability: //p' | head -n 1)"
  updated="$(echo "$out" | sed -n 's/^\- Updated: //p' | head -n 1)"

  msg="电动汽车充电器可用: ${name}"
  if [[ -n "$address" ]]; then
    msg+=" — ${address}"
  fi
  if [[ -n "$availability" ]]; then
    msg+=" — ${availability}"
  fi
  if [[ -n "$updated" ]]; then
    msg+=" (更新时间 ${updated})"
  fi

  echo "$msg"
fi
