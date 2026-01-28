# AgentMail API 参考

基础 URL：`https://api.agentmail.to/v0`

## 身份验证

所有请求都需要 Bearer token 身份验证：

```
Authorization: Bearer YOUR_API_KEY
```

## 收件箱

### 创建收件箱

```http
POST /v0/inboxes
```

**请求：**
```json
{
  "username": "my-agent",           // 可选：自定义用户名
  "domain": "agentmail.to",         // 可选：默认为 agentmail.to
  "display_name": "My Agent",       // 可选：友好名称
  "client_id": "unique-id"          // 可选：用于幂等性
}
```

**响应：**
```json
{
  "pod_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "inbox_id": "my-agent@agentmail.to",
  "display_name": "My Agent",
  "created_at": "2024-01-10T08:15:00Z",
  "updated_at": "2024-01-10T08:15:00Z",
  "client_id": "unique-id"
}
```

### 列出收件箱

```http
GET /v0/inboxes?limit=10&page_token=eyJwYWdlIjoxfQ==
```

**响应：**
```json
{
  "count": 2,
  "inboxes": [...],
  "limit": 10,
  "next_page_token": "eyJwYWdlIjoyMQ=="
}
```

### 获取收件箱

```http
GET /v0/inboxes/{inbox_id}
```

## 消息

### 发送消息

```http
POST /v0/inboxes/{inbox_id}/messages
```

**请求：**
```json
{
  "to": ["recipient@example.com"],          // 必需：字符串或数组
  "cc": ["cc@example.com"],                 // 可选：字符串或数组
  "bcc": ["bcc@example.com"],               // 可选：字符串或数组
  "reply_to": "reply@example.com",          // 可选：字符串或数组
  "subject": "电子邮件主题",               // 可选：字符串
  "text": "纯文本正文",                     // 可选：字符串
  "html": "<p>HTML 正文</p>",               // 可选：字符串
  "labels": ["sent", "important"],          // 可选：数组
  "attachments": [{                         // 可选：对象数组
    "filename": "document.pdf",
    "content": "base64编码内容",
    "content_type": "application/pdf"
  }],
  "headers": {                              // 可选：自定义标头
    "X-Custom-Header": "value"
  }
}
```

**响应：**
```json
{
  "message_id": "msg_123abc",
  "thread_id": "thd_789ghi"
}
```

### 列出消息

```http
GET /v0/inboxes/{inbox_id}/messages?limit=10&page_token=token
```

### 获取消息

```http
GET /v0/inboxes/{inbox_id}/messages/{message_id}
```

## 会话

### 列出会话

```http
GET /v0/inboxes/{inbox_id}/threads?limit=10
```

### 获取会话

```http
GET /v0/inboxes/{inbox_id}/threads/{thread_id}
```

**响应：**
```json
{
  "thread_id": "thd_789ghi",
  "inbox_id": "support@example.com",
  "subject": "关于我的账户的问题",
  "participants": ["jane@example.com", "support@example.com"],
  "labels": ["customer-support"],
  "message_count": 3,
  "last_message_at": "2023-10-27T14:30:00Z",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T14:30:00Z"
}
```

## Webhook

### 创建 Webhook

```http
POST /v0/webhooks
```

**请求：**
```json
{
  "url": "https://your-domain.com/webhook",
  "client_id": "webhook-identifier",
  "enabled": true,
  "event_types": ["message.received"],      // 可选：默认为所有事件
  "inbox_ids": ["inbox1@domain.com"]        // 可选：按特定收件箱筛选
}
```

### 列出 Webhook

```http
GET /v0/webhooks
```

### 更新 Webhook

```http
PUT /v0/webhooks/{webhook_id}
```

### 删除 Webhook

```http
DELETE /v0/webhooks/{webhook_id}
```

## 错误响应

所有错误都遵循此格式：

```json
{
  "error": {
    "type": "validation_error",
    "message": "无效的电子邮件地址",
    "details": {
      "field": "to",
      "code": "INVALID_EMAIL"
    }
  }
}
```

常见错误代码：
- `400` - 错误请求（验证错误）
- `401` - 未经授权（无效的 API 密钥）
- `404` - 未找到（资源不存在）
- `429` - 请求过多（速率限制）
- `500` - 内部服务器错误

## 速率限制

AgentMail 专为高容量使用而设计，限制宽松：
- API 请求：每个 API 密钥每分钟 1000 次
- 电子邮件发送：每天 10,000 封（可升级）
- Webhook 传递：实时，无限制

## Python SDK

Python SDK 提供了对 REST API 的便捷包装：

```python
from agentmail import AgentMail
import os

client = AgentMail(api_key=os.getenv("AGENTMAIL_API_KEY"))

# 所有操作都返回结构化对象
inbox = client.inboxes.create(username="my-agent")
message = client.inboxes.messages.send(
    inbox_id=inbox.inbox_id,
    to="user@example.com",
    subject="您好",
    text="消息正文"
)
```