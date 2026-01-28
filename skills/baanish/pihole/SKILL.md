# Pi-hole 技能

通过 Pi-hole v6 API 控制您的 Pi-hole DNS 广告拦截器。

## 设置

在 Clawdbot 配置中设置您的 Pi-hole API 配置：

```yaml
skills:
  entries:
    pihole:
      apiUrl: "https://pi-hole.local/api"  # v6 API 路径
      apiToken: "您的应用密码"           # 从 Pi-hole 管理界面获取
      insecure: false                          # 自签名证书设置为 true
```

或者，设置环境变量：
```bash
export PIHOLE_API_URL="https://pi-hole.local/api"
export PIHOLE_API_TOKEN="您的应用密码"
export PIHOLE_INSECURE="false"
```

### 获取 API 凭据

1. 在 `http://pi-hole.local/admin` 打开 Pi-hole 管理界面
2. 导航到 **设置** > **API**
3. 生成一个应用密码
4. 使用该密码作为 `apiToken`

## 功能

### 状态
- 获取当前 Pi-hole 状态（启用/禁用）
- 查看统计信息：已拦截查询、今天的查询、被拦截的域名、活跃客户端
- 查看最近的查询活动

### 控制
- **启用/禁用**：打开或关闭 Pi-hole
- **禁用 5 分钟**：临时禁用广告拦截一小段时间
- **禁用自定义时长**：设置特定的禁用时间（分钟）

### 拦截分析
- **检查被拦截的域名**：查看某个时间窗口内被拦截的域名
- **显示最多被拦截**：最常被拦截的域名

## 使用示例

```
# 检查 Pi-hole 状态
"pihole status"

# 关闭广告拦截
"pihole off"

# 打开广告拦截
"pihole on"

# 禁用 5 分钟（针对需要广告的网站）
"pihole disable 5m"

# 禁用 30 分钟
"pihole disable 30"

# 查看最近 30 分钟被拦截的内容
"pihole blocked"

# 查看最近 10 分钟（600 秒）被拦截的域名
"pihole blocked 600"

# 显示统计信息
"pihole stats"
```

## API 端点 (Pi-hole v6)

### 身份验证
```
POST /api/auth
Content-Type: application/json
{"password":"您的应用密码"}

响应:
{
  "session": {
    "sid": "会话令牌",
    "validity": 1800
  }
}
```

### 状态
```
GET /api/dns/blocking
Headers: sid: <会话令牌>

响应:
{
  "blocking": "enabled" | "disabled",
  "timer": 30  // 重新启用的秒数（如果设置了定时禁用）
}
```

### 启用/禁用
```
POST /api/dns/blocking
Headers: sid: <会话令牌>
Content-Type: application/json

启用:
{"blocking":true}

禁用:
{"blocking":false}

带定时器禁用（秒）:
{"blocking":false,"timer":300}
```

### 统计信息
```
GET /api/stats/summary
Headers: sid: <会话令牌>

响应:
{
  "queries": {
    "total": 233512,
    "blocked": 23496,
    "percent_blocked": 10.06
  },
  "gravity": {
    "domains_being_blocked": 165606
  },
  "clients": {
    "active": 45
  }
}
```

### 查询
```
GET /api/queries?start=-<秒数>
Headers: sid: <会话令牌>

响应:
{
  "queries": [
    {
      "domain": "example.com",
      "status": "GRAVITY",
      "time": 1768363900,
      "type": "A"
    }
  ]
}
```

## v5 vs v6 API 变更

Pi-hole v6 引入了重大的 API 变更：

| 功能 | v5 API | v6 API |
|---------|----------|----------|
| 基础 URL | `/admin/api.php` | `/api` |
| 身份验证 | URL/标头中的令牌 | 基于会话 |
| 状态 | `?status` | `/api/dns/blocking` |
| 统计 | `?summaryRaw` | `/api/stats/summary` |
| 查询 | `?recentBlocked` | `/api/queries` |
| 白名单 | 通过 API 支持 | **API 不可用** |

**重要提示**：v6 API 不再提供域名白名单功能。您必须通过 Pi-hole 管理界面白名单域名。

## SSL 证书

### 生产环境（有效证书）
```yaml
{
  "apiUrl": "https://pi-hole.example.com/api",
  "apiToken": "...",
  "insecure": false
}
```

### 自签名/本地证书
```yaml
{
  "apiUrl": "https://pi-hole.local/api",
  "apiToken": "...",
  "insecure": true
}
```

`insecure` 标志为 curl 添加 `-k` 选项以绕过证书验证。

## 安全说明

- 会话令牌在 30 分钟后过期（1800 秒）
- API 密码在 JSON body 中发送，不在 URL 中
- 所有请求都有 30 秒超时
- 令牌在进程列表中不可见（通过环境传递）

## 故障排除

### "身份验证失败"
- 检查 `apiToken` 是否匹配您的 Pi-hole 应用密码
- 验证 `apiUrl` 是否正确（必须以 `/api` 结尾）
- 确保 Pi-hole 可从您的网络访问

### "无法确定状态"
- 检查 API URL 是否可访问
- 如果使用 HTTPS 且为自签名证书，设置 `insecure: true`
- 验证 API 密码是否正确

### 网络错误
- 确保 clawdbot 的机器可以访问 Pi-hole
- 检查防火墙规则是否允许 API 访问
- 验证 URL 方案（http vs https）

## 要求

- Pi-hole v6 或更高版本
- 在 Pi-hole 管理界面中生成的应用密码
- 访问 Pi-hole API 的网络
- `curl`, `jq`（大多数 Unix 系统已安装）
