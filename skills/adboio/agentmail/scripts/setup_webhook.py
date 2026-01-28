#!/usr/bin/env python3
"""
设置 AgentMail Webhook 端点

使用说明:
    # 创建 webhook
    python setup_webhook.py --url "https://myapp.com/webhook" --create
    
    # 列出现有 webhook
    python setup_webhook.py --list
    
    # 删除 webhook
    python setup_webhook.py --delete "webhook_id"
    
    # 使用简单的 Flask 接收器测试 webhook（用于开发）
    python setup_webhook.py --test-server

环境变量:
    AGENTMAIL_API_KEY: 您的 AgentMail API 密钥
"""

import argparse
import os
import sys
import json

try:
    from agentmail import AgentMail  # 导入 AgentMail SDK
except ImportError:
    print("错误: 未找到 agentmail 包。请使用以下命令安装: pip install agentmail")
    sys.exit(1)


def main():
    """
    主函数：解析命令行参数并管理 webhook
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='管理 AgentMail Webhook')
    parser.add_argument('--create', action='store_true', help='创建新的 webhook')
    parser.add_argument('--url', help='Webhook URL（创建时必需）')
    parser.add_argument('--events', default='message.received', help='逗号分隔的事件类型（默认值: message.received）')
    parser.add_argument('--inbox-filter', help='过滤到特定收件箱，逗号分隔')
    parser.add_argument('--client-id', help='用于幂等性的客户端 ID')
    parser.add_argument('--list', action='store_true', help='列出现有 webhook')
    parser.add_argument('--delete', metavar='WEBHOOK_ID', help='通过 ID 删除 webhook')
    parser.add_argument('--test-server', action='store_true', help='启动测试 webhook 接收器')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 如果是测试服务器模式，启动测试服务器
    if args.test_server:
        start_test_server()
        return
    
    # 从环境变量获取 API 密钥
    api_key = os.getenv('AGENTMAIL_API_KEY')
    if not api_key:
        print("错误: 未设置 AGENTMAIL_API_KEY 环境变量")
        sys.exit(1)
    
    # 初始化 AgentMail 客户端
    client = AgentMail(api_key=api_key)
    
    # 模式1: 创建新的 webhook
    if args.create:
        if not args.url:
            print("错误: 创建 webhook 时需要 --url 参数")
            sys.exit(1)
        
        # 准备事件类型列表
        event_types = [event.strip() for event in args.events.split(',')]
        
        # 准备收件箱过滤
        inbox_ids = None
        if args.inbox_filter:
            inbox_ids = [inbox.strip() for inbox in args.inbox_filter.split(',')]
        
        try:
            webhook = client.webhooks.create(
                url=args.url,
                event_types=event_types,
                inbox_ids=inbox_ids,
                client_id=args.client_id
            )
            
            print(f"✅ Webhook 创建成功!")
            print(f"   ID: {webhook.webhook_id}")
            print(f"   URL: {webhook.url}")
            print(f"   事件: {', '.join(webhook.event_types)}")
            print(f"   已启用: {webhook.enabled}")
            if webhook.inbox_ids:
                print(f"   收件箱: {', '.join(webhook.inbox_ids)}")
            print(f"   创建时间: {webhook.created_at}")
            
        except Exception as e:
            print(f"❌ 创建 webhook 失败: {e}")
            sys.exit(1)
    
    # 模式2: 列出所有 webhook
    elif args.list:
        try:
            webhooks = client.webhooks.list()
            
            if not webhooks.webhooks:
                print("📭 未找到 webhook")
                return
            
            print(f"🪝 Webhooks 数量: {len(webhooks.webhooks)}\n")
            for webhook in webhooks.webhooks:
                status = "✅ 已启用" if webhook.enabled else "❌ 已禁用"
                print(f"{status} {webhook.webhook_id}")
                print(f"   URL: {webhook.url}")
                print(f"   事件: {', '.join(webhook.event_types)}")
                if webhook.inbox_ids:
                    print(f"   收件箱: {', '.join(webhook.inbox_ids)}")
                print(f"   创建时间: {webhook.created_at}")
                print()
                
        except Exception as e:
            print(f"❌ 列出 webhook 出错: {e}")
            sys.exit(1)
    
    # 模式3: 删除 webhook
    elif args.delete:
        try:
            client.webhooks.delete(args.delete)
            print(f"✅ Webhook {args.delete} 删除成功")
            
        except Exception as e:
            print(f"❌ 删除 webhook 失败: {e}")
            sys.exit(1)
    
    # 无效参数
    else:
        print("错误: 必须指定 --create、--list、--delete 或 --test-server")
        parser.print_help()
        sys.exit(1)


def start_test_server():
    """
    启动简单的 Flask Webhook 接收器用于测试
    """
    try:
        from flask import Flask, request, Response
    except ImportError:
        print("错误: 未找到 flask 包。请使用以下命令安装: pip install flask")
        sys.exit(1)
    
    # 创建 Flask 应用
    app = Flask(__name__)
    
    @app.route('/')
    def home():
        """主页，显示服务器状态"""
        return """
        <h1>AgentMail Webhook 测试服务器</h1>
        <p>✅ 服务器正在运行</p>
        <p>Webhook 端点: <code>POST /webhook</code></p>
        <p>在控制台查看传入的 webhook。</p>
        """
    
    @app.route('/webhook', methods=['POST'])
    def webhook():
        """Webhook 接收端点"""
        payload = request.json
        
        print("\n🪝 收到 Webhook:")
        print(f"   事件: {payload.get('event_type')}")
        print(f"   ID: {payload.get('event_id')}")
        
        # 如果是收到消息的事件，显示消息详情
        if payload.get('event_type') == 'message.received':
            message = payload.get('message', {})
            print(f"   发件人: {message.get('from', [{}])[0].get('email')}")
            print(f"   主题: {message.get('subject')}")
            print(f"   预览: {message.get('preview', '')[:50]}...")
        
        print(f"   完整负载: {json.dumps(payload, indent=2)}")
        print()
        
        # 返回 200 状态码确认收到
        return Response(status=200)
    
    print("🚀 在 http://localhost:3000 启动 webhook 测试服务器")
    print("📡 Webhook 端点: http://localhost:3000/webhook")
    print("\n💡 要进行外部访问，请使用 ngrok:")
    print("   ngrok http 3000")
    print("\n🛑 按 Ctrl+C 停止\n")
    
    try:
        app.run(host='0.0.0.0', port=3000, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Webhook 服务器已停止")


if __name__ == '__main__':
    main()