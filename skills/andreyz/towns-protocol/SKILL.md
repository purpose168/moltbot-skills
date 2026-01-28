---
name: bots
description: >-
  构建 Towns Protocol 机器人时使用 - 涵盖 SDK 初始化、斜杠命令、消息处理程序、反应、交互式表单、区块链操作和部署。
  触发词: "towns bot", "makeTownsBot", "onSlashCommand", "onMessage", "sendInteractionRequest",
  "webhook", "bot deployment", "@towns-protocol/bot"
license: MIT
compatibility: 需要 Bun 运行时、Base 网络 RPC 访问、@towns-protocol/bot SDK
metadata:
  author: towns-protocol
  version: "2.0.0"
---

# Towns Protocol Bot SDK 参考

## 关键规则

**必须遵循这些规则 - 违规会导致静默失败：**

1. **用户 ID 是以太坊地址** - 始终为 `0x...` 格式，永远不是用户名
2. **提及需要两者** - 文本中使用 `<@{userId}>` 格式，选项中包含 `mentions` 数组
3. **双钱包架构**：
   - `bot.viem.account.address` = Gas 钱包（签名和支付费用）- **必须用 Base ETH 充值**
   - `bot.appAddress` = 国库（可选，用于转账）
4. **斜杠命令不会触发 onMessage** - 它们是独占的处理程序
5. **交互式表单使用 `type` 属性** - 不是 `case`（例如，`type: 'form'`）
6. **永远不要只信任 txHash** - 在授予访问权限之前验证 `receipt.status === 'success'`

## 快速参考

### 关键导入

```typescript
import { makeTownsBot, getSmartAccountFromUserId } from '@towns-protocol/bot'
import type { BotCommand, BotHandler } from '@towns-protocol/bot'
import { Permission } from '@towns-protocol/web3'
import { parseEther, formatEther, erc20Abi, zeroAddress } from 'viem'
import { readContract, waitForTransactionReceipt } from 'viem/actions'
import { execute } from 'viem/experimental/erc7821'
```

### 处理程序方法

| 方法 | 签名 | 备注 |
|------|------|------|
| `sendMessage` | `(channelId, text, opts?) → { eventId }` | opts: `{ threadId?, replyId?, mentions?, attachments? }` |
| `editMessage` | `(channelId, eventId, text)` | 仅限机器人自己的消息 |
| `removeEvent` | `(channelId, eventId)` | 仅限机器人自己的消息 |
| `sendReaction` | `(channelId, messageId, emoji)` | |
| `sendInteractionRequest` | `(channelId, payload)` | 表单、交易、签名 |
| `hasAdminPermission` | `(userId, spaceId) → boolean` | |
| `ban` / `unban` | `(userId, spaceId)` | 需要 ModifyBanning 权限 |

### 机器人属性

| 属性 | 描述 |
|------|------|
| `bot.viem` | 用于区块链的 Viem 客户端 |
| `bot.viem.account.address` | Gas 钱包 - **必须用 Base ETH 充值** |
| `bot.appAddress` | 国库钱包（可选） |
| `bot.botId` | 机器人标识符 |

**详细指南请参见 [references/](references/)：**
- [消息 API](references/MESSAGING.md) - 提及、线程、附件、格式化
- [区块链操作](references/BLOCKCHAIN.md) - 读取/写入合约、验证交易
- [交互式组件](references/INTERACTIVE.md) - 表单、交易请求
- [部署](references/DEPLOYMENT.md) - 本地开发、Render、隧道
- [调试](references/DEBUGGING.md) - 故障排除指南

---

## 机器人设置

### 项目初始化

```bash
bunx towns-bot init my-bot
cd my-bot
bun install
```

### 环境变量

```bash
APP_PRIVATE_DATA=<base64_credentials>   # 来自 app.towns.com/developer
JWT_SECRET=<webhook_secret>              # 最少 32 个字符
PORT=3000
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/KEY  # 推荐
```

### 基本机器人模板

