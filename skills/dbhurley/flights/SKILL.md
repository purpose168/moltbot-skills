---
name: flights
description: 跟踪航班状态、延误情况和搜索航线。使用 FlightAware 数据。
homepage: https://flightaware.com
metadata: {"clawdis":{"emoji":"✈️","requires":{"bins":[],"env":[]}}}
---

# 航班跟踪技能

使用 FlightAware 数据跟踪航班状态、搜索航线并监控延误情况。

## 快速命令

```bash
cd skills/flights

# 按航线搜索航班
uv run python scripts/flights.py search PVD ORF --airline MX

# 获取特定航班状态
uv run python scripts/flights.py status MXY704
```

## 使用示例

**搜索 Breeze 航空 PVD → ORF 航班：**
```bash
flights.py search PVD ORF --airline MX
```

**查询特定航班：**
```bash
flights.py status AA100
flights.py status MXY704 --date 2026-01-08
```

## 输出格式

```json
{
  "flight": "MXY704",
  "airline": "Breeze Airways",
  "origin": "PVD",
  "destination": "ORF",
  "departure": "周四 05:04PM EST",
  "arrival": "06:41PM EST",
  "status": "已安排 / 延误",
  "aircraft": "BCS3"
}
```

## 状态值说明

- `Scheduled` - 航班准时
- `Scheduled / Delayed` - 预计延误
- `En Route / On Time` - 飞行中，准时
- `En Route / Delayed` - 飞行中，延误
- `Arrived / Gate Arrival` - 已降落并到达登机口
- `Cancelled` - 航班取消

## 航空公司代码

| 代码 | 航空公司 |
|------|----------|
| MX/MXY | Breeze Airways |
| AA | 美国航空 |
| DL | 达美航空 |
| UA | 美联航 |
| WN | 西南航空 |
| B6 | 捷蓝航空 |

## 可选：AviationStack API

要获取更详细的数据，请设置 `AVIATIONSTACK_API_KEY`（可在 aviationstack.com 获取免费套餐）。

## 依赖项

```bash
cd skills/flights && uv sync
```
