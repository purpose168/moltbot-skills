---
name: onchain-test
description: Onchain CLI 的测试版本，用于加密货币投资组合跟踪、市场数据和 CEX 历史记录。
---

# Onchain 测试版 CLI

用于加密货币投资组合跟踪、市场数据和 CEX 历史记录的 CLI（测试版本）。

## 调用方式

```
onchain <command>
```

## 命令

### 市场数据

```bash
onchain price <token>           # 代币价格（btc、eth、sol 等）
onchain markets                 # 市场概览及热门趋势
```

### 钱包数据

```bash
onchain balance [address]       # 代币余额（自动检测 EVM/Solana）
onchain history [address]       # 交易历史
onchain portfolio [address]     # 完整投资组合及 DeFi 持仓
```

### CEX 数据

```bash
onchain coinbase balance        # Coinbase 余额
onchain coinbase history        # Coinbase 交易历史
onchain binance balance         # Binance 余额
onchain binance history         # Binance 交易历史
```

### 预测市场

```bash
onchain polymarket trending     # 热门市场
onchain polymarket search <q>   # 搜索市场
onchain polymarket view <slug>  # 市场详情
```

### 配置

```bash
onchain setup                   # 交互式设置向导
onchain config                  # 查看当前配置
onchain test                    # 测试所有配置的提供程序
```

## 全局选项

- `--json` - 输出为 JSON（智能体友好）
- `--plain` - 禁用颜色和 emoji
- `--timeout <ms>` - 请求超时时间

## 配置

配置文件：`~/.config/onchain/config.json5`

### API 密钥配置

| 功能 | API 密钥 | 提供程序 |
|---------|---------|---------|
| EVM 钱包 | `DEBANK_API_KEY` | [DeBank](https://cloud.debank.com/) |
| Solana 钱包 | `HELIUS_API_KEY` | [Helius](https://helius.xyz/) |
| Coinbase | `COINBASE_API_KEY_ID` + `COINBASE_API_KEY_SECRET` | [Coinbase CDP](https://portal.cdp.coinbase.com/) |
| Binance | `BINANCE_API_KEY` + `BINANCE_API_SECRET` | [Binance](https://www.binance.com/en/my/settings/api-management) |

### 可选 API 密钥

| 功能 | API 密钥 | 备注 |
|---------|---------|-------|
| 市场数据 | `COINGECKO_API_KEY` | 免费层可用 |
| 市场回退 | `COINMARKETCAP_API_KEY` | 替代数据源 |

## 示例

### 获取代币价格
```bash
onchain price btc
```

### 检查钱包余额
```bash
onchain balance 0x1234...5678
```

### 查看投资组合
```bash
onchain portfolio main
```

### JSON 输出（用于脚本）
```bash
onchain --json price eth | jq '.priceUsd'
```

## 支持的链

**EVM（通过 DeBank）：** Ethereum、BNB Chain、Polygon、Arbitrum、Optimism、Avalanche、Base、zkSync Era、Linea、Scroll、Blast、Mantle 等。

**Solana（通过 Helius）：** 完全支持 Solana 主网。
