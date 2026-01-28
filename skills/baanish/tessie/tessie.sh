#!/bin/bash

# Tessie 技能 - 用于 Tessie API 控制的 CLI 脚本
# 用法: ./tessie.sh [命令] [参数]

# 启用严格模式：任何命令失败、未定义变量、管道失败都会导致脚本退出
set -euo pipefail

# 默认配置（可以从环境变量覆盖）
TESSIE_API_URL="${TESSIE_API_URL:-https://api.tessie.com}"
TESSIE_API_KEY="${TESSIE_API_KEY:-}"

# 从 Clawdbot 配置获取 API 密钥（如果环境变量未设置）
if [[ -z "$TESSIE_API_KEY" ]]; then
    CONFIG_FILE="$HOME/.clawdbot/clawdbot.json"
    if [[ -f "$CONFIG_FILE" ]]; then
        # 使用 jq 从 JSON 配置中提取 Tessie API 密钥
        TESSIE_API_KEY=$(jq -r '.skills.entries.tessie.apiKey // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
        # 可选：从配置中提取车辆 ID
        TESSIE_VEHICLE_ID=$(jq -r '.skills.entries.tessie.vehicleId // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    fi
fi

# 验证 API 密钥是否存在
if [[ -z "$TESSIE_API_KEY" ]]; then
    echo "⚠️  未配置 Tessie API 密钥"
    echo "请设置 TESSIE_API_KEY 环境变量或在 clawdbot.json 中配置"
    exit 1
fi

# 验证温度输入的有效性
# 参数: $1=温度值, $2=最小值, $3=最大值
validate_temp() {
    local temp="$1"
    local min="$2"
    local max="$3"

    # 检查是否为数字
    if ! [[ "$temp" =~ ^[0-9]+$ ]]; then
        echo "⚠️  温度必须是一个数字"
        return 1
    fi

    # 检查是否在有效范围内
    if (( temp < min || temp > max )); then
        echo "⚠️  温度必须在 ${min}°F 和 ${max}°F 之间"
        return 1
    fi
}

# 验证百分比输入的有效性
# 参数: $1=百分比值, $2=值名称（用于错误消息）
validate_percent() {
    local value="$1"
    local name="${2:-Value}"

    # 检查是否为数字
    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "⚠️  ${name} 必须是一个数字"
        return 1
    fi

    # 检查是否在 0-100 范围内
    if (( value < 0 || value > 100 )); then
        echo "⚠️  ${name} 必须在 0 到 100 之间"
        return 1
    fi
}

# 验证车辆 ID 格式（UUID 或整数）
validate_vehicle_id() {
    local id="$1"

    # 检查是否为空
    if [[ -z "$id" ]]; then
        echo "⚠️  车辆 ID 为空"
        return 1
    fi

    # 检查是否为 UUID 格式（第 4 版 UUID）
    if [[ "$id" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
        return 0
    fi

    # 或者检查是否为数字 ID（Tesla 格式）
    if [[ "$id" =~ ^[0-9]+$ ]]; then
        return 0
    fi

    echo "⚠️  无效的车辆 ID 格式"
    return 1
}

# 辅助函数：发送 API 请求
# 参数: $1=HTTP 方法, $2=API 端点, $3=请求数据（可选）
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    if [[ -n "$data" ]]; then
        # POST 请求（带数据）
        curl -s --fail --max-time 30 \
            -H "Authorization: Bearer $TESSIE_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${TESSIE_API_URL}${endpoint}" 2>/dev/null
    else
        # GET 请求（无数据）
        curl -s --fail --max-time 30 \
            -H "Authorization: Bearer $TESSIE_API_KEY" \
            "${TESSIE_API_URL}${endpoint}" 2>/dev/null
    fi
}

# 辅助函数：如果未设置，则获取车辆 ID 和 VIN
get_vehicle_info() {
    # 如果未设置车辆 ID，则从 API 获取
    if [[ -z "$TESSIE_VEHICLE_ID" ]]; then
        RESULT=$(api_request "GET" "/vehicles")
        if [[ $? -ne 0 ]] || [[ -z "$RESULT" ]]; then
            echo "⚠️  无法从 Tessie API 获取车辆信息"
            echo "请在配置中提供 TESSIE_VEHICLE_ID"
            exit 1
        fi
        # 从响应中提取车辆 ID 和 VIN
        TESSIE_VEHICLE_ID=$(echo "$RESULT" | jq -r '.results[0].last_state.vehicle_id // empty')
        TESSIE_VIN=$(echo "$RESULT" | jq -r '.results[0].vin // empty')

        if [[ -z "$TESSIE_VEHICLE_ID" ]]; then
            echo "⚠️  您的 Tessie 账户下未找到车辆"
            exit 1
        fi
    else
        # 如果已设置车辆 ID，则从车辆端点获取 VIN
        RESULT=$(api_request "GET" "/vehicles")
        if [[ $? -eq 0 ]] && [[ -n "$RESULT" ]]; then
            TESSIE_VIN=$(echo "$RESULT" | jq -r '.results[0].vin // empty')
        fi
    fi
}

# 辅助函数：获取车辆状态
get_vehicle_state() {
    get_vehicle_info
    ALL_VEHICLES=$(api_request "GET" "/vehicles")

    if [[ $? -ne 0 ]] || [[ -z "$ALL_VEHICLES" ]]; then
        echo "⚠️  获取车辆状态失败"
        return 1
    fi

    # 提取车辆状态 JSON
    STATE=$(echo "$ALL_VEHICLES" | jq -r '.results[0].last_state')

    if [[ -z "$STATE" ]] || [[ "$STATE" == "null" ]]; then
        echo "⚠️  车辆状态不可用"
        return 1
    fi

    return 0
}

# 解析命令参数
COMMAND="${1:-help}"

# 命令处理主逻辑
case "$COMMAND" in
    status|vehicle-state|state)
        # 获取车辆状态
        if ! get_vehicle_state; then
            exit 1
        fi

        echo "🚗 车辆状态:"
        echo "$STATE" | jq -r '
            "🔋 电池: \(.charge_state.battery_level // "N/A")%",
            "📏 续航: \(.charge_state.battery_range // "N/A") 英里",
            "🔒 锁定: \(.vehicle_state.locked // "N/A")",
            "🔌 充电: \(.charge_state.charging_state // "N/A")",
            "🌡️  温度: \(.climate_state.inside_temp // "N/A")°C",
            "🚗 状态: \(.state // "N/A")"
        '
        ;;

    battery|charge|soc)
        # 获取电池电量
        if ! get_vehicle_state; then
            exit 1
        fi

        LEVEL=$(echo "$STATE" | jq -r '.charge_state.battery_level // "N/A"')
        RANGE=$(echo "$STATE" | jq -r '.charge_state.battery_range // "N/A"')

        echo "🔋 电池: ${LEVEL}%"
        echo "📏 续航: ${RANGE} 英里"
        ;;

    location|where)
        # 获取车辆位置
        if ! get_vehicle_state; then
            exit 1
        fi

        echo "$STATE" | jq -r '
            "📍 位置:",
            "  纬度: \(.drive_state.latitude // "Unknown")",
            "  经度: \(.drive_state.longitude // "Unknown")",
            "  档位: \(.drive_state.shift_state // "Unknown")",
            "  速度: \(.drive_state.speed // 0) mph"
        '
        ;;

    drives|drive-history|recent-drives)
        # 获取最近行程
        get_vehicle_info
        LIMIT="${1:-5}"

        if ! validate_number "$LIMIT"; then
            echo "⚠️  限制必须是一个数字"
            exit 1
        fi

        DRIVES=$(api_request "GET" "/${TESSIE_VIN}/drives?limit=${LIMIT}")

        if [[ $? -ne 0 ]] || [[ -z "$DRIVES" ]]; then
            echo "⚠️  获取行程失败"
            exit 1
        fi

        echo "🚗 最近行程（最近 ${LIMIT} 条）:"
        echo "$DRIVES" | jq -r '
            .results[] |
            "(.ended_at | strftime("%Y-%m-%d %H:%M")): (.ending_saved_location // "Unknown") " +
            "((.odometer_distance // 0) 英里, (.energy_used // 0) kWh)"
        '
        ;;


    preheat|heat|warm)
        # 预热车辆
        get_vehicle_info
        echo "🔥 正在启动空调..."

        PAYLOAD=$(jq -n --arg t "$TEMP" '{temperature: $t}')
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/start_climate" "$PAYLOAD")

        if [[ $? -eq 0 ]]; then
            echo "✅ 空调已启动"
        else
            echo "⚠️  启动空调失败"
            echo "响应: $RESULT"
        fi
        ;;

    precool|cool|ac)
        # 预冷车辆（预热的别名）
        TEMP="${2:-68}"
        if ! validate_temp "$TEMP" 60 75; then
            exit 1
        fi

        get_vehicle_id
        echo "❄️  正在将车辆预冷至 ${TEMP}°F..."

        PAYLOAD=$(jq -n --arg t "$TEMP" '{temperature: $t}')
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/start_climate" "$PAYLOAD")

        if [[ $? -eq 0 ]]; then
            echo "✅ 空调已启动"
        else
            echo "⚠️  启动空调失败"
            echo "响应: $RESULT"
        fi
        ;;

    climate-off|ac-off|heat-off)
        # 关闭空调
        get_vehicle_id
        echo "🌡️  正在关闭空调..."
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/stop_climate")

        if [[ $? -eq 0 ]]; then
            echo "✅ 空调已关闭"
        else
            echo "⚠️  关闭空调失败"
            echo "响应: $RESULT"
        fi
        ;;

    drives|history|trips)
        # 显示行程历史
        LIMIT="${2:-10}"
        if ! validate_percent "$LIMIT" "Limit"; then
            exit 1
        fi

        get_vehicle_id
        echo "🚗 最近行程（最近 ${LIMIT} 条）:"
        RESULT=$(api_request "GET" "/${TESSIE_VIN}/drives?limit=${LIMIT}")

        if [[ $? -ne 0 ]] || [[ -z "$RESULT" ]]; then
            echo "⚠️  获取行程失败"
            exit 1
        fi

        DRIVE_COUNT=$(echo "$RESULT" | jq -r '.drives | length // 0')
        if [[ "$DRIVE_COUNT" == "0" ]]; then
            echo "在范围内未找到行程"
        else
            echo "$RESULT" | jq -r '
                .drives[] |
                "📅 \(.date // "Unknown") - \(.distance // "N/A") 英里",
                "   持续时间: \(.duration // "N/A")",
                "   效率: \(.efficiency // "N/A") Wh/mi"
            '
        fi
        ;;

    charge-start|start-charging|plug)
        # 开始充电
        get_vehicle_id
        echo "🔌 正在开始充电..."
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/start_charging")

        if [[ $? -eq 0 ]]; then
            echo "✅ 充电已开始"
        else
            echo "⚠️  开始充电失败"
            echo "响应: $RESULT"
        fi
        ;;

    charge-stop|stop-charging|unplug)
        # 停止充电
        get_vehicle_id
        echo "🛑 正在停止充电..."
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/stop_charging")

        if [[ $? -eq 0 ]]; then
            echo "✅ 充电已停止"
        else
            echo "⚠️  停止充电失败"
            echo "响应: $RESULT"
        fi
        ;;

    charge-limit|set-limit)
        # 设置充电限制
        LIMIT="${2:-90}"
        if ! validate_percent "$LIMIT" "Charge limit"; then
            exit 1
        fi

        get_vehicle_id
        echo "🔋 正在将充电限制设置为 ${LIMIT}%..."

        PAYLOAD=$(jq -n --arg l "$LIMIT" '{limit: $l}')
        RESULT=$(api_request "POST" "/${TESSIE_VIN}/command/set_charge_limit" "$PAYLOAD")

        if [[ $? -eq 0 ]]; then
            echo "✅ 充电限制已设置为 ${LIMIT}%"
        else
            echo "⚠️  设置充电限制失败"
            echo "响应: $RESULT"
        fi
        ;;

    fsd|fsd-stats|autopilot)
        # 获取 FSD 使用统计
        RANGE="${2:-today}"
        get_vehicle_id

        echo "🚗 FSD 统计（${RANGE}）:"
        RESULT=$(api_request "GET" "/${TESSIE_VIN}/drives?range=${RANGE}")

        if [[ $? -ne 0 ]] || [[ -z "$RESULT" ]]; then
            echo "⚠️  无法获取 FSD 统计。请检查车辆是否启用了 FSD。"
            echo "响应: $RESULT"
            exit 1
        fi

        echo "$RESULT" | jq -r '
            "🤖 FSD 里程: \(.miles // 0) 英里",
            "📈 使用率: \(.engagement // 0)%",
            "⏱️  时间: \(.hours // 0) 小时",
            "📅 期间: \(.period // "Unknown")"
        '
        ;;

    fsd-week|weekly-fsd)
        # 每周 FSD 统计
        get_vehicle_id
        echo "📊 每周 FSD 统计:"
        RESULT=$(api_request "GET" "/${TESSIE_VIN}/drives?range=week")

        if [[ $? -ne 0 ]] || [[ -z "$RESULT" ]]; then
            echo "⚠️  无法获取 FSD 统计"
            echo "响应: $RESULT"
            exit 1
        fi

        echo "$RESULT" | jq -r '
            "🤖 FSD 里程: \(.miles // 0) 英里",
            "📈 使用率: \(.engagement // 0)%",
            "📅 天数: \(.days // 0)"
        '
        ;;

    fsd-month|monthly-fsd)
        # 每月 FSD 统计
        get_vehicle_id
        echo "📅 每月 FSD 统计:"
        RESULT=$(api_request "GET" "/${TESSIE_VIN}/drives?range=month")

        if [[ $? -ne 0 ]] || [[ -z "$RESULT" ]]; then
            echo "⚠️  无法获取 FSD 统计"
            echo "响应: $RESULT"
            exit 1
        fi

        echo "$RESULT" | jq -r '
            "🤖 FSD 里程: \(.miles // 0) 英里",
            "📈 使用率: \(.engagement // 0)%",
            "📅 天数: \(.days // 0)"
        '
        ;;

    help|--help|-h)
        cat << EOF
