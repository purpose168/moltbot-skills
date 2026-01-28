#!/usr/bin/env python3
"""
检查 AgentMail 收件箱中的消息

使用说明:
    # 列出最近的消息
    python check_inbox.py --inbox "myagent@agentmail.to"
    
    # 获取特定消息
    python check_inbox.py --inbox "myagent@agentmail.to" --message "msg_123abc"
    
    # 列出邮件会话
    python check_inbox.py --inbox "myagent@agentmail.to" --threads
    
    # 监控新消息（每 N 秒轮询一次）
    python check_inbox.py --inbox "myagent@agentmail.to" --monitor 30

环境变量:
    AGENTMAIL_API_KEY: 您的 AgentMail API 密钥
"""

import argparse
import os
import sys
import time
from datetime import datetime

try:
    from agentmail import AgentMail  # 导入 AgentMail SDK
except ImportError:
    print("错误: 未找到 agentmail 包。请使用以下命令安装: pip install agentmail")
    sys.exit(1)


def format_timestamp(iso_string):
    """
    格式化 ISO 时间戳用于显示
    
    参数:
        iso_string: ISO 格式的时间字符串
    
    返回:
        格式化后的可读时间字符串
    """
    try:
        # 解析 ISO 格式时间，处理时区
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        # 格式化为 YYYY-MM-DD HH:MM:SS
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return iso_string


def print_message_summary(message):
    """
    打印消息摘要
    
    参数:
        message: 消息字典对象
    """
    # 提取发件人信息
    from_addr = message.get('from', [{}])[0].get('email', 'Unknown')
    from_name = message.get('from', [{}])[0].get('name', '')
    subject = message.get('subject', '(无主题)')
    timestamp = format_timestamp(message.get('timestamp', ''))
    # 提取预览文本（优先使用 preview 字段，否则使用 text 字段）
    preview = message.get('preview', message.get('text', ''))[:100]
    
    # 打印消息摘要
    print(f"📧 {message.get('message_id', 'N/A')}")
    # 根据是否有发件人姓名显示不同格式
    print(f"   发件人: {from_name} <{from_addr}>" if from_name else f"   发件人: {from_addr}")
    print(f"   主题: {subject}")
    print(f"   时间: {timestamp}")
    if preview:
        # 如果预览被截断，添加省略号
        print(f"   预览: {preview}{'...' if len(preview) == 100 else ''}")
    print()


def print_thread_summary(thread):
    """
    打印邮件会话摘要
    
    参数:
        thread: 邮件会话字典对象
    """
    subject = thread.get('subject', '(无主题)')
    participants = ', '.join(thread.get('participants', []))
    count = thread.get('message_count', 0)
    timestamp = format_timestamp(thread.get('last_message_at', ''))
    
    # 打印会话摘要
    print(f"🧵 {thread.get('thread_id', 'N/A')}")
    print(f"   主题: {subject}")
    print(f"   参与者: {participants}")
    print(f"   消息数: {count}")
    print(f"   最后消息: {timestamp}")
    print()


