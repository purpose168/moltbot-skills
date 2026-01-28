#!/bin/bash
# ============================================================================
# Portainer CLI - 通过 Portainer API 控制 Docker 容器
# 作者：Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 🐸 协助）
# ============================================================================
#
# 功能说明：
# 此脚本提供命令行接口，用于通过 Portainer REST API 管理 Docker 容器和堆栈。
# 支持的操作包括：查看状态、列出端点、管理容器、操作堆栈和查看日志。
#
# 使用方法：
#   ./portainer.sh <命令> [参数]
#
# 依赖项：
#   - curl: HTTP 请求工具
#   - jq: JSON 数据处理工具
#   - Portainer API 访问令牌
#
# 环境变量：
#   PORTAINER_URL: Portainer 服务器地址（默认从 ~/.clawdbot/.env 读取）
#   PORTAINER_API_KEY: API 访问令牌（默认从 ~/.clawdbot/.env 读取）
# ============================================================================

set -e

# ============================================================================
# 配置加载
# ============================================================================

# 从环境变量获取配置，如果未设置则为空
PORTAINER_URL="${PORTAINER_URL:-}"
PORTAINER_API_KEY="${PORTAINER_API_KEY:-}"

# 如果环境变量未设置，尝试从 clawdbot .env 文件加载
if [[ -z "$PORTAINER_URL" || -z "$PORTAINER_API_KEY" ]]; then
    ENV_FILE="$HOME/.clawdbot/.env"
    if [[ -f "$ENV_FILE" ]]; then
        export $(grep -E "^PORTAINER_" "$ENV_FILE" | xargs)
    fi
fi

# 验证必需的配置文件是否存在
if [[ -z "$PORTAINER_URL" || -z "$PORTAINER_API_KEY" ]]; then
    echo "错误：必须设置 PORTAINER_URL 和 PORTAINER_API_KEY"
    echo "请添加到 ~/.clawdbot/.env 或导出为环境变量"
    exit 1
fi

# ============================================================================
# API 基础配置
# ============================================================================

# 构建 API 基础 URL
API="$PORTAINER_URL/api"
# 构建认证请求头
AUTH_HEADER="X-API-Key: $PORTAINER_API_KEY"

# ============================================================================
# API 辅助函数
# ============================================================================

# 执行 GET 请求（用于查询操作）
api_get() {
    curl -s -H "$AUTH_HEADER" "$API$1"
}

# 执行 POST 请求（用于创建操作）
api_post() {
    curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" "$API$1" -d "$2"
}

# 执行 PUT 请求（用于更新操作）
api_put() {
    curl -s -X PUT -H "$AUTH_HEADER" -H "Content-Type: application/json" "$API$1" -d "$2"
}

# ============================================================================
# 命令处理
# ============================================================================

