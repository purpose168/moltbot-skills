---
name: snow-report
description: 获取全球任何山地度假村的雪况、预报和滑雪报告。当询问雪、粉雪、滑雪条件或山地天气时使用。通过 OpenSnow 支持 1000+ 度假村。用户可以设置喜爱的山峰以快速访问。支持 SnowTick 4字母代码（JHMR、TARG、MMTH）以快速查找。
---

# 雪况报告

从 OpenSnow 获取全球任何滑雪胜地的实时雪况。

## SnowTick — 山地代码

用于快速山地查找的 4 字母代码，类似股票代码：

| 代码 | 度假村 |
|--------|--------|
| `JHMR` | Jackson Hole |
| `TARG` | Grand Targhee |
| `MMTH` | Mammoth |
| `BIRD` | Snowbird |
| `ALTA` | Alta |
| `BOAT` | Steamboat |
| `WHIS` | Whistler |

完整列表在 `references/resorts.md` 中。在任何使用度假村名称的地方都可以使用代码。

## 命令

| 用户说 | 操作 |
|-----------|--------|
| "snowtick" | 快速代码带显示所有喜爱 |
| "snow report" / "how's the snow" | 从用户配置中获取默认山峰 |
| "snow at Mammoth" / "Jackson snow" | 获取特定度假村 |
| "JHMR" / "what's TARG at" | 通过 SnowTick 代码获取 |
| "compare Jackson and Targhee" | 多山比较 |
| "compare JHMR TARG MMTH" | 通过代码比较 |
| "powder alert" / "where's it snowing" | 检查喜爱地区的预报 |

## 用户配置

检查 `memory/snow-preferences.md` 获取用户设置：

```markdown
# 雪偏好设置

## 默认山峰
JHMR

## 喜爱
- JHMR (Jackson Hole)
- TARG (Grand Targhee)
- MMTH (Mammoth)
- ALTA (Alta)

## 报告风格
- compact (默认) | detailed
- skip: parking
```

代码或简写都可以使用。如果没有配置，询问用户他们的主山峰并创建文件。

## 解析代码

当用户提供代码（4 个大写字母）时：
1. 在 `references/resorts.md` 中查找
2. 获取对应的简写
3. 使用简写构建 OpenSnow URL

示例: `JHMR` → `jacksonhole` → `opensnow.com/location/jacksonhole/snow-summary`

## 快速使用

### SnowTick 命令
```
1. 从 memory/snow-preferences.md 读取用户喜爱
2. 并行打开所有喜爱度假村标签页
3. 快照每个标签页获取雪数据
4. 提取：基础深度、5 天预报、当前条件
5. 格式化为代码带最佳箭头
6. 关闭所有标签页
```

### 单山查询
```
1. browser action=open targetUrl=https://opensnow.com/location/{slug}/snow-summary
2. browser action=snapshot compact=true
3. 提取关键数据，关闭标签页
```

### 多山比较
```
1. 并行打开所有度假村标签页（每个的 browser action=open）
2. 快照所有标签页
3. 提取并格式化为比较表
4. 关闭所有标签页
```

## 数据提取

从 OpenSnow 快照中查找：

### 雪况摘要
- `Last 24 Hours` — 报告的降雪量 + 时间戳
- `Next 1-5 Days` — 预报的降雪
- `Next 6-10 Days` — 延长预报
- `Next 11-15 Days` — 长期预报

### 当前条件（"Right Now"下）
- 温度 + 体感温度
- 风速、方向、阵风
- 天气状况（晴、下雪等）

### 本地专家（每日雪况）
- 专家姓名
- 预报叙述

### AI 概览
- 快速条件摘要

## 输出格式

### SnowTick（喜爱仪表板）
```
📈 SnowTick — {date}

JHMR  12"  ▲ 6"   ❄️ snowing
FISH   8"  ▲ 2"   ☀️ clear  
SGAR  24"  ▲ 12"  ❄️ snowing ←
BALD  36"  ▲ 8"   🌨️ flurries
BRDG   6"  ▲ 0"   ☀️ clear
ROCK   2"  — 0"   ☀️ clear

▲ = next 5 days | ← = best bet
```

列：代码 | 基础深度 | 5 天预报 | 当前状况

### 紧凑（默认）
```
🏔️ {Resort} [{TICK}] — {date}

**雪:** {24hr}" | 接下来 5 天: {forecast}"
**现在:** {temp}°F, {conditions}, 风 {speed} mph
**每日雪况:** {1 句摘要}
```

### 详细
```
🏔️ {Resort} [{TICK}] — {date}

**现在:** {temp}°F ({feels}°F), {conditions}, 风 {speed} mph {dir}

| 周期 | 雪 |
|--------|------|
| 最近 24 小时 | X" |
| 接下来 5 天 | X" |
| 接下来 6-10 天 | X" |
| 接下来 11-15 天 | X" |

**每日雪况 ({expert}):** {完整摘要}

**AI 概览:** {摘要}
```

### 比较表
```
📊 雪况比较 — {date}

| 代码 | 度假村 | 24小时 | 接下来 5 天 | 接下来 10 天 | 温度 |
|--------|--------|------|---------|----------|------|
| JHMR | Jackson Hole | 0" | 0" | 8" | 11°F |
| TARG | Grand Targhee | 0" | 2" | 12" | 8°F |
| ALTA | Alta | 0" | 1" | 6" | 15°F |

**最佳选择:** TARG — 雪最多
```

### 粉雪警报
```
🚨 粉雪警报 — {date}

正在检查您的喜爱地区是否有降雪...

| 代码 | 度假村 | 接下来 5 天 | 接下来 10 天 |
|--------|--------|---------|----------|
| TARG | Grand Targhee | 6" | 18" | ← 最佳
| JHMR | Jackson Hole | 0" | 8" |
| ALTA | Alta | 2" | 10" |

**结论:** TARG 看起来是下周最佳选择
```

## 度假村简写和 SnowTick 代码

有关带的完整列表，请参阅 `references/resorts.md`。

**快速参考：**
| 地区 | 代码 |
|--------|---------|
| 怀俄明 | `JHMR` `TARG` `SNWK` |
| 犹他 | `ALTA` `BIRD` `PCMR` `DEER` |
| 科罗拉多 | `VAIL` `AJAX` `TELL` `BOAT` |
| 加州 | `MMTH` `PALI` `KIRK` `HVLY` |
| 蒙大拿 | `BSKY` `FISH` `BRDG` |
| BC | `WHIS` `RVLK` |
| 日本 | `NSKO` `HAKU` |

对于未列出的度假村：搜索 opensnow.com 并从 URL 获取简写，然后添加代码到 references。

## 首次设置

如果用户在没有配置的情况下询问雪况报告：

1. 询问："您的主山峰是什么？我会将其设置为默认值。"
2. 使用他们的答案创建 `memory/snow-preferences.md`
3. 询问："还有其他喜爱的山峰要添加用于比较吗？"
4. 获取他们的第一份报告

## 注意事项

- OpenSnow 是 JS 渲染的；需要浏览器
- 数据全天更新；早晨报告最新
- 11-15 天预报可能需要付费（显示可见内容）
- 对于特定度假村数据（索道、压雪道），请检查度假村自己的网站
