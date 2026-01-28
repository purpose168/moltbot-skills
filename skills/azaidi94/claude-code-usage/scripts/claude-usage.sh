#!/bin/bash
# Claude Code 使用情况检查脚本
# 查询 Anthropic OAuth API 获取 Claude Code 速率限制

set -euo pipefail

# 缓存文件路径（默认: /tmp/claude-usage-cache）
CACHE_FILE="${CACHE_FILE:-/tmp/claude-usage-cache}"
# 缓存 TTL（默认: 60 秒 = 1 分钟）
CACHE_TTL="${CACHE_TTL:-60}"

# 解析参数
FORCE_REFRESH=0
FORMAT="text"

while [[ $# -gt 0 ]]; do
  case $1 in
    --fresh|--force)
      FORCE_REFRESH=1
      shift
      ;;
    --json)
      FORMAT="json"
      shift
      ;;
    --cache-ttl)
      CACHE_TTL="$2"
      shift 2
      ;;
    --help|-h)
      cat << 'EOF'
用法: claude-usage.sh [选项]

检查 Claude Code OAuth 使用限制（会话和每周）。

选项:
  --fresh, --force    强制刷新（忽略缓存）
  --json              输出为 JSON 格式
  --cache-ttl SEC     缓存 TTL（秒），默认: 60
  --help, -h          显示此帮助信息

示例:
  claude-usage.sh                    # 如果缓存新鲜则使用缓存
  claude-usage.sh --fresh            # 强制调用 API
  claude-usage.sh --json             # JSON 输出
EOF
      exit 0
      ;;
    *)
      echo "未知选项: $1" >&2
      exit 1
      ;;
  esac
done

# 函数：将秒数转换为人类可读格式
secs_to_human() {
  local secs=$1
  if [ "$secs" -lt 0 ]; then secs=0; fi
  local days=$((secs / 86400))
  local hours=$(((secs % 86400) / 3600))
  local mins=$(((secs % 3600) / 60))

  if [ "$days" -gt 0 ]; then
    echo "${days}天 ${hours}小时"
  elif [ "$hours" -gt 0 ]; then
    echo "${hours}小时 ${mins}分钟"
  else
    echo "${mins}分钟"
  fi
}

# 检查缓存（除非强制刷新）
if [ "$FORCE_REFRESH" -eq 0 ] && [ -f "$CACHE_FILE" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE")))
  else
    age=$(($(date +%s) - $(stat -c%Y "$CACHE_FILE")))
  fi

  if [ "$age" -lt "$CACHE_TTL" ]; then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

# 从钥匙串获取 OAuth 令牌（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
  CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || echo "")
else
  # Linux: 检查常见的凭据存储
  if command -v secret-tool >/dev/null 2>&1; then
    CREDS=$(secret-tool lookup application "Claude Code" 2>/dev/null || echo "")
  else
    echo "错误: 找不到凭据存储（需要 macOS 钥匙串或 secret-tool）" >&2
    exit 1
  fi
fi

if [ -z "$CREDS" ]; then
  if [ "$FORMAT" = "json" ]; then
    echo '{"error":"no_credentials","session":null,"weekly":null}'
  else
    echo "❌ 找不到 Claude Code 凭据"
  fi
  exit 1
fi

