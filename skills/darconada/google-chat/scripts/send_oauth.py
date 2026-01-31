#!/usr/bin/env python3
"""
通过 OAuth 2.0 向 Google Chat 发送消息。
用法:
  # 按名称发送到空间
  python3 send_oauth.py --credentials creds.json --token token.json --space "空间名称" "消息"
  
  # 向用户发送私信
  python3 send_oauth.py --credentials creds.json --token token.json --dm user@domain.com "消息"
  
  # 按 ID 发送到空间
  python3 send_oauth.py --credentials creds.json --token token.json --space-id "spaces/AAAA..." "消息"

此脚本使用 Google Chat API 的 OAuth 2.0 认证方式，
支持动态发送到任何空间或用户，消息会以配置的 Google Chat 应用身份显示。
"""

import sys
import json
import argparse
from typing import Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os


# Google Chat API 所需的 OAuth 权限范围
SCOPES = [
    'https://www.googleapis.com/auth/chat.messages',       # 发送消息权限
    'https://www.googleapis.com/auth/chat.spaces',         # 访问空间信息权限
    'https://www.googleapis.com/auth/chat.memberships.readonly'  # 列出空间成员权限（用于私信识别）
]


def get_credentials(credentials_path: str, token_path: str) -> Credentials:
    """
    获取或刷新 OAuth 凭据。

    参数:
        credentials_path: OAuth 凭据 JSON 文件的路径（从 Google Cloud Console 下载）
        token_path: 令牌文件的路径（用于缓存已授权的访问令牌）

    返回:
        有效的 Credentials 对象，可用于访问 Google Chat API

    流程:
        1. 尝试从令牌文件加载已授权的凭据
        2. 如果凭据无效或已过期，检查是否可刷新
        3. 如果无法刷新，启动浏览器进行交互式授权
        4. 将新获取的凭据保存到令牌文件供下次使用
    """
    creds = None
    
    # 如果存在令牌文件，从文件加载已授权的凭据
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # 刷新或创建新的凭据
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # 凭据已过期但有刷新令牌，尝试刷新
            creds.refresh(Request())
        else:
            # 需要进行完整的 OAuth 授权流程
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            print("\n🔐 需要身份验证！", file=sys.stderr)
            print("正在打开浏览器进行身份验证...\n", file=sys.stderr)
            # 使用本地服务器接收回调，完成授权
            creds = flow.run_local_server(port=0)
        
        # 保存凭据供下次运行使用
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    return creds


def find_space_by_name(service, space_name: str) -> Optional[str]:
    """
    通过显示名称查找空间的 ID。

    参数:
        service: 已构建的 Google Chat API 服务对象
        space_name: 要查找的空间的显示名称

    返回:
        找到的空间 ID（格式为 spaces/xxx），未找到时返回 None
    """
    try:
        # 列出最多 100 个空间
        result = service.spaces().list(pageSize=100).execute()
        spaces = result.get('spaces', [])
        
        # 遍历空间列表，匹配显示名称（不区分大小写）
        for space in spaces:
            if space.get('displayName', '').lower() == space_name.lower():
                return space['name']
        
        return None
    except HttpError as e:
        print(f"列出空间时出错: {e}", file=sys.stderr)
        return None


def create_dm_space(service, user_email: str) -> Optional[str]:
    """
    创建或获取与用户的私信空间。

    参数:
        service: 已构建的 Google Chat API 服务对象
        user_email: 目标用户的电子邮件地址

    返回:
        私信空间的 ID，未能创建时返回 None

    注意:
        由于 Google Chat API 的限制，无法直接通过电子邮件创建新的私信。
        要发送私信，需要现有对话的空间 ID。可以使用 --list-spaces 发现可用的空间 ID。
    """
    try:
        # 列出现有空间以查找私信
        result = service.spaces().list(pageSize=100).execute()
        spaces = result.get('spaces', [])
        
        # 查找与该用户的现有私信
        for space in spaces:
            if space.get('type') == 'DIRECT_MESSAGE' or space.get('spaceType') == 'DIRECT_MESSAGE':
                # 检查此私信是否包含目标用户
                # 对于私信，我们可以尝试发送并查看是否成功
                # 这是一个限制 - 我们无法轻松地按电子邮件找到现有私信
                pass
        
        # 目前，我们需要私信的空间 ID
        # OAuth API 不容易支持按电子邮件创建私信
        print(f"错误: 无法直接创建与 {user_email} 的私信。", file=sys.stderr)
        print(f"要通过 OAuth 发送私信，您需要空间 ID。", file=sys.stderr)
        print(f"使用以下命令列出可用空间: --list-spaces", file=sys.stderr)
        return None
    except HttpError as e:
        print(f"错误: {e}", file=sys.stderr)
        return None


