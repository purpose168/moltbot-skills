#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""内容评级 CLI - Kids-In-Mind 风格的电影/电视内容评级工具。

提供详细的内容分类：性/裸露、暴力/血腥、语言
采用 0-10 分制，还包括物质使用、讨论话题和核心信息。
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urljoin
from urllib.request import Request, urlopen

# 数据目录
DATA_DIR = Path(os.environ.get("CONTENT_ADVISORY_DATA_DIR", Path.home() / ".clawdbot" / "content-advisory"))
CACHE_FILE = DATA_DIR / "cache.json"

# Kids-In-Mind 基础 URL
KIM_BASE = "https://kids-in-mind.com"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


@dataclass
class ContentRating:
    """内容评级数据类"""
    title: str  # 电影或电视节目标题
    year: str = ""  # 发行年份
    mpaa: str = ""  # MPAA 评级
    sex_nudity: int = 0  # 性/裸露评级 (0-10)
    violence_gore: int = 0  # 暴力/血腥评级 (0-10)
    language: int = 0  # 语言评级 (0-10)
    sex_nudity_detail: str = ""  # 性/裸露详细描述
    violence_gore_detail: str = ""  # 暴力/血腥详细描述
    language_detail: str = ""  # 语言详细描述
    substance_use: str = ""  # 物质使用描述
    discussion_topics: str = ""  # 讨论话题
    message: str = ""  # 核心信息
    url: str = ""  # 评级来源 URL
    cached_at: str = ""  # 缓存时间
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: dict) -> "ContentRating":
        """从字典创建实例"""
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class SearchResult:
    """搜索结果数据类"""
    title: str  # 标题
    year: str  # 年份
    url: str  # 详情 URL
    ratings: str = ""  # 评级字符串，例如 "3.5.4"
    mpaa: str = ""  # MPAA 评级
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return asdict(self)


def load_cache() -> dict[str, ContentRating]:
    """从 JSON 文件加载缓存"""
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE) as f:
            data = json.load(f)
            return {k: ContentRating.from_dict(v) for k, v in data.items()}
    except (json.JSONDecodeError, KeyError):
        return {}


