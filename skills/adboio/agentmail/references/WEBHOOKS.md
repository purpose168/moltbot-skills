# AgentMail Webhook 指南

Webhook 支持实时、事件驱动的电子邮件处理。当事件发生时（如收到消息），AgentMail 会立即向您注册的端点发送 POST 请求。

## 事件类型

### message.received
当新电子邮件到达时触发。包含完整的消息和会话数据。

**用例：** 自动回复支持电子邮件、处理附件、路由消息

```json
{
  "type": "event",
  "event_type": "message.received",
  "event_id": "evt_123abc",
  "message": {
    "inbox_id": "support@agentmail.to",
    "thread_id": "thd_789ghi",
    "message_id": "msg_123abc",
    "from": [{"name": "Jane Doe", "email": "jane@example.com"}],
    "to": [{"name": "Support", "email": "support@agentmail.to"}],
    "subject": "关于我的账户的问题",
    "text": "我需要帮助...",
    "html": "<p>我需要帮助...</p>",
    "timestamp": "2023-10-27T10:00:00Z",
    "labels": ["received"]
  },
  "thread": {
    "thread_id": "thd_789ghi",
    "subject": "关于我的账户的问题",
    "participants": ["jane@example.com", "support@agentmail.to"],
    "message_count": 1
  }
}
```

### message.sent
当您成功发送消息时触发。

```json
{
  "type": "event",
  "event_type": "message.sent",
  "event_id": "evt_456def",
  "send": {
    "inbox_id": "support@agentmail.to",
    "thread_id": "thd_789ghi",
    "message_id": "msg_456def",
    "timestamp": "2023-10-27T10:05:00Z",
    "recipients": ["jane@example.com"]
  }
}
```

### message.delivered
当您的消息到达收件人的邮件服务器时触发。

### message.bounced
当消息传递失败时触发。

```json
{
  "type": "event",
  "event_type": "message.bounced",
  "bounce": {
    "type": "Permanent",
    "sub_type": "General",
    "recipients": [{"address": "invalid@example.com", "status": "bounced"}]
  }
}
```

### message.complained
当收件人将您的消息标记为垃圾邮件时触发。

## 本地开发设置

### 第1步：安装依赖项

```bash
pip install agentmail flask ngrok python-dotenv
```

### 第2步：设置 ngrok

1. 在 [ngrok.com](https://ngrok.com/) 创建账户
2. 安装：`brew install ngrok`（macOS）或从网站下载
3. 验证身份：`ngrok config add-authtoken YOUR_AUTHTOKEN`

### 第3步：创建 Webhook 接收器

创建 `webhook_receiver.py`：

```python
from flask import Flask, request, Response
import json
from agentmail import AgentMail
import os

app = Flask(__name__)
client = AgentMail(api_key=os.getenv("AGENTMAIL_API_KEY"))

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    payload = request.json
    
    if payload['event_type'] == 'message.received':
        message = payload['message']
        
        # 自动回复示例
        response_text = f"感谢您关于 '{message['subject']}' 的电子邮件。我们会尽快回复您！"
        
        client.inboxes.messages.send(
            inbox_id=message['inbox_id'],
            to=message['from'][0]['email'],
            subject=f"回复: {message['subject']}",
            text=response_text
        )
        
        print(f"自动回复给 {message['from'][0]['email']}")
    
    return Response(status=200)

if __name__ == '__main__':
    app.run(port=3000)
```

### 第4步：启动服务

终端1 - 启动 ngrok：
```bash
ngrok http 3000
```

复制转发 URL（例如 `https://abc123.ngrok-free.app`）

终端2 - 启动 webhook 接收器：
```bash
python webhook_receiver.py
```

### 第5步：注册 Webhook

```python
from agentmail import AgentMail

client = AgentMail(api_key="your_api_key")

webhook = client.webhooks.create(
    url="https://abc123.ngrok-free.app/webhook",
    client_id="dev-webhook"
)
```

### 第6步：测试

向您的 AgentMail 收件箱发送电子邮件并查看控制台输出。

## 生产部署

### Webhook 验证

验证传入的 webhook 来自 AgentMail：

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-AgentMail-Signature')
    if not verify_webhook(request.data.decode(), signature, webhook_secret):
        return Response(status=401)
    
    # 处理 webhook...
```

### 错误处理

快速返回 200 状态，在后台处理：

```python
from threading import Thread
import time

def process_webhook_async(payload):
    try:
        # 这里的重处理
        time.sleep(5)  # 模拟工作
        handle_message(payload)
    except Exception as e:
        print(f"Webhook 处理错误: {e}")
        # 记录到错误跟踪服务

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    payload = request.json
    
    # 立即返回 200
    Thread(target=process_webhook_async, args=(payload,)).start()
    return Response(status=200)
```

### 重试逻辑

AgentMail 使用指数退避重试失败的 webhook。处理幂等性：

```python
processed_events = set()

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    event_id = request.json['event_id']
    
    if event_id in processed_events:
        return Response(status=200)  # 已处理
    
    # 处理事件...
    processed_events.add(event_id)
    return Response(status=200)
```

## 常见模式

### 自动回复机器人

```python
def handle_message_received(message):
    if 'support' in message['to'][0]['email']:
        # 支持自动回复
        reply_text = "感谢您联系支持！我们将在24小时内回复。"
    elif 'sales' in message['to'][0]['email']:
        # 销售自动回复
        reply_text = "感谢您的关注！销售代表将很快联系您。"
    else:
        return
    
    client.inboxes.messages.send(
        inbox_id=message['inbox_id'],
        to=message['from'][0]['email'],
        subject=f"回复: {message['subject']}",
        text=reply_text
    )
```

### 消息路由

```python
def route_message(message):
    subject = message['subject'].lower()
    
    if 'billing' in subject or 'payment' in subject:
        forward_to_slack('#billing-team', message)
    elif 'bug' in subject or 'error' in subject:
        create_github_issue(message)
    elif 'feature' in subject:
        add_to_feature_requests(message)
```

### 附件处理

```python
def process_attachments(message):
    for attachment in message.get('attachments', []):
        if attachment['content_type'] == 'application/pdf':
            # 处理 PDF
            pdf_content = base64.b64decode(attachment['content'])
            text = extract_pdf_text(pdf_content)
            
            # 回复提取的文本
            client.inboxes.messages.send(
                inbox_id=message['inbox_id'],
                to=message['from'][0]['email'],
                subject=f"回复: {message['subject']} - PDF 已处理",
                text=f"我从您的 PDF 中提取了以下文本:\n\n{text}"
            )
```

## Webhook 安全性

- **始终在生产环境中验证签名**
- **仅使用 HTTPS 端点**
- **在处理前验证负载结构**
- **实施速率限制以防止滥用**
- **快速返回 200 以避免重试**