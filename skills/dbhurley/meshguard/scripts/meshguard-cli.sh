#!/usr/bin/env bash
# meshguard-cli.sh — MeshGuard API 包装脚本，用于 Clawdbot
set -euo pipefail

# 加载配置文件（如果存在）
CONFIG_FILE="${HOME}/.meshguard/config"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
fi

# 设置默认值
MESHGUARD_URL="${MESHGUARD_URL:-https://dashboard.meshguard.app}"
MESHGUARD_API_KEY="${MESHGUARD_API_KEY:-}"
MESHGUARD_ADMIN_TOKEN="${MESHGUARD_ADMIN_TOKEN:-}"

API_BASE="${MESHGUARD_URL}/api/v1"

# ─── 辅助函数 ──────────────────────────────────────────────────────────────────

# 错误退出函数
die() { echo "ERROR: $*" >&2; exit 1; }

# 获取认证头
auth_header() {
  [[ -n "$MESHGUARD_API_KEY" ]] || die "MESHGUARD_API_KEY 未设置。请先运行 meshguard-setup.sh。"
  echo "Authorization: Bearer ${MESHGUARD_API_KEY}"
}

# 获取管理员认证头
admin_header() {
  [[ -n "$MESHGUARD_ADMIN_TOKEN" ]] || die "MESHGUARD_ADMIN_TOKEN 未设置。此操作需要管理员权限。"
  echo "Authorization: Bearer ${MESHGUARD_ADMIN_TOKEN}"
}

# 发送 GET 请求
api_get() {
  local endpoint="$1"
  curl -sf -H "$(auth_header)" -H "Content-Type: application/json" "${API_BASE}${endpoint}"
}

# 发送 POST 请求
api_post() {
  local endpoint="$1" data="$2"
  curl -sf -H "$(auth_header)" -H "Content-Type: application/json" -d "$data" "${API_BASE}${endpoint}"
}

# 发送 DELETE 请求
api_delete() {
  local endpoint="$1"
  curl -sf -X DELETE -H "$(auth_header)" -H "Content-Type: application/json" "${API_BASE}${endpoint}"
}

# 发送管理员 POST 请求
api_post_admin() {
  local endpoint="$1" data="$2"
  curl -sf -H "$(admin_header)" -H "Content-Type: application/json" -d "$data" "${API_BASE}${endpoint}"
}

# 格式化 JSON 输出
format_json() {
  if command -v jq &>/dev/null; then
    jq '.'
  else
    cat
  fi
}

# 显示用法帮助
usage() {
  cat <<EOF
使用方法: meshguard-cli.sh <命令> [子命令] [参数...]

命令:
  status                                    检查网关健康状态
  agents list                               列出所有代理
  agents create <name> --tier <tier>        创建代理
  agents get <id>                           获取代理详情
  agents delete <id>                        删除代理
  policies list                             列出所有策略
  policies create <yaml-file>               从 YAML 文件创建策略
  policies get <id>                         获取策略详情
  policies delete <id>                      删除策略
  audit query [--agent X] [--action Y] [--limit N]  查询审计日志
  signup --name <org> --email <email>       自助组织注册

环境变量:
  MESHGUARD_URL          网关 URL（默认: https://dashboard.meshguard.app）
  MESHGUARD_API_KEY      用于认证的 API 密钥
  MESHGUARD_ADMIN_TOKEN  用于组织管理的管理员令牌
EOF
  exit 1
}

# ─── 命令实现 ─────────────────────────────────────────────────────────────────

# 状态检查命令
cmd_status() {
  echo "正在检查 MeshGuard 网关: ${MESHGUARD_URL}..."
  local response
  response=$(curl -sf -H "Content-Type: application/json" "${API_BASE}/health" 2>&1) || {
    echo "失败: 无法连接到 ${API_BASE}/health"
    echo "响应: ${response:-<无响应>}"
    exit 1
  }
  echo "$response" | format_json
  echo ""
  echo "✅ 网关可访问。"
}

# 列出代理命令
cmd_agents_list() {
  api_get "/agents" | format_json
}

# 创建代理命令
cmd_agents_create() {
  local name="" tier="free"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tier) tier="$2"; shift 2 ;;
      *) name="$1"; shift ;;
    esac
  done
  [[ -n "$name" ]] || die "需要代理名称。使用方法: agents create <name> --tier <tier>"
  api_post "/agents" "{\"name\":\"${name}\",\"tier\":\"${tier}\"}" | format_json
}

