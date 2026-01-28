# Simmer 天气交易技能

使用 NOAA 天气预报交易 Polymarket 天气市场。灵感来自 [gopfan2 的 200 万美元天气交易策略](https://twitter.com/gopfan2)。

## 工作原理

1. 从 Simmer 获取活跃的天气市场（标记为 "weather"）
2. 获取相关日期的 NOAA 天气预报
3. 查找天气预报与低价区间匹配的市场
4. 当价格 < 15¢ 时买入（gopfan2 的阈值）

## 设置

### 1. 安装 Clawdbot

按照 [Clawdbot 安装指南](https://docs.clawd.bot/getting-started) 进行操作。

### 2. 获取您的 Simmer API 密钥

1. 访问 [simmer.markets/dashboard](https://simmer.markets/dashboard)
2. 点击 **SDK** 选项卡
3. 创建 API 密钥
4. 复制密钥（以 `sk_` 开头）

### 3. 安装此技能

将此文件夹复制到您的 Clawdbot 技能目录：

```bash
cp -r simmer-weather ~/.clawdbot/skills/
```

### 4. 设置您的 API 密钥

添加到您的环境变量（例如 `~/.bashrc` 或 `~/.zshrc`）：

```bash
export SIMMER_API_KEY="sk_your_key_here"
```

或者通过聊天告诉 Clawdbot 设置它。

## 使用方法

### 通过 Clawdbot 聊天

```
你：运行我的天气技能
Clawd：🌤️ 正在运行天气扫描...
       [结果]

你：检查我的天气持仓
Clawd：[显示当前持仓]
```

### 手动 CLI

```bash
# 运行交易扫描
python ~/.clawdbot/skills/simmer-weather/weather_trader.py

# 模拟运行（显示机会但不交易）
python ~/.clawdbot/skills/simmer-weather/weather_trader.py --dry-run

# 仅显示持仓
python ~/.clawdbot/skills/simmer-weather/weather_trader.py --positions
```

### Cron 定时任务

在 Clawdbot 中配置后，此技能默认每 2 小时运行一次。

手动设置：
```bash
# 添加到 crontab（crontab -e）
0 */2 * * * SIMMER_API_KEY="sk_your_key" python ~/.clawdbot/skills/simmer-weather/weather_trader.py >> ~/.clawdbot/logs/weather.log 2>&1
```

## 配置

编辑 `weather_trader.py` 进行自定义：

```python
# 策略参数
ENTRY_THRESHOLD = 0.15  # 当价格 < 15¢ 时买入
EXIT_THRESHOLD = 0.45   # 当价格 > 45¢ 时卖出
MAX_POSITION_USD = 2.00 # 每次交易最多 $2

# 交易位置（最小版本）
ACTIVE_LOCATIONS = ["NYC"]  # 添加 "Chicago", "Miami" 等
```

## 策略详情

基于 gopfan2 的方法：

- **入场**：当价格 < 15¢ 且 NOAA 预报匹配区间时买入 YES
- **出场**：当价格 > 45¢ 时卖出
- **风险**：每笔持仓最多 $2 以限制敞口

Polymarket 上的天气市场使用官方机场温度数据解析（纽约使用拉瓜迪亚机场，芝加哥使用奥黑尔机场等）。NOAA 预报在 1-3 天内通常比较准确。

## 故障排除

### "未找到天气市场"
天气市场具有季节性。访问 [simmer.markets](https://simmer.markets) 查看是否有活跃的市场。

### "API 密钥无效"
确保 `SIMMER_API_KEY` 已设置在您的环境中：
```bash
echo $SIMMER_API_KEY
```

### "NOAA 请求失败"
NOAA API 偶尔会限速或出现故障。等待几分钟后再试。

### "交易失败：未启用真实交易"
您需要在 Simmer 仪表板中启用真实交易：
1. 访问 simmer.markets/dashboard → SDK 选项卡
2. 启用"真实交易"
3. 创建并资助 Polymarket 钱包

## 链接

- [Simmer Markets](https://simmer.markets)
- [Clawdbot](https://clawd.bot)
- [gopfan2 的策略](https://twitter.com/gopfan2)
- [NOAA 天气 API](https://www.weather.gov/documentation/services-web-api)