# 调试

## 处理程序不触发

最常见的问题。按顺序检查：

### 1. Webhook URL 正确吗？

```bash
# 您的机器人应记录传入的请求
curl -X POST https://your-webhook-url/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. 隧道正在运行吗？（本地开发）

```bash
# Tailscale
tailscale funnel status

# ngrok
curl http://127.0.0.1:4040/api/tunnels
```

### 3. 机器人已添加到频道吗？

机器人必须：
- 在 Space 中安装（设置 → 集成）
- 添加到特定频道（频道设置 → 集成）

### 4. 消息转发模式？

在开发者门户中：
- "仅提及" = 仅 `@bot` 消息
- "所有消息" = 所有内容（`onTip` 需要）

### 5. 斜杠命令已注册吗？

必须位于传递给 `makeTownsBot` 的 `commands` 数组中：

```typescript
const commands = [
  { name: 'mycommand', description: '执行某操作' }
] as const satisfies BotCommand[]

const bot = await makeTownsBot(creds, secret, { commands })
```

## 添加请求日志

```typescript
const bot = await makeTownsBot(
  process.env.APP_PRIVATE_DATA!,
  process.env.JWT_SECRET!,
  { commands }
)

// 记录所有传入的事件
bot.onMessage(async (handler, event) => {
  console.log('[onMessage]', {
    userId: event.userId,
    channelId: event.channelId,
    message: event.message.slice(0, 100),
    isMentioned: event.isMentioned
  })
  // ... 处理程序的其余部分
})

bot.onSlashCommand('*', async (handler, event) => {
  console.log('[onSlashCommand]', {
    command: event.command,
    args: event.args,
    userId: event.userId
  })
})
```

## 常见错误消息

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `JWT verification failed` | 错误的 JWT_SECRET | 匹配开发者门户中的密钥 |
| `insufficient funds for gas` | Gas 钱包为空 | 为 `bot.viem.account.address` 充值 |
| `Invalid APP_PRIVATE_DATA` | 凭证格式错误 | 从开发者门户重新复制 |
| `ECONNREFUSED` RPC | RPC URL 错误或速率限制 | 使用专用 RPC（Alchemy/Infura）|
| `nonce too low` | 并发交易 | 添加交易队列或重试逻辑 |

## 验证 Webhook 连接

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  gasWallet: bot.viem.account.address
}))

// 从外部测试:
// curl https://your-webhook-url/health
```

## 调试交易失败

```typescript
import { waitForTransactionReceipt } from 'viem/actions'

try {
  const hash = await execute(bot.viem, { /* ... */ })
  console.log('交易已提交:', hash)

  const receipt = await waitForTransactionReceipt(bot.viem, { hash })
  console.log('交易结果:', {
    status: receipt.status,
    gasUsed: receipt.gasUsed.toString(),
    blockNumber: receipt.blockNumber
  })

  if (receipt.status !== 'success') {
    console.error('交易回滚。在 basescan 检查:',
      'https://basescan.org/tx/' + hash)
  }
} catch (err) {
  console.error('交易失败:', err.message)
  // 常见问题：余额不足、nonce 问题、合约回退
}
```

## 检查 Gas 钱包余额

```typescript
import { formatEther } from 'viem'

const balance = await bot.viem.getBalance({
  address: bot.viem.account.address
})

console.log('Gas 钱包余额:', formatEther(balance), 'ETH')

if (balance === 0n) {
  console.error('警告: Gas 钱包为空！')
  console.error('为这个地址充值:', bot.viem.account.address)
}
```
