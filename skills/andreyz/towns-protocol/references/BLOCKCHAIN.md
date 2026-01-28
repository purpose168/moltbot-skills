# 区块链操作

## 读取合约

```typescript
import { readContract } from 'viem/actions'
import { erc20Abi } from 'viem'

const balance = await readContract(bot.viem, {
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress]
})
```

## 执行交易

```typescript
import { execute } from 'viem/experimental/erc7821'
import { waitForTransactionReceipt } from 'viem/actions'

const hash = await execute(bot.viem, {
  address: bot.appAddress,
  account: bot.viem.account,
  calls: [{
    to: targetAddress,
    abi: contractAbi,
    functionName: 'transfer',
    args: [recipient, amount]
  }]
})

await waitForTransactionReceipt(bot.viem, { hash })
```

## 验证交易（对支付至关重要）

**永远不要仅基于 txHash 授予访问权限。** 始终验证链上情况：

```typescript
bot.onInteractionResponse(async (handler, event) => {
  if (event.response.payload.content?.case !== 'transaction') return
  const tx = event.response.payload.content.value

  if (tx.txHash) {
    const receipt = await waitForTransactionReceipt(bot.viem, {
      hash: tx.txHash
    })

    if (receipt.status !== 'success') {
      await handler.sendMessage(event.channelId, '链上交易失败')
      return
    }

    // 现在可以安全地授予访问权限
    await grantUserAccess(event.userId)
    await handler.sendMessage(event.channelId, '支付已确认！')
  }
})
```

## 调试交易失败

```typescript
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

## 代币地址（Base 主网）

```typescript
import { zeroAddress } from 'viem'

const TOKENS = {
  ETH: zeroAddress,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  TOWNS: '0x00000000A22C618fd6b4D7E9A335C4B96B189a38'
}
```

## 检查余额

```typescript
import { formatEther } from 'viem'

const gasBalance = await bot.viem.getBalance({ address: bot.viem.account.address })
const treasuryBalance = await bot.viem.getBalance({ address: bot.appAddress })
console.log('Gas: ' + formatEther(gasBalance) + ' ETH')
console.log('Treasury: ' + formatEther(treasuryBalance) + ' ETH')
```

## 获取用户的智能账户

```typescript
import { getSmartAccountFromUserId } from '@towns-protocol/bot'

const userSmartAccount = getSmartAccountFromUserId(event.userId)
```
