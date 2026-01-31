#!/usr/bin/env bash
# meshguard-setup.sh — MeshGuard 首次配置向导
# 功能：引导用户完成 MeshGuard 的初始配置，包括网关 URL、API 密钥等设置
set -euo pipefail

# 配置目录和文件路径
CONFIG_DIR="${HOME}/.meshguard"
CONFIG_FILE="${CONFIG_DIR}/config"

# 显示欢迎信息
echo "╔══════════════════════════════════════════╗"
echo "║       MeshGuard 配置向导                 ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查依赖项
echo "🔍 检查必要的依赖项..."
for bin in curl jq; do
  if ! command -v "$bin" &>/dev/null; then
    echo "⚠️  缺少依赖项: $bin"
    echo "   请在继续前安装它。"
    exit 1
  fi
done
echo "✅ 所有依赖项已就绪"
echo ""

# 加载现有配置（如果存在）
if [[ -f "$CONFIG_FILE" ]]; then
  echo "ℹ️  在 $CONFIG_FILE 找到现有配置"
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
  echo "   当前 URL: ${MESHGUARD_URL:-<未设置>}"
  echo ""
  read -rp "是否覆盖现有配置？ [y/N] " overwrite
  [[ "$overwrite" =~ ^[Yy] ]] || { echo "保持现有配置。"; exit 0; }
  echo ""
fi

# 网关 URL
echo "🎯 配置 MeshGuard 网关"
read -rp "MeshGuard 网关 URL [https://dashboard.meshguard.app]: " url
url="${url:-https://dashboard.meshguard.app}"
# 去除末尾斜杠
url="${url%/}"

# API 密钥
echo ""
echo "🔑 API 密钥配置"
echo "在 MeshGuard 仪表板 → 设置 → API 密钥 中找到"
read -rp "API 密钥: " api_key
if [[ -z "$api_key" ]]; then
  echo "⚠️  未提供 API 密钥。您可以稍后在 $CONFIG_FILE 中添加"
fi

# 管理员令牌（可选）
echo ""
echo "👑 管理员令牌（可选）"
echo "组织注册和管理员操作需要此令牌。"
echo "如果没有，请留空。"
read -rp "管理员令牌: " admin_token

# 保存配置
echo ""
echo "💾 保存配置..."
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_FILE" <<EOF
# MeshGuard 配置 — 由 meshguard-setup.sh 生成
# $(date -Iseconds)
# 配置说明：
# - MESHGUARD_URL: MeshGuard 网关的完整 URL
# - MESHGUARD_API_KEY: 用于 API 访问的密钥
# - MESHGUARD_ADMIN_TOKEN: 用于管理员操作的令牌（可选）
export MESHGUARD_URL="${url}"
export MESHGUARD_API_KEY="${api_key}"
export MESHGUARD_ADMIN_TOKEN="${admin_token}"
EOF

# 设置安全权限
chmod 600 "$CONFIG_FILE"
echo "✅ 配置已保存到 $CONFIG_FILE (权限: 600)"

# 测试连接
echo ""
echo "🌐 测试连接到 ${url}..."
api_base="${url}/api/v1"

if response=$(curl -sf --max-time 10 -H "Content-Type: application/json" "${api_base}/health" 2>&1); then
  echo "✅ 网关可访问！"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
else
  echo "⚠️  无法访问 ${api_base}/health"
  echo "   如果网关在私有网络中，这可能是预期的。"
  echo "   配置已保存 — 您可以稍后使用以下命令测试："
  echo "   bash skills/meshguard/scripts/meshguard-cli.sh status"
fi

# 如果提供了 API 密钥，测试其有效性
if [[ -n "$api_key" ]]; then
  echo ""
  echo "🔐 测试 API 密钥..."
  if response=$(curl -sf --max-time 10 \
    -H "Authorization: Bearer ${api_key}" \
    -H "Content-Type: application/json" \
    "${api_base}/agents" 2>&1); then
    echo "✅ API 密钥有效！"
  else
    echo "⚠️  API 密钥测试失败。密钥可能无效或网关不可访问。"
    echo "   您可以稍后在 $CONFIG_FILE 中更新它"
  fi
fi

echo ""
echo "🎉 设置完成！您现在可以使用 MeshGuard 命令："
echo "  bash skills/meshguard/scripts/meshguard-cli.sh status     # 查看状态"
echo "  bash skills/meshguard/scripts/meshguard-cli.sh agents list # 列出代理"
echo "  bash skills/meshguard/scripts/meshguard-cli.sh help        # 查看帮助"
echo ""
echo "💡 提示：如果需要修改配置，直接编辑 $CONFIG_FILE 文件即可"
