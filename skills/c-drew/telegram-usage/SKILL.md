---
name: telegram-usage
description: "显示会话使用统计信息（配额、会话时间、令牌数量、上下文窗口使用情况）。当用户请求使用统计、配额信息或会话数据时使用。"
metadata: {"clawdbot":{"emoji":"📊","requires":{"bins":["node"]}}}
---

# Telegram 使用统计技能

通过运行处理脚本来显示全面的会话使用统计信息。

## 功能说明

显示简洁的状态消息，包括：
- **剩余配额**：API 配额剩余百分比，带可视化指示器
- **重置倒计时**：距离配额重置的剩余时间

## 使用方法

当用户请求使用统计、配额信息或会话数据时：

```bash
node /home/drew-server/clawd/skills/telegram-usage/handler.js
```

这将输出适合 Telegram parseMode 格式的 HTML 内容。

## 输出格式

响应被格式化为简洁的 Telegram 消息，包括：
- 小节标题（粗体显示）
- 清晰的百分比和时间剩余显示
- 可视化指示器（表情符号）
- 所有信息整合在一条消息中，便于快速参考

## 输出示例

```
📊 API 使用统计

🔋 配额：🟢 47%
⏱️ 重置倒计时：53 分钟
```

## 重要说明

- 实时数据来自 `clawdbot models status`
- 每次调用时都会更新，获取当前 API 配额值
- 使用纯文本格式以确保 Telegram 兼容性