def save_cache(cache: dict[str, ContentRating]) -> None:
    """将缓存保存到 JSON 文件"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump({k: v.to_dict() for k, v in cache.items()}, f, indent=2)


def fetch_url(url: str) -> str:
    """获取 URL 内容作为字符串"""
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    )
    try:
        with urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.reason}") from e
    except URLError as e:
        raise RuntimeError(f"URL 错误: {e.reason}") from e


def clean_html(text: str) -> str:
    """移除 HTML 标签并解码实体"""
    # 移除脚本/样式内容
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # 移除标签
    text = re.sub(r"<[^>]+>", " ", text)
    # 解码实体
    text = html.unescape(text)
    # 规范化空白
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_section_by_id(html_content: str, section_id: str) -> str:
    """从具有特定 ID 的部分提取文本"""
    # 查找具有 id 的部分，然后获取内容直到下一个 h2 或部分结束
    pattern = rf'id="{section_id}"[^>]*>([^<]*)</h2>\s*</div>\s*</div>\s*<div[^>]*>\s*<div[^>]*>(.*?)</div>'
    match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
    if match:
        content = match.group(2)
        return clean_html(content)[:600]
    
    # 备选方案：更简单的模式
    pattern2 = rf'id="{section_id}"[^>]*>.*?</h2>.*?<p[^>]*>(.*?)</p>'
    match2 = re.search(pattern2, html_content, re.DOTALL | re.IGNORECASE)
    if match2:
        return clean_html(match2.group(1))[:600]
    
    return ""


def parse_kim_page(html_content: str, url: str) -> ContentRating:
    """解析 Kids-In-Mind 评论页面"""
    rating = ContentRating(title="", url=url, cached_at=datetime.now().isoformat())
    
    # 从标题提取："Title [Year] [MPAA] - X.Y.Z | Parents' Guide..."
    title_match = re.search(r"<title>([^<]+)</title>", html_content, re.IGNORECASE)
    if title_match:
        title_text = html.unescape(title_match.group(1))
        
        # 解析："Greenland 2: Migration [2026] [PG-13] - 1.6.4 | Parents' Guide..."
        main_match = re.match(r"(.+?)\s*\[(\d{4})\]\s*\[([^\]]+)\]\s*-\s*(\d+)\.(\d+)\.(\d+)", title_text)
        if main_match:
            rating.title = main_match.group(1).strip()
            rating.year = main_match.group(2)
            rating.mpaa = main_match.group(3)
            rating.sex_nudity = int(main_match.group(4))
            rating.violence_gore = int(main_match.group(5))
            rating.language = int(main_match.group(6))
        else:
            # 尝试更简单的模式：只获取 | 或 [ 之前的标题
            simple = re.match(r"(.+?)(?:\s*[\|\[]|$)", title_text)
            if simple:
                rating.title = simple.group(1).strip()
    
    # 使用 ID 提取部分详情
    rating.sex_nudity_detail = extract_section_by_id(html_content, "sex")
    rating.violence_gore_detail = extract_section_by_id(html_content, "violence")
    rating.language_detail = extract_section_by_id(html_content, "language")
    
    # 提取物质使用部分
    substance_match = re.search(r'id="substance"[^>]*>.*?SUBSTANCE[^<]*</h2>.*?<p[^>]*>(.*?)</p>', html_content, re.DOTALL | re.IGNORECASE)
    if substance_match:
        rating.substance_use = clean_html(substance_match.group(1))[:400]
    
    # 提取讨论话题
    topics_match = re.search(r'id="discussion"[^>]*>.*?DISCUSSION[^<]*</h2>.*?<p[^>]*>(.*?)</p>', html_content, re.DOTALL | re.IGNORECASE)
    if topics_match:
        rating.discussion_topics = clean_html(topics_match.group(1))[:400]
    
    # 提取核心信息
    message_match = re.search(r'id="message"[^>]*>.*?MESSAGE[^<]*</h2>.*?<p[^>]*>(.*?)</p>', html_content, re.DOTALL | re.IGNORECASE)
    if message_match:
        rating.message = clean_html(message_match.group(1))[:400]
    
    return rating


def search_kim_from_homepage(query: str, limit: int = 10) -> list[SearchResult]:
    """通过抓取 Kids-In-Mind 主页和字母索引页面搜索电影"""
    results = []
    query_lower = query.lower()
    
    # 首先尝试第一个字母的字母索引页面
    first_letter = query_lower[0] if query_lower else "a"
    index_url = f"{KIM_BASE}/{first_letter}.htm"
    
    urls_to_check = [KIM_BASE, index_url]
    seen_urls = set()
    
    for base_url in urls_to_check:
        try:
            html_content = fetch_url(base_url)
            
            # 查找所有电影链接
            link_pattern = r'href="(/[a-z]/[^"]+\.htm)"[^>]*>([^<]+)'
            for match in re.finditer(link_pattern, html_content, re.IGNORECASE):
                url_path = match.group(1)
                link_text = clean_html(match.group(2))
                
                # 跳过非电影页面
                if any(skip in url_path.lower() for skip in ["/about", "/contact", "/donate", "/terms", "/search"]):
                    continue
                
                full_url = urljoin(KIM_BASE, url_path)
                if full_url in seen_urls:
                    continue
                seen_urls.add(full_url)
                
                # 检查查询是否匹配
                if query_lower in link_text.lower():
                    # 尝试从链接文本或 URL 中提取年份和评级
                    year = ""
                    mpaa = ""
                    ratings = ""
                    
                    year_match = re.search(r"\[(\d{4})\]", link_text)
                    if year_match:
                        year = year_match.group(1)
                    
                    mpaa_match = re.search(r"\[(G|PG|PG-13|R|NC-17|NR)\]", link_text)
                    if mpaa_match:
                        mpaa = mpaa_match.group(1)
                    
                    ratings_match = re.search(r"(\d+)\.(\d+)\.(\d+)", link_text)
                    if ratings_match:
                        ratings = f"{ratings_match.group(1)}.{ratings_match.group(2)}.{ratings_match.group(3)}"
                    
                    # 清理标题
                    title = re.sub(r"\s*\[\d{4}\].*$", "", link_text).strip()
                    
                    results.append(SearchResult(
                        title=title,
                        year=year,
                        url=full_url,
                        ratings=ratings,
                        mpaa=mpaa,
                    ))
                    
                    if len(results) >= limit:
                        return results
        except Exception as e:
            print(f"获取 {base_url} 时出错: {e}", file=sys.stderr)
            continue
    
    return results


def lookup_title(query: str, year: str | None = None) -> ContentRating | None:
    """查找标题的内容评级"""
    cache = load_cache()
    
    # 首先检查缓存
    cache_key = f"{query.lower()}:{year or ''}"
    if cache_key in cache:
        cached = cache[cache_key]
        try:
            cached_time = datetime.fromisoformat(cached.cached_at)
            if (datetime.now() - cached_time).days < 30:
                return cached
        except (ValueError, TypeError):
            pass
    
    # 搜索标题
    search_results = search_kim_from_homepage(query)
    
    if not search_results:
        return None
    
    # 找到最佳匹配
    query_lower = query.lower()
    best_match = search_results[0]
    
    for result in search_results:
        # 优先选择精确标题匹配
        if result.title.lower() == query_lower:
            best_match = result
            break
        # 优先选择匹配年份
        if year and result.year == year:
            best_match = result
            break
    
    # 获取页面
    try:
        html_content = fetch_url(best_match.url)
        rating = parse_kim_page(html_content, best_match.url)
        
        # 如果解析失败，回退到搜索结果信息
        if not rating.title:
            rating.title = best_match.title
        if not rating.year and best_match.year:
            rating.year = best_match.year
        if not rating.mpaa and best_match.mpaa:
            rating.mpaa = best_match.mpaa
        if rating.sex_nudity == 0 and best_match.ratings:
            parts = best_match.ratings.split(".")
            if len(parts) == 3:
                rating.sex_nudity = int(parts[0])
                rating.violence_gore = int(parts[1])
                rating.language = int(parts[2])
        
        # 保存到缓存
        cache[cache_key] = rating
        save_cache(cache)
        
        return rating
    except Exception as e:
        print(f"查找错误: {e}", file=sys.stderr)
        return None


def render_bar(value: int, max_val: int = 10) -> str:
    """为评级渲染可视化条形图"""
    filled = "▓" * value
    empty = "░" * (max_val - value)
    return f"{filled}{empty}"


def print_rating(rating: ContentRating, json_output: bool = False) -> None:
    """以格式化输出打印内容评级"""
    if json_output:
        print(json.dumps(rating.to_dict(), indent=2))
        return
    
    # 标题
    year_str = f" ({rating.year})" if rating.year else ""
    mpaa_str = f" | {rating.mpaa}" if rating.mpaa else ""
    print(f"\n🎬 {rating.title}{year_str}{mpaa_str}\n")
    
    # 评级条
    print("📊 内容评级")
    print(f"   性/裸露:    {rating.sex_nudity:2d} {render_bar(rating.sex_nudity)}")
    print(f"   暴力/血腥: {rating.violence_gore:2d} {render_bar(rating.violence_gore)}")
    print(f"   语言:      {rating.language:2d} {render_bar(rating.language)}")
    
    # 详情
    if rating.sex_nudity_detail or rating.violence_gore_detail or rating.language_detail:
        print("\n📋 类别详情")
        if rating.sex_nudity_detail:
            detail = rating.sex_nudity_detail[:300]
            print(f"   性/裸露: {detail}{'...' if len(rating.sex_nudity_detail) > 300 else ''}")
        if rating.violence_gore_detail:
            detail = rating.violence_gore_detail[:300]
            print(f"   暴力: {detail}{'...' if len(rating.violence_gore_detail) > 300 else ''}")
        if rating.language_detail:
            detail = rating.language_detail[:300]
            print(f"   语言: {detail}{'...' if len(rating.language_detail) > 300 else ''}")
    
    if rating.substance_use:
        print(f"\n💊 物质使用\n   {rating.substance_use[:250]}")
    
    if rating.discussion_topics:
        print(f"\n💬 讨论话题\n   {rating.discussion_topics[:250]}")
    
    if rating.message:
        print(f"\n📝 核心信息\n   {rating.message[:250]}")
    
    if rating.url:
        print(f"\n🔗 来源: {rating.url}")
    
    print()


# ─────────────────────────────────────────────────────────────────────────────
# 命令
# ─────────────────────────────────────────────────────────────────────────────

def cmd_lookup(args: argparse.Namespace) -> int:
    """查找电影的内容评级"""
    rating = lookup_title(args.title, args.year)
    
    if not rating:
        print(f"❌ 无法找到 '{args.title}' 的内容评级", file=sys.stderr)
        print("   尝试不同的拼写或直接查看 kids-in-mind.com", file=sys.stderr)
        return 1
    
    print_rating(rating, args.json)
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    """搜索标题"""
    results = search_kim_from_homepage(args.query, args.limit)
    
    if not results:
        print(f"❌ 未找到 '{args.query}' 的结果", file=sys.stderr)
        return 1
    
    if args.json:
        print(json.dumps([r.to_dict() for r in results], indent=2))
        return 0
    
    print(f"🔍 '{args.query}' 的搜索结果:\n")
    for r in results:
        year_str = f" ({r.year})" if r.year else ""
        mpaa_str = f" [{r.mpaa}]" if r.mpaa else ""
        ratings_str = f" - {r.ratings}" if r.ratings else ""
        print(f"  • {r.title}{year_str}{mpaa_str}{ratings_str}")
    return 0


def cmd_clear_cache(args: argparse.Namespace) -> int:
    """清除缓存"""
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()
        print("🗑️  缓存已清除")
    else:
        print("ℹ️  缓存已经为空")
    return 0


def main() -> int:
    """主函数"""
    parser = argparse.ArgumentParser(
        description="内容评级 - Kids-In-Mind 风格的电影评级",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # lookup 命令
    p_lookup = subparsers.add_parser("lookup", help="查找电影的内容评级")
    p_lookup.add_argument("title", help="电影或节目标题")
    p_lookup.add_argument("--year", "-y", help="发行年份")
    p_lookup.add_argument("--json", action="store_true", help="JSON 输出")
    p_lookup.set_defaults(func=cmd_lookup)
    
    # search 命令
    p_search = subparsers.add_parser("search", help="搜索标题")
    p_search.add_argument("query", help="搜索查询")
    p_search.add_argument("--limit", "-n", type=int, default=10, help="最大结果数")
    p_search.add_argument("--json", action="store_true", help="JSON 输出")
    p_search.set_defaults(func=cmd_search)
    
    # clear-cache 命令
    p_clear = subparsers.add_parser("clear-cache", help="清除缓存结果")
    p_clear.set_defaults(func=cmd_clear_cache)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
