#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["rich", "typer"]
# ///
"""
PurelyMail 邮件服务设置工具 - 为 Clawdbot 代理配置和测试 PurelyMail 邮件服务

功能支持：
- 生成 PurelyMail 配置代码段
- 测试 IMAP 和 SMTP 连接
- 发送测试邮件
- 查看收件箱邮件
- 阅读具体邮件内容
- 提供完整的设置指南
- 交互式设置向导

使用示例：
  # 生成配置代码段
  uv run purelymail.py config --email agent@example.com --password "your_password"
  
  # 测试连接
  uv run purelymail.py test --email agent@example.com --password "your_password"
  
  # 发送测试邮件
  uv run purelymail.py send-test --email agent@example.com --password "your_password" --to you@example.com
  
  # 查看收件箱
  uv run purelymail.py inbox --email agent@example.com --password "your_password"
  
  # 运行设置向导
  uv run purelymail.py wizard
"""

import email
import imaplib
import json
import smtplib
import ssl
from datetime import datetime
from email.mime.text import MIMEText
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer(help="PurelyMail 设置 - 为 Clawdbot 代理配置邮件服务")
console = Console()

# PurelyMail 服务器设置
IMAP_SERVER = "imap.purelymail.com"      # IMAP 服务器地址
IMAP_PORT = 993                          # IMAP 端口（SSL）
SMTP_SERVER = "smtp.purelymail.com"      # SMTP 服务器地址
SMTP_PORT = 465                          # SMTP 端口（SSL）
SMTP_PORT_STARTTLS = 587                 # SMTP 端口（STARTTLS）


@app.command()
def config(
    email_addr: str = typer.Option(..., "--email", "-e", help="邮箱地址"),
    password: str = typer.Option(..., "--password", "-p", help="邮箱密码"),
    name: str = typer.Option("agent-email", "--name", "-n", help="配置条目名称"),
    output: bool = typer.Option(False, "--output", "-o", help="仅输出原始 JSON"),
):
    """
    生成 PurelyMail 的 clawdbot.json 配置代码段。
    
    参数:
        email_addr: 邮箱地址
        password: 邮箱密码
        name: 配置条目名称
        output: 是否仅输出原始 JSON
    """
    
    # 生成配置代码段
    config_snippet = {
        "skills": {
            "entries": {
                name: {
                    "env": {
                        f"{name.upper().replace('-', '_')}_EMAIL": email_addr,
                        f"{name.upper().replace('-', '_')}_PASSWORD": password,
                        f"{name.upper().replace('-', '_')}_IMAP_SERVER": IMAP_SERVER,
                        f"{name.upper().replace('-', '_')}_SMTP_SERVER": SMTP_SERVER,
                    }
                }
            }
        }
    }
    
    if output:
        # 仅输出 JSON 格式
        print(json.dumps(config_snippet, indent=2))
        return
    
    # 以美化的面板形式显示配置
    console.print(Panel(
        f"[bold]添加到你的 clawdbot.json:[/bold]\n\n"
        f"[cyan]{json.dumps(config_snippet, indent=2)}[/cyan]",
        title="PurelyMail 配置"
    ))
    
    console.print("\n[dim]或将其合并到现有配置的 skills.entries 下[/dim]")


@app.command()
def test(
    email_addr: str = typer.Option(..., "--email", "-e", help="邮箱地址"),
    password: str = typer.Option(..., "--password", "-p", help="邮箱密码"),
):
    """
    测试 IMAP 和 SMTP 连接。
    
    参数:
        email_addr: 邮箱地址
        password: 邮箱密码
    """
    
    console.print("[bold]测试 PurelyMail 连接...[/bold]\n")
    
    # 测试 IMAP 连接
    console.print(f"[blue]测试 IMAP ({IMAP_SERVER}:{IMAP_PORT})...[/blue]")
    try:
        context = ssl.create_default_context()
        with imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context) as imap:
            imap.login(email_addr, password)
            imap.select("INBOX")
            _, messages = imap.search(None, "ALL")
            msg_count = len(messages[0].split()) if messages[0] else 0
            console.print(f"[green]✓ IMAP 连接成功 - 收件箱中有 {msg_count} 条消息[/green]")
    except imaplib.IMAP4.error as e:
        console.print(f"[red]✗ IMAP 失败: {e}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]✗ IMAP 错误: {e}[/red]")
        raise typer.Exit(1)
    
    # 测试 SMTP 连接
    console.print(f"\n[blue]测试 SMTP ({SMTP_SERVER}:{SMTP_PORT})...[/blue]")
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as smtp:
            smtp.login(email_addr, password)
            console.print(f"[green]✓ SMTP 连接成功并已认证[/green]")
    except smtplib.SMTPAuthenticationError as e:
        console.print(f"[red]✗ SMTP 认证失败: {e}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]✗ SMTP 错误: {e}[/red]")
        raise typer.Exit(1)
    
    console.print("\n[bold green]✓ 所有测试通过！[/bold green]")


