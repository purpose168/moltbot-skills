# 交互式组件

## 发送按钮表单

```typescript
await handler.sendInteractionRequest(channelId, {
  type: 'form',           // 不是 'case'
  id: 'my-form',
  components: [
    { id: 'yes', type: 'button', label: '是' },
    { id: 'no', type: 'button', label: '否' }
  ],
  recipient: event.userId  // 可选：仅该用户可见
})
```

## 处理表单响应

```typescript
bot.onInteractionResponse(async (handler, event) => {
  if (event.response.payload.content?.case !== 'form') return

  const form = event.response.payload.content.value
  for (const c of form.components) {
    if (c.component.case === 'button') {
      console.log('点击的按钮:', c.id)

      if (c.id === 'yes') {
        await handler.sendMessage(event.channelId, '您点击了是！')
      }
    }
  }
})
```

## 请求交易

```typescript
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'

await handler.sendInteractionRequest(channelId, {
  type: 'transaction',
  id: 'payment',
  title: '发送代币',
  subtitle: '转账 50 USDC',
  tx: {
    chainId: '8453',
    to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // USDC
    value: '0',
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient, parseUnits('50', 6)]
    })
  },
  recipient: event.userId
})
```

## 处理交易响应

```typescript
bot.onInteractionResponse(async (handler, event) => {
  if (event.response.payload.content?.case !== 'transaction') return

  const tx = event.response.payload.content.value

  if (tx.txHash) {
    // 重要提示：在授予访问权限之前始终验证链上情况
    // 完整验证模式请参阅 BLOCKCHAIN.md
    const receipt = await waitForTransactionReceipt(bot.viem, {
      hash: tx.txHash
    })

    if (receipt.status === 'success') {
      await handler.sendMessage(event.channelId,
        '支付已确认: https://basescan.org/tx/' + tx.txHash)
    } else {
      await handler.sendMessage(event.channelId, '链上交易失败')
    }
  } else if (tx.error) {
    await handler.sendMessage(event.channelId, '交易已拒绝: ' + tx.error)
  }
})
```

## 请求签名

```typescript
await handler.sendInteractionRequest(channelId, {
  type: 'signature',
  id: 'sign-message',
  title: '签名消息',
  message: '我同意服务条款',
  recipient: event.userId
})
```

## 重要注意事项

- **使用 `type` 属性** - 不是 `case`（常见错误）
- **`recipient` 是可选的** - 如果设置，仅该用户看到交互
- **始终验证交易** - 永远不要只信任 txHash，检查 receipt.status
