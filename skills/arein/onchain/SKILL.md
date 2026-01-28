---
name: onchain
description: 用于加密货币投资组合跟踪、市场数据和 CEX 历史记录的 CLI。当用户询问加密货币价格、钱包余额、投资组合价值、Coinbase/Binance 持仓或 Polymarket 预测时使用。
---

# Onchain CLI

用于加密货币投资组合跟踪、市场数据和 CEX 历史记录的 CLI。

## 调用方式

```
onchain <command>
```

## 命令

### 市场数据

```bash
onchain price <token>         # 代币价格（btc、eth、sol 等）
onchain markets               # 市场概览及热门趋势
```

### 钱包数据

```bash
onchain balance [address]           # 代币余额（自动检测 EVM/Solana）
onchain balance --chain polygon     # 按链筛选
onchain history [address]           # 交易历史
onchain portfolio [address]         # 完整投资组合及 DeFi 持仓
```

### CEX 数据

```bash
onchain coinbase balance      # Coinbase 余额
onchain coinbase history      # Coinbase 交易历史
onchain binance balance       # Binance 余额
onchain binance history       # Binance 交易历史
```

### 预测市场

```bash
onchain polymarket trending          # 热门市场
onchain polymarket search <query>    # 搜索市场
onchain polymarket view <slug>       # 查看市场详情
```

### 配置

```bash
onchain setup                 # 交互式设置向导
onchain config                # 查看当前配置
onchain config wallet add <name> <address>
onchain config wallet set-default <name>
```

## 全局选项

- `--json` - 输出为 JSON（智能体友好）
- `--plain` - 禁用颜色和 emoji
- `--timeout <ms>` - 请求超时时间

## 配置

配置文件：`~/.config/onchain/config.json5`

### 必需的 API 密钥

| 功能 | API 密钥 | 获取密钥 |
|---------|---------|---------|
| EVM 钱包 | `DEBANK_API_KEY` | [DeBank](https://cloud.debank.com/) |
| Solana 钱包 | `HELIUS_API_KEY` | [Helius](https://helius.xyz/) |
| Coinbase CEX | `COINBASE_API_KEY` + `COINBASE_API_SECRET` | [Coinbase](https://www.coinbase.com/settings/api) |
| Binance CEX | `BINANCE_API_KEY` + `BINANCE_API_SECRET` | [Binance](https://www.binance.com/en/my/settings/api-management) |

### 可选的 API 密钥

| 功能 | API 密钥 | 备注 |
|---------|---------|-------|
| 市场数据 | `COINGECKO_API_KEY` | 免费层可用，更高限制需 Pro 版 |
| 市场回退 | `COINMARKETCAP_API_KEY` | 替代市场数据源 |

## 示例

### 获取比特币价格
```bash
onchain price btc
```

### 检查钱包余额
```bash
onchain balance 0x1234...5678
```

### 查看投资组合及 DeFi 持仓
```bash
onchain main  # 使用保存的钱包，名称为 "main"
```

### 获取热门预测市场
```bash
onchain polymarket trending -n 5
```

### 用于脚本的 JSON 输出
```bash
onchain --json price eth | jq '.priceUsd'
```

## 支持的链

### EVM（通过 DeBank）
Ethereum、BNB Chain、Polygon、Arbitrum、Optimism、Avalanche、Base、zkSync Era、Linea、Scroll、Blast、Mantle、Gnosis、Fantom、Celo 等。

### Solana（通过 Helius）
完全支持 Solana 主网，包括 SPL 代币和 NFT。

## 智能体集成

此 CLI 专为智能体使用设计。关键模式：

1. **始终使用 `--json`** 以进行程序化访问
2. **检查退出码** - 0 表示成功，1 表示错误
3. **使用保存的钱包** - 使用 `onchain setup` 配置一次，按名称引用
4. **速率限制** - API 有速率限制，快速调用之间添加延迟

### 示例智能体用法

```bash
# 获取投资组合价值
VALUE=$(onchain --json portfolio main | jq -r '.totalValueUsd')

# 获取价格及变化
onchain --json price btc | jq '{price: .priceUsd, change24h: .priceChange24h}'

# 检查市场是否看涨
CHANGE=$(onchain --json markets | jq '.marketCapChange24h')
```