def send_message(service, space_id: str, message: str, add_emoji: bool = True) -> dict:
    """
    向指定空间发送消息。

    参数:
        service: 已构建的 Google Chat API 服务对象
        space_id: 目标空间的 ID（格式为 spaces/xxx）
        message: 要发送的消息内容
        add_emoji: 是否添加机器人表情符号前缀（默认为 True）

    返回:
        包含发送结果的字典，success 字段表示是否成功
    """
    try:
        # 添加机器人表情符号前缀（如果启用）
        if add_emoji:
            message = f"🤖 {message}"
        
        body = {'text': message}
        result = service.spaces().messages().create(
            parent=space_id,
            body=body
        ).execute()
        return {"success": True, "response": result}
    except HttpError as e:
        return {"success": False, "error": str(e)}


def list_spaces(service):
    """
    列出所有可用的 Google Chat 空间。

    参数:
        service: 已构建的 Google Chat API 服务对象

    返回:
        布尔值，表示是否成功列出空间
    """
    try:
        result = service.spaces().list(pageSize=100).execute()
        spaces = result.get('spaces', [])
        
        print("\n=== 可用空间列表 ===\n")
        for space in spaces:
            space_type = space.get('spaceType', space.get('type', 'UNKNOWN'))
            space_id = space['name']
            
            # 对于私信，尝试获取成员信息
            if space_type == 'DIRECT_MESSAGE':
                try:
                    members_result = service.spaces().members().list(parent=space_id).execute()
                    members = members_result.get('memberships', [])
                    member_names = []
                    for member in members:
                        member_info = member.get('member', {})
                        display_name = member_info.get('displayName', 'Unknown')
                        member_names.append(display_name)
                    
                    name = f"私信: {', '.join(member_names)}"
                except:
                    name = space.get('displayName', '私信（未知参与者）')
            else:
                name = space.get('displayName', space.get('name', '未命名'))
            
            print(f"• {name}")
            print(f"  类型: {space_type}")
            print(f"  ID: {space_id}\n")
        
        return True
    except HttpError as e:
        print(f"列出空间时出错: {e}", file=sys.stderr)
        return False


def main():
    """
    主函数：解析命令行参数并执行相应的 Google Chat 操作。
    
    支持的操作:
        --space: 按显示名称发送到空间
        --space-id: 按空间 ID 发送到空间（更快）
        --dm: 向用户发送私信
        --list-spaces: 列出所有可用空间
    
    常用参数:
        --credentials: OAuth 凭据 JSON 文件路径（必需）
        --token: 令牌文件路径（必需，如果不存在将创建）
        --no-emoji: 禁用机器人表情符号前缀
    """
    parser = argparse.ArgumentParser(description='通过 OAuth 向 Google Chat 发送消息')
    parser.add_argument('--credentials', required=True, help='OAuth 凭据 JSON 文件路径')
    parser.add_argument('--token', required=True, help='令牌文件路径（如果不存在将创建）')
    
    # 互斥组：必须提供以下参数之一
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--space', help='空间的显示名称')
    group.add_argument('--space-id', help='空间 ID（格式为 spaces/...）')
    group.add_argument('--dm', help='私信目标用户的电子邮件')
    group.add_argument('--list-spaces', action='store_true', help='列出所有可用空间')
    
    parser.add_argument('message', nargs='?', help='要发送的消息内容')
    parser.add_argument('--no-emoji', action='store_true', help='不添加机器人表情符号前缀')
    
    args = parser.parse_args()
    
    # 获取 OAuth 凭据
    creds = get_credentials(args.credentials, args.token)
    service = build('chat', 'v1', credentials=creds)
    
    # 处理列出空间命令
    if args.list_spaces:
        if list_spaces(service):
            sys.exit(0)
        else:
            sys.exit(1)
    
    # 验证发送操作时是否提供了消息
    if not args.message:
        print("错误: 发送消息时必须提供消息内容", file=sys.stderr)
        sys.exit(1)
    
    # 确定目标空间 ID
    space_id = None
    if args.space_id:
        space_id = args.space_id
    elif args.space:
        space_id = find_space_by_name(service, args.space)
        if not space_id:
            print(f"错误: 未找到空间 '{args.space}'", file=sys.stderr)
            sys.exit(1)
    elif args.dm:
        space_id = create_dm_space(service, args.dm)
        if not space_id:
            print(f"错误: 无法创建与 {args.dm} 的私信", file=sys.stderr)
            sys.exit(1)
    
    # 发送消息
    result = send_message(service, space_id, args.message, add_emoji=not args.no_emoji)
    
    # 输出结果
    if result["success"]:
        print(json.dumps(result["response"], indent=2))
    else:
        print(f"错误: {result['error']}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
