#!/usr/bin/env python3
"""
Firecrawl 网络技能 for Clawdbot。

功能：
- markdown: 将 URL 抓取为干净的 Markdown
- screenshot: 捕获网页屏幕截图
- extract: 使用 JSON 架构提取结构化数据
- search: 搜索网络
- crawl: 爬取文档站点
- map: 发现网站上的 URL
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

try:
    from firecrawl import Firecrawl
except ImportError:
    print("错误: 未安装 firecrawl。请运行: pip3 install firecrawl", file=sys.stderr)
    sys.exit(1)


def get_client():
    """
    初始化 Firecrawl 客户端。
    
    返回:
        Firecrawl: Firecrawl 客户端实例
        
    退出:
        如果环境变量未设置，则退出程序并显示错误信息
    """
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        print("错误: FIRECRAWL_API_KEY 环境变量未设置", file=sys.stderr)
        print("获取密钥的地址: https://www.firecrawl.dev/app/api-keys", file=sys.stderr)
        sys.exit(1)
    return Firecrawl(api_key=api_key)


def cmd_markdown(args):
    """
    抓取 URL 并返回 Markdown 内容。
    
    参数:
        args: 命令行参数，包含 url 和 main_only 选项
    """
    app = get_client()
    result = app.scrape(
        args.url,
        formats=["markdown"],
        only_main_content=args.main_only
    )
    if result and hasattr(result, 'markdown') and result.markdown:
        print(result.markdown)
    elif isinstance(result, dict) and "markdown" in result:
        print(result["markdown"])
    else:
        print(f"错误: 无法抓取 {args.url}", file=sys.stderr)
        print(f"结果: {result}", file=sys.stderr)
        sys.exit(1)


def cmd_screenshot(args):
    """
    截取 URL 的屏幕截图。
    
    参数:
        args: 命令行参数，包含 url 和 output 选项
    """
    app = get_client()
    result = app.scrape(
        args.url,
        formats=["screenshot"]
    )
    
    screenshot_data = None
    if hasattr(result, 'screenshot'):
        screenshot_data = result.screenshot
    elif isinstance(result, dict) and "screenshot" in result:
        screenshot_data = result["screenshot"]
    
    if not screenshot_data:
        print(f"错误: 无法截取 {args.url} 的屏幕截图", file=sys.stderr)
        sys.exit(1)
    
    # 处理 URL 响应（Firecrawl 返回托管的 URL）
    if screenshot_data.startswith("http://") or screenshot_data.startswith("https://"):
        if args.output:
            urllib.request.urlretrieve(screenshot_data, args.output)
            print(f"屏幕截图已保存到 {args.output}")
        else:
            print(f"屏幕截图 URL: {screenshot_data}")
        return
    
    # 处理 base64 数据 URI 响应（回退方案）
    if screenshot_data.startswith("data:image"):
        screenshot_data = screenshot_data.split(",", 1)[1]
    
    if args.output:
        with open(args.output, "wb") as f:
            f.write(base64.b64decode(screenshot_data))
        print(f"屏幕截图已保存到 {args.output}")
    else:
        print(f"[屏幕截图: {len(screenshot_data)} 字节 base64]")


def cmd_extract(args):
    """
    使用架构从 URL 提取结构化数据。
    
    参数:
        args: 命令行参数，包含 url、schema 和 prompt 选项
    """
    app = get_client()
    
    # 读取 JSON 架构文件
    with open(args.schema) as f:
        schema = json.load(f)
    
    # 调用提取 API
    result = app.scrape(
        args.url,
        formats=["extract"],
        extract={"schema": schema, "prompt": args.prompt} if args.prompt else {"schema": schema}
    )
    
    extract_data = None
    if hasattr(result, 'extract'):
        extract_data = result.extract
    elif isinstance(result, dict) and "extract" in result:
        extract_data = result["extract"]
    
    if extract_data:
        print(json.dumps(extract_data, indent=2))
    else:
        print(f"错误: 无法从 {args.url} 提取数据", file=sys.stderr)
        sys.exit(1)


def cmd_search(args):
    """
    搜索网络并返回结果。
    
    参数:
        args: 命令行参数，包含 query 和 limit 选项
    """
    app = get_client()
    results = app.search(args.query, limit=args.limit)
    
    # 处理不同的响应格式
    data = []
    if hasattr(results, 'data'):
        data = results.data
    elif isinstance(results, dict) and "data" in results:
        data = results["data"]
    elif isinstance(results, list):
        data = results
    
    if not data:
        print(f"未找到关于: {args.query} 的结果", file=sys.stderr)
        return
    
    for r in data:
        if hasattr(r, 'title'):
            print(f"## {r.title}")
            print(f"URL: {r.url}")
            if r.description:
                print(r.description)
            if hasattr(r, 'markdown') and r.markdown:
                print(f"\n{r.markdown[:2000]}...")
        else:
            print(f"## {r.get('title', '无标题')}")
            print(f"URL: {r.get('url', 'N/A')}")
            if r.get("description"):
                print(r["description"])
            if r.get("markdown"):
                print(f"\n{r['markdown'][:2000]}...")
        print("\n---\n")


def cmd_crawl(args):
    """
    爬取文档站点。
    
    参数:
        args: 命令行参数，包含 url、limit 和 output 选项
    """
    app = get_client()
    
    print(f"正在爬取 {args.url}（限制: {args.limit} 个页面）...", file=sys.stderr)
    
    result = app.crawl(
        args.url,
        limit=args.limit,
        scrape_options={
            "formats": ["markdown"],
            "onlyMainContent": True
        }
    )
    
    # 处理不同的响应格式
    pages = []
    if hasattr(result, 'data'):
        pages = result.data
    elif isinstance(result, dict) and "data" in result:
        pages = result["data"]
    elif isinstance(result, list):
        pages = result
    
    if not pages:
        print(f"错误: 无法爬取 {args.url}", file=sys.stderr)
        sys.exit(1)
    
    if args.output:
        # 创建输出目录
        Path(args.output).mkdir(parents=True, exist_ok=True)
        for i, page in enumerate(pages):
            # 获取元数据
            if hasattr(page, 'metadata'):
                meta = page.metadata
                url = meta.sourceURL if hasattr(meta, 'sourceURL') else str(i)
                title = meta.title if hasattr(meta, 'title') else "无标题"
            elif isinstance(page, dict):
                meta = page.get("metadata", {})
                url = meta.get("sourceURL", str(i))
                title = meta.get("title", "无标题")
            else:
                url = str(i)
                title = "无标题"
            
            # 从 URL 创建文件名
            slug = url.split("/")[-1] or f"page_{i}"
            slug = "".join(c if c.isalnum() or c in "-_" else "_" for c in slug)
            filename = f"{args.output}/{i:03d}_{slug[:50]}.md"
            
            # 获取内容
            content = page.markdown if hasattr(page, 'markdown') else page.get("markdown", "")
            
            # 写入文件
            with open(filename, "w") as f:
                f.write(f"# {title}\n\n")
                f.write(f"来源: {url}\n\n---\n\n")
                f.write(content or "")
        
        print(f"已保存 {len(pages)} 个页面到 {args.output}/")
    else:
        for page in pages:
            if hasattr(page, 'metadata'):
                title = page.metadata.title if hasattr(page.metadata, 'title') else "无标题"
                url = page.metadata.sourceURL if hasattr(page.metadata, 'sourceURL') else ""
                content = page.markdown if hasattr(page, 'markdown') else ""
            else:
                title = page.get("metadata", {}).get("title", "无标题")
                url = page.get("metadata", {}).get("sourceURL", "")
                content = page.get("markdown", "")
            
            print(f"## {title}")
            print(f"URL: {url}")
            print((content or "")[:1000])
            print("\n---\n")
        
        print(f"\n总计: 爬取了 {len(pages)} 个页面")


def cmd_map(args):
    """
    映射网站以发现 URL。
    
    参数:
        args: 命令行参数，包含 url、search 和 limit 选项
    """
    app = get_client()
    
    result = app.map(
        args.url,
        search=args.search,
        limit=args.limit
    )
    
    # 处理不同的响应格式
    links = []
    if hasattr(result, 'links'):
        links = result.links
    elif isinstance(result, dict) and "links" in result:
        links = result["links"]
    elif isinstance(result, list):
        links = result
    
    if not links:
        print(f"错误: 无法映射 {args.url}", file=sys.stderr)
        sys.exit(1)
    
    print(f"找到 {len(links)} 个 URL:\n")
    for link in links:
        print(link)


def main():
    """
    主函数：解析命令行参数并执行相应命令。
    """
    parser = argparse.ArgumentParser(
        description="Clawdbot 的 Firecrawl 网络工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  fc.py markdown "https://example.com"
  fc.py screenshot "https://example.com" -o shot.png
  fc.py search "Python 异步最佳实践"
  fc.py crawl "https://docs.astro.build" --limit 30 --output ./astro-docs
        """
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # ========== Markdown 命令 ==========
    md = subparsers.add_parser("markdown", help="获取页面为 Markdown")
    md.add_argument("url", help="要抓取的 URL")
    md.add_argument("--main-only", action="store_true", help="排除导航/页脚")
    
    # ========== 屏幕截图命令 ==========
    ss = subparsers.add_parser("screenshot", help="截取网页屏幕截图")
    ss.add_argument("url", help="要捕获的 URL")
    ss.add_argument("--output", "-o", help="保存到文件（PNG）")
    
    # ========== 提取命令 ==========
    ex = subparsers.add_parser("extract", help="提取结构化数据")
    ex.add_argument("url", help="要提取的 URL")
    ex.add_argument("--schema", required=True, help="JSON 架构文件路径")
    ex.add_argument("--prompt", help="提取指导提示")
    
    # ========== 搜索命令 ==========
    se = subparsers.add_parser("search", help="搜索网络")
    se.add_argument("query", help="搜索查询")
    se.add_argument("--limit", type=int, default=5, help="结果数量（默认: 5）")
    
    # ========== 爬取命令 ==========
    cr = subparsers.add_parser("crawl", help="爬取文档站点")
    cr.add_argument("url", help="起始 URL")
    cr.add_argument("--limit", type=int, default=50, help="最大页面数（默认: 50）")
    cr.add_argument("--output", "-o", help="保存到目录")
    
    # ========== 映射命令 ==========
    mp = subparsers.add_parser("map", help="发现网站上的 URL")
    mp.add_argument("url", help="要映射的 URL")
    mp.add_argument("--search", help="筛选包含此词的 URL")
    mp.add_argument("--limit", type=int, default=100, help="最大 URL 数量（默认: 100）")
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 命令映射表
    commands = {
        "markdown": cmd_markdown,
        "screenshot": cmd_screenshot,
        "extract": cmd_extract,
        "search": cmd_search,
        "crawl": cmd_crawl,
        "map": cmd_map,
    }
    
    # 执行对应的命令
    commands[args.command](args)


if __name__ == "__main__":
    main()
