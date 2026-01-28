# 消息 API

## 发送带提及的消息

**必须同时包含格式化的文本和 mentions 数组：**

```typescript
// 格式: Hello <@0x...>!
const text = 'Hello <@' + userId + '>!'
await handler.sendMessage(channelId, text, {
  mentions: [{ userId, displayName: '用户' }]
})

// @channel
await handler.sendMessage(channelId, '请注意！', {
  mentions: [{ atChannel: true }]
})
```

## 线程和回复

```typescript
// 在线程中回复
await handler.sendMessage(channelId, '线程回复', { threadId: event.eventId })

// 回复特定消息
await handler.sendMessage(channelId, '回复', { replyId: messageId })
```

## 附件

```typescript
// 图片
attachments: [{ type: 'image', url: 'https://...jpg', alt: '描述' }]

// 小程序
attachments: [{ type: 'miniapp', url: 'https://your-app.com/miniapp.html' }]

// 大文件（分块）
attachments: [{
  type: 'chunked',
  data: readFileSync('./video.mp4'),
  filename: 'video.mp4',
  mimetype: 'video/mp4'
}]
```

## 消息格式化

Towns 有特定的渲染行为：
- **使用 `\n\n`**（双换行）分隔各部分 - 单个 `\n` 会导致重叠
- **永远不要使用 `---`** 作为分隔符 - 渲染为零高度规则
- **使用中间点** 表示内联数据: `价值: $1.00 · 盈亏: $0.50`

```typescript
// 良好实践 - 双换行
const msg = ['**标题**', '第1行', '第2行'].join('\n\n')

// 不良实践 - 单个换行会重叠
const bad = lines.join('\n')
```

## 编辑和删除

```typescript
// 编辑机器人自己的消息
await handler.editMessage(channelId, eventId, '更新后的文本')

// 删除机器人自己的消息
await handler.removeEvent(channelId, eventId)
```

## 反应

```typescript
await handler.sendReaction(channelId, messageId, '👍')
```
