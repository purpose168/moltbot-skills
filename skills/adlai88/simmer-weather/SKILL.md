---
name: simmer-weather
description: 通过 Simmer API 使用 NOAA 天气预报交易 Polymarket 天气市场。灵感来自 gopfan2 的 200 万美元策略。
metadata: {"clawdbot":{"emoji":"🌡️","requires":{"env":["SIMMER_API_KEY"]},"cron":"0 */2 * * *"}}
authors:
  - Simmer (@simmer_markets)
attribution: "策略灵感来自 gopfan2"
---

# Simmer 天气交易

使用 NOAA 预报数据在 Polymarket 上交易温度市场。

## 何时使用此技能

当用户想要以下操作时使用此技能：
- 自动交易天气市场
- 设置 gopfan2 风格的温度交易
- 低买天气预测
- 检查天气交易持仓
- 配置交易阈值或位置

## 设置流程

当用户要求安装或配置此技能时：

1. **询问 Simmer API 密钥**
   - 他们可以从 simmer.markets/dashboard → SDK 选项卡获取
   - 存储在环境变量中为 `SIMMER_API_KEY`

2. **询问设置（或确认默认值）**
   - 入场阈值：何时买入（默认 15¢）
   - 出场阈值：何时卖出（默认 45¢）
   - 最大仓位：每笔交易金额（默认 $2.00）
   - 位置：交易哪些城市（默认 NYC）

3. **保存设置到环境变量**
   - `SIMMER_WEATHER_ENTRY` - 入场阈值（例如 "0.15" 表示 15¢）
   - `SIMMER_WEATHER_EXIT` - 出场阈值（例如 "0.45" 表示 45¢）
   - `SIMMER_WEATHER_MAX_POSITION` - 每笔最大金额（例如 "2.00"）
   - `SIMMER_WEATHER_LOCATIONS` - 逗号分隔的城市（例如 "NYC,Chicago"）

4. **设置 cron 定时任务**
   - 默认每 2 小时运行一次
   - 用户可以请求不同频率

## 配置

所有设置都可以通过环境变量自定义：

| 设置 | 环境变量 | 默认值 | 描述 |
|---------|---------------------|---------|-------------|
| 入场阈值 | `SIMMER_WEATHER_ENTRY` | 0.15 | 当价格低于此值时买入（0.15 = 15¢） |
| 出场阈值 | `SIMMER_WEATHER_EXIT` | 0.45 | 当价格高于此值时卖出（0.45 = 45¢） |
| 最大仓位 | `SIMMER_WEATHER_MAX_POSITION` | 2.00 | 每笔交易最大美元金额 |
| 位置 | `SIMMER_WEATHER_LOCATIONS` | NYC | 逗号分隔：NYC,Chicago,Miami,Seattle,Dallas,Atlanta |

**支持的位置：**
- NYC（纽约 - 拉瓜迪亚机场）
- Chicago（芝加哥 - 奥黑尔机场）
- Seattle（西雅图 - 塔科马机场）
- Atlanta（亚特兰大 - 哈茨菲尔德机场）
- Dallas（达拉斯 - 沃斯堡机场）
- Miami（迈阿密 - 国际机场）

查看当前配置，运行：
```bash
python weather_trader.py --config
```

## 工作原理

每个周期脚本执行以下步骤：
1. 从 Simmer API 获取活跃的天气市场（标记为 "weather"）
2. 按事件分组市场（每个温度日是一个事件，包含多个区间）
3. 解析事件名称以获取位置和日期
4. 获取该位置/日期的 NOAA 预报
5. 找到与预报匹配的温度区间
6. **入场：** 如果区间价格 < 入场阈值 → 通过 Simmer SDK 执行买入
7. **出场：** 检查未平仓持仓，如果价格 > 出场阈值则卖出
8. 向用户报告结果

## 运行技能

**运行扫描：**
```bash
python weather_trader.py
```

**模拟运行（无实际交易）：**
```bash
python weather_trader.py --dry-run
```

**仅检查持仓：**
```bash
python weather_trader.py --positions
```

**查看当前配置：**
```bash
python weather_trader.py --config
```

## 报告结果

每次运行后，向用户发送消息，包含：
- 当前配置
- 找到的天气市场数量
- 每个位置的 NOAA 预报
- 入场机会（以及执行的交易）
- 出场机会（以及执行的卖出）
- 当前持仓

要分享的示例输出：
```
🌤️ 天气交易扫描完成

配置：入场 <15¢，出场 >45¢，最大 $2.00，位置：NYC

找到 12 个活跃天气市场，分布在 4 个事件中

NYC 1 月 28 日：NOAA 预报 34°F（最高温度）
→ 区间 "34-35°F" 交易价格 $0.12
→ 低于 15¢ 阈值 - 买入机会！
→ 已执行：以 $0.12 买入 16.6 股（$2.00）

检查 2 个未平仓持仓：
→ NYC 1 月 27 日 "32-33°F" @ $0.52 - 卖出机会！
→ 已执行：以 $0.52 卖出 15.0 股

汇总：执行 1 次买入，1 次卖出
下次扫描在 2 小时后。
```

## 示例对话

**用户："设置天气交易"**
→ 引导设置流程：
1. 询问 API 密钥
2. 询问入场阈值（建议默认 15¢）
3. 询问出场阈值（建议默认 45¢）
4. 询问最大仓位（建议 $2）
5. 询问哪些位置（默认 NYC，可以添加更多）
6. 保存设置并设置 cron

**用户："运行我的天气技能"**
→ 立即执行脚本并报告结果

**用户："我的天气交易情况如何？"**
→ 使用 --positions 标志运行脚本并总结

**用户："让它更激进"**
→ 解释当前阈值并提供选项：
- 将入场阈值提高到 20¢（更多机会）
- 将最大仓位提高到 $5（更大交易）
→ 更新相关的环境变量

**用户："将芝加哥添加到我的天气交易"**
→ 更新 SIMMER_WEATHER_LOCATIONS 以包含芝加哥
→ 示例："NYC,Chicago"

**用户："我当前的设置是什么？"**
→ 使用 --config 标志运行脚本并显示设置

**用户："将我的出场阈值改为 50 美分"**
→ 将 SIMMER_WEATHER_EXIT 更新为 "0.50"

## 故障排除

**"未找到天气市场"**
- 天气市场可能未激活（季节性）
- 检查 simmer.markets 看是否存在天气市场

**"API 密钥无效"**
- 验证 SIMMER_API_KEY 环境变量已设置
- 从 simmer.markets/dashboard → SDK 选项卡获取新密钥

**"NOAA 请求失败"**
- NOAA API 可能被限速，等待几分钟
- 检查 weather.gov 是否可访问

**"最大仓位太小，无法买 5 股"**
- Polymarket 要求每笔订单最少 5 股
- 增加 SIMMER_WEATHER_MAX_POSITION 或等待更低价格

**"价格低于最小单位"**
- 市场处于极端（接近 0% 或 100%）
- 这些会自动跳过以避免问题