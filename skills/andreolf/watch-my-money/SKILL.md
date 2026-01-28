---
name: watch-my-money
description: 分析银行交易、对支出进行分类、跟踪月度预算、检测超支和异常。输出交互式 HTML 报告。
triggers:
  - "跟踪支出"
  - "检查我的预算"
  - "分析交易"
  - "我花了什么"
  - "我超支了吗"
  - "预算跟踪器"
  - "支出分析"
  - "月度支出"
formats:
  - CSV 银行导出
  - 文本交易列表
outputs:
  - 交互式 HTML 报告
  - JSON 数据导出
  - 控制台摘要
privacy: local-only
---

# 看管我的钱

分析交易、对支出进行分类、跟踪预算、标记超支。

## 工作流程

### 1. 获取交易

向用户索要银行/信用卡 CSV 导出或粘贴的文本。

常见来源：
- 从银行在线门户下载 CSV
- 从预算应用程序导出
- 从对账单复制/粘贴交易

支持的格式：
- 任何包含日期、描述、金额列的 CSV
- 粘贴的文本："2026-01-03 Starbucks -5.40 CHF"

### 2. 解析和标准化

读取输入，标准化为标准格式：
- 自动检测分隔符（逗号、分号、制表符）
- 解析日期（YYYY-MM-DD、DD/MM/YYYY、MM/DD/YYYY）
- 标准化金额（支出为负，收入为正）
- 从描述中提取商户
- 检测定期交易（订阅）

### 3. 对交易进行分类

为每笔交易分配类别：

**类别：**
- 房租、水电费、订阅、杂货、外出就餐
- 交通、旅行、购物、健康
- 收入、转账、其他

分类顺序：
1. 检查保存的商户覆盖
2. 应用确定性关键词规则（见 [common-merchants.md](references/common-merchants.md)）
3. 模式匹配（订阅、水电费）
4. 启发式回退

对于模糊的商户（5-10 个批次），请用户确认。
保存覆盖以供将来运行。

### 4. 检查预算

将支出与用户定义的预算进行比较。

警报阈值：
- 80% - 接近限制（黄色）
- 100% - 达到限制（红色）
- 120% - 超出预算（红色，紧急）

见 [budget-templates.md](references/budget-templates.md) 获取建议预算。

### 5. 检测异常

标记异常支出：
- 类别激增：支出 > 1.5 倍基线且差值 > 50
- 订阅增长：订阅增加 > 20%
- 新昂贵商户：首次出现且支出 > 30
- 潜在订阅：定期相同金额收费

基线 = 前 3 个月平均值（或如果没有历史记录则使用当前月）。

### 6. 生成 HTML 报告

创建本地 HTML 文件，包含：
- 月度摘要（收入、支出、净额）
- 带预算状态的类别明细
- 顶级商户
- 警报部分
- 检测到的定期交易
- 隐私切换（模糊金额/商户）

复制 [template.html](assets/template.html) 并注入数据。

### 7. 保存状态

持久化到 `~/.watch_my_money/`：
- `state.json` - 预算、商户覆盖、历史记录
- `reports/YYYY-MM.json` - 机器可读的月度数据
- `reports/YYYY-MM.html` - 交互式报告

## CLI 命令

```bash
# 分析 CSV
python -m watch_my_money analyze --csv path/to/file.csv --month 2026-01

# 从标准输入分析
cat transactions.txt | python -m watch_my_money analyze --stdin --month 2026-01 --default-currency CHF

# 比较月份
python -m watch_my_money compare --months 2026-01 2025-12

# 设置预算
python -m watch_my_money set-budget --category groceries --amount 500 --currency CHF

# 查看预算
python -m watch_my_money budgets

# 导出月度数据
python -m watch_my_money export --month 2026-01 --out summary.json

# 重置所有状态
python -m watch_my_money reset-state
```

## 输出结构

控制台显示：
- 包含收入/支出/净额的月度摘要
- 带支出与预算的类别表
- 检测到的定期交易
- 前 5 个商户
- 警报作为要点

写入的文件：
- `~/.watch_my_money/state.json`
- `~/.watch_my_money/reports/2026-01.json`
- `~/.watch_my_money/reports/2026-01.html`

## HTML 报告功能

- 可折叠的类别部分
- 预算进度条
- 定期交易列表
- 月度环比比较
- 隐私切换（模糊敏感数据）
- 深色模式（遵循系统偏好）
- 浮动操作按钮
- 截屏友好的布局
- 自动隐藏空部分

## 隐私

所有数据保留在本地。无网络调用。无外部 API。
交易数据在本地分析，仅存储在 `~/.watch_my_money/` 中。