@app.command()
def send_test(
    email_addr: str = typer.Option(..., "--email", "-e", help="邮箱地址"),
    password: str = typer.Option(..., "--password", "-p", help="邮箱密码"),
    to: str = typer.Option(..., "--to", "-t", help="收件人邮箱地址"),
    subject: str = typer.Option("Test from Clawdbot Agent", "--subject", "-s", help="邮件主题"),
):
    """
    发送测试邮件。
    
    参数:
        email_addr: 邮箱地址
        password: 邮箱密码
        to: 收件人邮箱地址
        subject: 邮件主题
    """
    
    console.print(f"[blue]正在向 {to} 发送测试邮件...[/blue]")
    
    # 创建测试邮件内容
    msg = MIMEText(f"""Hello!

This is a test email from your Clawdbot agent ({email_addr}).

If you received this, SMTP is working correctly!

Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

-- 
Clawdbot Agent
""")
    
    msg["Subject"] = subject
    msg["From"] = email_addr
    msg["To"] = to
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as smtp:
            smtp.login(email_addr, password)
            smtp.send_message(msg)
        console.print(f"[green]✓ 测试邮件已发送到 {to}[/green]")
    except Exception as e:
        console.print(f"[red]✗ 发送失败: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def inbox(
    email_addr: str = typer.Option(..., "--email", "-e", help="邮箱地址"),
    password: str = typer.Option(..., "--password", "-p", help="邮箱密码"),
    limit: int = typer.Option(10, "--limit", "-l", help="显示的消息数量"),
    unread: bool = typer.Option(False, "--unread", "-u", help="仅显示未读消息"),
):
    """
    列出最近的收件箱消息。
    
    参数:
        email_addr: 邮箱地址
        password: 邮箱密码
        limit: 显示的消息数量
        unread: 是否仅显示未读消息
    """
    
    try:
        context = ssl.create_default_context()
        with imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context) as imap:
            imap.login(email_addr, password)
            imap.select("INBOX")
            
            # 构建搜索条件
            search_criteria = "UNSEEN" if unread else "ALL"
            _, messages = imap.search(None, search_criteria)
            
            msg_nums = messages[0].split()
            if not msg_nums:
                console.print("[yellow]未找到消息[/yellow]")
                return
            
            # 获取最新消息
            msg_nums = msg_nums[-limit:]
            msg_nums.reverse()  # 按时间倒序（最新的在前）
            
            # 创建表格显示消息列表
            table = Table(title=f"收件箱 ({email_addr})")
            table.add_column("#", style="dim")
            table.add_column("发件人", style="cyan")
            table.add_column("主题", style="bold")
            table.add_column("日期", style="dim")
            
            for num in msg_nums:
                _, msg_data = imap.fetch(num, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
                if msg_data[0]:
                    header = email.message_from_bytes(msg_data[0][1])
                    from_addr = header.get("From", "Unknown")[:40]
                    subject = header.get("Subject", "No subject")[:50]
                    date = header.get("Date", "")[:25]
                    table.add_row(num.decode(), from_addr, subject, date)
            
            console.print(table)
            console.print(f"\n[dim]使用 'purelymail read <num>' 阅读消息[/dim]")
            
    except Exception as e:
        console.print(f"[red]错误: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def read(
    msg_num: int = typer.Argument(..., help="要阅读的消息编号"),
    email_addr: str = typer.Option(..., "--email", "-e", help="邮箱地址"),
    password: str = typer.Option(..., "--password", "-p", help="邮箱密码"),
):
    """
    阅读特定的邮件消息。
    
    参数:
        msg_num: 消息编号
        email_addr: 邮箱地址
        password: 邮箱密码
    """
    
    try:
        context = ssl.create_default_context()
        with imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context) as imap:
            imap.login(email_addr, password)
            imap.select("INBOX")
            
            # 获取邮件内容
            _, msg_data = imap.fetch(str(msg_num).encode(), "(RFC822)")
            if not msg_data[0]:
                console.print(f"[red]消息 {msg_num} 未找到[/red]")
                raise typer.Exit(1)
            
            msg = email.message_from_bytes(msg_data[0][1])
            
            # 提取邮件正文
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode(errors="replace")
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors="replace")
            
            # 以美化的面板形式显示邮件
            console.print(Panel(
                f"[bold]发件人:[/bold] {msg.get('From', 'Unknown')}\n"
                f"[bold]收件人:[/bold] {msg.get('To', 'Unknown')}\n"
                f"[bold]日期:[/bold] {msg.get('Date', 'Unknown')}\n"
                f"[bold]主题:[/bold] {msg.get('Subject', 'No subject')}\n\n"
                f"{body[:2000]}{'...' if len(body) > 2000 else ''}",
                title=f"消息 #{msg_num}"
            ))
            
    except Exception as e:
        console.print(f"[red]错误: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def setup_guide():
    """
    打印完整的 PurelyMail 设置指南。
    """
    
    guide = """
[bold cyan]Clawdbot 的 PurelyMail 设置指南[/bold cyan]

[bold]步骤 1: 创建 PurelyMail 账户[/bold]
  1. 访问 https://purelymail.com
  2. 点击 "Get Started" 并创建账户
  3. 选择一个计划（基础版约 $10/年）

[bold]步骤 2: 添加你的域名[/bold]
  1. 在 PurelyMail 仪表板中，点击 "Domains"
  2. 添加你的域名（例如，yourdomain.com）
  3. 添加 PurelyMail 提供的 DNS 记录：
     - MX 记录（用于接收邮件）
     - SPF、DKIM、DMARC（用于发送邮件）
  4. 等待 DNS 传播（可能需要长达 48 小时）

[bold]步骤 3: 创建代理邮箱[/bold]
  1. 在 PurelyMail 仪表板中进入 "Users"
  2. 点击 "Add User"
  3. 创建一个类似 agent@yourdomain.com 的地址
  4. 设置一个强密码
  5. 安全保存密码

[bold]步骤 4: 配置 Clawdbot[/bold]
  运行: purelymail config --email agent@yourdomain.com --password "YourPassword"
  
  将输出添加到你的 ~/.clawdbot/clawdbot.json

[bold]步骤 5: 测试连接[/bold]
  运行: purelymail test --email agent@yourdomain.com --password "YourPassword"

[bold]步骤 6: 发送测试邮件[/bold]
  运行: purelymail send-test --email agent@yourdomain.com --password "YourPassword" --to you@example.com

[bold]服务器设置[/bold]
  IMAP: imap.purelymail.com:993 (SSL)
  SMTP: smtp.purelymail.com:465 (SSL) 或 :587 (STARTTLS)

[bold]提示[/bold]
  • 为你的代理使用唯一的密码（不是你的主账户密码）
  • 在 PurelyMail 账户上启用 2FA
  • 考虑使用捕获所有地址进行灵活路由
  • PurelyMail 支持在你的域名上使用无限别名
"""
    
    console.print(Panel(guide, title="设置指南"))


@app.command()
def wizard():
    """
    交互式向导，用于为你的 Clawdbot 代理设置 PurelyMail。
    """
    
    console.print(Panel(
        "[bold]欢迎使用 PurelyMail 设置向导！[/bold]\n\n"
        "此向导将帮助你为 Clawdbot 代理配置电子邮件。\n"
        "你首先需要一个 PurelyMail 账户 - 在 https://purelymail.com 注册",
        title="📬 PurelyMail 向导"
    ))
    
    # 步骤 1: 检查是否有账户
    console.print("\n[bold cyan]步骤 1: PurelyMail 账户[/bold cyan]")
    has_account = typer.confirm("你已经有 PurelyMail 账户了吗？", default=True)
    
    if not has_account:
        console.print("""
[yellow]没问题！以下是开始的方法：[/yellow]

1. 访问 [link=https://purelymail.com]https://purelymail.com[/link]
2. 点击 "Get Started" 
3. 选择一个计划（~$10/年，无限地址）
4. 添加你的域名并设置 DNS 记录
5. 为你的代理创建一个邮箱

[dim]一旦你有了凭证，请回来再次运行此向导！[/dim]
""")
        raise typer.Exit(0)
    
    # 步骤 2: 获取凭证
    console.print("\n[bold cyan]步骤 2: 输入凭证[/bold cyan]")
    email_addr = typer.prompt("代理邮箱地址（例如，agent@yourdomain.com）")
    password = typer.prompt("邮箱密码", hide_input=True)
    
    # 步骤 3: 测试连接
    console.print("\n[bold cyan]步骤 3: 测试连接[/bold cyan]")
    
    # 测试 IMAP
    console.print(f"正在测试 IMAP ({IMAP_SERVER}:{IMAP_PORT})...")
    imap_ok = False
    try:
        context = ssl.create_default_context()
        with imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context) as imap:
            imap.login(email_addr, password)
            imap.select("INBOX")
            _, messages = imap.search(None, "ALL")
            msg_count = len(messages[0].split()) if messages[0] else 0
            console.print(f"[green]✓ IMAP 连接成功 - 收件箱中有 {msg_count} 条消息[/green]")
            imap_ok = True
    except Exception as e:
        console.print(f"[red]✗ IMAP 失败: {e}[/red]")
    
    # 测试 SMTP
    console.print(f"正在测试 SMTP ({SMTP_SERVER}:{SMTP_PORT})...")
    smtp_ok = False
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as smtp:
            smtp.login(email_addr, password)
            console.print(f"[green]✓ SMTP 连接成功[/green]")
            smtp_ok = True
    except Exception as e:
        console.print(f"[red]✗ SMTP 失败: {e}[/red]")
    
    if not (imap_ok and smtp_ok):
        console.print("\n[red]连接测试失败。请检查你的凭证。[/red]")
        console.print("[dim]常见问题：密码错误、启用了 2FA（使用应用密码）、账户未激活[/dim]")
        raise typer.Exit(1)
    
    console.print("\n[green]✓ 所有连接测试通过！[/green]")
    
    # 步骤 4: 生成配置
    console.print("\n[bold cyan]步骤 4: 生成配置[/bold cyan]")
    config_name = typer.prompt("配置条目名称", default="agent-email")
    
    env_prefix = config_name.upper().replace("-", "_")
    config_snippet = {
        config_name: {
            "env": {
                f"{env_prefix}_EMAIL": email_addr,
                f"{env_prefix}_PASSWORD": password,
                f"{env_prefix}_IMAP_SERVER": IMAP_SERVER,
                f"{env_prefix}_SMTP_SERVER": SMTP_SERVER,
            }
        }
    }
    
    console.print(Panel(
        f"[bold]添加到你的 clawdbot.json 中的 skills.entries 下:[/bold]\n\n"
        f"[cyan]{json.dumps(config_snippet, indent=2)}[/cyan]",
        title="配置"
    ))
    
    # 步骤 5: 可选的测试邮件
    console.print("\n[bold cyan]步骤 5: 发送测试邮件（可选）[/bold cyan]")
    send_test = typer.confirm("你想发送测试邮件吗？", default=True)
    
    if send_test:
        test_to = typer.prompt("发送测试邮件到")
        
        msg = MIMEText(f"""Hello!

This is a test email from your Clawdbot agent setup wizard.

Agent email: {email_addr}
Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

If you received this, your agent's email is working correctly! 🎉

-- 
Clawdbot Agent (via PurelyMail)
""")
        
        msg["Subject"] = "✓ Clawdbot Agent Email Test"
        msg["From"] = email_addr
        msg["To"] = test_to
        
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as smtp:
                smtp.login(email_addr, password)
                smtp.send_message(msg)
            console.print(f"[green]✓ 测试邮件已发送到 {test_to}[/green]")
        except Exception as e:
            console.print(f"[yellow]⚠ 发送测试邮件失败: {e}[/yellow]")
    
    # 完成！
    console.print(Panel(
        f"""[bold green]设置完成！ 🎉[/bold green]

你的 Clawdbot 代理邮箱已准备就绪：
  📧 邮箱: {email_addr}
  📥 IMAP: {IMAP_SERVER}:993
  📤 SMTP: {SMTP_SERVER}:465

[bold]下一步:[/bold]
1. 将上面的配置添加到 ~/.clawdbot/clawdbot.json
2. 重启你的 Clawdbot 网关
3. 你的代理现在可以发送和接收邮件了！

[dim]使用 'purelymail inbox' 查看消息
使用 'purelymail send-test' 发送邮件[/dim]""",
        title="✓ 设置完成"
    ))


if __name__ == "__main__":
    app()
