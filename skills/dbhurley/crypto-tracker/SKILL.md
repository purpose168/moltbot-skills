---
name: crypto-tracker
description: 通过 CoinGecko API 跟踪加密货币价格、设置警报和搜索币种。
homepage: https://www.coingecko.com/api
metadata: {"clawdis":{"emoji":"📈","requires":{"bins":["uv"]}}}
---

# 加密货币跟踪器

使用免费的 CoinGecko API（无需 API 密钥）跟踪加密货币价格、设置价格/百分比警报和搜索币种。

## 快速命令

### 检查价格
```bash
# 单个币种
uv run {baseDir}/scripts/crypto.py price bitcoin

# 多个币种
uv run {baseDir}/scripts/crypto.py price bitcoin ethereum solana

# 更详细信息（市值、交易量）
uv run {baseDir}/scripts/crypto.py price bitcoin --detailed
```

### 搜索币种
```bash
# 通过名称/符号查找币种 ID
uv run {baseDir}/scripts/crypto.py search doge
uv run {baseDir}/scripts/crypto.py search cardano
```

### 管理警报

```bash
# 设置价格阈值警报
uv run {baseDir}/scripts/crypto.py alert <user_id> bitcoin above 100000
uv run {baseDir}/scripts/crypto.py alert <user_id> ethereum below 3000

# 设置百分比变化警报（24小时）
uv run {baseDir}/scripts/crypto.py alert <user_id> bitcoin change 5    # ±5%
uv run {baseDir}/scripts/crypto.py alert <user_id> solana drop 10      # -10%
uv run {baseDir}/scripts/crypto.py alert <user_id> ethereum rise 15    # +15%

# 列出用户的警报
uv run {baseDir}/scripts/crypto.py alerts <user_id>

# 移除警报
uv run {baseDir}/scripts/crypto.py alert-rm <alert_id>

# 检查所有警报（用于 cron/心跳）
uv run {baseDir}/scripts/crypto.py check-alerts
```

## 币种别名

常见符号会自动解析：
- `btc` → bitcoin
- `eth` → ethereum  
- `sol` → solana
- `doge` → dogecoin
- `ada` → cardano
- `xrp` → ripple
- `dot` → polkadot
- `matic` → polygon
- `link` → chainlink
- `avax` → avalanche-2
- `ltc` → litecoin

## 警报类型

| 类型 | 示例 | 触发条件 |
|------|---------|---------------|
| `above` | `alert user btc above 100000` | 价格 >= $100,000 |
| `below` | `alert user eth below 3000` | 价格 <= $3,000 |
| `change` | `alert user btc change 5` | 24小时变化 >= ±5% |
| `drop` | `alert user sol drop 10` | 24小时变化 <= -10% |
| `rise` | `alert user eth rise 15` | 24小时变化 >= +15% |

## 定时任务集成

定期检查警报（例如，每 15 分钟）：
```bash
uv run {baseDir}/scripts/crypto.py check-alerts --json-output
```

返回带有用户 ID 的触发警报，用于通知。

## 数据存储

警报存储在 `{baseDir}/data/alerts.json` 中，包含：
- 按用户跟踪警报
- 重复通知之间的冷却时间（默认：1 小时）
- 最后触发时间戳

## 注意事项

- CoinGecko 免费层级：约 10-30 请求/分钟（无需 API 密钥）
- 支持 15,000+ 币种
- 使用 `--json-output` 标志获取机器可读输出
