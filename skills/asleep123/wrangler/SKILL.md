---
name: cloudflare
description: 使用 Wrangler CLI 管理 Cloudflare Workers、KV、D1、R2 和密钥。使用场景包括：部署 Worker、管理数据库、存储对象或配置 Cloudflare 资源。涵盖 Worker 部署、KV 命名空间、D1 SQL 数据库、R2 对象存储、密钥管理和日志实时查看。
---

# Cloudflare (Wrangler CLI)

通过 `wrangler` CLI 管理 Cloudflare Workers 及相关服务。

## 前置条件

- 需要 Node.js v20+
- 安装方式：`npm install -g wrangler` 或使用项目本地版本 `npx wrangler`
- 身份验证：`wrangler login`（打开浏览器进行 OAuth 认证）
- 验证：`wrangler whoami`

## 快速参考

### Workers

```bash
# 初始化新的 Worker
wrangler init <名称>

# 本地开发
wrangler dev [脚本]

# 部署
wrangler deploy [脚本]

# 列出部署记录
wrangler deployments list

# 查看部署详情
wrangler deployments view [部署ID]

# 回滚
wrangler rollback [版本ID]

# 删除 Worker
wrangler delete [名称]

# 实时查看日志
wrangler tail [Worker名称]
```

### 密钥管理

```bash
# 添加/更新密钥（交互式）
wrangler secret put <密钥名>

# 从标准输入添加密钥
echo "值" | wrangler secret put <密钥名>

# 列出所有密钥
wrangler secret list

# 删除密钥
wrangler secret delete <密钥名>

# 从 JSON 文件批量上传密钥
wrangler secret bulk secrets.json
```

### KV（键值存储）

```bash
# 创建命名空间
wrangler kv namespace create <名称>

# 列出命名空间
wrangler kv namespace list

# 删除命名空间
wrangler kv namespace delete --namespace-id <ID>

# 写入键值
wrangler kv key put <键> <值> --namespace-id <ID>

# 读取键值
wrangler kv key get <键> --namespace-id <ID>

# 删除键值
wrangler kv key delete <键> --namespace-id <ID>

# 列出所有键
wrangler kv key list --namespace-id <ID>

# 批量操作（JSON 文件）
wrangler kv bulk put <文件> --namespace-id <ID>
wrangler kv bulk delete <文件> --namespace-id <ID>
```

### D1（SQL 数据库）

```bash
# 创建数据库
wrangler d1 create <名称>

# 列出数据库
wrangler d1 list

# 数据库信息
wrangler d1 info <名称>

# 执行 SQL
wrangler d1 execute <数据库> --command "SELECT * FROM users"

# 执行 SQL 文件
wrangler d1 execute <数据库> --file schema.sql

# 本地执行（用于开发）
wrangler d1 execute <数据库> --local --command "..."

# 导出数据库
wrangler d1 export <名称> --output backup.sql

# 删除数据库
wrangler d1 delete <名称>

# 迁移管理
wrangler d1 migrations create <数据库> <名称>
wrangler d1 migrations apply <数据库>
wrangler d1 migrations list <数据库>
```

### R2（对象存储）

```bash
# 创建存储桶
wrangler r2 bucket create <名称>

# 列出存储桶
wrangler r2 bucket list

# 删除存储桶
wrangler r2 bucket delete <名称>

# 上传对象
wrangler r2 object put <存储桶>/<键> --file <路径>

# 下载对象
wrangler r2 object get <存储桶>/<键> --file <路径>

# 删除对象
wrangler r2 object delete <存储桶>/<键>
```

### 队列

```bash
# 创建队列
wrangler queues create <名称>

# 列出队列
wrangler queues list

# 删除队列
wrangler queues delete <名称>
```

## 配置文件

Wrangler 支持 TOML 和 JSON/JSONC 两种配置格式：

- `wrangler.toml` — 传统格式
- `wrangler.json` 或 `wrangler.jsonc` — 新格式，支持 JSON Schema 补全

**⚠️ 重要提示：** 如果两种文件都存在，JSON 格式优先。请选择一种格式以避免混淆（编辑 TOML 被忽略的情况）。

### JSONC 格式（带 Schema 自动补全）

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-30"
}
```

### TOML 格式

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-12-30"
```

带绑定配置：

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-12-30"

# KV 绑定
[[kv_namespaces]]
binding = "MY_KV"
id = "xxx"

# D1 绑定
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxx"

# R2 绑定
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# 环境变量
[vars]
API_URL = "https://api.example.com"

# 密钥（通过 `wrangler secret put` 设置）
# 在 Worker 代码中通过 env.SECRET_NAME 引用
```

静态资源（适用于 Next.js 等框架）：

```toml
name = "my-site"
main = ".open-next/worker.js"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

## 常见模式

### 按环境部署

```bash
wrangler deploy -e production
wrangler deploy -e staging
```

### 自定义域名（通过仪表板或 API）

自定义域名必须在 Cloudflare 仪表板的 Worker 设置 > 域名和路由中配置，或通过 Cloudflare API 配置。Wrangler 不直接管理自定义域名。

### 带绑定的本地开发

```bash
# 为开发创建本地 D1/KV/R2
wrangler dev --local
```

### 检查部署状态

```bash
wrangler deployments list
wrangler deployments view
```

## Wrangler 不能做什么

- **DNS 管理** — 使用 Cloudflare 仪表板或 API 管理 DNS 记录
- **自定义域名** — 通过仪表板（Worker 设置 > 域名和路由）或 API 配置
- **SSL 证书** — 添加自定义域名时由 Cloudflare 自动管理
- **防火墙/WAF 规则** — 使用仪表板或 API

如需 DNS/域名管理，请使用 `cloudflare` 技能（直接使用 Cloudflare API）。

## 故障排除

| 问题 | 解决方案 |
|-------|----------|
| "未认证" | 运行 `wrangler login` |
| Node 版本错误 | 需要 Node.js v20+ |
| "未找到配置" | 确保配置文件存在（`wrangler.toml` 或 `wrangler.jsonc`），或使用 `-c path/to/config` |
| 配置更改被忽略 | 检查是否存在 `wrangler.json`/`wrangler.jsonc` — JSON 优先于 TOML |
| 未找到绑定 | 检查 `wrangler.toml` 中的绑定是否与代码引用匹配 |

## 资源链接

- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 文档](https://developers.cloudflare.com/d1/)
- [R2 文档](https://developers.cloudflare.com/r2/)
- [KV 文档](https://developers.cloudflare.com/kv/)
