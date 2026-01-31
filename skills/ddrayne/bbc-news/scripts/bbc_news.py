#!/usr/bin/env python3
"""
BBC 新闻命令行工具 - 从 RSS 订阅获取并显示 BBC 新闻报道
"""
import argparse
import sys
from datetime import datetime

try:
    import feedparser
except ImportError:
    print("错误: 未找到 feedparser 库。请安装: pip install feedparser", file=sys.stderr)
    sys.exit(1)

# BBC 新闻 RSS 订阅
FEEDS = {
    "top": "https://feeds.bbci.co.uk/news/rss.xml",
    "uk": "https://feeds.bbci.co.uk/news/uk/rss.xml",
    "world": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "business": "https://feeds.bbci.co.uk/news/business/rss.xml",
    "politics": "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "health": "https://feeds.bbci.co.uk/news/health/rss.xml",
    "education": "https://feeds.bbci.co.uk/news/education/rss.xml",
    "science": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "technology": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "entertainment": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "england": "https://feeds.bbci.co.uk/news/england/rss.xml",
    "scotland": "https://feeds.bbci.co.uk/news/scotland/rss.xml",
    "wales": "https://feeds.bbci.co.uk/news/wales/rss.xml",
    "northern-ireland": "https://feeds.bbci.co.uk/news/northern_ireland/rss.xml",
    "africa": "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "asia": "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    "australia": "https://feeds.bbci.co.uk/news/world/australia/rss.xml",
    "europe": "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    "latin-america": "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "middle-east": "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "us-canada": "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
}


def fetch_news(section="top", limit=10, format="text"):
    """从 RSS 订阅获取 BBC 新闻报道"""
    if section not in FEEDS:
        print(f"错误: 未知部分 '{section}'", file=sys.stderr)
        print(f"可用部分: {', '.join(sorted(FEEDS.keys()))}", file=sys.stderr)
        return 1

    feed_url = FEEDS[section]
    feed = feedparser.parse(feed_url)

    if feed.bozo:
        print(f"错误: 无法解析来自 {feed_url} 的订阅", file=sys.stderr)
        return 1

    entries = feed.entries[:limit]

    if format == "json":
        import json
        stories = []
        for entry in entries:
            stories.append({
                "title": entry.title,
                "link": entry.link,
                "description": entry.get("description", ""),
                "published": entry.get("published", ""),
            })
        print(json.dumps(stories, indent=2))
    else:
        # 文本格式
        section_title = feed.feed.get("title", f"BBC 新闻 - {section.title()}")
        print(f"\n{section_title}")
        print("=" * len(section_title))
        print()

        for i, entry in enumerate(entries, 1):
            print(f"{i}. {entry.title}")
            if hasattr(entry, "description") and entry.description:
                # 从描述中移除 HTML 标签
                import re
                desc = re.sub(r'<[^>]+>', '', entry.description)
                print(f"   {desc}")
            print(f"   🔗 {entry.link}")
            if hasattr(entry, "published"):
                print(f"   📅 {entry.published}")
            print()

    return 0


def list_sections():
    """列出所有可用部分"""
    print("\n可用的 BBC 新闻部分:")
    print("=" * 40)
    print("\n主要部分:")
    main = ["top", "uk", "world", "business", "politics", "health", 
            "education", "science", "technology", "entertainment"]
    for section in main:
        if section in FEEDS:
            print(f"  • {section}")
    
    print("\n英国地区:")
    regional = ["england", "scotland", "wales", "northern-ireland"]
    for section in regional:
        if section in FEEDS:
            print(f"  • {section}")
    
    print("\n世界地区:")
    world = ["africa", "asia", "australia", "europe", 
             "latin-america", "middle-east", "us-canada"]
    for section in world:
        if section in FEEDS:
            print(f"  • {section}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="从 RSS 订阅获取 BBC 新闻报道",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                          # 头条新闻（默认）
  %(prog)s uk                       # 英国新闻
  %(prog)s world --limit 5          # 世界前 5 条新闻
  %(prog)s technology --json        # 技术新闻（JSON 格式）
  %(prog)s --list                   # 列出所有可用部分
        """
    )
    parser.add_argument(
        "section",
        nargs="?",
        default="top",
        help="新闻部分（默认: top）"
    )
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=10,
        help="要获取的新闻数量（默认: 10）"
    )
    parser.add_argument(
        "-f", "--format",
        choices=["text", "json"],
        default="text",
        help="输出格式（默认: text）"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="列出所有可用部分"
    )

    args = parser.parse_args()

    if args.list:
        list_sections()
        return 0

    return fetch_news(args.section, args.limit, args.format)


if __name__ == "__main__":
    sys.exit(main())
