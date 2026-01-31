---
name: grocery-list
description: 独立的购物清单、食谱和膳食计划，使用本地存储。无需外部服务。
homepage: https://clawdhub.com/skills/grocery-list
metadata: { "clawdbot": { "emoji": "🛒", "requires": { "bins": ["uv"] } } }
---

# 购物清单和膳食计划

自包含的购物清单、食谱和膳食计划，使用本地 JSON 存储。无需订阅或外部服务。

## 功能

- **多个清单** — 杂货、Costco、Target 等
- **智能分类** — 农产品、乳制品、肉类、面包、冷冻食品、食品储藏室、家居用品
- **数量解析** — "2 gallons milk" → 数量: 2, 单位: "gallon"
- **食谱存储** — 保存带有配料的食谱
- **膳食计划** — 按日期和类型（早餐/午餐/晚餐）计划膳食
- **食谱转清单** — 通过一个命令将食谱配料添加到任何清单
- **家庭成员分配** — 将物品分配给家庭成员
- **通知** — `notify` 命令用于心跳/定时任务集成

## 命令

### 清单

```bash
uv run {baseDir}/scripts/grocery.py lists                    # 显示所有清单
uv run {baseDir}/scripts/grocery.py list "Grocery"           # 显示清单中的物品
uv run {baseDir}/scripts/grocery.py list "Grocery" --unchecked
uv run {baseDir}/scripts/grocery.py list create "Costco"     # 创建新清单
uv run {baseDir}/scripts/grocery.py list delete "Costco"     # 删除清单
```

### 物品

```bash
uv run {baseDir}/scripts/grocery.py add "Grocery" "Milk"
uv run {baseDir}/scripts/grocery.py add "Grocery" "Milk" --category dairy --qty "2 gallons"
uv run {baseDir}/scripts/grocery.py add "Grocery" "Chicken" --assignee "Erin"
uv run {baseDir}/scripts/grocery.py check "Grocery" "Milk"
uv run {baseDir}/scripts/grocery.py uncheck "Grocery" "Milk"
uv run {baseDir}/scripts/grocery.py remove "Grocery" "Milk"
uv run {baseDir}/scripts/grocery.py clear "Grocery"          # 清除已勾选物品
```

### 食谱

```bash
uv run {baseDir}/scripts/grocery.py recipes                  # 列出所有食谱
uv run {baseDir}/scripts/grocery.py recipe "Tacos"           # 查看食谱
uv run {baseDir}/scripts/grocery.py recipe add "Tacos" --ingredients "ground beef,tortillas,cheese,lettuce,tomatoes"
uv run {baseDir}/scripts/grocery.py recipe add "Tacos" --category "Mexican" --servings 4
uv run {baseDir}/scripts/grocery.py recipe delete "Tacos"
uv run {baseDir}/scripts/grocery.py recipe search "chicken"
```

### 膳食计划

```bash
uv run {baseDir}/scripts/grocery.py meals                    # 显示本周膳食
uv run {baseDir}/scripts/grocery.py meals --date 2026-01-15
uv run {baseDir}/scripts/grocery.py meal add --date 2026-01-15 --type dinner --recipe "Tacos"
uv run {baseDir}/scripts/grocery.py meal add-to-list --date 2026-01-15 --list "Grocery"
uv run {baseDir}/scripts/grocery.py meal remove --date 2026-01-15 --type dinner
```

### 通知

```bash
uv run {baseDir}/scripts/grocery.py notify                   # 心跳的待处理警报
uv run {baseDir}/scripts/grocery.py stats                    # 快速摘要
```

## 分类

内置自动检测分类：

- **produce** — 水果、蔬菜
- **dairy** — 牛奶、奶酪、鸡蛋、酸奶
- **meat** — 鸡肉、牛肉、猪肉、鱼
- **bakery** — 面包、卷、百吉饼
- **frozen** — 冰淇淋、冷冻餐
- **pantry** — 罐头食品、意大利面、米饭
- **beverages** — 饮料、汽水、果汁
- **snacks** — 薯片、饼干
- **household** — 清洁用品、纸制品
- **personal** — 洗漱用品、药品
- **other** — 未分类

## JSON 输出

所有命令都支持 `--json` 用于编程访问：

```bash
uv run {baseDir}/scripts/grocery.py list "Grocery" --json
uv run {baseDir}/scripts/grocery.py recipes --json
uv run {baseDir}/scripts/grocery.py meals --json
```

## 数据存储

数据存储在本地 `~/.clawdbot/grocery-list/data.json`。无需云账户。

## 使用示例

**"将牛奶和鸡蛋添加到购物清单"**

```bash
uv run {baseDir}/scripts/grocery.py add "Grocery" "Milk" --category dairy
uv run {baseDir}/scripts/grocery.py add "Grocery" "Eggs" --category dairy
```

**"购物清单上有什么？"**

```bash
uv run {baseDir}/scripts/grocery.py list "Grocery" --unchecked
```

**"计划周六晚餐吃 tacos"**

```bash
uv run {baseDir}/scripts/grocery.py meal add --date 2026-01-18 --type dinner --recipe "Tacos"
```

**"将 taco 配料添加到购物清单"**

```bash
uv run {baseDir}/scripts/grocery.py meal add-to-list --date 2026-01-18 --list "Grocery"
```

**"勾选牛奶"**

```bash
uv run {baseDir}/scripts/grocery.py check "Grocery" "Milk"
```
