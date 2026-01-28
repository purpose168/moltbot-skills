#!/bin/bash
# ============================================================================
# MCP Atlassian Docker 运行脚本
# 使用 Jira 凭据运行 Atlassian MCP 容器
# ============================================================================
#
# 功能说明：
# 此脚本用于在 Docker 容器中运行 MCP Atlassian 服务器。
# MCP（Model Context Protocol）是一种协议，允许通过标准化的接口
# 与 Atlassian 产品（如 Jira、Confluence）进行程序化交互。
#
# 使用方法：
#   JIRA_URL=https://company.atlassian.net \
#   JIRA_USERNAME=your.email@company.com \
#   JIRA_API_TOKEN=your_api_token \
#   bash scripts/run_mcp_atlassian.sh
#
# 前置条件：
#   - 已安装 Docker
#   - 已安装 jq（用于 JSON 处理，可选）
#   - 有效的 Jira API 令牌
#
# 依赖镜像：
#   - ghcr.io/sooperset/mcp-atlassian:latest
#
# 环境变量说明：
#   JIRA_URL: Atlassian 实例的基础 URL
#   JIRA_USERNAME: Jira 账户的电子邮件地址
#   JIRA_API_TOKEN: Jira API 令牌（用于身份验证）
# ============================================================================

set -e

# ============================================================================
# 验证必需的环境变量
# ============================================================================

# 检查 JIRA_URL 是否已设置
# JIRA_URL 是 Atlassian 实例的访问地址，格式如：https://company.atlassian.net
if [ -z "$JIRA_URL" ]; then
    echo "错误：未设置 JIRA_URL（例如：https://company.atlassian.net）"
    exit 1
fi

# 检查 JIRA_USERNAME 是否已设置
# JIRA_USERNAME 是您的 Jira 账户电子邮件地址，用于身份验证
if [ -z "$JIRA_USERNAME" ]; then
    echo "错误：未设置 JIRA_USERNAME（您的 Jira 电子邮件地址）"
    exit 1
fi

# 检查 JIRA_API_TOKEN 是否已设置
# JIRA_API_TOKEN 是您创建的 API 令牌，用于安全地访问 Jira API
# 创建地址：https://id.atlassian.com/manage-profile/security/api-tokens
if [ -z "$JIRA_API_TOKEN" ]; then
    echo "错误：未设置 JIRA_API_TOKEN"
    exit 1
fi

echo "启动 MCP Atlassian 容器..."
echo "   URL: $JIRA_URL"
echo "   用户: $JIRA_USERNAME"

# ============================================================================
# 运行 Docker 容器
# ============================================================================
#
# 容器启动参数说明：
#   --rm: 容器退出后自动删除，避免残留
#   -i: 以交互模式运行（保持 STDIN 打开）
#   -e: 设置环境变量，传递给容器内的进程
#
# 环境变量传递：
#   JIRA_URL: Atlassian 实例地址
#   JIRA_USERNAME: 用户邮箱（用于 Basic Auth）
#   JIRA_API_TOKEN: API 令牌（用于身份验证）
#
# 使用的镜像：
#   ghcr.io/sooperset/mcp-atlassian:latest
#   这是一个开源的 MCP Atlassian 服务器实现
# ============================================================================

docker run --rm -i \
  -e JIRA_URL="$JIRA_URL" \
  -e JIRA_USERNAME="$JIRA_USERNAME" \
  -e JIRA_API_TOKEN="$JIRA_API_TOKEN" \
  ghcr.io/sooperset/mcp-atlassian:latest
