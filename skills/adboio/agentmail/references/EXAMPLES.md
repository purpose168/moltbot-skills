# AgentMail 使用示例

AI 智能体工作流程中 AgentMail 的常见模式和用例。

## 基本智能体电子邮件设置

### 1. 创建智能体身份

```python
from agentmail import AgentMail
import os

client = AgentMail(api_key=os.getenv("AGENTMAIL_API_KEY"))

# 为您的智能体创建收件箱
agent_inbox = client.inboxes.create(
    username="spike-assistant",
    display_name="Spike - AI 助手",
    client_id="spike-main-inbox"  # 防止重复
)

print(f"智能体电子邮件: {agent_inbox.inbox_id}")
# 输出: spike-assistant@agentmail.to
```

### 2. 发送状态更新

```python
def send_task_completion(task_name, details, recipient):
    client.inboxes.messages.send(
        inbox_id="spike-assistant@agentmail.to",
        to=recipient,
        subject=f"任务完成: {task_name}",
        text=f"您好！我已完成任务: {task_name}\n\n详情:\n{details}\n\n最诚挚的问候,\nSpike 🦝",
        html=f"""
        <p>您好!</p>
        <p>我已完成任务: <strong>{task_name}</strong></p>
        <h3>详情:</h3>
        <p>{details.replace(chr(10), '<br>')}</p>
        <p>最诚挚的问候,<br>Spike 🦝</p>
        """
    )

# 使用示例
send_task_completion(
    "PDF 处理", 
    "旋转了5页，提取了文本，并将输出保存到 /tmp/processed.pdf",
    "adam@example.com"
)
```

## 客户支持自动化

### 自动回复系统

```python
def setup_support_auto_reply():
    """设置 webhook 以自动回复支持电子邮件"""
    
    # 创建支持收件箱
    support_inbox = client.inboxes.create(
        username="support",
        display_name="客户支持",
        client_id="support-inbox"
    )
    
    # 注册用于自动回复的 webhook
    webhook = client.webhooks.create(
        url="https://your-app.com/webhook/support",
        event_types=["message.received"],
        inbox_ids=[support_inbox.inbox_id],
        client_id="support-webhook"
    )
    
    return support_inbox, webhook

def handle_support_message(message):
    """处理传入的支持消息并发送自动回复"""
    
    subject = message['subject'].lower()
    sender = message['from'][0]['email']
    
    # 根据主题关键词确定回复
    if 'billing' in subject or 'payment' in subject:
        response = """
        感谢您的账单咨询。
        
        我们的账单团队将审查您的请求并在24小时内回复。
        如有紧急账单问题，请致电 1-800-SUPPORT。
        
        最诚挚的问候，
        客户支持团队
        """
    elif 'bug' in subject or 'error' in subject:
        response = """
        感谢您报告此问题。
        
        我们的技术团队已收到通知并将进行调查。
        我们将在48小时内为您提供调查结果。
        
        如果您有更多详情，请回复此电子邮件。
        
        最诚挚的问候，
        技术支持
        """
    else:
        response = """
        感谢您联系我们！
        
        我们已收到您的消息，将在未来24小时内回复。
        如有紧急问题，请致电我们的支持热线。
        
        最诚挚的问候，
        客户支持团队
        """
    
    # 发送自动回复
    client.inboxes.messages.send(
        inbox_id=message['inbox_id'],
        to=sender,
        subject=f"回复: {message['subject']}",
        text=response
    )
    
    # 记录以便人工跟进
    print(f"自动回复给 {sender}，主题: {message['subject']}")
```

## 文档处理工作流程

### 电子邮件 → 处理 → 回复