Tessie 技能 - 通过 Tessie API 控制您的 Tesla

命令:
  status / state          显示车辆状态（电池、位置等）
  battery / charge         显示电池电量和续航
  location / where          显示车辆位置
  preheat [temp]          预热车辆到指定温度（默认: 72°F）
  precool [temp]          预冷车辆到指定温度（默认: 68°F）
  climate-off             关闭空调控制
  drives [limit]           显示最近行程（默认: 10）
  charge-start             开始充电
  charge-stop             停止充电
  charge-limit [percent]    设置充电限制（默认: 90%）
  fsd [range]            显示 FSD 使用情况（today/week/month）
  fsd-week               每周 FSD 统计
  fsd-month              每月 FSD 统计

示例:
  ./tessie.sh battery
  ./tessie.sh preheat 72
  ./tessie.sh drives 5
  ./tessie.sh fsd today
  ./tessie.sh fsd-week

设置:
  1. 从 https://tessie.com/developers 获取 API 密钥
  2. 设置 TESSIE_API_KEY 环境变量或添加到 clawdbot.json
  3. 如果已知，可选设置 TESSIE_VEHICLE_ID
EOF
        ;;

    *)
        echo "未知命令: $COMMAND"
        echo "运行 './tessie.sh help' 获取用法帮助"
        exit 1
        ;;
esac
