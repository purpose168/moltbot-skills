#!/usr/bin/env python3
"""
通过传入 Webhook 向 Google Chat 发送消息。
用法: python3 send_webhook.py <webhook_url> <消息> [--thread_key <key>]

此脚本用于通过 Google Chat 的传入 Webhook 功能发送简单的文本消息。
Webhook 是一种轻量级的消息发送方式，适合已配置的固定频道。
"""

import sys
import json
import urllib.request
import urllib.error
from typing import Optional


def send_webhook_message(webhook_url: str, message: str, thread_key: Optional[str] = None) -> dict:
    """
    通过 Google Chat webhook 发送消息。

    参数:
        webhook_url: Google Chat Webhook 的完整 URL 地址
        message: 要发送的文本消息内容
        thread_key: 可选的线程键，用于将消息添加到同一线程中

    返回:
        包含发送结果的字典，success 字段表示是否成功，
        成功时 response 包含 API 返回数据，失败时 error 包含错误信息
    """
    payload = {"text": message}
    
    # 如果提供了线程键，添加到 URL 中（用于回复线程）
    url = webhook_url
    if thread_key:
        url = f"{webhook_url}&threadKey={thread_key}"
    
    headers = {"Content-Type": "application/json; charset=UTF-8"}
    data = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return {"success": True, "response": result}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return {"success": False, "error": f"HTTP {e.code}: {error_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """
    主函数：解析命令行参数并发送消息。
    
    命令行参数:
        sys.argv[1]: Webhook URL
        sys.argv[2]: 要发送的消息内容
        sys.argv[3]: --thread_key (可选)
        sys.argv[4]: 线程键值 (可选)
    """
    if len(sys.argv) < 3:
        print("用法: python3 send_webhook.py <webhook_url> <消息> [--thread_key <key>]")
        sys.exit(1)
    
    webhook_url = sys.argv[1]
    message = sys.argv[2]
    thread_key = None
    
    # 解析可选的线程键参数
    if len(sys.argv) >= 5 and sys.argv[3] == "--thread_key":
        thread_key = sys.argv[4]
    
    # 发送消息
    result = send_webhook_message(webhook_url, message, thread_key)
    
    # 输出结果
    if result["success"]:
        print(json.dumps(result["response"], indent=2))
    else:
        print(f"错误: {result['error']}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