# 获取代理详情命令
cmd_agents_get() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "需要代理 ID。使用方法: agents get <id>"
  api_get "/agents/${id}" | format_json
}

# 删除代理命令
cmd_agents_delete() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "需要代理 ID。使用方法: agents delete <id>"
  api_delete "/agents/${id}" | format_json
  echo "✅ 代理 ${id} 已删除。"
}

# 列出策略命令
cmd_policies_list() {
  api_get "/policies" | format_json
}

# 创建策略命令
cmd_policies_create() {
  local file="${1:-}"
  [[ -n "$file" ]] || die "需要 YAML 文件。使用方法: policies create <file>"
  [[ -f "$file" ]] || die "文件不存在: $file"

  # 将 YAML 转换为 JSON — 优先使用 yq，回退到 Python
  local json_data
  if command -v yq &>/dev/null; then
    json_data=$(yq -o=json '.' "$file")
  elif command -v python3 &>/dev/null; then
    json_data=$(python3 -c "
import sys, json, yaml
with open('$file') as f:
    print(json.dumps(yaml.safe_load(f)))
" 2>/dev/null) || die "无法解析 YAML。请安装 yq 或 python3 与 PyYAML。"
  else
    die "需要 yq 或 python3+PyYAML 来解析 YAML 文件。"
  fi

  api_post "/policies" "$json_data" | format_json
}

# 获取策略详情命令
cmd_policies_get() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "需要策略 ID。使用方法: policies get <id>"
  api_get "/policies/${id}" | format_json
}

# 删除策略命令
cmd_policies_delete() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "需要策略 ID。使用方法: policies delete <id>"
  api_delete "/policies/${id}" | format_json
  echo "✅ 策略 ${id} 已删除。"
}

# 查询审计日志命令
cmd_audit_query() {
  local agent="" action="" limit="20"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --agent) agent="$2"; shift 2 ;;
      --action) action="$2"; shift 2 ;;
      --limit) limit="$2"; shift 2 ;;
      *) die "未知的审计选项: $1" ;;
    esac
  done

  local query="?limit=${limit}"
  [[ -n "$agent" ]] && query="${query}&agent=${agent}"
  [[ -n "$action" ]] && query="${query}&action=${action}"

  api_get "/audit/logs${query}" | format_json
}

# 注册组织命令
cmd_signup() {
  local name="" email=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2 ;;
      --email) email="$2"; shift 2 ;;
      *) die "未知的注册选项: $1" ;;
    esac
  done
  [[ -n "$name" ]] || die "需要组织名称。使用方法: signup --name <org> --email <email>"
  [[ -n "$email" ]] || die "需要电子邮件。使用方法: signup --name <org> --email <email>"

  api_post_admin "/orgs/signup" "{\"name\":\"${name}\",\"email\":\"${email}\"}" | format_json
}

# ─── 命令路由 ───────────────────────────────────────────────────────────────────

[[ $# -ge 1 ]] || usage

command="$1"; shift

case "$command" in
  status)
    cmd_status
    ;;
  agents)
    sub="${1:-}"; shift || true
    case "$sub" in
      list)   cmd_agents_list ;;
      create) cmd_agents_create "$@" ;;
      get)    cmd_agents_get "$@" ;;
      delete) cmd_agents_delete "$@" ;;
      *)      die "未知的 agents 子命令: $sub。使用: list|create|get|delete" ;;
    esac
    ;;
  policies)
    sub="${1:-}"; shift || true
    case "$sub" in
      list)   cmd_policies_list ;;
      create) cmd_policies_create "$@" ;;
      get)    cmd_policies_get "$@" ;;
      delete) cmd_policies_delete "$@" ;;
      *)      die "未知的 policies 子命令: $sub。使用: list|create|get|delete" ;;
    esac
    ;;
  audit)
    sub="${1:-}"; shift || true
    case "$sub" in
      query) cmd_audit_query "$@" ;;
      *)     die "未知的 audit 子命令: $sub。使用: query" ;;
    esac
    ;;
  signup)
    cmd_signup "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    die "未知命令: $command。运行 'help' 查看用法。"
    ;;
esac
