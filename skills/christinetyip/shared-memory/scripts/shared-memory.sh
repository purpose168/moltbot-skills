#!/bin/bash
# 共享内存管理脚本 - 管理用户、组和权限
# 使用 Ensue - 一个适用于代理的共享内存网络
#
# 用法: ./scripts/shared-memory.sh <操作> [参数...]
#
# 操作:
#   create-user <用户名>
#   delete-user <用户名>
#   create-group <组名>
#   delete-group <组名>
#   add-member <组名> <用户名>
#   remove-member <组名> <用户名>
#   grant <目标类型> <目标名称> <操作> <键模式>
#   revoke <授权ID>
#   list [目标类型] [操作]
#   subscribe <键名>
#   unsubscribe <键名>
#   list-subscriptions

# 遇到错误时立即退出，变量未设置时报错，管道失败时退出
set -euo pipefail

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 从各种来源查找 Ensue API 密钥
find_api_key() {
  # 首先检查环境变量
  if [ -n "${ENSUE_API_KEY:-}" ]; then
    echo "$ENSUE_API_KEY"
    return
  fi

  # 检查 learning-memory 插件
  local key_file="$HOME/.claude/plugins/cache/ensue-learning-memory/ensue-learning-memory/0.2.0/.ensue-key"
  if [ -f "$key_file" ]; then
    cat "$key_file"
    return
  fi

  # 检查 ensue-memory 插件
  key_file="$HOME/.claude/plugins/cache/ensue-memory-network/ensue-memory/0.1.0/.ensue-key"
  if [ -f "$key_file" ]; then
    cat "$key_file"
    return
  fi

  # 检查 clawdbot 配置文件
  if [ -f "$HOME/.clawdbot/clawdbot.json" ]; then
    local key=$(grep -A2 '"ensue-learning-memory"' "$HOME/.clawdbot/clawdbot.json" | grep '"apiKey"' | cut -d'"' -f4)
    if [ -n "$key" ]; then
      echo "$key"
      return
    fi
  fi

  # 未找到密钥，返回空字符串
  echo ""
}

# 查找并设置 API 密钥
ENSUE_API_KEY=$(find_api_key)

# 如果未找到 API 密钥，显示错误信息并退出
if [ -z "$ENSUE_API_KEY" ]; then
  echo '{"error":"未找到 ENSUE_API_KEY。请在 https://www.ensue-network.ai/login 获取免费 API 密钥，然后在 clawdbot.json 的 skills.entries.ensue-learning-memory.apiKey 下配置，或设置为 ENSUE_API_KEY 环境变量。"}'
  exit 1
fi

# 调用 Ensue API 的通用函数
# 参数:
#   $1 - 方法名称
#   $2 - JSON 格式的参数
call_api() {
  local method="$1"
  local args="$2"

  # 使用 curl 发送 POST 请求到 Ensue API 端点
  curl -s -X POST https://api.ensue-network.ai/ \
    -H "Authorization: Bearer $ENSUE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"$method\",\"arguments\":$args},\"id\":1}" \
    | sed 's/^data: //'
}

# 获取第一个参数作为操作类型
ACTION="${1:-}"

