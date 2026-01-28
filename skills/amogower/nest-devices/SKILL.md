---
name: nest-devices
description: 通过设备访问 API 控制 Nest 智能家居设备（恒温器、摄像头、门铃）。用于检查或调节室温、查看摄像头画面、查看谁在门口、监控房间或设置温度计划时。
metadata:
  clawdbot:
    emoji: "🏠"
---

# Nest 设备访问

通过谷歌智能设备管理 API 控制 Nest 设备。

## 设置

### 1. 谷歌云和设备访问

1. 在 [console.cloud.google.com](https://console.cloud.google.com) 创建谷歌云项目
2. 支付 5 美元费用并在 [console.nest.google.com/device-access](https://console.nest.google.com/device-access) 创建设备访问项目
3. 创建 OAuth 2.0 凭证（Web 应用程序类型）
4. 添加 `https://www.google.com` 作为授权的重定向 URI
5. 将您的 Nest 账户链接到设备访问项目

### 2. 获取刷新令牌

运行 OAuth 流程以获取刷新令牌：

```bash
# 1. 在浏览器中打开此 URL（替换 CLIENT_ID 和 PROJECT_ID）：
https://nestservices.google.com/partnerconnections/PROJECT_ID/auth?redirect_uri=https://www.google.com&access_type=offline&prompt=consent&client_id=CLIENT_ID&response_type=code&scope=https://www.googleapis.com/auth/sdm.service

# 2. 授权并从重定向 URL 复制 'code' 参数

# 3. 用 code 交换令牌：
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET" \
  -d "code=AUTH_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://www.google.com"
```

### 3. 存储凭证

存储在 1Password 或环境变量中：

**1Password**（推荐）：
创建一个包含以下字段的项目：`project_id`、`client_id`、`client_secret`、`refresh_token`

**环境变量：**
```bash
export NEST_PROJECT_ID="your-project-id"
export NEST_CLIENT_ID="your-client-id"
export NEST_CLIENT_SECRET="your-client-secret"
export NEST_REFRESH_TOKEN="your-refresh-token"
```

## 使用方法

### 列出设备
```bash
python3 scripts/nest.py list
```

### 恒温器

```bash
# 获取状态
python3 scripts/nest.py get <device_id>

# 设置温度（摄氏度）
python3 scripts/nest.py set-temp <device_id> 21 --unit c --type heat

# 设置温度（华氏度）
python3 scripts/nest.py set-temp <device_id> 70 --unit f --type heat

# 更改模式（HEAT、COOL、HEATCOOL、OFF）
python3 scripts/nest.py set-mode <device_id> HEAT

# 节能模式
python3 scripts/nest.py set-eco <device_id> MANUAL_ECO
```

### 摄像头

```bash
# 生成实时流 URL（RTSP，有效期约 5 分钟）
python3 scripts/nest.py stream <device_id>
```

## Python API

```python
from nest import NestClient

client = NestClient()

# 列出设备
devices = client.list_devices()

# 恒温器控制
client.set_heat_temperature(device_id, 21.0)  # 摄氏度
client.set_thermostat_mode(device_id, 'HEAT')
client.set_eco_mode(device_id, 'MANUAL_ECO')

# 摄像头流
result = client.generate_stream(device_id)
rtsp_url = result['results']['streamUrls']['rtspUrl']
```

## 配置

脚本按以下顺序检查凭证：

1. **1Password**：设置 `NEST_OP_VAULT` 和 `NEST_OP_ITEM`（或使用默认值：保管库 "Alfred"，项目 "Nest Device Access API"）
2. **环境变量**：`NEST_PROJECT_ID`、`NEST_CLIENT_ID`、`NEST_CLIENT_SECRET`、`NEST_REFRESH_TOKEN`

## 温度参考

| 设置 | 摄氏度 | 华氏度 |
|------|---------|--------|
| 节能（外出）| 15-17°C | 59-63°F |
| 舒适 | 19-21°C | 66-70°F |
| 温暖 | 22-23°C | 72-73°F |
| 夜间 | 17-18°C | 63-65°F |

---

## 实时事件（门铃、移动检测等）

当有人按门铃或检测到移动时需要即时提醒，您需要使用 webhook 设置谷歌云 Pub/Sub。

### 前置条件

- 已安装并认证的谷歌云 CLI（`gcloud`）
- Cloudflare 账户（免费套餐可用）用于隧道
- 在配置中启用 Clawdbot 钩子

### 1. 启用 Clawdbot 钩子

添加到您的 `clawdbot.json`：

```json
{
  "hooks": {
    "enabled": true,
    "token": "your-secret-token-here"
  }
}
```

生成令牌：`openssl rand -hex 24`

### 2. 创建 Pub/Sub 主题

```bash
gcloud config set project YOUR_GCP_PROJECT_ID

# 创建主题
gcloud pubsub topics create nest-events

# 授予 SDM 发布权限（服务账户和发布者组都需要）
gcloud pubsub topics add-iam-policy-binding nest-events \
  --member="serviceAccount:sdm-prod@sdm-prod.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

gcloud pubsub topics add-iam-policy-binding nest-events \
  --member="group:sdm-publisher@googlegroups.com" \
  --role="roles/pubsub.publisher"
```

### 3. 将主题链接到设备访问

转到 [console.nest.google.com/device-access](https://console.nest.google.com/device-access) → 您的项目 → 编辑 → 设置 Pub/Sub 主题为：

```
projects/YOUR_GCP_PROJECT_ID/topics/nest-events
```

### 4. 设置 Cloudflare 隧道

```bash
# 安装 cloudflared
curl -L -o ~/.local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/.local/bin/cloudflared

# 认证（打开浏览器）
~/.local/bin/cloudflared tunnel login

# 创建命名隧道
~/.local/bin/cloudflared tunnel create nest-webhook

# 记下输出中的隧道 ID（UUID）
```

创建 `~/.cloudflared/config.yml`：

```yaml
tunnel: nest-webhook
credentials-file: /home/YOUR_USER/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: nest.yourdomain.com
    service: http://localhost:8420
  - service: http_status:404
```

创建 DNS 路由：

```bash
~/.local/bin/cloudflared tunnel route dns nest-webhook nest.yourdomain.com
```

### 5. 创建 Systemd 服务

**Webhook 服务器** (`/etc/systemd/system/nest-webhook.service`)：

```ini
[Unit]
Description=Nest Pub/Sub Webhook Server
After=network.target

[Service]
Type=simple
User=YOUR_USER
Environment=CLAWDBOT_GATEWAY_URL=http://localhost:18789
Environment=CLAWDBOT_HOOKS_TOKEN=your-hooks-token-here
ExecStart=/usr/bin/python3 /path/to/skills/nest-devices/scripts/nest-webhook.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Cloudflare 隧道** (`/etc/systemd/system/cloudflared-nest.service`)：

```ini
[Unit]
Description=Cloudflare Tunnel for Nest Webhook
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=YOUR_USER
ExecStart=/home/YOUR_USER/.local/bin/cloudflared tunnel run nest-webhook
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nest-webhook cloudflared-nest
```

### 6. 创建 Pub/Sub 推送订阅

```bash
gcloud pubsub subscriptions create nest-events-sub \
  --topic=nest-events \
  --push-endpoint="https://nest.yourdomain.com/nest/events" \
  --ack-deadline=30
```

### 7. 测试

```bash
# 测试 webhook 端点
curl https://nest.yourdomain.com/health

# 模拟门铃事件
curl -X POST http://localhost:8420/nest/events \
  -H "Content-Type: application/json" \
  -d '{"message":{"data":"eyJyZXNvdXJjZVVwZGF0ZSI6eyJuYW1lIjoiZW50ZXJwcmlzZXMvdGVzdC9kZXZpY2VzL0RPT1JCRUxMLTAxIiwiZXZlbnRzIjp7InNkbS5kZXZpY2VzLmV2ZW50cy5Eb29yYmVsbENoaW1lLkNoaW1lIjp7ImV2ZW50SWQiOiJ0ZXN0In19fX0="}}'
```

### 支持的事件

| 事件 | 行为 |
|------|------|
| `DoorbellChime.Chime` | 🔔 **提醒** — 发送照片到 Telegram |
| `CameraPerson.Person` | 🚶 **提醒** — 发送照片到 Telegram |
| `CameraMotion.Motion` | 📹 仅记录（不提醒）|
| `CameraSound.Sound` | 🔊 仅记录（不提醒）|
| `CameraClipPreview.ClipPreview` | 🎬 仅记录（不提醒）|

> **过期过滤：** 超过 5 分钟的事件仅记录但不提醒。这可以防止排队中的 Pub/Sub 消息延迟送达时产生通知洪泛。

### 图像捕获

当门铃或人员事件触发提醒时：

1. **主要方式：** SDM `GenerateImage` API — 快速，事件特定的快照
2. **备用方式：** 通过 `ffmpeg` 捕获 RTSP 实时流帧（需要安装 `ffmpeg`）

### 环境变量

| 变量 | 必需 | 描述 |
|------|------|------|
| `CLAWDBOT_GATEWAY_URL` | 否 | 网关 URL（默认：`http://localhost:18789`）|
| `CLAWDBOT_HOOKS_TOKEN` | 是 | 用于感知通知的网关钩子令牌 |
| `OP_SVC_ACCT_TOKEN` | 是 | 用于 Nest API 凭证的 1Password 服务账户令牌 |
| `TELEGRAM_BOT_TOKEN` | 是 | 用于发送提醒的 Telegram 机器人令牌 |
| `TELEGRAM_CHAT_ID` | 是 | 接收提醒的 Telegram 聊天 ID |
| `PORT` | 否 | Webhook 服务器端口（默认：`8420`）|

### 重要的设置说明

- **验证完整的 Pub/Sub 主题路径**在设备访问控制台中与您的 GCP 项目完全匹配：`projects/YOUR_GCP_PROJECT_ID/topics/nest-events`
- **使用推送订阅**，而不是拉取 — webhook 期望 HTTP POST 传递
- **端到端测试**后设置：按门铃并确认照片到达。不要仅依赖模拟的 POST 请求。

---

## 限制

- 摄像头事件图像在约 5 分钟后过期（RTSP 备用捕获当前帧而非）
- 实时事件需要 Pub/Sub 设置（见上文）
- 快速隧道（无 Cloudflare 账户）无正常运行时间保证
- 一些较旧的 Nest 设备可能不支持所有功能
- 有意不提醒移动和声音事件以避免通知疲劳
