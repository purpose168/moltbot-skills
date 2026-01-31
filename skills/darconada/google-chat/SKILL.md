---
name: google-chat
description: 通过 webhook 或 OAuth 向 Google Chat 空间和用户发送消息。当您需要向 Google Chat 频道（空间）或特定用户发送通知、警报或消息时使用。支持传入 webhook（用于预定义频道）和 OAuth 2.0（用于向任何空间或用户动态消息传递）。
---

# Google Chat 消息发送

使用两种方法向 Google Chat 发送消息：

1. **Webhook** - 快速、预配置的频道（消息显示为机器人）
2. **OAuth** - 向任何空间或用户动态消息传递（需要身份验证）

## 快速开始

### 方法 1: Webhook（推荐用于已知频道）

发送到预配置的频道：

```bash
python3 scripts/send_webhook.py "$WEBHOOK_URL" "您的消息"
```

带线程的示例：
```bash
python3 scripts/send_webhook.py "$WEBHOOK_URL" "回复消息" --thread_key "unique-thread-id"
```

**配置:** 将 webhook 存储在 `google-chat-config.json` 中：

```json
{
  "webhooks": {
    "acs_engineering_network": "https://chat.googleapis.com/v1/spaces/...",
    "general": "https://chat.googleapis.com/v1/spaces/..."
  }
}
```

读取配置并发送：
```bash
WEBHOOK_URL=$(jq -r '.webhooks.acs_engineering_network' google-chat-config.json)
python3 scripts/send_webhook.py "$WEBHOOK_URL" "部署完成 ✅"
```

### 方法 2: OAuth（用于动态消息传递）

**首次设置：**

1. 将 OAuth 凭据保存到文件（例如 `google-chat-oauth-credentials.json`）
2. 运行初始身份验证（打开浏览器，保存令牌）：

```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --space "通用" \
  "测试消息"
```

**按名称发送到空间：**
```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --space "工程网络" \
  "部署完成"
```

**注意:** OAuth 消息自动包含 `🤖` 表情符号前缀。使用 `--no-emoji` 禁用此功能：
```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --space "工程网络" \
  "不带表情符号的消息" \
  --no-emoji
```

**列出可用的空间：**
```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --list-spaces
```

**发送到 DM（需要现有的空间 ID）：**
```bash
# 注意: Google Chat API 不支持按电子邮件创建新的 DM
# 您需要现有 DM 对话的空间 ID
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --space-id "spaces/xxxxx" \
  "报告已准备好"
```

**按 ID 发送到空间（更快）：**
```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --space-id "spaces/AAAALtlqgVA" \
  "直接消息到空间"
```

## 依赖项

安装必需的 Python 包：

```bash
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

**必需的 OAuth 范围:**
- `https://www.googleapis.com/auth/chat.messages` - 发送消息
- `https://www.googleapis.com/auth/chat.spaces` - 访问空间信息
- `https://www.googleapis.com/auth/chat.memberships.readonly` - 列出空间成员（用于 DM 识别）

## OAuth 设置指南

如果 OAuth 凭据尚不存在：

1. 转到 [Google Cloud Console](https://console.cloud.google.com)
2. 选择您的项目或创建一个
3. 启用 **Google Chat API**
4. 转到 **APIs & Services → Credentials**
5. 创建 **OAuth 2.0 Client ID**（桌面应用类型）
6. 下载 JSON 并保存为 `google-chat-oauth-credentials.json`

凭据 JSON 应该如下所示：
```json
{
  "installed": {
    "client_id": "...apps.googleusercontent.com",
    "client_secret": "GOCSPX-...",
    "redirect_uris": ["http://localhost"],
    ...
  }
}
```

## Webhook 设置指南

为 Google Chat 空间创建 webhook：

1. 在浏览器中打开 Google Chat
2. 转到该空间
3. 点击空间名称 → **Apps & integrations**
4. 点击 **Manage webhooks** → **Add webhook**
5. 为其命名（例如 "Agustin Networks"）
6. 复制 webhook URL
7. 添加到 `google-chat-config.json`

## 选择正确的方法

**在以下情况下使用 Webhook:**
- 重复发送到相同的频道
- 消息应显示为机器人/服务
- 速度很重要（无需 OAuth 握手）
- 配置是静态的

**在以下情况下使用 OAuth:**
- 动态发送到不同的空间
- 消息应从您配置的 Google Chat 应用显示
- 空间名称在运行时确定
- 需要列出和发现可用的空间

**OAuth 限制:**
- 无法按电子邮件地址创建新的 DM（Google Chat API 限制）
- 要发送 DM，您需要现有对话的空间 ID
- 使用 `--list-spaces` 查找可用的 DM 空间 ID

## 消息格式

两种方法都支持简单文本。对于高级格式（卡片、按钮），构造 JSON 负载：

**带卡片的 webhook：**
```python
import json
import urllib.request

payload = {
    "cardsV2": [{
        "cardId": "unique-card-id",
        "card": {
            "header": {"title": "部署状态"},
            "sections": [{
                "widgets": [{
                    "textParagraph": {"text": "生产部署成功完成"}
                }]
            }]
        }
    }]
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(webhook_url, data=data, headers={"Content-Type": "application/json"})
urllib.request.urlopen(req)
```

## 故障排除

**Webhook 错误:**
- 验证 webhook URL 正确且处于活动状态
- 检查空间仍然存在且 webhook 未被删除
- 确保消息不为空

**OAuth 错误:**
- 如果令牌过期，重新运行身份验证流程
- 验证 Cloud Console 中已启用 Google Chat API
- 检查用户是否有权访问目标空间
- 对于 DM，确保用户电子邮件正确且在同一工作区中

**权限错误:**
- Webhook: 必须是空间的成员
- OAuth: 必须有权访问目标空间或用户
- 企业工作区: 某些功能可能受管理员策略限制

## 示例

**部署通知到工程频道：**
```bash
WEBHOOK=$(jq -r '.webhooks.acs_engineering_network' google-chat-config.json)
python3 scripts/send_webhook.py "$WEBHOOK" "🚀 生产部署 v2.1.0 完成"
```

**提醒特定用户关于任务：**
```bash
python3 scripts/send_oauth.py \
  --credentials google-chat-oauth-credentials.json \
  --token google-chat-token.json \
  --dm juan@empresa.com \
  "您的报告已准备好供审核: https://docs.company.com/report"
```

**将多条消息线程在一起（webhook）：**
```bash
WEBHOOK=$(jq -r '.webhooks.general' google-chat-config.json)
THREAD_KEY="deploy-$(date +%s)"

python3 scripts/send_webhook.py "$WEBHOOK" "开始部署..." --thread_key "$THREAD_KEY"
# ... 部署发生 ...
python3 scripts/send_webhook.py "$WEBHOOK" "部署完成 ✅" --thread_key "$THREAD_KEY"
```
