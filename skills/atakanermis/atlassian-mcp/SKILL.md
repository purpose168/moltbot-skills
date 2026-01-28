---
name: mcp-atlassian
description: 在 Docker 中运行 Model Context Protocol (MCP) Atlassian 服务器，实现与 Jira、Confluence 和其他 Atlassian 产品的集成。当您需要查询 Jira 问题、搜索 Confluence 或以编程方式与 Atlassian 服务交互时使用。需要 Docker 和有效的 Jira API 凭据。
---

# MCP Atlassian

## 概述

MCP Atlassian 服务器通过 Model Context Protocol 提供对 Jira 和其他 Atlassian 服务的程序化访问。使用您的 Jira 凭据在 Docker 中运行它，以查询问题、管理项目和与 Atlassian 工具交互。

## 快速开始

使用您的 Jira 凭据拉取并运行容器：

```bash
docker pull ghcr.io/sooperset/mcp-atlassian:latest

docker run --rm -i \
  -e JIRA_URL=https://your-company.atlassian.net \
  -e JIRA_USERNAME=your.email@company.com \
  -e JIRA_API_TOKEN=your_api_token \
  ghcr.io/sooperset/mcp-atlassian:latest
```

**使用脚本（更快）：**

使用您的 API 令牌运行捆绑的脚本：

```bash
JIRA_API_TOKEN=your_token bash scripts/run_mcp_atlassian.sh
```

## 环境变量

- **JIRA_URL**：您的 Atlassian 实例 URL（例如：`https://company.atlassian.net`）
- **JIRA_USERNAME**：您的 Jira 电子邮件地址
- **JIRA_API_TOKEN**：您的 Jira API 令牌（在[账户设置 → 安全](https://id.atlassian.com/manage-profile/security/api-tokens)中创建）

## 将 MCP Atlassian 与 Clawdbot 一起使用

运行后，MCP 服务器公开了 Jira 工具供使用。在您的 Clawdbot 配置中将容器引用为 MCP 源，以查询问题、创建任务或直接从您的智能体管理 Jira。

## 资源

### scripts/
- **run_mcp_atlassian.sh** - 带有凭据处理的简化运行脚本
