---
name: mbta
description: 波士顿地区地铁、公交、通勤铁路和轮渡的实时 MBTA 交通预测。查询发车时间、搜索站点/路线、检查服务警报和运行实时仪表板。当被问及波士顿交通、T 时刻表、何时出发赶火车或 MBTA 服务状态时使用。
metadata: {"clawdbot":{"requires":{"bins":["python3"],"pip":["requests"]}}}
---

# MBTA 交通

通过 v3 API 查询实时 MBTA 预测。

## 设置

```bash
# 可选但推荐用于更高的速率限制
export MBTA_API_KEY=your_key_here  # 免费获取：https://api-v3.mbta.com/portal

# 安装依赖
pip install requests pyyaml flask  # flask 仅用于仪表板
```

## 快速命令

```bash
cd skills/mbta

# 站点的下一班发车
python scripts/mbta.py next --stop place-alfcl  # 艾尔威夫
python scripts/mbta.py next --stop place-harsq --route Red  # 哈佛，仅限红线

# 搜索站点 ID
python scripts/mbta.py stops --search "Porter"
python scripts/mbta.py stops --search "Kendall"

# 列出路线
python scripts/mbta.py routes              # 所有路线
python scripts/mbta.py routes --type rail  # 仅限地铁
python scripts/mbta.py routes --type bus   # 公交

# 服务警报
python scripts/mbta.py alerts              # 所有警报
python scripts/mbta.py alerts --route Red  # 红线警报

# 所有配置的发车（使用 config.yaml）
python scripts/mbta.py departures --config config.yaml

# 启动网络仪表板
python scripts/mbta.py dashboard --config config.yaml --port 6639
```

## 配置

编辑 `config.yaml` 来设置您的站点：

```yaml
panels:
  - title: "My Station"
    walk_minutes: 5  # 过滤掉您赶不上的列车
    services:
      - label: "Red Line"
        destination: "to Alewife"
        route_id: "Red"
        stop_id: "place-harsq"
        direction_id: 0  # 方向为 0 或 1
        limit: 3
```

关键字段：
- `walk_minutes`: 发车时间早于此的列车将被过滤掉
- `direction_id`: 0 =  outbound/north, 1 = inbound/south（因线路而异）
- `headsign_contains`: 可选过滤器（例如 "Ashmont" 以排除 Braintree）

## 查找站点/路线 ID

```bash
# 搜索站点
python scripts/mbta.py stops --search "Davis"
# 返回: place-davis: Davis

# 获取路线
python scripts/mbta.py routes --type rail
# 返回路线 ID 如 "Red", "Orange", "Green-E"
```

## JSON 输出

添加 `--json` 获取机器可读输出：

```bash
python scripts/mbta.py next --stop place-alfcl --json
python scripts/mbta.py departures --config config.yaml --json
```

## 常见站点 ID

| 站点 | 站点 ID |
|---------|---------|
| Alewife | place-alfcl |
| Harvard | place-harsq |
| Kendall/MIT | place-knncl |
| Park Street | place-pktrm |
| South Station | place-sstat |
| North Station | place-north |
| Back Bay | place-bbsta |
| Downtown Crossing | place-dwnxg |

## 回答用户问题

**"下一班红线列车是什么时候？"**
```bash
python scripts/mbta.py next --stop place-alfcl --route Red
```

**"我现在应该离开去赶 T 吗？"**
检查发车时间与步行时间。如果下一班列车 ≤ 步行分钟数，回答 "现在就走！"

**"橙线有延误吗？"**
```bash
python scripts/mbta.py alerts --route Orange
```

**"哪些公交去哈佛？"**
```bash
python scripts/mbta.py stops --search "Harvard"
# 然后检查该站点的路线
python scripts/mbta.py next --stop <stop_id>
```
