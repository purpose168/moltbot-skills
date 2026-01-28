#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "rich"]
# ///
"""
SearXNG 命令行工具 - 通过本地实例进行尊重隐私的元搜索。

此脚本提供命令行界面，用于与本地 SearXNG 实例交互。
支持多种搜索类别、时间范围过滤和格式化输出。
"""

import argparse
import os
import sys
import json
import warnings
import httpx
from rich.console import Console
from rich.table import Table
from rich import print as rprint
from urllib.parse import urlencode

# 抑制本地自签名证书的SSL警告
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

# 创建控制台对象用于富文本输出
console = Console()

# 从环境变量获取SearXNG实例URL，默认为本地地址
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://localhost:8080")


def search_searxng(
    query: str,
    limit: int = 10,
    category: str = "general",
    language: str = "auto",
    time_range: str = None,
    output_format: str = "table"
) -> dict:
    """
    使用SearXNG实例进行搜索。
    
    参数:
        query: 搜索查询字符串
        limit: 返回结果数量
        category: 搜索类别（general、images、news、videos等）
        language: 语言代码（auto、en、de、fr等）
        time_range: 时间范围筛选（day、week、month、year）
        output_format: 输出格式（table、json）
    
    返回:
        包含搜索结果的字典
    """
    # 构建搜索参数
    params = {
        "q": query,
        "format": "json",
        "categories": category,
    }
    
    # 如果指定了语言，添加到参数
    if language != "auto":
        params["language"] = language
    
    # 如果指定了时间范围，添加到参数
    if time_range:
        params["time_range"] = time_range
    
    try:
        # 禁用SSL验证以支持本地自签名证书
        response = httpx.get(
            f"{SEARXNG_URL}/search",
            params=params,
            timeout=30,
            verify=False  # 用于本地自签名证书
        )
        response.raise_for_status()
        
        data = response.json()
        
        # 限制结果数量
        if "results" in data:
            data["results"] = data["results"][:limit]
        
        return data
        
    except httpx.HTTPError as e:
        console.print(f"[red]连接SearXNG出错:[/red] {e}", file=sys.stderr)
        return {"error": str(e), "results": []}
    except Exception as e:
        console.print(f"[red]意外错误:[/red] {e}", file=sys.stderr)
        return {"error": str(e), "results": []}


def display_results_table(data: dict, query: str):
    """在富表格中显示搜索结果。"""
    results = data.get("results", [])
    
    if not results:
        rprint(f"[yellow]未找到查询结果:[/yellow] {query}")
        return
    
    # 创建结果表格
    table = Table(title=f"SearXNG 搜索: {query}", show_lines=False)
    table.add_column("#", style="dim", width=3)
    table.add_column("标题", style="bold")
    table.add_column("URL", style="blue", width=50)
    table.add_column("引擎", style="green", width=20)
    
    for i, result in enumerate(results, 1):
        title = result.get("title", "无标题")[:70]
        url = result.get("url", "")[:45] + "..."
        engines = ", ".join(result.get("engines", []))[:18]
        
        table.add_row(
            str(i),
            title,
            url,
            engines
        )
    
    console.print(table)
    
    # 显示额外信息
    if data.get("number_of_results"):
        rprint(f"\n[dim]可用结果总数: {data['number_of_results']}[/dim]")
    
    # 显示前3个结果的内容片段
    rprint("\n[bold]最佳结果:[/bold]")
    for i, result in enumerate(results[:3], 1):
        title = result.get("title", "无标题")
        url = result.get("url", "")
        content = result.get("content", "")[:200]
        
        rprint(f"\n[bold cyan]{i}. {title}[/bold cyan]")
        rprint(f"   [blue]{url}[/blue]")
        if content:
            rprint(f"   [dim]{content}...[/dim]")


def display_results_json(data: dict):
    """以JSON格式显示结果，用于程序化使用。"""
    print(json.dumps(data, indent=2))


def main():
    """主函数，解析命令行参数并执行搜索。"""
    parser = argparse.ArgumentParser(
        description="SearXNG CLI - 通过本地SearXNG实例搜索网络",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
示例:
  %(prog)s search "python 异步"
  %(prog)s search "气候变化" -n 20
  %(prog)s search "可爱猫咪" --category images
  %(prog)s search "突发新闻" --category news --time-range day
  %(prog)s search "rust 教程" --format json

环境变量:
  SEARXNG_URL: SearXNG实例URL（默认值: {SEARXNG_URL})
        """
    )
    
    # 添加子命令解析器
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # 搜索命令
    search_parser = subparsers.add_parser("search", help="搜索网络")
    search_parser.add_argument("query", nargs="+", help="搜索查询")
    search_parser.add_argument(
        "-n", "--limit",
        type=int,
        default=10,
        help="结果数量（默认值: 10）"
    )
    search_parser.add_argument(
        "-c", "--category",
        default="general",
        choices=["general", "images", "videos", "news", "map", "music", "files", "it", "science"],
        help="搜索类别（默认值: general）"
    )
    search_parser.add_argument(
        "-l", "--language",
        default="auto",
        help="语言代码（auto、en、de、fr等）"
    )
    search_parser.add_argument(
        "-t", "--time-range",
        choices=["day", "week", "month", "year"],
        help="时间范围筛选"
    )
    search_parser.add_argument(
        "-f", "--format",
        choices=["table", "json"],
        default="table",
        help="输出格式（默认值: table）"
    )
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 如果没有指定命令，打印帮助信息
    if not args.command:
        parser.print_help()
        return
    
    # 处理搜索命令
    if args.command == "search":
        query = " ".join(args.query)
        
        data = search_searxng(
            query=query,
            limit=args.limit,
            category=args.category,
            language=args.language,
            time_range=args.time_range,
            output_format=args.format
        )
        
        if args.format == "json":
            display_results_json(data)
        else:
            display_results_table(data, query)


if __name__ == "__main__":
    main()