```python
import base64
import tempfile
from pathlib import Path

def process_pdf_attachment(message):
    """提取附件，处理 PDF，并回复结果"""
    
    processed_files = []
    
    for attachment in message.get('attachments', []):
        if attachment['content_type'] == 'application/pdf':
            # 解码附件
            pdf_data = base64.b64decode(attachment['content'])
            
            # 保存到临时文件
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(pdf_data)
                temp_path = tmp.name
            
            try:
                # 处理 PDF（示例：提取文本）
                extracted_text = extract_pdf_text(temp_path)
                
                # 保存处理结果
                output_path = f"/tmp/processed_{attachment['filename']}.txt"
                with open(output_path, 'w') as f:
                    f.write(extracted_text)
                
                processed_files.append({
                    'original': attachment['filename'],
                    'output': output_path,
                    'preview': extracted_text[:200] + '...'
                })
                
            finally:
                Path(temp_path).unlink()  # 清理临时文件
    
    if processed_files:
        # 发送结果回去
        results_text = "\n".join([
            f"已处理 {f['original']}:\n{f['preview']}\n"
            for f in processed_files
        ])
        
        # 附加处理后的文件
        attachments = []
        for f in processed_files:
            with open(f['output'], 'r') as file:
                content = base64.b64encode(file.read().encode()).decode()
            attachments.append({
                'filename': Path(f['output']).name,
                'content': content,
                'content_type': 'text/plain'
            })
        
        client.inboxes.messages.send(
            inbox_id=message['inbox_id'],
            to=message['from'][0]['email'],
            subject=f"回复: {message['subject']} - 已处理",
            text=f"我已处理您的 PDF 文件:\n\n{results_text}",
            attachments=attachments
        )

def extract_pdf_text(pdf_path):
    """从 PDF 文件中提取文本"""
    # 实现取决于您的 PDF 库
    # 使用 pdfplumber 的示例：
    import pdfplumber
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text
```

## 任务分配和跟踪

### 基于电子邮件的任务管理

```python
def create_task_tracker_inbox():
    """设置通过电子邮件接收任务分配的收件箱"""
    
    inbox = client.inboxes.create(
        username="tasks",
        display_name="任务分配机器人",
        client_id="task-tracker"
    )
    
    # 用于处理任务电子邮件的 webhook
    webhook = client.webhooks.create(
        url="https://your-app.com/webhook/tasks",
        event_types=["message.received"],
        inbox_ids=[inbox.inbox_id]
    )
    
    return inbox

def process_task_assignment(message):
    """解析电子邮件并从内容创建任务"""
    
    subject = message['subject']
    body = message.get('text', '')
    sender = message['from'][0]['email']
    
    # 简单的任务解析
    if subject.startswith('TASK:'):
        task_title = subject[5:].strip()
        
        # 从正文中提取截止日期、优先级等
        lines = body.split('\n')
        due_date = None
        priority = 'normal'
        description = body
        
        for line in lines:
            if line.startswith('Due:'):
                due_date = line[4:].strip()
            elif line.startswith('Priority:'):
                priority = line[9:].strip().lower()
        
        # 在您的系统中创建任务
        task_id = create_task_in_system({
            'title': task_title,
            'description': description,
            'due_date': due_date,
            'priority': priority,
            'assigned_by': sender
        })
        
        # 确认任务创建
        client.inboxes.messages.send(
            inbox_id=message['inbox_id'],
            to=sender,
            subject=f"任务已创建: {task_title} (#{task_id})",
            text=f"""
任务创建成功！

ID: #{task_id}
标题: {task_title}
优先级: {priority}
截止日期: {due_date or '未指定'}

工作进行时我会发送更新。

最诚挚的问候，
任务机器人
            """
        )
        
        # 开始处理任务...
        process_task_async(task_id)

def create_task_in_system(task_data):
    """在您的任务管理系统中创建任务"""
    # 实现取决于您的系统
    # 返回任务 ID
    return "T-12345"

def send_task_update(task_id, status, details, assignee_email):
    """发送任务进度更新"""
    
    client.inboxes.messages.send(
        inbox_id="tasks@agentmail.to",
        to=assignee_email,
        subject=f"任务更新: #{task_id} - {status}",
        text=f"""
任务 #{task_id} 状态更新

状态: {status}
详情: {details}

查看完整详情: https://your-app.com/tasks/{task_id}

最诚挚的问候，
任务机器人
        """
    )
```

## 与外部服务集成

### 从电子邮件创建 GitHub Issue

