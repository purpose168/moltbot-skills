---
name: refund-radar
description: 扫描银行对账单以检测定期收费、标记可疑交易，并使用交互式 HTML 报告起草退款请求。
---

# 退款雷达

扫描银行对账单以检测定期收费、标记可疑交易、识别重复项和费用、起草退款请求模板，并生成交互式 HTML 审计报告。

## 触发词

- "扫描我的银行对账单以获取退款"
- "分析我的信用卡交易"
- "查找我账单中的定期收费"
- "检查重复或可疑收费"
- "帮助我争议一笔收费"
- "生成退款请求"
- "审计我的订阅"

## 工作流程

### 1. 获取交易数据

向用户索要银行/信用卡 CSV 导出或粘贴的文本。常见来源：

- Apple Card：钱包 → 信用卡余额 → 导出
- Chase：账户 → 下载交易记录 → CSV
- Mint：交易记录 → 导出
- 任何银行：从交易历史下载 CSV

或接受粘贴的文本格式：
```
2026-01-03 Spotify -11.99 USD
2026-01-15 工资 +4500 USD
```

### 2. 解析和标准化

对其数据运行解析器：

```bash
python -m refund_radar analyze --csv statement.csv --month 2026-01
```

或对于粘贴的文本：
```bash
python -m refund_radar analyze --stdin --month 2026-01 --default-currency USD
```

解析器自动检测：
- 分隔符（逗号、分制表符）
- 日期格式（YYYY-MM-DD、DD/MM/YYYY、MM/DD/YYYY）
- 金额格式（单列或借方/贷方）
- 货币

### 3. 审查定期收费

工具通过以下方式识别定期订阅：
- 同一商户在 90 天内出现 >= 2 次
- 相似金额（5% 或 $2 以内）
- 一致的周期（每周、每月、每年）
- 已知的订阅关键词（Netflix、Spotify 等）

输出显示：
- 商户名称
- 平均金额和周期
- 最后收费日期
- 下次预期收费

### 4. 标记可疑收费

工具自动标记：

| 标记类型 | 触发条件 | 严重程度 |
|---------|---------|---------|
| 重复 | 同一商户 + 金额在 2 天内相同 | 高 |
| 金额异常 | > 1.8 倍基线，差值 > $25 | 高 |
| 新商户 | 首次出现 + 金额 > $30 | 中 |
| 费用类 | 关键词（FEE、ATM、OVERDRAFT）+ > $3 | 低 |
| 货币异常 | 异常货币或 DCC | 低 |

### 5. 与用户确认

对于标记的项目，分批询问 5-10 个：

- 这笔收费合法吗？
- 我应该将此商户标记为预期吗？
- 您要为此生成退款模板吗？

根据回答更新状态：
```bash
python -m refund_radar mark-expected --merchant "Costco"
python -m refund_radar mark-recurring --merchant "Netflix"
```

### 6. 生成 HTML 报告

报告保存到 `~/.refund_radar/reports/YYYY-MM.html`

复制 [template.html](assets/template.html) 结构。包含以下部分：
- **摘要**：交易数量、总支出、定期收费数量、标记数量
- **定期收费**：表格显示商户、金额、周期、下次预期
- **意外收费**：标记的项目及严重程度和原因
- **重复项**：同日重复收费
- **费用类收费**：ATM 费、外汇费、服务费
- **退款模板**：即可复制的电子邮件/聊天/争议消息

功能：
- 隐私开关（模糊商户名称）
- 深色/浅色模式
- 可折叠部分
- 模板上的复制按钮
- 自动隐藏空部分

### 7. 起草退款请求

对于每个标记的收费，生成三种模板类型：
- **电子邮件**：正式的退款请求
- **聊天**：快速消息用于实时支持
- **争议**：银行争议表单文本

每种有三种语气变体：
- 简洁（默认）
- 坚定（断言性）
- 友好（礼貌）

模板包括：
- 商户名称和日期
- 收费金额
- 基于标记类型的争议原因
- 卡号后 4 位、参考号的占位符

**重要**：任何生成的文本中不能有撇号。

## CLI 参考

```bash
# 分析对账单
python -m refund_radar analyze --csv file.csv --month 2026-01

# 从标准输入分析
python -m refund_radar analyze --stdin --month 2026-01 --default-currency CHF

# 将商户标记为预期
python -m refund_radar mark-expected --merchant "Amazon"

# 将商户标记为定期
python -m refund_radar mark-recurring --merchant "Netflix"

# 列出预期商户
python -m refund_radar expected

# 重置学习状态
python -m refund_radar reset-state

# 导出月份数据
python -m refund_radar export --month 2026-01 --out data.json
```

## 写入的文件

| 路径 | 用途 |
|------|------|
| `~/.refund_radar/state.json` | 学习到的偏好、商户历史 |
| `~/.refund_radar/reports/YYYY-MM.html` | 交互式审计报告 |
| `~/.refund_radar/reports/YYYY-MM.json` | 原始分析数据 |

## 隐私

- **无网络调用。** 一切在本地运行。
- **无外部 API。** 没有 Plaid，没有云服务。
- **您的数据保留在本地机器上。**
- **报告中的隐私开关。** 一键模糊商户名称。

## 要求

- Python 3.9+
- 无外部依赖

## 仓库

https://github.com/andreolf/refund-radar
