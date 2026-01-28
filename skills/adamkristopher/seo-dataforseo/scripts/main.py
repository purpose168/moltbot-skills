"""
DataForSEO API 工具包 - 主入口点

用于关键词研究的简单接口，涵盖 YouTube、着陆页和网站页面。
所有结果都会自动保存到 /results 目录，并带有时间戳。

使用示例:
    from main import *

    # 快速关键词研究
    result = keyword_research("python 教程")

    # YouTube 特定研究
    result = youtube_keyword_research("视频编辑技巧")

    # 用于内容规划的完整分析
    result = full_keyword_analysis(["seo 工具", "关键词研究"])
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

# 将当前目录添加到导入路径
sys.path.insert(0, str(Path(__file__).parent))

# 导入所有 API 模块
from api.keywords_data import (
    get_search_volume,
    get_keywords_for_site,
    get_ad_traffic_by_keywords,
    get_keywords_for_keywords
)
from api.labs import (
    get_keyword_overview,
    get_keyword_suggestions,
    get_keyword_ideas,
    get_related_keywords,
    get_bulk_keyword_difficulty,
    get_historical_search_volume,
    get_search_intent,
    get_domain_keywords,
    get_competitors
)
from api.serp import (
    get_google_serp,
    get_youtube_serp,
    get_google_maps_serp,
    get_google_news_serp,
    get_google_images_serp,
    get_featured_snippet
)
from api.trends import (
    get_trends_explore,
    get_youtube_trends,
    get_news_trends,
    get_shopping_trends,
    compare_keyword_trends,
    get_trending_now
)
from core.storage import list_results, load_result, get_latest_result


# ============================================================================
# 高层便捷函数
# ============================================================================

def keyword_research(
    keyword: str,
    location_name: str = None,
    include_suggestions: bool = True,
    include_related: bool = True,
    include_difficulty: bool = True
) -> Dict[str, Any]:
    """
    对单个关键词进行综合关键词研究。

    执行多个 API 调用来收集：
    - 关键词概览（搜索量、CPC、竞争度、搜索意图）
    - 关键词建议（可选）
    - 相关关键词（可选）
    - 关键词难度（可选）

    参数:
        keyword: 要研究的种子关键词
        location_name: 目标位置（默认：美国）
        include_suggestions: 包含关键词建议
        include_related: 包含相关关键词
        include_difficulty: 包含难度分数

    返回:
        包含以下键的字典：overview, suggestions, related, difficulty

    示例:
        >>> result = keyword_research("python 编程")
    """
    print(f"\n🔍 正在研究关键词: {keyword}")
    results = {}

    # 始终获取概览
    print("  → 获取关键词概览...")
    results["overview"] = get_keyword_overview(
        keywords=[keyword],
        location_name=location_name
    )

    if include_suggestions:
        print("  → 获取关键词建议...")
        results["suggestions"] = get_keyword_suggestions(
            keyword=keyword,
            location_name=location_name,
            limit=50
        )

    if include_related:
        print("  → 获取相关关键词...")
        results["related"] = get_related_keywords(
            keyword=keyword,
            location_name=location_name,
            depth=2,
            limit=50
        )

    if include_difficulty:
        print("  → 获取关键词难度...")
        results["difficulty"] = get_bulk_keyword_difficulty(
            keywords=[keyword],
            location_name=location_name
        )

    print(f"✅ {keyword} 的研究完成\n")
    return results


def youtube_keyword_research(
    keyword: str,
    location_name: str = None,
    include_serp: bool = True,
    include_trends: bool = True
) -> Dict[str, Any]:
    """
    以 YouTube 为中心的关键词研究。

    收集对 YouTube 内容特别有用的数据：
    - 带搜索意图的关键词概览
    - YouTube SERP 结果（当前排名）
    - YouTube 趋势数据
    - 关键词建议

    参数:
        keyword: 要为 YouTube 研究的关键词
        location_name: 目标位置
        include_serp: 包含当前 YouTube 排名
        include_trends: 包含 YouTube 趋势数据

    返回:
        包含以下键的字典：overview, serp, trends, suggestions

    示例:
        >>> result = youtube_keyword_research("视频编辑教程")
    """
    print(f"\n🎬 YouTube 关键词研究: {keyword}")
    results = {}

    # 关键词概览
    print("  → 获取关键词概览...")
    results["overview"] = get_keyword_overview(
        keywords=[keyword],
        location_name=location_name,
        include_serp_info=True
    )

    # 关键词建议
    print("  → 获取关键词建议...")
    results["suggestions"] = get_keyword_suggestions(
        keyword=keyword,
        location_name=location_name,
        limit=50
    )

    if include_serp:
        print("  → 获取 YouTube 排名...")
        results["youtube_serp"] = get_youtube_serp(
            keyword=keyword,
            location_name=location_name,
            depth=20
        )

    if include_trends:
        print("  → 获取 YouTube 趋势...")
        results["youtube_trends"] = get_youtube_trends(
            keywords=[keyword],
            location_name=location_name
        )

    print(f"✅ {keyword} 的 YouTube 研究完成\n")
    return results


def landing_page_keyword_research(
    keywords: List[str],
    competitor_domain: str = None,
    location_name: str = None
) -> Dict[str, Any]:
    """
    用于着陆页优化的关键词研究。

    收集对着陆页 SEO 有用的数据：
    - 目标关键词的关键词概览
    - 搜索意图分类
    - 关键词难度
    - Google SERP 分析
    - 竞争对手关键词（如果提供了域名）

    参数:
        keywords: 着陆页的目标关键词
        competitor_domain: 可选的竞争对手域名进行分析
        location_name: 目标位置

    返回:
        包含着陆页关键词综合数据的字典

    示例:
        >>> result = landing_page_keyword_research(
        ...     ["最佳 crm 软件", "小型企业 crm"],
        ...     competitor_domain="hubspot.com"
        ... )
    """
    print(f"\n📄 着陆页关键词研究: {keywords}")
    results = {}

    # 关键词概览
    print("  → 获取关键词概览...")
    results["overview"] = get_keyword_overview(
        keywords=keywords,
        location_name=location_name,
        include_serp_info=True
    )

    # 搜索意图
    print("  → 获取搜索意图...")
    results["search_intent"] = get_search_intent(
        keywords=keywords,
        location_name=location_name
    )

    # 难度分数
    print("  → 获取关键词难度...")
    results["difficulty"] = get_bulk_keyword_difficulty(
        keywords=keywords,
        location_name=location_name
    )

    # 主关键词的 SERP 分析
    print("  → 获取 SERP 分析...")
    results["serp"] = get_google_serp(
        keyword=keywords[0],
        location_name=location_name
    )

    # 竞争对手分析
    if competitor_domain:
        print(f"  → 分析竞争对手: {competitor_domain}...")
        results["competitor_keywords"] = get_keywords_for_site(
            target_domain=competitor_domain,
            location_name=location_name
        )

    print(f"✅ 着陆页研究完成\n")
    return results


def full_keyword_analysis(
    keywords: List[str],
    location_name: str = None,
    include_historical: bool = True,
    include_trends: bool = True
) -> Dict[str, Any]:
    """
    用于内容策略的完整关键词分析。

    综合分析包括：
    - 关键词概览
    - 历史搜索量趋势
    - 关键词难度
    - 搜索意图
    - 关键词创意（扩展）
    - Google Trends 数据

    参数:
        keywords: 要分析的关键词
        location_name: 目标位置
        include_historical: 包含历史搜索量
        include_trends: 包含 Google Trends 数据

    返回:
        包含综合关键词分析的字典

    示例:
        >>> result = full_keyword_analysis(["ai 写作工具", "chatgpt 替代品"])
    """
    print(f"\n📊 完整关键词分析: {keywords}")
    results = {}

    print("  → 获取关键词概览...")
    results["overview"] = get_keyword_overview(
        keywords=keywords,
        location_name=location_name,
        include_serp_info=True
    )

    print("  → 获取关键词难度...")
    results["difficulty"] = get_bulk_keyword_difficulty(
        keywords=keywords,
        location_name=location_name
    )

    print("  → 获取搜索意图...")
    results["search_intent"] = get_search_intent(
        keywords=keywords,
        location_name=location_name
    )

    print("  → 获取关键词创意...")
    results["keyword_ideas"] = get_keyword_ideas(
        keywords=keywords,
        location_name=location_name,
        limit=100
    )

    if include_historical:
        print("  → 获取历史搜索量...")
        results["historical"] = get_historical_search_volume(
            keywords=keywords,
            location_name=location_name
        )

    if include_trends:
        print("  → 获取 Google Trends 数据...")
        results["trends"] = get_trends_explore(
            keywords=keywords[:5],
            location_name=location_name
        )

    print(f"✅ 完整分析完成\n")
    return results


def competitor_analysis(
    domain: str,
    keywords: List[str] = None,
    location_name: str = None
) -> Dict[str, Any]:
    """
    分析竞争对手的关键词策略。

    参数:
        domain: 要分析的竞争对手域名
        keywords: 可选的用于查找竞争对手的关键词
        location_name: 目标位置

    返回:
        包含竞争对手分析数据的字典

    示例:
        >>> result = competitor_analysis("竞争对手.com")
    """
    print(f"\n🎯 竞争对手分析: {domain}")
    results = {}

    print("  → 获取域名关键词...")
    results["domain_keywords"] = get_domain_keywords(
        target_domain=domain,
        location_name=location_name,
        limit=100
    )

    print("  → 从 Google Ads 数据获取关键词...")
    results["ads_keywords"] = get_keywords_for_site(
        target_domain=domain,
        location_name=location_name
    )

    if keywords:
        print("  → 查找其他竞争对手...")
        results["other_competitors"] = get_competitors(
            keywords=keywords,
            location_name=location_name
        )

    print(f"✅ 竞争对手分析完成\n")
    return results


def trending_topics(
    location_name: str = None
) -> Dict[str, Any]:
    """
    获取当前热门话题和搜索。

    参数:
        location_name: 目标位置

    返回:
        包含热门趋势数据的字典

    示例:
        >>> result = trending_topics()
    """
    print("\n📈 获取热门话题...")
    result = get_trending_now(location_name=location_name)
    print("✅ 热门话题已获取\n")
    return result


# ============================================================================
# 工具函数
# ============================================================================

def get_recent_results(category: str = None, limit: int = 10) -> List[Path]:
    """
    获取最近保存的结果。

    参数:
        category: 按类别筛选（keywords_data, labs, serp, trends）
        limit: 返回的最大结果数

    返回:
        结果文件路径列表
    """
    return list_results(category=category, limit=limit)


def load_latest(category: str, operation: str = None) -> Optional[Dict]:
    """
    加载某个类别/操作的最新结果。

    参数:
        category: 结果类别
        operation: 特定操作（可选）

    返回:
        加载的结果数据或 None
    """
    return get_latest_result(category=category, operation=operation)


# ============================================================================
# 快速访问 - 直接 API 函数导出
# ============================================================================

# 要直接访问各个 API 函数，请从相应模块导入：
# from api.keywords_data import get_search_volume, get_keywords_for_site
# from api.labs import get_keyword_suggestions, get_bulk_keyword_difficulty
# from api.serp import get_google_serp, get_youtube_serp
# from api.trends import get_trends_explore, get_youtube_trends


if __name__ == "__main__":
    print("""
DataForSEO API 工具包
======================

高层函数:
  - keyword_research(keyword)                    # 关键词研究
  - youtube_keyword_research(keyword)            # YouTube 关键词研究
  - landing_page_keyword_research(keywords, competitor_domain)  # 着陆页研究
  - full_keyword_analysis(keywords)              # 完整关键词分析
  - competitor_analysis(domain)                  # 竞争对手分析
  - trending_topics()                            # 热门话题

使用说明:
  from main import *
  result = keyword_research("您的关键词")

所有结果都会自动保存到 /results 目录。
""")