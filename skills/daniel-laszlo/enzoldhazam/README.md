# enzoldhazam

通过 [enzoldhazam.hu](https://www.enzoldhazam.hu)（NGBS iCON 智能家居系统）控制温控器的 CLI 工具。

## 安装

```bash
# 克隆仓库
git clone https://github.com/daniel-laszlo/enzoldhazam.git
cd enzoldhazam

# 构建
go build -o enzoldhazam ./cmd/enzoldhazam

# 可选：移动到 PATH
mv enzoldhazam /usr/local/bin/
```

## 使用

### 身份验证

登录并将凭据保存到 macOS 钥匙串：

```bash
enzoldhazam login
```

或使用环境变量：

```bash
export ENZOLDHAZAM_USER="your-email@example.com"
export ENZOLDHAZAM_PASS="your-password"
```

### 命令

```bash
# 显示所有房间的当前/目标温度
enzoldhazam status

# 获取特定房间详情
enzoldhazam get <room-name>
enzoldhazam get <thermostat-id>

# 设置目标温度
enzoldhazam set <room-name> <temperature>

# 清除存储的凭据
enzoldhazam logout
```

### JSON 输出

所有数据命令都支持 `--json` 标志以实现自动化：

```bash
enzoldhazam status --json
enzoldhazam get <room-name> --json
```

## 示例输出

```
$ enzoldhazam status
设备: 我的设备 (123456789012)
状态: 在线 | 水温: 38.2°C | 外部: 5.0°C

客厅     22.5°C (目标: 21.5°C) 相对湿度: 31%
办公室   21.6°C (目标: 21.5°C) 相对湿度: 30%
卧室     21.8°C (目标: 21.5°C) 相对湿度: 26%
```

## 要求

- Go 1.21+
- macOS（用于钥匙串凭据存储）
- 在 enzoldhazam.hu 上注册了 NGBS iCON 设备的账户

## 许可证

MIT
