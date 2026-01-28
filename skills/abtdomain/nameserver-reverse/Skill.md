# DomainKits MCP 服务器

通过MCP兼容客户端提供域名情报工具。

## 接口端点

| 接口端点 | 描述 |
|----------|-------------|
| `https://mcp.domainkits.com/mcp/nrds` | 新注册域名搜索 |
| `https://mcp.domainkits.com/mcp/ns-reverse` | 名称服务器反向查询 |

## 配置说明

### Claude Desktop

编辑配置文件：
- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "domainkits-nrds": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.domainkits.com/mcp/nrds",
        "--transport",
        "http-first"
      ]
    },
    "domainkits-ns-reverse": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.domainkits.com/mcp/ns-reverse",
        "--transport",
        "http-first"
      ]
    }
  }
}
```

### Cursor 编辑器

编辑 `~/.cursor/mcp.json`：
```json
{
  "mcpServers": {
    "domainkits-nrds": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.domainkits.com/mcp/nrds"]
    },
    "domainkits-ns-reverse": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.domainkits.com/mcp/ns-reverse"]
    }
  }
}
```

---

### Gemini CLI

```bash
gemini extensions install https://github.com/ABTdomain/domainkits-mcp
```

## 可用工具

### search_nrds

按关键词搜索新注册的域名。

**参数说明：**

| 名称 | 类型 | 必需 | 默认值 | 描述 |
|------|------|----------|---------|-------------|
| keyword | string | 是 | - | 搜索词（仅限 a-z, 0-9, 连字符，最多20个字符） |
| days | integer | 是 | - | 回溯天数：1-7天 |
| position | string | 否 | any | 关键词位置：`start`（开头）、`end`（结尾）或 `any`（任意位置） |
| tld | string | 否 | all | 按顶级域名筛选（例如 `com`、`net`、`org`） |

**使用示例：**
```bash
curl -X POST https://mcp.domainkits.com/mcp/nrds \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_nrds","arguments":{"keyword":"ai","days":7,"position":"start","tld":"com"}}}'
```

---

### search_ns_reverse

查找托管在特定名称服务器上的gTLD域名。

**参数说明：**

| 名称 | 类型 | 必需 | 默认值 | 描述 |
|------|------|----------|---------|-------------|
| ns | string | 是 | - | 名称服务器主机名（例如 `ns1.google.com`） |
| tld | string | 否 | all | 按顶级域名筛选（例如 `com`、`net`、`org`） |
| min_len | integer | 否 | - | 域名前缀最小长度 |
| max_len | integer | 否 | - | 域名前缀最大长度 |

**使用示例：**
```bash
curl -X POST https://mcp.domainkits.com/mcp/ns-reverse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_ns_reverse","arguments":{"ns":"ns1.google.com","tld":"com","min_len":4,"max_len":8}}}'
```

---

## 使用限制

- 每个IP每分钟最多10次请求
- 每次响应最多返回5个域名
- NRDS数据可能有24-48小时延迟

## 完整访问权限

需要高级筛选和导出功能的完整结果，请访问：
- **新注册域名搜索**：[domainkits.com/search/new](https://domainkits.com/search/new)
- **名称服务器反向查询**：[domainkits.com/tools/ns-reverse](https://domainkits.com/tools/ns-reverse)

## 关于

[DomainKits](https://domainkits.com) - 专为域名投资者、品牌经理和研究人员设计的域名情报工具。

## 隐私政策

- IP地址已匿名化处理
- 搜索查询已匿名化处理
- 日志保留7天
- 不收集任何个人数据

## 许可证

MIT许可证