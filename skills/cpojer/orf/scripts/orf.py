#!/usr/bin/env python3
"""
ORF 新闻 RSS 获取器
获取奥地利 ORF 新闻，排除体育内容，按政治重要性排序
"""

import argparse
import datetime as dt
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET


FEEDS = {
    # ORF 提供 RSS 订阅源；请参阅 https://rss.orf.at/
    # 我们将合并它们并按链接去重
    "news": "https://rss.orf.at/news.xml",
    "oesterreich": "https://rss.orf.at/oesterreich.xml",
    "sport": "https://rss.orf.at/sport.xml",
}

# 体育关键词列表，用于检测体育新闻
SPORT_HINTS = [
    "sport",
    "bundesliga",
    "champions league",
    "europa league",
    "ski",
    "skifahren",
    "tennis",
    "fußball",
    "fussball",
    "formel 1",
    "nba",
    "nfl",
]


def fetch(url: str) -> bytes:
    """从 URL 获取 RSS 内容"""
    req = urllib.request.Request(
        url,
        headers={
            "accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
            "user-agent": "clawdbot-orf-digest/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_rss(xml_bytes: bytes) -> list[dict]:
    """解析 RSS XML 并提取新闻项目"""
    root = ET.fromstring(xml_bytes)
    items: list[dict] = []

    # ORF 使用 RSS 1.0 (RDF) 命名空间
    # 我们通过扫描名为 "item" 的元素来避免硬编码完整的命名空间 URI
    for el in root.iter():
        if not str(el.tag).endswith("item"):
            continue

        def find_text(name_suffix: str) -> str:
            for child in list(el):
                if str(child.tag).endswith(name_suffix) and child.text:
                    return child.text.strip()
            return ""

        title = find_text("title")
        link = find_text("link")
        pub_date = find_text("pubDate") or find_text("date")

        if title and link:
            items.append({"title": title, "link": link, "pubDate": pub_date})

    return items


def parse_date(dt_str: str):
    """解析日期字符串为 datetime 对象"""
    if not dt_str:
        return None

    # RFC2822 (RSS 2.0)
    try:
        return dt.datetime.strptime(dt_str, "%a, %d %b %Y %H:%M:%S %z")
    except Exception:
        pass

    # ISO8601 (ORF RSS 1.0 使用 dc:date)
    try:
        # 例如: 2026-01-14T12:03:32+01:00
        return dt.datetime.fromisoformat(dt_str)
    except Exception:
        return None


def age_text(published, now: dt.datetime) -> str:
    """将发布时间转换为相对时间文本"""
    if published is None:
        return ""

    delta = now - published.astimezone(now.tzinfo)
    seconds = max(0, int(delta.total_seconds()))

    if seconds < 60:
        return "刚刚"

    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}分钟前"

    hours = minutes // 60
    if hours < 48:
        return f"{hours}小时前"

    days = hours // 24
    return f"{days}天前"


def is_sportish(title: str, link: str) -> bool:
    """检测是否为体育新闻"""
    t = (title or "").lower()
    l = (link or "").lower()
    if "/sport" in l:
        return True
    return any(h in t for h in SPORT_HINTS)


def score_item(title: str, focus: str) -> int:
    """根据内容相关性为新闻项目评分"""
    import re

    t = (title or "").lower()
    score = 0

    def has(patterns: list[str]) -> bool:
        return any(re.search(p, t) for p in patterns)

    # 默认：政治 + 重大新闻
    politics = [
        r"\bregierung\b",
        r"\bparlament\b",
        r"\bkanzler\b",
        r"\bminister(in)?\b",
        r"\bwahl(en)?\b",
        r"\bkoalition\b",
        r"\bbudget\b",
        r"\bspö\b",
        r"\bövp\b",
        r"\bfpo\b|\bfpö\b",
        r"\bneos\b",
        r"\bgrüne\b|\bgruene\b",
    ]

    international = [
        r"\bukraine\b",
        r"\bruss\w*",
        r"\bisrael\b",
        r"\bgaza\b",
        r"\bchina\b",
        r"\busa\b|\bvereinigte(n)? staaten\b",
        r"\beu\b|\beuropa\b|\bbrüssel\b|\bbruessel\b",
        r"\bnato\b",
        r"\bkrieg\b",
    ]

    if has(politics) or has(international):
        score += 5

    # 根据关注点轻微提升分数
    if focus == "inland" and has([r"\bösterreich\b|\boesterreich\b", r"\bwien\b", r"\bparlament\b", r"\bregierung\b"]):
        score += 3
    if focus == "ausland" and has(international):
        score += 3

    return score


def main() -> int:
    """主函数：获取并处理 ORF 新闻"""
    ap = argparse.ArgumentParser(description="获取 ORF RSS 项目（德语），排除体育，按政治重要性排序。")
    ap.add_argument("--count", type=int, default=5, help="返回的项目数量（默认: 5）")
    ap.add_argument("--focus", choices=["auto", "inland", "ausland"], default="auto", help="关注区域：国内(inland)、国外(ausland)或自动(auto)")
    ap.add_argument("--format", choices=["json", "text"], default="json", help="输出格式")
    args = ap.parse_args()

    count = max(1, min(int(args.count), 15))
    focus = args.focus

    now = dt.datetime.now(dt.timezone.utc)

    # 合并订阅源；始终排除体育订阅源
    # 始终包含 news；仅当用户明确关注国内时才包含区域奥地利订阅源
    feed_urls = [FEEDS["news"]] + ([FEEDS["oesterreich"]] if focus == "inland" else [])

    merged: list[dict] = []
    for url in feed_urls:
        merged.extend(parse_rss(fetch(url)))

    seen: set[str] = set()
    items: list[dict] = []

    for it in merged:
        link = it.get("link") or ""
        if not link or link in seen:
            continue
        seen.add(link)

        title = it.get("title") or ""
        if is_sportish(title, link):
            continue

        published = parse_date(it.get("pubDate") or "")
        items.append(
            {
                "title": title,
                "link": link,
                "published": published.isoformat() if published else None,
                "age": age_text(published, now),
                "score": score_item(title, "inland" if focus == "inland" else "ausland" if focus == "ausland" else "auto"),
            }
        )

    # 优先高分；平局时按时间顺序
    def sort_key(it: dict):
        published = it.get("published") or ""
        return (it.get("score", 0), published)

    ranked = sorted(items, key=sort_key, reverse=True)[:count]

    if args.format == "text":
        for it in ranked:
            sys.stdout.write(f"{it['title']}\n{it.get('age','')}\n{it['link']}\n\n")
        return 0

    sys.stdout.write(json.dumps({"items": ranked}, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