# 根据操作类型执行相应的命令
case "$ACTION" in
  # 创建用户
  create-user)
    USERNAME="${2:?需要指定用户名}"
    call_api "share" "{\"command\":{\"command\":\"create_user\",\"username\":\"$USERNAME\"}}"
    ;;

  # 删除用户
  delete-user)
    USERNAME="${2:?需要指定用户名}"
    call_api "share" "{\"command\":{\"command\":\"delete_user\",\"username\":\"$USERNAME\"}}"
    ;;

  # 创建组
  create-group)
    GROUP="${2:?需要指定组名}"
    call_api "share" "{\"command\":{\"command\":\"create_group\",\"group_name\":\"$GROUP\"}}"
    ;;

  # 删除组
  delete-group)
    GROUP="${2:?需要指定组名}"
    call_api "share" "{\"command\":{\"command\":\"delete_group\",\"group_name\":\"$GROUP\"}}"
    ;;

  # 将用户添加到组
  add-member)
    GROUP="${2:?需要指定组名}"
    USERNAME="${3:?需要指定用户名}"
    call_api "share" "{\"command\":{\"command\":\"add_member\",\"group_name\":\"$GROUP\",\"username\":\"$USERNAME\"}}"
    ;;

  # 从组中移除用户
  remove-member)
    GROUP="${2:?需要指定组名}"
    USERNAME="${3:?需要指定用户名}"
    call_api "share" "{\"command\":{\"command\":\"remove_member\",\"group_name\":\"$GROUP\",\"username\":\"$USERNAME\"}}"
    ;;

  # 授予权限
  grant)
    TARGET_TYPE="${2:?需要指定目标类型 (org|user|group)}"
    TARGET_NAME="${3:-}"
    GRANT_ACTION="${4:?需要指定操作 (read|create|update|delete)}"
    KEY_PATTERN="${5:?需要指定键模式}"

    if [ "$TARGET_TYPE" = "org" ]; then
      # 授予整个组织
      call_api "share" "{\"command\":{\"command\":\"grant\",\"target\":{\"type\":\"org\"},\"action\":\"$GRANT_ACTION\",\"key_pattern\":\"$KEY_PATTERN\"}}"
    elif [ "$TARGET_TYPE" = "user" ]; then
      # 授予特定用户
      call_api "share" "{\"command\":{\"command\":\"grant\",\"target\":{\"type\":\"user\",\"username\":\"$TARGET_NAME\"},\"action\":\"$GRANT_ACTION\",\"key_pattern\":\"$KEY_PATTERN\"}}"
    elif [ "$TARGET_TYPE" = "group" ]; then
      # 授予组
      call_api "share" "{\"command\":{\"command\":\"grant\",\"target\":{\"type\":\"group\",\"group_name\":\"$TARGET_NAME\"},\"action\":\"$GRANT_ACTION\",\"key_pattern\":\"$KEY_PATTERN\"}}"
    else
      echo '{"error":"无效的目标类型。使用: org、user 或 group"}'
      exit 1
    fi
    ;;

  # 撤销权限
  revoke)
    GRANT_ID="${2:?需要指定授权ID}"
    call_api "share" "{\"command\":{\"command\":\"revoke\",\"grant_id\":\"$GRANT_ID\"}}"
    ;;

  # 列出权限
  list)
    TARGET_TYPE="${2:-}"
    LIST_ACTION="${3:-}"
    if [ -n "$TARGET_TYPE" ] && [ -n "$LIST_ACTION" ]; then
      call_api "share" "{\"command\":{\"command\":\"list\",\"target_type\":\"$TARGET_TYPE\",\"action\":\"$LIST_ACTION\"}}"
    elif [ -n "$TARGET_TYPE" ]; then
      call_api "share" "{\"command\":{\"command\":\"list\",\"target_type\":\"$TARGET_TYPE\"}}"
    else
      call_api "share" "{\"command\":{\"command\":\"list\"}}"
    fi
    ;;

  # 订阅键的更改通知
  subscribe)
    KEY_NAME="${2:?需要指定键名}"
    call_api "subscribe_to_memory" "{\"key_name\":\"$KEY_NAME\"}"
    ;;

  # 取消订阅
  unsubscribe)
    KEY_NAME="${2:?需要指定键名}"
    call_api "unsubscribe_from_memory" "{\"key_name\":\"$KEY_NAME\"}"
    ;;

  # 列出所有活动订阅
  list-subscriptions)
    call_api "list_subscriptions" "{}"
    ;;

  # 列出当前用户的权限
  list-permissions)
    call_api "list_permissions" "{}"
    ;;

  # 显示帮助信息
  *)
    cat << 'EOF'
共享内存 - 管理用户、组和权限
使用 Ensue - 一个适用于代理的共享内存网络

用法: ./scripts/shared-memory.sh <操作> [参数...]

用户管理:
  create-user <用户名>           创建新用户
  delete-user <用户名>           删除用户

组管理:
  create-group <组名>            创建新组
  delete-group <组名>            删除组
  add-member <组> <用户名>       将用户添加到组
  remove-member <组> <用户名>    从组中移除用户

权限管理:
  grant org <操作> <模式>              授予整个组织
  grant user <用户名> <操作> <模式>    授予特定用户
  grant group <组> <操作> <模式>       授予组
  revoke <授权ID>                      撤销权限
  list [目标类型] [操作]               列出权限
  list-permissions                    列出当前用户的权限

订阅管理:
  subscribe <键名>             订阅键的更改通知
  unsubscribe <键名>           取消订阅
  list-subscriptions           列出活动订阅

操作: read、create、update、delete
模式: 命名空间前缀（例如，"christine/shared/" 匹配该路径下的所有键）

命名空间组织:
  <用户名>/
  ├── private/     -> 仅此用户可见
  ├── shared/      -> 与他人共享
  └── public/      -> 只读知识

示例:
  ./scripts/shared-memory.sh create-user mark
  ./scripts/shared-memory.sh create-group family
  ./scripts/shared-memory.sh add-member family mark
  ./scripts/shared-memory.sh grant group family read christine/shared/
  ./scripts/shared-memory.sh subscribe christine/shared/shopping-list
EOF
    ;;
esac
