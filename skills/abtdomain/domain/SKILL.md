---
name: domainkits
description: 域名情报工具包 - 按关键词搜索新注册域名(NRDS)和按名称服务器反向查找域名(NS Reverse)。适用于域名投资者、品牌保护和研究报告。
metadata: {"clawdbot":{"emoji":"🌐","requires":{"bins":["curl"]},"homepage":"https://domainkits.com"}}
user-invocable: true
---

# DomainKits - 域名情报工具包

适用于投资者、品牌经理和研究人员的域名情报工具。

---

## 工具1：search_nrds（新注册域名搜索）

搜索最近1-7天内注册的域名。

**接口端点：** `POST https://mcp.domainkits.com/mcp/nrds`

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|-----------|------|----------|---------|-------------|
| keyword | string | 是 | - | 搜索词（a-z, 0-9, 连字符，最多20个字符） |
| days | integer | 是 | - | 回溯时间：1-7天 |
| position | string | 否 | any | `start`（开头）、`end`（结尾）或 `any`（任意位置） |
| tld | string | 否 | all | 筛选：筛选特定顶级域名，如 `com`、`net`、`org` 等 |

**示例：**
```bash
curl -X POST https://mcp.domainkits.com/mcp/nrds \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_nrds","arguments":{"keyword":"ai","days":7,"position":"start","tld":"com"}}}'
```

---

## 工具2：search_ns_reverse（名称服务器反向查询）

查找托管在特定名称服务器上的gTLD域名。

**接口端点：** `POST https://mcp.domainkits.com/mcp/ns-reverse`

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|-----------|------|----------|---------|-------------|
| ns | string | 是 | - | 名称服务器主机名（例如 `ns1.google.com`） |
| tld | string | 否 | all | 筛选：筛选特定顶级域名，如 `com`、`net`、`org` 等 |
| min_len | integer | 否 | - | 域名前缀最小长度 |
| max_len | integer | 否 | - | 域名前缀最大长度 |

**示例：**
```bash
curl -X POST https://mcp.domainkits.com/mcp/ns-reverse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_ns_reverse","arguments":{"ns":"ns1.cloudflare.com","tld":"com","min_len":4,"max_len":10}}}'
```

---

## 使用限制

- 每个IP每分钟10次请求
- 每次响应最多5个域名
- NRDS数据可能有24-48小时延迟

## 完整访问权限

- **NRDS搜索**：https://domainkits.com/search/new
- **NS反向查询**：https://domainkits.com/tools/ns-reverse
```

---