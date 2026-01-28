#!/usr/bin/env python3
"""
通过 AgentMail API 发送电子邮件

使用说明:
    python send_email.py --inbox "sender@agentmail.to" --to "recipient@example.com" --subject "您好" --text "消息正文"
    
    # 带有 HTML 内容
    python send_email.py --inbox "sender@agentmail.to" --to "recipient@example.com" --subject "您好" --html "<p>消息正文</p>"
    
    # 带有附件
    python send_email.py --inbox "sender@agentmail.to" --to "recipient@example.com" --subject "您好" --text "请查看附件" --attach "/path/to/file.pdf"

环境变量:
    AGENTMAIL_API_KEY: 您的 AgentMail API 密钥
"""

import argparse
import os
import sys
import base64
import mimetypes
from pathlib import Path

try:
    from agentmail import AgentMail  # 导入 AgentMail SDK
except ImportError:
    print("错误: 未找到 agentmail 包。请使用以下命令安装: pip install agentmail")
    sys.exit(1)


def main():
    """
    主函数：解析命令行参数并发送电子邮件
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='通过 AgentMail 发送电子邮件')
    parser.add_argument('--inbox', required=True, help='发件人收件箱电子邮件地址')
    parser.add_argument('--to', required=True, help='收件人电子邮件地址')
    parser.add_argument('--cc', help='抄送电子邮件地址（逗号分隔）')
    parser.add_argument('--bcc', help='密送电子邮件地址（逗号分隔）')
    parser.add_argument('--subject', default='', help='电子邮件主题')
    parser.add_argument('--text', help='纯文本正文')
    parser.add_argument('--html', help='HTML 正文')
    parser.add_argument('--attach', action='append', help='附件文件路径（可多次使用）')
    parser.add_argument('--reply-to', help='回复地址电子邮件')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 从环境变量获取 API 密钥
    api_key = os.getenv('AGENTMAIL_API_KEY')
    if not api_key:
        print("错误: 未设置 AGENTMAIL_API_KEY 环境变量")
        sys.exit(1)
    
    # 验证必需的邮件内容
    if not args.text and not args.html:
        print("错误: 必须提供 --text 或 --html 内容")
        sys.exit(1)
    
    # 初始化 AgentMail 客户端
    client = AgentMail(api_key=api_key)
    
    # 准备收件人列表
    recipients = [email.strip() for email in args.to.split(',')]
    cc_recipients = [email.strip() for email in args.cc.split(',')] if args.cc else None
    bcc_recipients = [email.strip() for email in args.bcc.split(',')] if args.bcc else None
    
    # 准备附件
    attachments = []
    if args.attach:
        for file_path in args.attach:
            path = Path(file_path)
            # 验证文件是否存在
            if not path.exists():
                print(f"错误: 附件文件未找到: {file_path}")
                sys.exit(1)
            
            # 读取并 Base64 编码文件内容
            with open(path, 'rb') as f:
                content = base64.b64encode(f.read()).decode('utf-8')
            
            # 检测内容类型
            content_type, _ = mimetypes.guess_type(str(path))
            if not content_type:
                content_type = 'application/octet-stream'
            
            # 构建附件对象
            attachments.append({
                'filename': path.name,
                'content': content,
                'content_type': content_type
            })
            print(f"已添加附件: {path.name} ({content_type})")
    
    # 发送电子邮件
    try:
        print(f"正在从 {args.inbox} 发送邮件到 {', '.join(recipients)}")
        
        response = client.inboxes.messages.send(
            inbox_id=args.inbox,
            to=recipients,
            cc=cc_recipients,
            bcc=bcc_recipients,
            reply_to=args.reply_to,
            subject=args.subject,
            text=args.text,
            html=args.html,
            attachments=attachments if attachments else None
        )
        
        print(f"✅ 电子邮件发送成功!")
        print(f"   消息 ID: {response.message_id}")
        print(f"   会话 ID: {response.thread_id}")
        
    except Exception as e:
        print(f"❌ 发送电子邮件失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()