```typescript
import { makeTownsBot } from '@towns-protocol/bot'
import type { BotCommand } from '@towns-protocol/bot'

const commands = [
  { name: 'help', description: '显示帮助' },
  { name: 'ping', description: '检查是否在线' }
] as const satisfies BotCommand[]

const bot = await makeTownsBot(
  process.env.APP_PRIVATE_DATA!,
  process.env.JWT_SECRET!,
  { commands }
)

bot.onSlashCommand('ping', async (handler, event) => {
  const latency = Date.now() - event.createdAt.getTime()
  await handler.sendMessage(event.channelId, 'Pong! ' + latency + 'ms')
})

export default bot.start()
```

### 配置验证

```typescript
import { z } from 'zod'

const EnvSchema = z.object({
  APP_PRIVATE_DATA: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url().optional()
})

const env = EnvSchema.safeParse(process.env)
if (!env.success) {
  console.error('无效配置:', env.error.issues)
  process.exit(1)
}
```

---

## 事件处理程序

### onMessage

在普通消息上触发（不是斜杠命令）。

```typescript
bot.onMessage(async (handler, event) => {
  // event: { userId, spaceId, channelId, eventId, message, isMentioned, threadId?, replyId? }

  if (event.isMentioned) {
    await handler.sendMessage(event.channelId, '您提到了我！')
  }
})
```

### onSlashCommand

在 `/command` 上触发。不会触发 onMessage。

```typescript
bot.onSlashCommand('weather', async (handler, { args, channelId }) => {
  // /weather San Francisco → args: ['San', 'Francisco']
  const location = args.join(' ')
  if (!location) {
    await handler.sendMessage(channelId, '用法: /weather <位置>')
    return
  }
  // ... 获取天气
})
```

### onReaction

```typescript
bot.onReaction(async (handler, event) => {
  // event: { reaction, messageId, channelId }
  if (event.reaction === '👋') {
    await handler.sendMessage(event.channelId, '我看到您挥手了！')
  }
})
```

### onTip

需要开发者门户中的"所有消息"模式。

```typescript
bot.onTip(async (handler, event) => {
  // event: { senderAddress, receiverAddress, amount (bigint), currency }
  if (event.receiverAddress === bot.appAddress) {
    await handler.sendMessage(event.channelId,
      '感谢您的 ' + formatEther(event.amount) + ' ETH!')
  }
})
```

### onInteractionResponse

```typescript
bot.onInteractionResponse(async (handler, event) => {
  switch (event.response.payload.content?.case) {
    case 'form':
      const form = event.response.payload.content.value
      for (const c of form.components) {
        if (c.component.case === 'button' && c.id === 'yes') {
          await handler.sendMessage(event.channelId, '您点击了是！')
        }
      }
      break
    case 'transaction':
      const tx = event.response.payload.content.value
      if (tx.txHash) {
        // 重要提示：在授予访问权限之前先验证链上情况
        // 完整验证模式请参阅 references/BLOCKCHAIN.md
        await handler.sendMessage(event.channelId,
          '交易: https://basescan.org/tx/' + tx.txHash)
      }
      break
  }
})
```

### 事件上下文验证

在使用之前始终验证上下文：

```typescript
bot.onSlashCommand('cmd', async (handler, event) => {
  if (!event.spaceId || !event.channelId) {
    console.error('缺少上下文:', { userId: event.userId })
    return
  }
  // 安全继续
})
```

---

## 常见错误

| 错误 | 修复方法 |
|------|----------|
| `insufficient funds for gas` | 用 Base ETH 为 `bot.viem.account.address` 充值 |
| 提及不高亮 | 文本中包含 BOTH `<@userId>` 和 `mentions` 数组 |
| 斜杠命令不工作 | 添加到 `makeTownsBot` 中的 `commands` 数组 |
| 处理程序不触发 | 检查开发者门户中的消息转发模式 |
| `writeContract` 失败 | 对外部合约使用 `execute()` |
| 基于 txHash 授予访问权限 | 首先验证 `receipt.status === 'success'` |
| 消息行重叠 | 使用 `\n\n`（双换行），而不是 `\n` |
| 缺少事件上下文 | 使用前验证 `spaceId`/`channelId` |

---

## 资源

- **开发者门户**: https://app.towns.com/developer
- **文档**: https://docs.towns.com/build/bots
- **SDK**: https://www.npmjs.com/package/@towns-protocol/bot
- **链 ID**: 8453（Base 主网）
