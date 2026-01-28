# Google Calendar API 快速参考

## 基础 URL
```
https://www.googleapis.com/calendar/v3
```

## 身份验证
所有请求都需要 OAuth 2.0 令牌：
```
Authorization: Bearer {access_token}
```

## 常用端点

### 列出事件
```
GET /calendars/{calendarId}/events
```

参数说明：
- `timeMin`（datetime）：时间范围开始（RFC3339 格式）
- `timeMax`（datetime）：时间范围结束（RFC3339 格式）
- `maxResults`（int）：返回的最大事件数量
- `singleEvents`（bool）：是否展开重复事件
- `orderBy`（string）："startTime" 或 "updated"
- `q`（string）：搜索查询关键词

### 获取单个事件
```
GET /calendars/{calendarId}/events/{eventId}
```

### 创建事件
```
POST /calendars/{calendarId}/events
```

请求体：
```json
{
  "summary": "事件标题",
  "description": "详情描述",
  "location": "地址位置",
  "start": {
    "dateTime": "2026-01-27T10:00:00-05:00",
    "timeZone": "America/New_York"
  },
  "end": {
    "dateTime": "2026-01-27T11:00:00-05:00",
    "timeZone": "America/New_York"
  },
  "attendees": [
    {"email": "person@example.com"}
  ]
}
```

### 快速添加（自然语言）
```
POST /calendars/{calendarId}/events/quickAdd?text={text}
```

示例文本："周五中午与 Alex 在 Cafe Roma 午餐"

### 更新事件
```
PUT /calendars/{calendarId}/events/{eventId}
```
或
```
PATCH /calendars/{calendarId}/events/{eventId}
```

### 删除事件
```
DELETE /calendars/{calendarId}/events/{eventId}
```

### 列出日历
```
GET /users/me/calendarList
```

### 空闲/忙碌查询
```
POST /freeBusy
```

请求体：
```json
{
  "timeMin": "2026-01-27T00:00:00Z",
  "timeMax": "2026-01-28T00:00:00Z",
  "items": [{"id": "primary"}]
}
```

## 事件对象结构

```json
{
  "id": "abc123",
  "summary": "会议",
  "description": "讨论项目",
  "location": "会议室 A",
  "start": {
    "dateTime": "2026-01-27T10:00:00-05:00",
    "timeZone": "America/New_York"
  },
  "end": {
    "dateTime": "2026-01-27T11:00:00-05:00",
    "timeZone": "America/New_York"
  },
  "attendees": [
    {
      "email": "person@example.com",
      "responseStatus": "accepted"
    }
  ],
  "organizer": {
    "email": "me@example.com",
    "self": true
  },
  "status": "confirmed",
  "htmlLink": "https://calendar.google.com/event?eid=..."
}
```

## 全天事件

使用 `date` 代替 `dateTime`：
```json
{
  "start": {"date": "2026-01-27"},
  "end": {"date": "2026-01-28"}
}
```

## 重复事件

```json
{
  "recurrence": [
    "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231"
  ]
}
```

## 响应状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 已创建 |
| 204 | 已删除（无内容） |
| 400 | 错误请求 |
| 401 | 未授权（令牌过期） |
| 403 | 禁止（无访问权限） |
| 404 | 未找到 |
| 410 | 已消失（已删除） |
| 429 | 请求频率受限 |

## 速率限制

- 每用户约 10 次请求/秒
- 建议使用指数退避策略

## 权限范围

| 权限范围 | 访问权限 |
|----------|----------|
| `calendar.readonly` | 读取日历和事件 |
| `calendar.events` | 仅读/写事件 |
| `calendar` | 完全访问权限 |
