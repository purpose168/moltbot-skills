---
name: digital-ocean
description: 通过 DO API 管理 Digital Ocean  droplet、域名和基础设施。
homepage: https://docs.digitalocean.com/reference/api/
metadata: {"clawdis":{"emoji":"🌊","requires":{"bins":["uv","curl"],"env":["DO_API_TOKEN"]},"primaryEnv":"DO_API_TOKEN"}}
---

# Digital Ocean 管理

控制 DO droplet、域名和基础设施。

## 设置

设置环境变量：
- `DO_API_TOKEN`: 您的 Digital Ocean API 令牌（在 cloud.digitalocean.com/account/api/tokens 创建）

## 命令行命令

```bash
# 账户信息
uv run {baseDir}/scripts/do.py account

# 列出所有 droplet
uv run {baseDir}/scripts/do.py droplets

# 获取 droplet 详情
uv run {baseDir}/scripts/do.py droplet <droplet_id>

# 列出域名
uv run {baseDir}/scripts/do.py domains

# 列出域名记录
uv run {baseDir}/scripts/do.py records <domain>

# Droplet 操作
uv run {baseDir}/scripts/do.py power-off <droplet_id>
uv run {baseDir}/scripts/do.py power-on <droplet_id>
uv run {baseDir}/scripts/do.py reboot <droplet_id>
```

## 直接 API (curl)

### 列出 Droplet
```bash
curl -s -H "Authorization: Bearer $DO_API_TOKEN" \
  "https://api.digitalocean.com/v2/droplets" | jq '.droplets[] | {id, name, status, ip: .networks.v4[0].ip_address}'
```

### 获取账户信息
```bash
curl -s -H "Authorization: Bearer $DO_API_TOKEN" \
  "https://api.digitalocean.com/v2/account" | jq '.account'
```

### 列出域名
```bash
curl -s -H "Authorization: Bearer $DO_API_TOKEN" \
  "https://api.digitalocean.com/v2/domains" | jq '.domains[].name'
```

### 创建 Droplet
```bash
curl -s -X POST -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-droplet",
    "region": "nyc1",
    "size": "s-1vcpu-1gb",
    "image": "ubuntu-22-04-x64"
  }' \
  "https://api.digitalocean.com/v2/droplets"
```

### 重启 Droplet
```bash
curl -s -X POST -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"reboot"}' \
  "https://api.digitalocean.com/v2/droplets/<DROPLET_ID>/actions"
```

### 添加域名
```bash
curl -s -X POST -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "example.com"}' \
  "https://api.digitalocean.com/v2/domains"
```

## 注意事项

- 在执行破坏性操作（关机、销毁）前请始终确认
- 令牌需要读写权限才能执行管理操作
- API 文档：https://docs.digitalocean.com/reference/api/api-reference/
