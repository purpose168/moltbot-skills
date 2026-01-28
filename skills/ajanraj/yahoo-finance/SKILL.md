---
name: yahoo-finance
description: 使用 Yahoo Finance 获取股票价格、报价、基本面数据、收益、期权、股息和分析师评级。使用 yfinance 库 - 无需 API 密钥。
---

# Yahoo Finance CLI

一个使用 yfinance 从 Yahoo Finance 获取综合股票数据的 Python CLI。

## 环境要求

- Python 3.11+
- uv（用于内联脚本依赖项）

## 安装 uv

脚本需要 `uv` - 一个极快的 Python 包管理器。检查是否已安装：

```bash
uv --version
```

如果未安装，请使用以下方法之一安装：

### macOS / Linux
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### macOS（Homebrew）
```bash
brew install uv
```

### Windows
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### pip（任何平台）
```bash
pip install uv
```

安装后，重启终端或运行：
```bash
source ~/.bashrc  # 或 macOS 上的 ~/.zshrc
```

## 安装

`yf` 脚本使用 PEP 723 内联脚本元数据 - 依赖项在首次运行时自动安装。

```bash
# 设为可执行
chmod +x /path/to/skills/yahoo-finance/yf

# 可选：创建符号链接到 PATH 以便全局访问
ln -sf /path/to/skills/yahoo-finance/yf /usr/local/bin/yf
```

首次运行会将依赖项（yfinance、rich）安装到 uv 的缓存中。后续运行是即时的。

## 命令

### 价格（快速查看）
```bash
yf AAPL              # price 的简写
yf price AAPL
```

### 报价（详细）
```bash
yf quote MSFT
```

### 基本面数据
```bash
yf fundamentals NVDA
```
显示：市盈率、每股收益、市值、利润率、净资产收益率/资产收益率、分析师目标价。

### 收益报告
```bash
yf earnings TSLA
```
显示：下次收益日期、每股收益预估、带有惊喜的收益历史。

### 公司简介
```bash
yf profile GOOGL
```
显示：所属行业、员工数、网站、地址、业务描述。

### 股息
```bash
yf dividends KO
```
显示：股息率/收益率、除息日、派息比率、近期股息历史。

### 分析师评级
```bash
yf ratings AAPL
```
显示：买入/持有/卖出分布、平均评级、近期上调/下调。

### 期权链
```bash
yf options SPY
```
显示：接近价位的看涨期权和看跌期权，包含执行价、买/卖价、成交量、未平仓合约、隐含波动率。

### 历史数据
```bash
yf history GOOGL 1mo     # 1 个月历史
yf history TSLA 1y       # 1 年
yf history BTC-USD 5d    # 5 天
```
时间范围：1d、5d、1mo、3mo、6mo、1y、2y、5y、10y、ytd、max

### 对比
```bash
yf compare AAPL,MSFT,GOOGL
yf compare RELIANCE.NS,TCS.NS,INFY.NS
```
并排对比，显示价格、涨跌幅、52 周范围、市值。

### 搜索
```bash
yf search "reliance industries"
yf search "bitcoin"
yf search "s&p 500 etf"
```

## 股票代码格式

- **美国股票：** AAPL、MSFT、GOOGL、TSLA
- **印度 NSE：** RELIANCE.NS、TCS.NS、INFY.NS
- **印度 BSE：** RELIANCE.BO、TCS.BO
- **加密货币：** BTC-USD、ETH-USD
- **外汇：** EURUSD=X、GBPUSD=X
- **ETF：** SPY、QQQ、VOO

## 使用示例

```bash
# 快速价格查看
yf AAPL

# 获取估值指标
yf fundamentals NVDA

# 下次收益日期 + 历史
yf earnings TSLA

# SPY 期权链
yf options SPY

# 对比科技巨头
yf compare AAPL,MSFT,GOOGL,META,AMZN

# 查找印度股票
yf search "infosys"

# 可口可乐股息信息
yf dividends KO

# 苹果分析师评级
yf ratings AAPL
```

## 故障排除

### "command not found: uv"
按照上面的说明安装 uv。

### 限速 / 连接错误
Yahoo Finance 可能会对过量请求进行限速。等待几分钟后再试。

### 股票代码"无数据"
- 验证股票代码是否存在：`yf search "公司名称"`
- 某些数据（期权、股息）并非所有证券都有

## 技术说明

- 使用 PEP 723 内联脚本元数据实现 uv 依赖管理
- Rich 库提供彩色、格式化的表格
- 首次运行将依赖项安装到 uv 缓存（约 5 秒）
- 后续运行是即时的（缓存环境）
- 优雅地处理 NaN/None 值，提供回退方案