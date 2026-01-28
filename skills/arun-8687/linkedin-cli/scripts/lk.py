#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
LinkedIn 命令行工具 (lk)

此脚本提供命令行界面来与 LinkedIn 交互，包括：
- 查看当前用户个人资料
- 搜索 LinkedIn 用户
- 查看个人资料详情
- 检查消息对话
- 汇总动态 Feed

依赖：
    linkedin-api - LinkedIn API 的 Python 封装库

使用前请设置以下环境变量：
    LINKEDIN_LI_AT - LinkedIn 会话 Cookie
    LINKEDIN_JSESSIONID - LinkedIn 会话 ID

作者：Fido 🐶
"""

import os
import sys
import argparse
import json
from linkedin_api import Linkedin
from requests.cookies import RequestsCookieJar

# ============================================================================
# ANSI 颜色常量定义
# 用于终端输出的彩色格式化
# ============================================================================

BOLD = "\033[1m"      # 粗体
RESET = "\033[0m"     # 重置格式
BLUE = "\033[94m"     # 蓝色
GREEN = "\033[92m"    # 绿色


# ============================================================================
# API 初始化函数
# ============================================================================

def get_api():
    """
    初始化并返回 LinkedIn API 实例
    
    从环境变量读取会话 Cookie，创建带有 Cookie 的 LinkedIn API 实例
    
    返回:
        Linkedin: 已配置的 LinkedIn API 实例
    
    异常:
        SystemExit: 如果缺少必要的环境变量
    """
    # 从环境变量获取 LinkedIn 会话 Cookie
    li_at = os.environ.get("LINKEDIN_LI_AT")
    jsessionid = os.environ.get("LINKEDIN_JSESSIONID")
    
    # 验证环境变量是否设置
    if not li_at or not jsessionid:
        print("错误: LINKEDIN_LI_AT 和 LINKEDIN_JSESSIONID 环境变量未设置。")
        sys.exit(1)
    
    # 创建 Cookie Jar 并设置 LinkedIn 域的 Cookie
    jar = RequestsCookieJar()
    jar.set("li_at", li_at, domain=".www.linkedin.com")
    jar.set("JSESSIONID", jsessionid, domain=".www.linkedin.com")
    
    # 创建 LinkedIn API 实例（使用 Cookie 认证，不需要账号密码）
    return Linkedin("", "", cookies=jar)


# ============================================================================
# 用户相关功能函数
# ============================================================================

def whoami(api):
    """
    显示当前登录用户的个人资料信息
    
    参数:
        api: LinkedIn API 实例
    """
    # 获取用户个人资料
    profile = api.get_user_profile()
    
    # 提取并格式化个人资料信息
    name = f"{profile.get('firstName', '')} {profile.get('lastName', '')}".strip()
    headline = profile.get('headline', profile.get('miniProfile', {}).get('occupation', '无简介'))
    location = profile.get('locationName', '未知')
    
    # 打印个人资料（使用颜色格式化）
    print(f"{BOLD}{name}{RESET}")
    print(f"{BLUE}{headline}{RESET}")
    print(f"📍 {location}")


def search(api, query):
    """
    按关键词搜索 LinkedIn 用户
    
    参数:
        api: LinkedIn API 实例
        query: 搜索关键词
    """
    # 执行人员搜索
    results = api.search_people(keywords=query, limit=10)
    
    # 打印搜索结果
    print(f"搜索 '{BOLD}{query}{RESET}' 的结果:")
    for res in results:
        name = res.get('name', '未知')
        job = res.get('jobtitle', '无职位')
        urn = res.get('urn_id', '无URN')
        print(f"- {BOLD}{name}{RESET} ({urn})")
        print(f"  {job}")


def view_profile(api, public_id):
    """
    查看指定用户的详细个人资料
    
    参数:
        api: LinkedIn API 实例
        public_id: 用户的公开 ID 或 URN
    """
    # 获取用户个人资料
    profile = api.get_profile(public_id)
    
    # 提取基本信息
    name = f"{profile.get('firstName', '')} {profile.get('lastName', '')}"
    headline = profile.get('headline', '无简介')
    summary = profile.get('summary', '未提供摘要。')
    
    # 打印基本信息
    print(f"{BOLD}{name}{RESET}")
    print(f"{BLUE}{headline}{RESET}")
    print("-" * 20)
    print(summary)
    
    # 打印工作经历（最多3条）
    print(f"\n{BOLD}工作经历:{RESET}")
    for exp in profile.get('experience', [])[:3]:
        company = exp.get('companyName', '未知公司')
        title = exp.get('title', '未知职位')
        print(f"• {BOLD}{title}{RESET} 于 {company}")


# ============================================================================
# 消息和动态功能函数
# ============================================================================

def check_messages(api):
    """
    检查最近的私信对话
    
    参数:
        api: LinkedIn API 实例
    """
    # 获取对话列表
    conversations = api.get_conversations()
    
    # 打印最近的对话（最多5条）
    print(f"{BOLD}最近的对话:{RESET}")
    for conv in conversations.get('elements', [])[:5]:
        # 提取对话参与者
        participants = ", ".join([p.get('firstName', '未知') for p in conv.get('participants', [])])
        
        # 提取最新消息内容
        events = conv.get('events', [{}])
        snippet = "无预览"
        if events:
             content = events[0].get('eventContent', {})
             msg_event = content.get('com.linkedin.voyager.messaging.event.MessageEvent', {})
             snippet = msg_event.get('body', '无预览')
        
        # 打印对话信息
        print(f"• {BOLD}{participants}{RESET}")
        print(f"  {snippet[:100]}...")


def feed(api, count=10):
    """
    汇总 LinkedIn 动态 Feed
    
    参数:
        api: LinkedIn API 实例
        count: 要获取的动态数量（默认10）
    """
    # 获取动态帖子
    posts = api.get_feed_posts(limit=count)
    
    # 打印动态列表
    print(f"{BOLD}LinkedIn 动态 (前 {count} 条):{RESET}")
    for post in posts:
        author = post.get('author_name', '未知')
        time = post.get('old', '最近').strip()
        content = post.get('content', '无内容').replace('\n', ' ')
        print(f"• {BOLD}{author}{RESET} ({time}): {content[:200]}...")


# ============================================================================
# 主程序入口
# ============================================================================

def main():
    """
    主函数：解析命令行参数并调用相应的功能函数
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="lk - LinkedIn 命令行工具")
    
    # 添加子命令解析器
    subparsers = parser.add_subparsers(dest="command")
    
    # whoami 子命令：显示当前用户信息
    subparsers.add_parser("whoami", help="显示当前用户个人资料")
    
    # search 子命令：搜索用户
    search_parser = subparsers.add_parser("search", help="搜索用户")
    search_parser.add_argument("query", help="搜索关键词")
    
    # profile 子命令：查看个人资料
    profile_parser = subparsers.add_parser("profile", help="查看个人资料详情")
    profile_parser.add_argument("public_id", help="公开 ID 或 URN")
    
    # messages 子命令：检查消息
    subparsers.add_parser("messages", help="检查最近的消息")
    
    # feed 子命令：汇总动态
    feed_parser = subparsers.add_parser("feed", help="汇总时间线动态")
    feed_parser.add_argument("-n", "--count", type=int, default=10, help="要获取的动态数量")
    
    # check 子命令：快速状态检查
    subparsers.add_parser("check", help="快速状态检查")
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 如果没有提供子命令，打印帮助信息
    if not args.command:
        parser.print_help()
        return
    
    # 初始化 LinkedIn API
    api = get_api()
    
    try:
        # 根据子命令调用相应功能
        if args.command == "whoami":
            whoami(api)
        elif args.command == "search":
            search(api, args.query)
        elif args.command == "profile":
            view_profile(api, args.public_id)
        elif args.command == "messages":
            check_messages(api)
        elif args.command == "feed":
            feed(api, args.count)
        elif args.command == "check":
            whoami(api)
            print("-" * 10)
            check_messages(api)
    except Exception as e:
        print(f"{BOLD}LinkedIn 错误:{RESET} {e}")


# ============================================================================
# 程序入口点
# ============================================================================

if __name__ == "__main__":
    main()
