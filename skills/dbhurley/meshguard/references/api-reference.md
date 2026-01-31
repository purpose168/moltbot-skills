# MeshGuard API 参考

基础 URL: `{MESHGUARD_URL}/api/v1`

所有需要认证的端点都需要：`Authorization: Bearer <API_KEY>`

管理员端点需要：`Authorization: Bearer <ADMIN_TOKEN>`

---

## 健康检查

### `GET /health`
检查网关健康状态。无需认证。

**响应：**
```json
{
  "status": "healthy",
  "version": "1.4.2",
  "uptime_seconds": 86400,
  "services": {
    "database": "connected",
    "cache": "connected",
    "queue": "connected"
  }
}
```

---

## 代理

### `GET /agents`
列出组织中的所有代理。

**响应：**
```json
{
  "agents": [
    {
      "id": "ag_abc123",
      "name": "my-agent",
      "tier": "pro",
      "status": "active",
      "created_at": "2025-01-15T10:00:00Z",
      "policies": ["pol_xyz789"]
    }
  ],
  "total": 1
}
```

### `POST /agents`
创建新代理。

**请求体：**
```json
{
  "name": "my-agent",
  "tier": "free|pro|enterprise"
}
```

**响应：** 带有 `id` 和 `api_key` 的代理对象。

### `GET /agents/{id}`
通过 ID 获取代理详情。

### `DELETE /agents/{id}`
删除代理。返回 `204 No Content`。

---

## 策略

### `GET /policies`
列出所有策略。

**响应：**
```json
{
  "policies": [
    {
      "id": "pol_xyz789",
      "name": "rate-limit-policy",
      "description": "Limit agent calls to 100/min",
      "rules": [
        {
          "type": "rate_limit",
          "max_requests": 100,
          "window_seconds": 60
        }
      ],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### `POST /policies`
创建新策略。

**请求体：**
```json
{
  "name": "my-policy",
  "description": "Policy description",
  "rules": [
    {
      "type": "rate_limit",
      "max_requests": 100,
      "window_seconds": 60
    },
    {
      "type": "content_filter",
      "block_categories": ["pii", "credentials"]
    },
    {
      "type": "scope_restriction",
      "allowed_actions": ["read", "search"],
      "denied_actions": ["delete", "admin"]
    }
  ]
}
```

### 规则类型

| 类型 | 字段 | 描述 |
|------|------|-------------|
| `rate_limit` | `max_requests`, `window_seconds` | 限制请求速率 |
| `content_filter` | `block_categories` | 阻止敏感内容类别 |
| `scope_restriction` | `allowed_actions`, `denied_actions` | 限制代理能力 |
| `time_window` | `allowed_hours`, `timezone` | 限制操作时间 |
| `budget_limit` | `max_cost_usd`, `period` | 成本控制 |

### `GET /policies/{id}`
获取策略详情。

### `DELETE /policies/{id}`
删除策略。返回 `204 No Content`。

---

## 审计日志

### `GET /audit/logs`
查询审计事件。

**查询参数：**

| 参数 | 类型 | 描述 |
|-------|------|-------------|
| `agent` | string | 按代理名称过滤 |
| `action` | string | 按操作类型过滤 |
| `limit` | integer | 最大结果数（默认：20，最大：1000） |
| `offset` | integer | 分页偏移量 |
| `from` | ISO 8601 | 开始时间戳 |
| `to` | ISO 8601 | 结束时间戳 |

**操作类型：** `agent.create`, `agent.delete`, `agent.update`, `policy.create`, `policy.update`, `policy.delete`, `policy.attach`, `policy.detach`, `auth.login`, `auth.revoke`, `violation.rate_limit`, `violation.content_filter`, `violation.scope`

**响应：**
```json
{
  "events": [
    {
      "id": "evt_001",
      "timestamp": "2025-01-15T10:30:00Z",
      "action": "agent.create",
      "agent": "my-agent",
      "actor": "user@example.com",
      "details": {
        "tier": "pro"
      },
      "ip": "192.168.1.1"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## 组织注册

### `POST /orgs/signup` *(需要管理员令牌)*
创建新组织。

**请求体：**
```json
{
  "name": "Acme Corp",
  "email": "admin@acme.com"
}
```

**响应：**
```json
{
  "org_id": "org_abc123",
  "name": "Acme Corp",
  "api_key": "mg_live_...",
  "admin_token": "mg_admin_...",
  "dashboard_url": "https://dashboard.meshguard.app/org/org_abc123"
}
```

---

## 错误响应

所有错误都遵循以下格式：
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired API key",
    "status": 401
  }
}
```

常见错误代码：`unauthorized` (401), `forbidden` (403), `not_found` (404), `rate_limited` (429), `internal_error` (500)。