# 提取令牌信息
TOKEN=$(echo "$CREDS" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')
REFRESH_TOKEN=$(echo "$CREDS" | grep -o '"refreshToken":"[^"]*"' | sed 's/"refreshToken":"//;s/"//')
EXPIRES_AT=$(echo "$CREDS" | grep -o '"expiresAt":[0-9]*' | sed 's/"expiresAt"://')

if [ -z "$TOKEN" ]; then
  if [ "$FORMAT" = "json" ]; then
    echo '{"error":"no_token","session":null,"weekly":null}'
  else
    echo "❌ 无法提取访问令牌"
  fi
  exit 1
fi

# 检查令牌是否过期，如果需要则刷新
if [ -n "$EXPIRES_AT" ]; then
  NOW_MS=$(($(date +%s) * 1000))
  if [ "$NOW_MS" -gt "$EXPIRES_AT" ]; then
    # 令牌已过期 - 触发 Claude CLI 自动刷新
    if command -v claude >/dev/null 2>&1; then
      # 运行简单查询以触发令牌刷新
      echo "2+2" | claude >/dev/null 2>&1 || true

      # 刷新后从钥匙串重新加载凭据
      if [[ "$OSTYPE" == "darwin"* ]]; then
        CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || echo "")
      else
        if command -v secret-tool >/dev/null 2>&1; then
          CREDS=$(secret-tool lookup application "Claude Code" 2>/dev/null || echo "")
        fi
      fi

      if [ -n "$CREDS" ]; then
        TOKEN=$(echo "$CREDS" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')
      fi
    else
      if [ "$FORMAT" = "json" ]; then
        echo '{"error":"token_expired","session":null,"weekly":null}'
      else
        echo "❌ OAuth 令牌已过期。运行 'claude' CLI 刷新。"
      fi
      exit 1
    fi
  fi
fi

# 从 API 获取使用情况
RESP=$(curl -s "https://api.anthropic.com/api/oauth/usage" \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-beta: oauth-2025-04-20" 2>/dev/null)

if [ -z "$RESP" ]; then
  if [ "$FORMAT" = "json" ]; then
    echo '{"error":"api_error","session":null,"weekly":null}'
  else
    echo "❌ API 请求失败"
  fi
  exit 1
fi

# 解析会话（5小时）
SESSION=$(echo "$RESP" | grep -o '"five_hour":{[^}]*}' | grep -o '"utilization":[0-9]*' | sed 's/.*://')
SESSION_RESET=$(echo "$RESP" | grep -o '"five_hour":{[^}]*}' | grep -o '"resets_at":"[^"]*"' | sed 's/"resets_at":"//;s/"//')

# 解析每周（7天）
WEEKLY=$(echo "$RESP" | grep -o '"seven_day":{[^}]*}' | grep -o '"utilization":[0-9]*' | sed 's/.*://')
WEEKLY_RESET=$(echo "$RESP" | grep -o '"seven_day":{[^}]*}' | grep -o '"resets_at":"[^"]*"' | sed 's/"resets_at":"//;s/"//')

SESSION=${SESSION:-0}
WEEKLY=${WEEKLY:-0}

# 计算距离重置的剩余时间
NOW=$(date +%s)

if [ -n "$SESSION_RESET" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    SESSION_TS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${SESSION_RESET%Z}" +%s 2>/dev/null || echo 0)
  else
    SESSION_TS=$(date -d "${SESSION_RESET}" +%s 2>/dev/null || echo 0)
  fi
  SESSION_LEFT=$(secs_to_human $((SESSION_TS - NOW)))
else
  SESSION_LEFT="未知"
fi

if [ -n "$WEEKLY_RESET" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    WEEKLY_TS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${WEEKLY_RESET%Z}" +%s 2>/dev/null || echo 0)
  else
    WEEKLY_TS=$(date -d "${WEEKLY_RESET}" +%s 2>/dev/null || echo 0)
  fi
  WEEKLY_LEFT=$(secs_to_human $((WEEKLY_TS - NOW)))
else
  WEEKLY_LEFT="未知"
fi

# 输出格式
if [ "$FORMAT" = "json" ]; then
  OUTPUT=$(cat <<EOF
{
  "session": {
    "utilization": $SESSION,
    "resets_in": "$SESSION_LEFT",
    "resets_at": "$SESSION_RESET"
  },
  "weekly": {
    "utilization": $WEEKLY,
    "resets_in": "$WEEKLY_LEFT",
    "resets_at": "$WEEKLY_RESET"
  },
  "cached_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
else
  # 美观的文本输出，带 Emoji
  SESSION_BAR=""
  WEEKLY_BAR=""

  # 会话进度条
  SESSION_FILLED=$((SESSION / 10))
  SESSION_EMPTY=$((10 - SESSION_FILLED))
  for ((i=0; i<SESSION_FILLED; i++)); do SESSION_BAR="${SESSION_BAR}█"; done
  for ((i=0; i<SESSION_EMPTY; i++)); do SESSION_BAR="${SESSION_BAR}░"; done

  # 每周进度条
  WEEKLY_FILLED=$((WEEKLY / 10))
  WEEKLY_EMPTY=$((10 - WEEKLY_FILLED))
  for ((i=0; i<WEEKLY_FILLED; i++)); do WEEKLY_BAR="${WEEKLY_BAR}█"; done
  for ((i=0; i<WEEKLY_EMPTY; i++)); do WEEKLY_BAR="${WEEKLY_BAR}░"; done

  # 根据使用量级别确定 Emoji
  if [ "$SESSION" -gt 80 ]; then
    SESSION_EMOJI="🔴"
  elif [ "$SESSION" -gt 50 ]; then
    SESSION_EMOJI="🟡"
  else
    SESSION_EMOJI="🟢"
  fi

  if [ "$WEEKLY" -gt 80 ]; then
    WEEKLY_EMOJI="🔴"
  elif [ "$WEEKLY" -gt 50 ]; then
    WEEKLY_EMOJI="🟡"
  else
    WEEKLY_EMOJI="🟢"
  fi

  OUTPUT=$(cat <<EOF
🦞 Claude Code 使用情况

⏱️  会话 (5h): $SESSION_EMOJI $SESSION_BAR $SESSION%
   重置时间: $SESSION_LEFT

📅 每周 (7d): $WEEKLY_EMOJI $WEEKLY_BAR $WEEKLY%
   重置时间: $WEEKLY_LEFT
EOF
)
fi

# 缓存输出
echo "$OUTPUT" > "$CACHE_FILE"
echo "$OUTPUT"
