---
name: enzoldhazam
description: 控制 NGBS iCON 智能家居温控器。当用户询问家庭温度、供暖、温控器控制或想要调整房间温度时使用。
---

# enzoldhazam

通过 enzoldhazam.hu 控制 NGBS iCON 智能家居温控器。

## 设置

1. 安装 CLI：
```bash
git clone https://github.com/daniel-laszlo/enzoldhazam.git
cd enzoldhazam
go build -o enzoldhazam ./cmd/enzoldhazam
sudo mv enzoldhazam /usr/local/bin/
```

2. 登录（凭据存储在 macOS 钥匙串中）：
```bash
enzoldhazam login
```

或设置环境变量：
```bash
export ENZOLDHAZAM_USER="your-email"
export ENZOLDHAZAM_PASS="your-password"
```

## 命令

| 命令 | 描述 |
|---------|-------------|
| `enzoldhazam status` | 显示所有房间的温度 |
| `enzoldhazam status --json` | 用于解析的 JSON 输出 |
| `enzoldhazam get <room>` | 获取特定房间详情 |
| `enzoldhazam set <room> <temp>` | 设置目标温度 |
| `enzoldhazam login` | 将凭据保存到钥匙串 |
| `enzoldhazam logout` | 清除存储的凭据 |

## 示例

```bash
# 检查当前温度
enzoldhazam status

# 将房间设置为 22°C
enzoldhazam set "客厅" 22

# 获取房间信息为 JSON
enzoldhazam get "卧室" --json
```

## 说明

当用户询问家庭温度、供暖或温控器时：

1. 使用 `enzoldhazam status` 检查当前状态
2. 使用 `enzoldhazam set <room> <temp>` 更改温度
3. 当需要处理数据时，解析 `--json` 输出

在执行之前，始终与用户确认温度更改。
