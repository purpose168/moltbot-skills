---
name: rejseplanen
description: 丹麦国家旅行规划工具。提供实时列车、巴士、地铁和城际交通信息。使用 Rejseplanen API 进行路线规划、时刻表查询和车站搜索。
author: Bjarke S <bjarkehs@gmail.com>
metadata:
  clawdbot:
    emoji: "🚂"
    requires:
      bins: ["curl"]
---

# Rejseplanen - 丹麦旅行规划

在丹麦规划公共交通旅行。提供实时列车、巴士、地铁和城际交通信息。

## 快速参考

| 操作 | 命令 |
|------|------|
| 规划路线 | `bash scripts/trip.sh "起点" "终点" [日期时间]` |
| 查询时刻表 | `bash scripts/timetable.sh "车站名" [线路] [日期]` |
| 搜索车站 | `bash scripts/stations.sh "搜索词"` |

## 设置

需要配置以下环境变量：

- `REJSEPLANEN_PASSWORD` - Rejseplanen API 密码
- `REJSEPLANEN_USERNAME` - Rejseplanen API 用户名

在 Clawdbot 配置中设置：

```json
{
  "skills": {
    "entries": {
      "rejseplanen": {
        "env": {
          "REJSEPLANEN_PASSWORD": "您的密码",
          "REJSEPLANEN_USERNAME": "您的用户名"
        }
      }
    }
  }
}
```

## 使用方法

### 规划路线

查找从 A 到 B 的路线：

```bash
bash scripts/trip.sh "København H" "Aarhus H"
```

带日期时间：

```bash
bash scripts/trip.sh "København H" "Aarhus H" "14:00 25.12.2026"
```

输出格式：JSON，包含所有详细信息（换乘、持续时间、价格）

### 查询时刻表

查看车站的时刻表：

```bash
bash scripts/timetable.sh "København H"
```

带线路过滤：

```bash
bash scripts/timetable.sh "København H" "IC"
```

带日期：

```bash
bash scripts/timetable.sh "København H" "" "25.12.2026"
```

### 搜索车站

搜索车站名称：

```bash
bash scripts/stations.sh "København"
```

## 丹麦交通类型

| 类型 | 描述 |
|------|------|
| **列车 (Train)** | 区域列车、城际列车、高铁 (IC, IC, Lyn) |
| **巴士 (Bus)** | 区域和本地巴士 |
| **地铁 (Metro)** | 哥本哈根地铁 (M1, M2, M3) |
| **通勤铁路 (S-tog)** | 哥本哈根通勤铁路 |

## 常见路线示例

### 哥本哈根到奥登塞
```bash
bash scripts/trip.sh "København H" "Odense St."
```

### 哥本哈根到比隆（乐高乐园）
```bash
bash scripts/trip.sh "København H" "Billund Lufthavn"
```

### 查询机场交通
```bash
bash scripts/trip.sh "København H" "Københavns Lufthavn"
```

## 提示

- 使用车站的官方名称（如 "København H" 而非 "Copenhagen"）
- 丹麦铁路覆盖全国，包括到瑞典的路线
- 实时数据在 API 中可用时包含