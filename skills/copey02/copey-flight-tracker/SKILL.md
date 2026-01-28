---
name: flight-tracker
version: 1.0.0
description: 使用详细的实时状态、登机口信息、延误情况和实时位置跟踪航班。当用户要求跟踪航班、检查航班状态、通过航班号查询航班信息（例如"跟踪 AA100"、"联合航空 2402 的状态是什么"、"检查我的 BA123 航班"）或希望以类似 Flighty 应用的格式化视图显示航班数据时使用。
---

# 航班跟踪器

使用 AviationStack API 跟踪全球任何航班，并以简洁的 Flighty 风格格式显示。

## 快速开始

通过 IATA 代码跟踪航班：

```bash
scripts/track_flight.py AA100
scripts/track_flight.py UA2402
scripts/track_flight.py BA123
```

## 首次设置

使用此技能之前，您需要一个 API 密钥（一次性设置）：

1. **在 https://aviationstack.com/signup/free 获取免费 API 密钥**（每月 100 次请求）
2. **设置环境变量：**
   ```bash
   export AVIATIONSTACK_API_KEY='your-key-here'
   ```
3. **安装依赖：**
   ```bash
   pip3 install requests
   ```

有关详细设置说明，请参阅 [api-setup.md](references/api-setup.md)。

## 输出格式

该技能以简洁、可读的格式显示航班信息，包括：

- ✈️ 航空公司和航班号
- 🛩️ 飞机型号和注册号
- 🛫 出发机场、航站楼、登机口、时间
- 🛬 到达机场、航站楼、登机口、时间
- 📊 航班状态及可视化指示
- ⏱️ 延误计算（如果适用）
- 🌐 实时位置、高度、速度（在空中时）

状态指示：
- 🟢 飞行中/在空中/航路上
- ✅ 已降落/已到达
- 🟡 已计划
- 🟠 已延误
- 🔴 已取消

## 高级用法

**获取原始 JSON 数据：**
```bash
scripts/track_flight.py AA100 --json
```

**查看帮助：**
```bash
scripts/track_flight.py --help
```

## 工作流程

当用户要求跟踪航班时：

1. 从请求中提取航班号
2. 使用航班号运行跟踪脚本
3. 向用户展示格式化输出
4. 如果需要进一步处理数据，使用 `--json` 标志

## 航班号格式

接受 IATA 航班代码：
- AA100（美国航空）
- UA2402（联合航空）
- BA123（英国航空）
- DL456（达美航空）

脚本会自动转换为大写并处理查询。

## 错误处理

脚本处理常见错误：
- 缺少 API 密钥 → 显示设置说明
- 航班未找到 → 建议核实
- API 错误 → 显示错误消息
- 超出速率限制 → 指示达到限制

## API 限制

免费层级：每月 100 次请求。跟踪使用情况以保持在限制内。对于大量使用，请考虑升级或使用替代 API（请参阅 references/api-setup.md）。

## 注意事项

- 使用 AviationStack 免费层级（免费计划无 HTTPS）
- 实时数据频繁更新
- 可用的历史航班数据
- 全球覆盖（250+ 个国家，13,000+ 家航空公司）
