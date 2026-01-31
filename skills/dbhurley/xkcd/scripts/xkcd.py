#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
xkcd 漫画获取器 - 获取最新、随机、特定编号的漫画，或搜索漫画。

功能支持：
- 获取最新发布的 xkcd 漫画
- 获取随机编号的 xkcd 漫画
- 根据漫画编号获取特定漫画
- 按关键词搜索 xkcd 漫画（支持标题和 alt 文本搜索）
- 支持 Markdown 和 JSON 两种输出格式
"""

import argparse
import json
import random
import sys
from datetime import date

import httpx

# xkcd API 基础 URL
BASE_URL = "https://xkcd.com"
# HTTP 请求超时时间（秒）
TIMEOUT = 10


def fetch_comic(num: int | None = None) -> dict:
    """
    获取指定编号的漫画，如果未指定编号则获取最新漫画。
    
    参数:
        num: 漫画编号，为 None 时获取最新漫画
        
    返回:
        包含漫画信息的字典，包括编号、标题、alt 文本、图片 URL、完整链接和日期
    """
    if num:
        # 获取特定编号的漫画
        url = f"{BASE_URL}/{num}/info.0.json"
    else:
        # 获取最新漫画
        url = f"{BASE_URL}/info.0.json"
    
    # 发送 HTTP GET 请求，设置超时并跟随重定向
    resp = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()
    
    # 格式化返回数据
    return {
        "num": data["num"],
        "title": data["title"],
        "alt": data["alt"],
        "img": data["img"],
        "url": f"{BASE_URL}/{data['num']}/",
        "date": f"{data['year']}-{data['month'].zfill(2)}-{data['day'].zfill(2)}",
    }


def fetch_random() -> dict:
    """
    获取随机编号的 xkcd 漫画。
    
    特殊处理：跳过第 404 号漫画（作为网络幽默，这个编号不存在）
    
    返回:
        随机漫画的信息字典
    """
    # 首先获取最新漫画以确定编号范围
    latest = fetch_comic()
    max_num = latest["num"]
    
    # 随机选择一个编号（跳过 #404）
    num = random.randint(1, max_num)
    while num == 404:
        num = random.randint(1, max_num)
    return fetch_comic(num)


def search_comics(query: str, limit: int = 5) -> list[dict]:
    """
    按关键词在漫画标题和 alt 文本中搜索漫画。
    使用并发请求快速搜索最近 200 期漫画。
    
    参数:
        query: 搜索关键词
        limit: 返回结果数量限制，默认为 5
        
    返回:
        匹配的漫画列表，按漫画编号降序排列
    """
    import concurrent.futures
    
    # 将搜索词转为小写用于不区分大小写的匹配
    query_lower = query.lower()
    latest = fetch_comic()
    max_num = latest["num"]
    
    def check_comic(num: int) -> dict | None:
        """检查单个漫画是否匹配搜索词。"""
        if num == 404:
            return None
        try:
            comic = fetch_comic(num)
            if query_lower in comic["title"].lower() or query_lower in comic["alt"].lower():
                return comic
        except Exception:
            pass
        return None
    
    results = []
    # 搜索最近 200 期漫画
    search_range = list(range(max_num, max(1, max_num - 200), -1))
    
    # 使用线程池并发请求，设置 20 个工作线程
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(check_comic, num): num for num in search_range}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                results.append(result)
                # 达到结果数量限制后停止搜索
                if len(results) >= limit:
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
    
    # 按漫画编号降序排列
    results.sort(key=lambda x: x["num"], reverse=True)
    return results[:limit]


def format_markdown(comic: dict) -> str:
    """
    将漫画信息格式化为 Markdown 字符串。
    
    参数:
        comic: 包含漫画信息的字典
        
    返回:
        格式化的 Markdown 字符串，包含标题、图片、alt 文本和链接
    """
    return f"""**xkcd #{comic['num']}: {comic['title']}**

![{comic['title']}]({comic['img']})

> {comic['alt']}

🔗 {comic['url']}"""


def main():
    """
    主函数：解析命令行参数并执行相应的漫画获取操作。
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="获取 xkcd 漫画 / Fetch xkcd comics")
    
    # 漫画编号参数（可选）
    parser.add_argument("number", nargs="?", type=int, help="漫画编号（省略则获取最新漫画）")
    
    # 随机模式参数
    parser.add_argument("--random", "-r", action="store_true", help="获取随机漫画")
    
    # 搜索参数
    parser.add_argument("--search", "-s", type=str, help="按关键词搜索漫画")
    
    # 搜索结果数量限制
    parser.add_argument("--limit", "-l", type=int, default=5, help="最大搜索结果数量")
    
    # 输出格式参数
    parser.add_argument("--format", "-f", choices=["markdown", "json"], default="markdown", help="输出格式（markdown 或 json）")
    
    args = parser.parse_args()
    
    try:
        if args.search:
            # 搜索模式
            comics = search_comics(args.search, args.limit)
            if not comics:
                print(f"未找到匹配的漫画 '{args.search}'", file=sys.stderr)
                sys.exit(1)
            if args.format == "json":
                print(json.dumps(comics, indent=2))
            else:
                for comic in comics:
                    print(format_markdown(comic))
                    print("\n---\n")
        elif args.random:
            # 随机模式
            comic = fetch_random()
            if args.format == "json":
                print(json.dumps(comic, indent=2))
            else:
                print(format_markdown(comic))
        else:
            # 默认获取最新或指定编号的漫画
            comic = fetch_comic(args.number)
            if args.format == "json":
                print(json.dumps(comic, indent=2))
            else:
                print(format_markdown(comic))
    except httpx.HTTPStatusError as e:
        print(f"获取漫画时出错: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
