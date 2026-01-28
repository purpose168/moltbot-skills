# 检测规则参考

## 定期收费检测

如果满足以下条件，一笔收费被视为定期收费：

### 频率规则
- 同一标准化商户在最近 90 天内出现 >= 2 次
- 金额在 `max(2.00, 0.05 * abs(amount))` 范围内相似
- 周期匹配以下之一：
  - 每周：收费间隔 5-9 天
  - 每月：收费间隔 25-35 天
  - 每年：收费间隔 330-400 天

### 订阅关键词
自动检测这些商户的定期收费：
- NETFLIX、SPOTIFY、APPLE.COM/BILL、GOOGLE、ICLOUD
- ADOBE、MICROSOFT、DROPBOX、NOTION、SLACK
- OPENAI、CHATGPT、GITHUB、FIGMA
- HULU、DISNEY、HBO、PARAMOUNT、PEACOCK
- YOUTUBE、TWITCH、PATREON、SUBSTACK、MEDIUM
- ZOOM、ATLASSIAN、JIRA、ASANA、MONDAY
- AWS、AZURE、DIGITALOCEAN、HEROKU、VERCEL
- CANVA、GRAMMARLY、LASTPASS、1PASSWORD
- NORDVPN、EXPRESSVPN、AUDIBLE、KINDLE
- PELOTON、STRAVA、HEADSPACE、CALM、DUOLINGO

## 意外收费检测

### 1. 新商户（中等严重程度）
- 历史上首次看到此商户
- 且 `abs(amount) > 30`
- 不在已知的定期收费列表中

### 2. 金额异常（高严重程度）
- `abs(amount) > baseline * 1.8`
- 且 `(amount - baseline) > 25`
- 基线 = 同一商户最近 20 笔收费的平均值

### 3. 重复（高严重程度）
- 相同的标准化商户名称
- 相同金额（完全匹配）
- 彼此在 0-2 天内

### 4. 费用类（低严重程度）
- 描述包含关键词：
  - FEE、COMMISSION、FX、ATM、OVERDRAFT、LATE
  - PENALTY、SERVICE CHARGE、MAINTENANCE
  - ANNUAL FEE、MONTHLY FEE、INTEREST
  - FINANCE CHARGE、CASH ADVANCE
  - FOREIGN TRANSACTION、WIRE TRANSFER
  - INSUFFICIENT FUNDS、NSF、RETURNED ITEM
- 且 `abs(amount) > 3`

### 5. 货币异常（低/中等严重程度）
- 交易货币与主账户货币不同
- 货币在对账单中出现 <= 2 次
- 如果存在 DCC 指示器则为中等：
  - DCC、DYNAMIC CURRENCY、CONVERSION FEE
  - EXCHANGE RATE、CURRENCY CONVERSION

### 6. 缺失退款（中等严重程度）
- 描述包含争议关键词：
  - DISPUTE、CHARGEBACK、UNAUTHORIZED、FRAUD
- 14 天内没有匹配的正向金额
- 收费金额 > 50

## 商户标准化

### 移除的前缀
- POS、DEBIT、CREDIT、ACH、WIRE、CHECK
- PURCHASE、PAYMENT、TRANSFER、DEPOSIT
- CARD、VISA、MC、MASTERCARD、AMEX
- SQ *、SQUARE *、PAYPAL *、STRIPE、VENMO
- TST*、SP、DD

### 移除的后缀
- 交易 ID（6 位以上数字序列）
- 参考编号（REF #...）
- 位置信息（州 + 邮编）
- 尾随星号和破折号

### 输出
- 标题大小写以提高可读性
- 折叠空白字符
