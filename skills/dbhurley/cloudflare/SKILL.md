---
name: cloudflare
description: Cloudflare 命令行工具 - 管理 DNS 记录、清除缓存和控制 Workers 路由。
version: 1.0.0
author: dbhurley
homepage: https://cloudflare.com
metadata:
  clawdis:
    emoji: "🔶"
    requires:
      bins: ["python3", "uv"]
      env:
        - CLOUDFLARE_API_TOKEN
    primaryEnv: CLOUDFLARE_API_TOKEN
---

# Cloudflare 命令行工具

通过 API 管理 Cloudflare DNS、缓存和 Workers。

## 🔑 必需的密钥

| 变量 | 描述 | 获取方式 |
|----------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | 范围 API 令牌 | Cloudflare → 我的资料 → API 令牌 |

**推荐的令牌权限：**
- DNS:Read, DNS:Edit
- Cache Purge:Purge
- Workers Routes:Edit

## ⚙️ 设置

在 `~/.clawdis/clawdis.json` 中配置：
```json
{
  "skills": {
    "cloudflare": {
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-token"
      }
    }
  }
}
```

## 📋 命令

### 验证令牌

```bash
# 测试你的令牌是否有效
uv run {baseDir}/scripts/cloudflare.py verify
```

### 区域（域名）

```bash
# 列出所有区域
uv run {baseDir}/scripts/cloudflare.py zones

# 获取区域详情
uv run {baseDir}/scripts/cloudflare.py zone <zone_id_or_domain>
```

### DNS 记录

```bash
# 列出区域的 DNS 记录
uv run {baseDir}/scripts/cloudflare.py dns list <domain>

# 添加 DNS 记录
uv run {baseDir}/scripts/cloudflare.py dns add <domain> --type A --name www --content 1.2.3.4
uv run {baseDir}/scripts/cloudflare.py dns add <domain> --type CNAME --name blog --content example.com

# 更新 DNS 记录
uv run {baseDir}/scripts/cloudflare.py dns update <domain> <record_id> --content 5.6.7.8

# 删除 DNS 记录（需要确认）
uv run {baseDir}/scripts/cloudflare.py dns delete <domain> <record_id>

# 无确认删除
uv run {baseDir}/scripts/cloudflare.py dns delete <domain> <record_id> --yes
```

### 缓存

```bash
# 清除所有缓存
uv run {baseDir}/scripts/cloudflare.py cache purge <domain> --all

# 清除特定 URL 的缓存
uv run {baseDir}/scripts/cloudflare.py cache purge <domain> --urls "https://example.com/page1,https://example.com/page2"

# 按前缀清除缓存
uv run {baseDir}/scripts/cloudflare.py cache purge <domain> --prefix "/blog/"
```

### Workers 路由

```bash
# 列出路由
uv run {baseDir}/scripts/cloudflare.py routes list <domain>

# 添加路由
uv run {baseDir}/scripts/cloudflare.py routes add <domain> --pattern "*.example.com/*" --worker my-worker
```

## 📤 输出格式

所有命令都支持 `--json` 以获取机器可读的输出：
```bash
uv run {baseDir}/scripts/cloudflare.py dns list example.com --json
```

## 🔗 常见工作流程

### 将域名指向 Vercel
```bash
# 为顶点添加 CNAME
cloudflare dns add example.com --type CNAME --name @ --content cname.vercel-dns.com --proxied false

# 为 www 添加 CNAME
cloudflare dns add example.com --type CNAME --name www --content cname.vercel-dns.com --proxied false
```

### 部署后清除缓存
```bash
cloudflare cache purge example.com --all
```

## 📦 安装

```bash
clawdhub install cloudflare
```
