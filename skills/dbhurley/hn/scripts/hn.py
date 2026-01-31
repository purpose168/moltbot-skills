#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "rich"]
# ///
"""
Hacker News 命令行工具 - 浏览 HN 故事和评论

功能：
- 浏览热门、最新、最佳、问答、展示、工作等分类的故事
- 查看故事详情和评论
- 搜索故事

使用示例：
  # 查看前 10 个热门故事
  uv run hn.py top
  
  # 查看前 20 个最新故事
  uv run hn.py new -n 20
  
  # 查看故事详情和评论
  uv run hn.py story 12345
  
  # 搜索故事
  uv run hn.py search "AI agents"
"""

import argparse
import httpx
from rich.console import Console
from rich.table import Table
from rich import print as rprint
from html import unescape
import re

console = Console()
BASE_URL = "https://hacker-news.firebaseio.com/v0"
ALGOLIA_URL = "https://hn.algolia.com/api/v1"

def strip_html(text: str) -> str:
    """
    移除 HTML 标签并解码实体
    
    参数:
        text: 包含 HTML 的文本
        
    返回:
        清理后的文本
    """
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    return unescape(text)

def fetch_item(item_id: int) -> dict:
    """
    获取单个项目（故事、评论等）
    
    参数:
        item_id: 项目 ID
        
    返回:
        项目数据字典
    """
    r = httpx.get(f"{BASE_URL}/item/{item_id}.json", timeout=10)
    return r.json() if r.status_code == 200 else {}

def fetch_stories(endpoint: str, limit: int = 10) -> list[dict]:
    """
    从指定端点获取故事
    
    参数:
        endpoint: API 端点
        limit: 返回故事数量限制
        
    返回:
        故事列表
    """
    r = httpx.get(f"{BASE_URL}/{endpoint}.json", timeout=10)
    if r.status_code != 200:
        return []
    ids = r.json()[:limit]
    stories = []
    for i in ids:
        item = fetch_item(i)
        if item:
            stories.append(item)
    return stories

def display_stories(stories: list[dict], title: str):
    """
    以表格形式显示故事
    
    参数:
        stories: 故事列表
        title: 表格标题
    """
    table = Table(title=title, show_lines=False)
    table.add_column("#", style="dim", width=3)
    table.add_column("分数", style="green", width=5)
    table.add_column("标题", style="bold")
    table.add_column("评论", style="cyan", width=5)
    table.add_column("ID", style="dim", width=10)
    
    for i, s in enumerate(stories, 1):
        table.add_row(
            str(i),
            str(s.get('score', 0)),
            s.get('title', '无标题')[:70],
            str(s.get('descendants', 0)),
            str(s.get('id', ''))
        )
    console.print(table)

def display_story(story: dict, comment_limit: int = 10):
    """
    显示故事及其评论
    
    参数:
        story: 故事数据
        comment_limit: 评论数量限制
    """
    rprint(f"\n[bold]{story.get('title', '无标题')}[/bold]")
    rprint(f"[green]{story.get('score', 0)} 分[/green] 由 [cyan]{story.get('by', '未知')}[/cyan] 发布")
    if story.get('url'):
        rprint(f"[blue]{story.get('url')}[/blue]")
    if story.get('text'):
        rprint(f"\n{strip_html(story.get('text'))}")
    
    kids = story.get('kids', [])[:comment_limit]
    if kids:
        rprint(f"\n[bold]前 {len(kids)} 条评论:[/bold]\n")
        for kid_id in kids:
            comment = fetch_item(kid_id)
            if comment and comment.get('text'):
                author = comment.get('by', '未知')
                text = strip_html(comment.get('text', ''))[:500]
                rprint(f"[cyan]{author}[/cyan]: {text}\n")

def search_stories(query: str, limit: int = 10):
    """
    通过 Algolia 搜索 HN
    
    参数:
        query: 搜索关键词
        limit: 结果数量限制
    """
    r = httpx.get(f"{ALGOLIA_URL}/search", params={"query": query, "hitsPerPage": limit}, timeout=10)
    if r.status_code != 200:
        rprint("[red]搜索失败[/red]")
        return
    
    hits = r.json().get('hits', [])
    table = Table(title=f"搜索: {query}", show_lines=False)
    table.add_column("#", style="dim", width=3)
    table.add_column("分数", style="green", width=5)
    table.add_column("标题", style="bold")
    table.add_column("ID", style="dim", width=10)
    
    for i, h in enumerate(hits, 1):
        table.add_row(
            str(i),
            str(h.get('points', 0) or 0),
            (h.get('title') or '无标题')[:70],
            str(h.get('objectID', ''))
        )
    console.print(table)

def main():
    """
    主函数 - 处理命令行参数并执行相应操作
    """
    parser = argparse.ArgumentParser(description="Hacker News 命令行工具")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # 分类命令
    for feed in ['top', 'new', 'best', 'ask', 'show', 'jobs']:
        p = subparsers.add_parser(feed, help=f"{feed} 故事")
        p.add_argument('-n', '--limit', type=int, default=10, help='故事数量')
    
    # 故事详情命令
    story_p = subparsers.add_parser('story', help='获取故事详情')
    story_p.add_argument('id', type=int, help='故事 ID')
    story_p.add_argument('--comments', type=int, default=10, help='评论数量')
    
    # 搜索命令
    search_p = subparsers.add_parser('search', help='搜索故事')
    search_p.add_argument('query', nargs='+', help='搜索关键词')
    search_p.add_argument('-n', '--limit', type=int, default=10, help='最大结果数')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    endpoints = {
        'top': 'topstories',      # 热门故事
        'new': 'newstories',      # 最新故事
        'best': 'beststories',    # 最佳故事
        'ask': 'askstories',      # 问答 HN
        'show': 'showstories',    # 展示 HN
        'jobs': 'jobstories'      # 工作
    }
    
    if args.command in endpoints:
        stories = fetch_stories(endpoints[args.command], args.limit)
        display_stories(stories, f"HN {args.command.title()}")
    elif args.command == 'story':
        story = fetch_item(args.id)
        if story:
            display_story(story, args.comments)
        else:
            rprint("[red]故事未找到[/red]")
    elif args.command == 'search':
        search_stories(' '.join(args.query), args.limit)

if __name__ == "__main__":
    main()
