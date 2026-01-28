---
name: deepwiki
description: 查询 DeepWiki MCP 服务器以获取 GitHub 仓库文档、Wiki 结构和 AI 驱动的问题回答。
homepage: https://docs.devin.ai/work-with-devin/deepwiki-mcp
---

# DeepWiki

使用此技能通过 DeepWiki MCP 服务器访问公共 GitHub 仓库的文档。您可以搜索仓库 Wiki、获取结构，并基于仓库文档提出复杂的问题。

## 命令

### 提问
向任何 GitHub 仓库提问，获得 AI 驱动、基于上下文的回答。
```bash
node ./scripts/deepwiki.js ask <所有者/仓库名> "您的问题"
```

### 读取 Wiki 结构
获取 GitHub 仓库的文档主题列表。
```bash
node ./scripts/deepwiki.js structure <所有者/仓库名>
```

### 读取 Wiki 内容
查看 GitHub 仓库 Wiki 中特定路径的文档。
```bash
node ./scripts/deepwiki.js contents <所有者/仓库名> <路径>
```

## 示例

**询问 Devin 的 MCP 使用方法：**
```bash
node ./scripts/deepwiki.js ask cognitionlabs/devin "如何使用 MCP？"
```

**获取 React 文档的结构：**
```bash
node ./scripts/deepwiki.js structure facebook/react
```

## 注意事项

- 基础服务器：`https://mcp.deepwiki.com/mcp`
- 仅适用于公共仓库。
- 无需身份验证。
