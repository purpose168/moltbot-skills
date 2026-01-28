---
name: openai-docs-skill
description: 通过 OpenAI Docs MCP 服务器使用 CLI（curl/jq）查询 OpenAI 开发者文档。当任务涉及 OpenAI API（Responses、Chat Completions、Realtime 等）、OpenAI SDK、ChatGPT Apps SDK、Codex、MCP 集成、端点模式、参数、限制或迁移，且您需要最新的官方指导时使用。
---

# OpenAI 文档 MCP 技能

## 概述

从 shell 使用 OpenAI 开发者文档 MCP 服务器搜索和获取权威文档。对于 OpenAI 平台工作，始终执行此操作，而不是依赖记忆或非官方来源。

## 核心规则

- 对于 OpenAI API/SDK/Apps/Codex 问题或需要精确、当前的文档时，始终使用此技能。
- 通过 `scripts/openai-docs-mcp.sh` 中的 CLI 包装器查询 MCP 服务器（不要依赖 Codex MCP 工具）。
- 使用 `search` 或 `list` 找到最佳文档页面，然后 `fetch` 该页面（或锚点）以获取准确文本。
- 在响应中显示您使用的文档 URL，以便来源清晰。

## 快速开始

```bash
scripts/openai-docs-mcp.sh search "Responses API" 5
scripts/openai-docs-mcp.sh fetch https://platform.openai.com/docs/guides/migrate-to-responses
```

## 工作流程

1. 发现：使用聚焦的查询进行 `search`。如果不确定，使用 `list` 浏览。
2. 阅读：`fetch` 最相关的 URL（可选择添加锚点）。
3. 应用：总结和/或引用相关部分；包含 URL。

## 脚本参考

CLI 包装器位于 `scripts/openai-docs-mcp.sh`，对 `https://developers.openai.com/mcp` 使用 `curl` + `jq`。

子命令：
- `init`：初始化并检查服务器功能。
- `tools`：列出 MCP 服务器上可用的工具。
- `search <查询> [限制] [游标]`：从文档索引返回 JSON 命中。
- `list [限制] [游标]`：浏览文档索引。
- `fetch <URL> [锚点]`：返回文档页面或部分的 markdown。
- `endpoints`：列出 OpenAPI 端点。
- `openapi <端点-url> [lang1,lang2] [仅代码]`：获取 OpenAPI 模式或代码示例。

环境变量：
- `MCP_URL`：覆盖默认的 MCP 端点。