case "$1" in
    status)
        # 检查 Portainer 服务器状态和版本
        api_get "/status" | jq -r '"Portainer v\(.Version)"'
        ;;
    
    endpoints|envs)
        # 列出所有 Docker 环境端点
        api_get "/endpoints" | jq -r '.[] | "\(.Id): \(.Name) (\(.Type == 1 | if . then "local" else "remote" end)) - \(if .Status == 1 then "✓ online" else "✗ offline" end)"'
        ;;
    
    containers)
        # 列出指定端点上的所有容器
        ENDPOINT="${2:-4}"  # 默认使用端点 4
        api_get "/endpoints/$ENDPOINT/docker/containers/json?all=true" | jq -r '.[] | "\(.Names[0] | ltrimstr("/"))\t\(.State)\t\(.Status)"' | column -t -s $'\t'
        ;;
    
    stacks)
        # 列出所有 Docker Compose 堆栈
        api_get "/stacks" | jq -r '.[] | "\(.Id): \(.Name) - \(if .Status == 1 then "✓ active" else "✗ inactive" end)"'
        ;;
    
    stack-info)
        # 显示指定堆栈的详细信息
        STACK_ID="$2"
        if [[ -z "$STACK_ID" ]]; then
            echo "用法：portainer.sh stack-info <堆栈ID>"
            exit 1
        fi
        api_get "/stacks/$STACK_ID" | jq '{Id, Name, Status, EndpointId, GitConfig: .GitConfig.URL, UpdateDate: (.UpdateDate | todate)}'
        ;;
    
    redeploy)
        # 从 Git 拉取最新代码并重新部署堆栈
        STACK_ID="$2"
        if [[ -z "$STACK_ID" ]]; then
            echo "用法：portainer.sh redeploy <堆栈ID> [端点ID]"
            exit 1
        fi
        
        # 获取堆栈信息以提取环境变量和端点 ID
        STACK_INFO=$(api_get "/stacks/$STACK_ID")
        ENDPOINT_ID=$(echo "$STACK_INFO" | jq -r '.EndpointId')
        ENV_VARS=$(echo "$STACK_INFO" | jq -c '.Env')
        GIT_CRED_ID=$(echo "$STACK_INFO" | jq -r '.GitConfig.Authentication.GitCredentialID // 0')
        
        # 构建重新部署请求负载
        PAYLOAD=$(jq -n \
            --argjson env "$ENV_VARS" \
            --argjson gitCredId "$GIT_CRED_ID" \
            '{env: $env, prune: false, pullImage: true, repositoryAuthentication: true, repositoryGitCredentialID: $gitCredId}')
        
        # 发送重新部署请求
        RESULT=$(api_put "/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID" "$PAYLOAD")
        
        # 检查部署结果并输出状态
        if echo "$RESULT" | jq -e '.Id' > /dev/null 2>&1; then
            STACK_NAME=$(echo "$RESULT" | jq -r '.Name')
            echo "✓ 堆栈 '$STACK_NAME' 重新部署成功"
        else
            echo "✗ 重新部署失败："
            echo "$RESULT" | jq -r '.message // .details // .'
            exit 1
        fi
        ;;
    
    start)
        # 启动指定容器
        ENDPOINT="${3:-4}"  # 默认端点为 4
        CONTAINER="$2"
        if [[ -z "$CONTAINER" ]]; then
            echo "用法：portainer.sh start <容器名称> [端点ID]"
            exit 1
        fi
        
        # 通过容器名称获取容器 ID
        CONTAINER_ID=$(api_get "/endpoints/$ENDPOINT/docker/containers/json?all=true" | jq -r ".[] | select(.Names[0] == \"/$CONTAINER\") | .Id")
        if [[ -z "$CONTAINER_ID" ]]; then
            echo "✗ 未找到容器 '$CONTAINER'"
            exit 1
        fi
        
        # 发送启动请求
        api_post "/endpoints/$ENDPOINT/docker/containers/$CONTAINER_ID/start" "{}" > /dev/null
        echo "✓ 容器 '$CONTAINER' 已启动"
        ;;
    
    stop)
        # 停止指定容器
        ENDPOINT="${3:-4}"
        CONTAINER="$2"
        if [[ -z "$CONTAINER" ]]; then
            echo "用法：portainer.sh stop <容器名称> [端点ID]"
            exit 1
        fi
        
        # 获取容器 ID
        CONTAINER_ID=$(api_get "/endpoints/$ENDPOINT/docker/containers/json?all=true" | jq -r ".[] | select(.Names[0] == \"/$CONTAINER\") | .Id")
        if [[ -z "$CONTAINER_ID" ]]; then
            echo "✗ 未找到容器 '$CONTAINER'"
            exit 1
        fi
        
        # 发送停止请求
        api_post "/endpoints/$ENDPOINT/docker/containers/$CONTAINER_ID/stop" "{}" > /dev/null
        echo "✓ 容器 '$CONTAINER' 已停止"
        ;;
    
    restart)
        # 重启指定容器
        ENDPOINT="${3:-4}"
        CONTAINER="$2"
        if [[ -z "$CONTAINER" ]]; then
            echo "用法：portainer.sh restart <容器名称> [端点ID]"
            exit 1
        fi
        
        # 获取容器 ID
        CONTAINER_ID=$(api_get "/endpoints/$ENDPOINT/docker/containers/json?all=true" | jq -r ".[] | select(.Names[0] == \"/$CONTAINER\") | .Id")
        if [[ -z "$CONTAINER_ID" ]]; then
            echo "✗ 未找到容器 '$CONTAINER'"
            exit 1
        fi
        
        # 发送重启请求
        api_post "/endpoints/$ENDPOINT/docker/containers/$CONTAINER_ID/restart" "{}" > /dev/null
        echo "✓ 容器 '$CONTAINER' 已重启"
        ;;
    
    logs)
        # 查看容器日志
        ENDPOINT="${3:-4}"
        CONTAINER="$2"
        TAIL="${4:-100}"  # 默认显示最后 100 行
        if [[ -z "$CONTAINER" ]]; then
            echo "用法：portainer.sh logs <容器名称> [端点ID] [行数]"
            exit 1
        fi
        
        # 获取容器 ID
        CONTAINER_ID=$(api_get "/endpoints/$ENDPOINT/docker/containers/json?all=true" | jq -r ".[] | select(.Names[0] == \"/$CONTAINER\") | .Id")
        if [[ -z "$CONTAINER_ID" ]]; then
            echo "✗ 未找到容器 '$CONTAINER'"
            exit 1
        fi
        
        # 获取并显示日志（包含 stdout 和 stderr）
        curl -s -H "$AUTH_HEADER" "$API/endpoints/$ENDPOINT/docker/containers/$CONTAINER_ID/logs?stdout=true&stderr=true&tail=$TAIL" | strings
        ;;
    
    *)
        # 显示帮助信息
        echo "Portainer CLI - 通过 Portainer API 控制 Docker"
        echo ""
        echo "用法：portainer.sh <命令> [参数]"
        echo ""
        echo "可用命令："
        echo "  status                    显示 Portainer 版本"
        echo "  endpoints                 列出所有环境"
        echo "  containers [端点]         列出容器（默认端点：4）"
        echo "  stacks                    列出所有堆栈"
        echo "  stack-info <ID>           显示堆栈详情"
        echo "  redeploy <堆栈ID>         拉取并重新部署堆栈"
        echo "  start <容器>              启动容器"
        echo "  stop <容器>               停止容器"
        echo "  restart <容器>            重启容器"
        echo "  logs <容器> [端点] [行数]  显示容器日志（最后 n 行）"
        echo ""
        echo "环境变量："
        echo "  PORTAINER_URL             Portainer 服务器地址"
        echo "  PORTAINER_API_KEY         API 访问令牌"
        ;;
esac
