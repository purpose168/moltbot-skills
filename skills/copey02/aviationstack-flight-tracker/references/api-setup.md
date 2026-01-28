# AviationStack API 设置

## 入门

AviationStack 提供每月 100 次 API 请求的免费层级，非常适合偶尔的航班跟踪。

### 1. 获取您的免费 API 密钥

1. 访问: https://aviationstack.com/signup/free
2. 注册免费账户
3. 从仪表板获取您的 API 访问密钥

### 2. 设置环境变量

将 API 密钥添加到您的环境：

```bash
export AVIATIONSTACK_API_KEY='your-api-key-here'
```

要使其永久生效，将此行添加到您的 shell 配置文件中：

**Bash/Zsh:**
```bash
echo "export AVIATIONSTACK_API_KEY='your-api-key-here'" >> ~/.zshrc
source ~/.zshrc
```

**Fish:**
```fish
set -Ux AVIATIONSTACK_API_KEY 'your-api-key-here'
```

### 3. 安装 Python 依赖

脚本需要 `requests` 库：

```bash
pip3 install requests
```

## API 限制

**免费层级：**
- 每月 100 次请求
- 实时航班数据
- 历史航班
- 机场/航空公司查询
- 仅 HTTP（无 HTTPS）

**付费层级：**（起价 $49.99/月）
- 每月最多 500,000 次请求
- HTTPS 支持
- 优先支持
- 历史数据访问

## 支持的航班号格式

API 接受 IATA 航班代码：
- `AA100` - 美国航空 100
- `UA2402` - 联合航空 2402
- `BA123` - 英国航空 123
- `DL456` - 达美航空 456

## API 响应数据

API 返回全面的航班信息：

- **航班状态**: 已计划、飞行中、已降落、已取消、已延误
- **出发数据**: 机场、航站楼、登机口、计划/预计/实际时间
- **到达数据**: 机场、航站楼、登机口、计划/预计/实际时间
- **实时跟踪**: 当前位置（经纬度）、高度、速度
- **飞机信息**: 注册号、型号（IATA/ICAO 代码）
- **航空公司信息**: 名称、IATA/ICAO 代码

## 替代 API

如果您需要更多请求或不同功能，请考虑：

- **FlightAware AeroAPI**: 企业级，优秀的历史数据
- **OpenSky Network**: 免费、开源、社区驱动
- **AeroDataBox**: 定价合理，数据全面
- **Flightradar24 API**: 实时跟踪、可视化数据

## 故障排除

**错误: "未设置 AVIATIONSTACK_API_KEY 环境变量"**
- 确保已导出环境变量
- 添加到 shell 配置文件后重启终端

**错误: "未找到该航班号"**
- 核实航班号正确（使用 IATA 代码）
- 某些航班可能尚未进入系统（检查已计划的航班）
- 先在 aviationstack.com 上搜索确认航班存在

**超出 API 速率限制：**
- 免费层级允许每月 100 次请求
- 跟踪您的使用情况或升级到付费层级
