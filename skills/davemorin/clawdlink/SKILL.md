---
name: clawdlink
description: 加密的 Clawdbot 到 Clawdbot 消息传递。向朋友的 Clawdbot 发送端到端加密的消息。
triggers:
  - clawdlink
  - friend link
  - add friend
  - send message to
  - tell [name] that
  - message from
  - accept friend request
  - clawdlink preferences
  - quiet hours
---

# ClawdLink

通过中央中继在 Clawdbot 之间进行加密的点对点消息传递。

## 安装

```bash
cd ~/clawd/skills/clawdlink
npm install
node scripts/install.js      # 添加到 HEARTBEAT.md
node cli.js setup "您的姓名"
```

## Clawdbot 快速开始

使用 handler 获取 JSON 输出：

```bash
node handler.js <操作> [参数...]
```

### 核心操作

| 操作 | 用法 |
|--------|-------|
| `check` | 轮询消息和请求 |
| `send` | `send "Matt" "你好!" [--urgent] [--context=work]` |
| `add` | `add "clawdlink://..."` |
| `accept` | `accept "Matt"` |
| `link` | 获取您的朋友链接 |
| `friends` | 列出好友 |
| `status` | 获取状态 |

### 首选项操作

| 操作 | 用法 |
|--------|-------|
| `preferences` | 显示所有首选项 |
| `quiet-hours` | `quiet-hours on` / `quiet-hours 22:00 08:00` |
| `batch` | `batch on` / `batch off` |
| `tone` | `tone casual` / `tone formal` / `tone brief` |

## 消息投递首选项

用户控制他们如何接收消息：

### 安静时段
```bash
node handler.js quiet-hours 22:00 07:30
```
安静时段期间保留消息，结束时投递。紧急消息仍会送达。

### 批量投递
```bash
node handler.js batch on
node handler.js preferences set schedule.batchDelivery.times '["09:00","18:00"]'
```
非紧急消息批量投递并在设定时间送达。

### 沟通语气
```bash
node handler.js tone casual
```
选项: `natural`, `casual`, `formal`, `brief`

### 特定好友设置
```bash
node handler.js preferences set friends."Sophie Bakalar".priority high
node handler.js preferences set friends."Sophie Bakalar".alwaysDeliver true
```

## 消息元数据

发送时，包含上下文：

```bash
node handler.js send "Sophie" "需要讨论预算" --urgent --context=work
```

选项:
- `--urgent` — 绕过安静时段和批量投递
- `--fyi` — 低优先级，始终可批量
- `--context=work|personal|social` — 有助于批量决策

## 对话模式

### 设置首选项
**用户:** "将安静时段设置为晚上 10 点到早上 8 点"
**操作:** `node handler.js quiet-hours 22:00 08:00`

**用户:** "我更喜欢随意的沟通"
**操作:** `node handler.js tone casual`

**用户:** "批量我的 ClawdLink 消息并在早上 9 点和下午 6 点送达"
**操作:** 
```bash
node handler.js batch on
node handler.js preferences set schedule.batchDelivery.times '["09:00","18:00"]'
```

**用户:** "总是让来自 Sophie 的消息通过"
**操作:** `node handler.js preferences set friends."Sophie".alwaysDeliver true`

### 发送带上下文的消息
**用户:** "告诉 Matt 我急需文件"
**操作:** `node handler.js send "Matt" "我需要文件" --urgent --context=work`

## 首选项架构

```json
{
  "schedule": {
    "quietHours": { "enabled": true, "start": "22:00", "end": "08:00" },
    "batchDelivery": { "enabled": false, "times": ["09:00", "18:00"] },
    "timezone": "America/Los_Angeles"
  },
  "delivery": {
    "allowUrgentDuringQuiet": true,
    "summarizeFirst": true,
    "includeContext": true
  },
  "style": {
    "tone": "natural",
    "greetingStyle": "friendly"
  },
  "friends": {
    "Sophie Bakalar": { "priority": "high", "alwaysDeliver": true }
  }
}
```

## 数据存储

`~/.clawdbot/clawdlink/`
- `identity.json` — 密钥对
- `config.json` — 显示名称
- `friends.json` — 带有共享密钥的好友
- `preferences.json` — 投递首选项
- `held_messages.json` — 等待投递的消息
- `pending_requests.json` — 待处理的好友请求

## 自动轮询

`heartbeat.js` 在每个 Clawdbot 心跳时运行：
- 轮询中继获取消息/请求
- 应用投递首选项
- 在安静时段保留消息
- 在计划时间投递批量消息
- 有内容送达时输出格式化文本

## 安全性

- **端到端加密** — XChaCha20-Poly1305
- **Ed25519 签名** — 发送者验证
- **X25519 密钥交换** — 共享密钥
- **7 天 TTL** — 消息自动过期
