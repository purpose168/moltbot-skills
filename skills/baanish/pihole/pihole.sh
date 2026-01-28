#!/bin/bash

# Pi-hole 技能 - 用于 Pi-hole v6 API 控制的 CLI 脚本
# 用法: ./pihole.sh [命令] [参数]

set -o pipefail

# 默认配置（可以从环境变量覆盖）
PIHOLE_API_URL="${PIHOLE_API_URL:-http://pi-hole.local/admin/api.php}"
PIHOLE_API_TOKEN="${PIHOLE_API_TOKEN:-}"
PIHOLE_INSECURE="${PIHOLE_INSECURE:-false}"

# 从 Clawdbot 配置获取 API 配置（如果环境变量未设置）
if [[ -z "$PIHOLE_API_TOKEN" ]]; then
    CONFIG_FILE="$HOME/.clawdbot/clawdbot.json"
    if [[ -f "$CONFIG_FILE" ]]; then
        PIHOLE_API_URL=$(jq -r '.skills.entries.pihole.apiUrl // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
        PIHOLE_API_TOKEN=$(jq -r '.skills.entries.pihole.apiToken // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
        PIHOLE_INSECURE=$(jq -r '.skills.entries.pihole.insecure // "false"' "$CONFIG_FILE" 2>/dev/null || echo "false")
    fi
fi

# 验证 API URL 和令牌
if [[ -z "$PIHOLE_API_URL" ]] || [[ "$PIHOLE_API_URL" == "empty" ]]; then
    echo "⚠️  未配置 Pi-hole API URL"
    echo "请设置 PIHOLE_API_URL 环境变量或在 clawdbot.json 中配置"
    exit 1
fi

if [[ -z "$PIHOLE_API_TOKEN" ]] || [[ "$PIHOLE_API_TOKEN" == "empty" ]]; then
    echo "⚠️  未配置 Pi-hole API 令牌"
    echo "请设置 PIHOLE_API_TOKEN 环境变量或在 clawdbot.json 中配置"
    exit 1
fi

# 根据 insecure 设置构建 curl 标志
CURL_FLAGS="-s --fail --max-time 30"
if [[ "$PIHOLE_INSECURE" == "true" ]]; then
    CURL_FLAGS="$CURL_FLAGS -k"
fi

# 验证数值输入
validate_number() {
    local value="$1"
    local name="$2"
    local min="${3:-0}"

    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "⚠️  ${name} 必须是一个数字"
        exit 1
    fi

    if (( value < min )); then
        echo "⚠️  ${name} 必须至少为 ${min}"
        exit 1
    fi
    return 0
}

# 验证域名输入
validate_domain() {
    local domain="$1"

    if [[ -z "$domain" ]]; then
        echo "⚠️  域名不能为空"
        exit 1
    fi

    # 基本域名验证
    if ! [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        echo "⚠️  无效的域名格式: $domain"
        exit 1
    fi
    return 0
}

# 获取会话令牌（Pi-hole v6 API 需要）
get_session() {
    local response
    response=$(curl $CURL_FLAGS \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"$PIHOLE_API_TOKEN\"}" \
        "${PIHOLE_API_URL}/auth" 2>/dev/null)

    if ! echo "$response" | jq -e '.session.sid' >/dev/null 2>&1; then
        echo "⚠️  无法通过 Pi-hole 身份验证"
        echo "响应: $response"
        exit 1
    fi

    echo "$response" | jq -r '.session.sid'
}

# 辅助函数：发送经过身份验证的 API 请求
api_request() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    local session

    session=$(get_session) || exit 1

    if [[ -n "$data" ]]; then
        curl $CURL_FLAGS \
            -H "sid: $session" \
            -H "Content-Type: application/json" \
            -X "$method" \
            -d "$data" \
            "${PIHOLE_API_URL}${endpoint}" 2>/dev/null
    else
        curl $CURL_FLAGS \
            -H "sid: $session" \
            "${PIHOLE_API_URL}${endpoint}" 2>/dev/null
    fi
}

# 解析命令
COMMAND="${1:-help}"

case "$COMMAND" in
    status)
        # 获取 Pi-hole 拦截状态
        RESULT=$(api_request "/dns/blocking")
        if ! echo "$RESULT" | jq -e '.blocking' >/dev/null 2>&1; then
            echo "⚠️  无法确定状态"
            echo "响应: $RESULT"
            exit 1
        fi

        BLOCKING=$(echo "$RESULT" | jq -r '.blocking')
        TIMER=$(echo "$RESULT" | jq -r '.timer // "none"')

        if [[ "$BLOCKING" == "true" ]]; then
            echo "🟢 Pi-hole 已启用"
            if [[ "$TIMER" != "none" ]] && [[ "$TIMER" != "null" ]]; then
                echo "⏱️  已临时禁用 $TIMER 秒"
            fi
        else
            echo "🔴 Pi-hole 已禁用"
            if [[ "$TIMER" != "none" ]] && [[ "$TIMER" != "null" ]]; then
                echo "⏱️  将在 $TIMER 秒后重新启用"
            fi
        fi
        ;;

    on|enable)
        # 启用 Pi-hole 拦截
        echo "正在启用 Pi-hole..."
        RESULT=$(api_request "/dns/blocking" "POST" '{"blocking":true}')
        BLOCKING=$(echo "$RESULT" | jq -r '.blocking')
        if [[ "$BLOCKING" == "true" ]] || [[ "$BLOCKING" == "enabled" ]]; then
            echo "✅ Pi-hole 现在已启用"
        else
            echo "⚠️  启用 Pi-hole 失败"
            echo "响应: $RESULT"
            exit 1
        fi
        ;;

    off|disable)
        # 禁用 Pi-hole 拦截（无限期）
        echo "正在禁用 Pi-hole..."
        RESULT=$(api_request "/dns/blocking" "POST" '{"blocking":false}')
        BLOCKING=$(echo "$RESULT" | jq -r '.blocking')
        if [[ "$BLOCKING" == "false" ]] || [[ "$BLOCKING" == "disabled" ]]; then
            echo "✅ Pi-hole 现在已禁用"
        else
            echo "⚠️  禁用 Pi-hole 失败"
            echo "响应: $RESULT"
            exit 1
        fi
        ;;

    5m|5min)
        # 禁用 5 分钟
        echo "正在禁用 Pi-hole 5 分钟..."
        RESULT=$(api_request "/dns/blocking" "POST" '{"blocking":false,"timer":300}')
        BLOCKING=$(echo "$RESULT" | jq -r '.blocking')
        if [[ "$BLOCKING" == "false" ]] || [[ "$BLOCKING" == "disabled" ]]; then
            echo "✅ Pi-hole 已禁用 5 分钟"
        else
            echo "⚠️  禁用 Pi-hole 失败"
            echo "响应: $RESULT"
            exit 1
        fi
        ;;

    disable)
        # 禁用自定义时长（分钟）
        DURATION="${2:-5}"
        if ! validate_number "$DURATION" "Duration" "1"; then
            exit 1
        fi
        SECONDS=$((DURATION * 60))
        echo "正在禁用 Pi-hole ${DURATION} 分钟..."
        RESULT=$(api_request "/dns/blocking" "POST" "{\"blocking\":false,\"timer\":$SECONDS}")
        BLOCKING=$(echo "$RESULT" | jq -r '.blocking')
        if [[ "$BLOCKING" == "false" ]] || [[ "$BLOCKING" == "disabled" ]]; then
            echo "✅ Pi-hole 已禁用 ${DURATION} 分钟"
        else
            echo "⚠️  禁用 Pi-hole 失败"
            echo "响应: $RESULT"
            exit 1
        fi
        ;;

    blocked|recent-blocked|blocked-last-5m)
        # 显示最近被拦截的内容（默认最近 30 分钟）
        DURATION="${2:-1800}"
        if ! validate_number "$DURATION" "Duration" "1"; then
            exit 1
        fi

        echo "🔍 正在检查最近 $((DURATION / 60)) 分钟的被拦截查询..."
        RESULT=$(api_request "/queries?start=-${DURATION}")

        if ! echo "$RESULT" | jq -e '.queries' >/dev/null 2>&1; then
            echo "⚠️  无法获取被拦截的查询"
            echo "响应: $RESULT"
            exit 1
        fi

        BLOCKED=$(echo "$RESULT" | jq -r '.queries | map(select(.status=="GRAVITY")) | .[] | .domain' | sort | uniq -c | sort -rn | head -20)

        if [[ -z "$BLOCKED" ]]; then
            echo "✅ 最近 $((DURATION / 60)) 分钟没有域名被拦截"
        else
            echo "🚫 被拦截的域名（时间窗口内的计数）:"
            echo "$BLOCKED" | awk '{printf "%4dx %s\n", $1, $2}'
        fi
        ;;

    stats|summary)
        # 显示 Pi-hole 统计信息
        echo "📊 Pi-hole 统计信息:"
        RESULT=$(api_request "/stats/summary")

        if ! echo "$RESULT" | jq -e '.queries' >/dev/null 2>&1; then
            echo "⚠️  无法获取统计信息"
            echo "响应: $RESULT"
            exit 1
        fi

        QUERIES=$(echo "$RESULT" | jq -r '.queries.total // 0')
        BLOCKED=$(echo "$RESULT" | jq -r '.queries.blocked // 0')
        DOMAINS=$(echo "$RESULT" | jq -r '.gravity.domains_being_blocked // 0')
        CLIENTS=$(echo "$RESULT" | jq -r '.clients.active // 0')

        if (( QUERIES > 0 )); then
            PERCENT=$(awk "BEGIN {printf \"%.1f\", ($BLOCKED / $QUERIES) * 100}" <<< "$QUERIES $BLOCKED")
        else
            PERCENT="0.0"
        fi

        echo "查询: $QUERIES"
        echo "已拦截: $BLOCKED (${PERCENT}%)"
        echo "被拦截的域名: $DOMAINS"
        echo "活跃客户端: $CLIENTS"
        ;;

    top-domains)
        # 显示最多访问的域名
        LIMIT="${2:-10}"
        if ! validate_number "$LIMIT" "Limit" "1"; then
            exit 1
        fi

        echo "📊 最多 ${LIMIT} 个域名:"
        RESULT=$(api_request "/stats/query_types?start=-86400")

        if ! echo "$RESULT" | jq -e '.top_domains' >/dev/null 2>&1; then
            echo "⚠️  无法获取最多域名"
            echo "响应: $RESULT"
            exit 1
        fi

        echo "$RESULT" | jq -r ".top_domains[0:$LIMIT] | .[] | \"\(.count) \(.domain)\""
        ;;

    whitelist|add-whitelist)
        # 通过 DNSMASQ 配置将域名添加到白名单（v6 中）
        DOMAIN="${2}"
        if ! validate_domain "$DOMAIN"; then
            exit 1
        fi

        echo "⚠️  白名单功能需要在 Pi-hole v6 中配置 DNSMASQ"
        echo "域名: $DOMAIN"
        echo "此功能尚未通过 API 实现"
        exit 1
        ;;

    help|--help|-h)
        cat << EOF
Pi-hole 技能 - 控制 Pi-hole DNS 拦截器（v6 API）

命令:
  status                    显示 Pi-hole 是否启用/禁用
  on / enable               启用广告拦截
  off / disable             禁用广告拦截
  5m / 5min              禁用 5 分钟
  disable <分钟>         禁用自定义时长
  blocked [秒]          显示被拦截的域名（默认: 30 分钟）
  stats / summary           显示 Pi-hole 统计信息
  top-domains [限制]        显示最多域名（默认: 10）

示例:
  ./pihole.sh status
  ./pihole.sh disable 5
  ./pihole.sh blocked 600  （显示最近 10 分钟被拦截的）
  ./pihole.sh stats

配置:
  在 clawdbot.json skills.entries.pihole 中设置 PIHOLE_API_URL 和 PIHOLE_API_TOKEN
  设置 insecure: true 以绕过 SSL 证书验证

EOF
        ;;

    *)
        echo "未知命令: $COMMAND"
        echo "运行 './pihole.sh help' 获取用法帮助"
        exit 1
        ;;
esac