def main():
    """
    主函数：解析命令行参数并执行相应的收件箱操作
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='检查 AgentMail 收件箱')
    parser.add_argument('--inbox', required=True, help='收件箱电子邮件地址')
    parser.add_argument('--message', help='通过 ID 获取特定消息')
    parser.add_argument('--threads', action='store_true', help='列出邮件会话而非消息')
    parser.add_argument('--monitor', type=int, metavar='SECONDS', help='监控新消息（轮询间隔秒数）')
    parser.add_argument('--limit', type=int, default=10, help='获取的项目数量（默认值: 10)')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 从环境变量获取 API 密钥
    api_key = os.getenv('AGENTMAIL_API_KEY')
    if not api_key:
        print("错误: 未设置 AGENTMAIL_API_KEY 环境变量")
        sys.exit(1)
    
    # 初始化 AgentMail 客户端
    client = AgentMail(api_key=api_key)
    
    # 模式1: 监控模式 - 持续检查新消息
    if args.monitor:
        print(f"🔍 正在监控 {args.inbox}（每 {args.monitor} 秒检查一次）")
        print("按 Ctrl+C 停止\n")
        
        last_message_ids = set()  # 记录上一轮检查的消息 ID
        
        try:
            while True:
                try:
                    # 获取消息列表
                    messages = client.inboxes.messages.list(
                        inbox_id=args.inbox,
                        limit=args.limit
                    )
                    
                    new_messages = []
                    current_message_ids = set()
                    
                    # 检查是否有新消息
                    for message in messages.messages:
                        msg_id = message.get('message_id')
                        current_message_ids.add(msg_id)
                        
                        if msg_id not in last_message_ids:
                            new_messages.append(message)
                    
                    # 打印新消息
                    if new_messages:
                        print(f"🆕 发现 {len(new_messages)} 条新消息:")
                        for message in new_messages:
                            print_message_summary(message)
                    
                    # 更新上一轮消息 ID
                    last_message_ids = current_message_ids
                    
                except Exception as e:
                    print(f"❌ 检查收件箱出错: {e}")
                
                # 等待指定时间后再次检查
                time.sleep(args.monitor)
                
        except KeyboardInterrupt:
            print("\n👋 监控已停止")
            return
    
    # 模式2: 获取特定消息详情
    elif args.message:
        try:
            message = client.inboxes.messages.get(
                inbox_id=args.inbox,
                message_id=args.message
            )
            
            # 打印消息详细信息
            print(f"📧 消息详情:")
            print(f"   ID: {message.get('message_id')}")
            print(f"   会话: {message.get('thread_id')}")
            
            # 发件人信息
            from_addr = message.get('from', [{}])[0].get('email', 'Unknown')
            from_name = message.get('from', [{}])[0].get('name', '')
            print(f"   发件人: {from_name} <{from_addr}>" if from_name else f"   发件人: {from_addr}")
            
            # 收件人信息
            to_addrs = ', '.join([addr.get('email', '') for addr in message.get('to', [])])
            print(f"   收件人: {to_addrs}")
            
            print(f"   主题: {message.get('subject', '(无主题)')}")
            print(f"   时间: {format_timestamp(message.get('timestamp', ''))}")
            
            # 标签信息
            if message.get('labels'):
                print(f"   标签: {', '.join(message.get('labels'))}")
            
            # 打印消息内容
            print("\n📝 内容:")
            if message.get('text'):
                print(message['text'])
            elif message.get('html'):
                print("(HTML 内容 - 使用 API 获取完整 HTML)")
            else:
                print("(无文本内容)")
            
            # 附件信息
            if message.get('attachments'):
                print(f"\n📎 附件 ({len(message['attachments'])}):")
                for att in message['attachments']:
                    print(f"   • {att.get('filename', '未命名')} ({att.get('content_type', '未知类型')})")
            
        except Exception as e:
            print(f"❌ 获取消息出错: {e}")
            sys.exit(1)
    
    # 模式3: 列出邮件会话
    elif args.threads:
        try:
            threads = client.inboxes.threads.list(
                inbox_id=args.inbox,
                limit=args.limit
            )
            
            if not threads.threads:
                print(f"📭 在 {args.inbox} 中未找到邮件会话")
                return
            
            print(f"🧵 {args.inbox} 中的邮件会话（显示 {len(threads.threads)}）:\n")
            for thread in threads.threads:
                print_thread_summary(thread)
                
        except Exception as e:
            print(f"❌ 列出邮件会话出错: {e}")
            sys.exit(1)
    
    # 模式4: 列出最近消息（默认模式）
    else:
        try:
            messages = client.inboxes.messages.list(
                inbox_id=args.inbox,
                limit=args.limit
            )
            
            if not messages.messages:
                print(f"📭 在 {args.inbox} 中未找到消息")
                return
            
            print(f"📧 {args.inbox} 中的消息（显示 {len(messages.messages)}）:\n")
            for message in messages.messages:
                print_message_summary(message)
                
        except Exception as e:
            print(f"❌ 列出消息出错: {e}")
            sys.exit(1)


if __name__ == '__main__':
    main()