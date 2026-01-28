# @cyberdrk/onchain

用于加密货币投资组合跟踪、市场数据和 CEX 历史记录的 CLI。专为人类使用和 AI 智能体集成而设计。

## 安装

```bash
npm install -g @cyberdrk/onchain
```

或直接使用 npx 运行：
```bash
npx @cyberdrk/onchain price btc
```

## 快速开始

```bash
# 检查代币价格
onchain price btc
onchain price eth sol matic

# 查看钱包余额（自动检测 EVM/Solana）
onchain balance 0x1234...5678

# CEX 余额
onchain coinbase balance
onchain binance balance

# 市场概览
onchain markets

# 预测市场
onchain polymarket trending
```

## 命令

### 市场数据
```bash
onchain price <token>           # 代币价格及 24 小时变化
onchain markets                 # 市场概览及热门代币
```

### 钱包数据
```bash
onchain balance <address>       # 代币余额（EVM 或 Solana）
onchain history <address>       # 交易历史
onchain portfolio <address>     # 完整投资组合及 DeFi 持仓
```

### CEX 数据
```bash
onchain coinbase balance        # Coinbase 账户余额
onchain coinbase history        # 交易历史
onchain binance balance         # Binance 账户余额
onchain binance history         # 交易历史
```

### 预测市场
```bash
onchain polymarket trending     # 热门市场
onchain polymarket search <q>   # 搜索市场
onchain polymarket view <slug>  # 市场详情
```

### 配置
```bash
onchain setup                   # 交互式 API 密钥设置
onchain config                  # 查看当前配置
onchain test                    # 测试所有配置的提供程序
```

## 配置

运行 `onchain setup` 进行交互式配置，或设置环境变量：

| 功能 | 环境变量 | 提供程序 |
|---------|---------------------|----------|
| EVM 钱包 | `DEBANK_API_KEY` | [DeBank Cloud](https://cloud.debank.com/) |
| Solana 钱包 | `HELIUS_API_KEY` | [Helius](https://helius.xyz/) |
| Coinbase | `COINBASE_API_KEY_ID` + `COINBASE_API_KEY_SECRET` | [Coinbase CDP](https://portal.cdp.coinbase.com/) |
| Binance | `BINANCE_API_KEY` + `BINANCE_API_SECRET` | [Binance](https://www.binance.com/en/my/settings/api-management) |
| 市场数据 | `COINGECKO_API_KEY` | [CoinGecko](https://www.coingecko.com/en/api)（可选）|
| 市场回退 | `COINMARKETCAP_API_KEY` | [CoinMarketCap](https://coinmarketcap.com/api/)（可选）|

配置文件位置：
- 全局：`~/.config/onchain/config.json5`
- 本地：`./.onchainrc.json5`

## 全局选项

```bash
--json              # 输出为 JSON（用于脚本/智能体）
--plain             # 禁用颜色和 emoji
--no-color          # 仅禁用颜色
--timeout <ms>      # 请求超时时间（毫秒）
```

## 智能体集成

此 CLI 设计用于 AI 智能体，使用 `--json` 输出：

```bash
# 获取投资组合价值
onchain --json portfolio 0x123... | jq '.totalValueUsd'

# 检查市场是否上涨
onchain --json markets | jq '.marketCapChange24h > 0'

# 获取特定代币价格
onchain --json price eth | jq '{price: .priceUsd, change: .priceChange24h}'
```

退出码：`0` 表示成功，`1` 表示错误。

## 支持的链

**EVM（通过 DeBank）：** Ethereum、BNB Chain、Polygon、Arbitrum、Optimism、Avalanche、Base、zkSync Era、Linea、Scroll、Blast、Mantle 等 60+ 条链。

**Solana（通过 Helius）：** 完全支持 Solana 主网，包括 SPL 代币和 NFT。

## 开发

```bash
pnpm install
pnpm run dev price btc    # 不构建直接运行
pnpm run build            # 构建 TypeScript
pnpm run test             # 运行测试
pnpm run lint             # 代码检查
```

## 许可证

MIT