```python
def setup_github_integration():
    """创建用于 GitHub Issue 创建的收件箱"""
    
    inbox = client.inboxes.create(
        username="github-issues",
        display_name="GitHub Issue 创建器",
        client_id="github-integration"
    )
    
    return inbox

def create_github_issue_from_email(message):
    """将电子邮件转换为 GitHub Issue"""
    
    import requests
    
    # 提取 Issue 详情
    title = message['subject'].replace('BUG:', '').replace('FEATURE:', '').strip()
    body_content = message.get('text', '')
    sender = message['from'][0]['email']
    
    # 确定 Issue 类型和标签
    labels = ['email-created']
    if 'BUG:' in message['subject']:
        labels.append('bug')
    elif 'FEATURE:' in message['subject']:
        labels.append('enhancement')
    
    # 创建 GitHub Issue
    github_token = os.getenv('GITHUB_TOKEN')
    repo = 'your-org/your-repo'
    
    issue_data = {
        'title': title,
        'body': f"""
**通过电子邮件报告人:** {sender}

**原始消息:**
{body_content}

**电子邮件会话:** {message.get('thread_id')}
        """,
        'labels': labels
    }
    
    response = requests.post(
        f'https://api.github.com/repos/{repo}/issues',
        json=issue_data,
        headers={
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    )
    
    if response.status_code == 201:
        issue = response.json()
        
        # 回复 GitHub Issue 链接
        client.inboxes.messages.send(
            inbox_id=message['inbox_id'],
            to=sender,
            subject=f"回复: {message['subject']} - GitHub Issue 已创建",
            text=f"""
感谢您的报告！

我已创建 GitHub Issue 进行跟踪：

Issue #{issue['number']}: {issue['title']}
链接: {issue['html_url']}

您可以直接在 GitHub 上跟踪进度并添加评论。

最诚挚的问候，
GitHub 机器人
            """
        )
        
        print(f"从电子邮件创建了 GitHub Issue #{issue['number']}")
    else:
        print(f"创建 GitHub Issue 失败: {response.text}")

# 在 webhook 处理程序中使用
def handle_github_webhook(payload):
    if payload['event_type'] == 'message.received':
        message = payload['message']
        if message['inbox_id'] == 'github-issues@agentmail.to':
            create_github_issue_from_email(message)
```

## 通知和警报系统

### 多渠道警报

```python
def setup_alert_system():
    """创建用于系统通知的警报收件箱"""
    
    alerts_inbox = client.inboxes.create(
        username="alerts",
        display_name="系统警报",
        client_id="alert-system"
    )
    
    return alerts_inbox

def send_system_alert(alert_type, message, severity='info', recipients=None):
    """通过电子邮件发送系统警报"""
    
    if recipients is None:
        recipients = ['admin@company.com', 'ops@company.com']
    
    severity_emoji = {
        'critical': '🚨',
        'warning': '⚠️',
        'info': 'ℹ️',
        'success': '✅'
    }
    
    emoji = severity_emoji.get(severity, 'ℹ️')
    
    client.inboxes.messages.send(
        inbox_id="alerts@agentmail.to",
        to=recipients,
        subject=f"{emoji} [{severity.upper()}] {alert_type}",
        text=f"""
系统警报

类型: {alert_type}
严重程度: {severity}
时间: {datetime.now().isoformat()}

消息:
{message}

这是来自监控系统的自动警报。
        """,
        html=f"""
<h2>{emoji} 系统警报</h2>
<table>
<tr><td><strong>类型:</strong></td><td>{alert_type}</td></tr>
<tr><td><strong>严重程度:</strong></td><td style="color: {'red' if severity == 'critical' else 'orange' if severity == 'warning' else 'blue'}">{severity}</td></tr>
<tr><td><strong>时间:</strong></td><td>{datetime.now().isoformat()}</td></tr>
</table>

<h3>消息:</h3>
<p>{message.replace(chr(10), '<br>')}</p>

<p><em>这是来自监控系统的自动警报。</em></p>
        """
    )

# 使用示例
send_system_alert("数据库连接", "无法连接到主数据库", "critical")
send_system_alert("备份完成", "每日备份成功完成", "success")
send_system_alert("CPU 使用率高", "CPU 使用率连续5分钟超过80%", "warning")
```

## 测试和开发

### 本地开发设置

```python
def setup_dev_environment():
    """为本地开发设置 AgentMail"""
    
    # 创建开发收件箱
    dev_inbox = client.inboxes.create(
        username="dev-test",
        display_name="开发测试",
        client_id="dev-testing"
    )
    
    print(f"开发收件箱: {dev_inbox.inbox_id}")
    print("在本地使用此收件箱测试电子邮件工作流程")
    
    # 测试电子邮件发送
    test_response = client.inboxes.messages.send(
        inbox_id=dev_inbox.inbox_id,
        to="your-personal-email@gmail.com",
        subject="AgentMail 开发测试",
        text="这是来自您的 AgentMail 开发设置的测试电子邮件。"
    )
    
    print(f"测试电子邮件已发送: {test_response.message_id}")
    
    return dev_inbox

# 运行开发设置
if __name__ == "__main__":
    setup_dev_environment()
```