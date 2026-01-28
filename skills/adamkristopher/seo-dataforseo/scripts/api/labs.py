"""DataForSEO Labs API - 关键词研究、建议、难度和竞争分析。

此模块提供与 DataForSEO Labs API 的交互。
用于获取高级关键词分析数据，包括：
- 关键词建议和创意
- 关键词难度评分
- 搜索意图分类
- 相关关键词
- 历史搜索量
- 竞争对手分析
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

# 将父目录添加到导入路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from dataforseo_client.rest import ApiException

from core.client import get_client
from core.storage import save_result
from config.settings import settings


def get_keyword_overview(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    include_serp_info: bool = False,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取综合关键词数据，包括搜索量、CPC、竞争度和搜索意图。

    此函数是关键词分析的核心，返回关键词的综合指标。

    参数:
        keywords: 关键词列表（最多 700 个）
        location_name: 目标位置
        language_name: 目标语言
        include_serp_info: 包含 SERP 功能数据
        save: 是否保存结果

    返回:
        包含综合关键词指标的字典

    数据字段:
        - keyword: 关键词
        - search_volume: 月均搜索量
        - cpc: 每次点击成本（美元）
        - competition: 竞争度指数
        - keyword_difficulty: 关键词难度 (0-100)
        - search_intent: 搜索意图
        - serp_features: SERP 功能列表

    示例:
        >>> result = get_keyword_overview(["最佳 python 课程", "python 入门"])
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_keyword_overview_live([{
            "keywords": keywords[:700],
            "location_name": location,
            "language_name": language,
            "include_serp_info": include_serp_info
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="keyword_overview",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_keywords"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_keyword_suggestions(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    include_seed_keyword: bool = True,
    include_serp_info: bool = False,
    limit: int = 100,
    save: bool = True
) -> Dict[str, Any]:
    """
    基于种子关键词获取关键词建议。

    建议会在种子关键词的前后或中间添加额外的词，
    形成长尾关键词变体。

    参数:
        keyword: 种子关键词（最少 3 个字符）
        location_name: 目标位置
        language_name: 目标语言
        include_seed_keyword: 包含种子关键词的指标
        include_serp_info: 包含每个关键词的 SERP 数据
        limit: 最大结果数（最多 1000 个）
        save: 是否保存结果

    返回:
        包含带指标的关键词建议的字典

    示例:
        >>> result = get_keyword_suggestions("python 教程")
        >>> # 返回: "免费 python 教程", "python 教程下载" 等
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_keyword_suggestions_live([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "include_seed_keyword": include_seed_keyword,
            "include_serp_info": include_serp_info,
            "limit": min(limit, 1000)
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="keyword_suggestions",
                keyword=keyword,
                extra_info=f"limit_{limit}"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_keyword_ideas(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    include_serp_info: bool = False,
    closely_variants: bool = False,
    limit: int = 700,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取与种子关键词属于同一类别的关键词创意。

    此函数超越语义相似性，通过将种子词与类别分类法
    进行映射来建议相关关键词。

    参数:
        keywords: 种子关键词列表（最多 200 个）
        location_name: 目标位置
        language_name: 目标语言
        include_serp_info: 包含 SERP 数据
        closely_variants: 短语匹配 (True) vs 广泛匹配 (False)
        limit: 最大结果数（最多 1000 个）
        save: 是否保存结果

    返回:
        包含带指标的关键词创意的字典

    示例:
        >>> result = get_keyword_ideas(["youtube 营销", "视频 seo"])
        >>> # 获取同一类别的相关关键词
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_keyword_ideas_live([{
            "keywords": keywords[:200],
            "location_name": location,
            "language_name": language,
            "include_serp_info": include_serp_info,
            "closely_variants": closely_variants,
            "limit": min(limit, 1000)
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="keyword_ideas",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_seeds"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_related_keywords(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 2,
    include_seed_keyword: bool = True,
    include_serp_info: bool = False,
    limit: int = 100,
    save: bool = True
) -> Dict[str, Any]:
    """
    从 Google 的"相关搜索"功能获取相关关键词。

    使用深度优先搜索算法分析 SERP "相关搜索"元素。

    参数:
        keyword: 种子关键词
        location_name: 目标位置
        language_name: 目标语言
        depth: 搜索深度 0-4
            - 0: 仅种子关键词
            - 1: 直接相关
            - 2: 二级相关（最多约 200 个结果）
            - 3: 三级相关（最多约 1000 个结果）
            - 4: 最大深度（最多约 4680 个结果）
        include_seed_keyword: 包含种子关键词指标
        include_serp_info: 包含 SERP 数据
        limit: 最大结果数（最多 1000 个）
        save: 是否保存结果

    返回:
        包含带指标的相关关键词的字典

    示例:
        >>> result = get_related_keywords("视频编辑软件", depth=2)
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_related_keywords_live([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": min(depth, 4),
            "include_seed_keyword": include_seed_keyword,
            "include_serp_info": include_serp_info,
            "limit": min(limit, 1000)
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="related_keywords",
                keyword=keyword,
                extra_info=f"depth_{depth}"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_bulk_keyword_difficulty(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取多个关键词的难度分数。

    难度分数 (0-100) 表示在自然搜索结果前 10 名中
    排名的难易程度。

    参数:
        keywords: 关键词列表（最多 1000 个）
        location_name: 目标位置
        language_name: 目标语言
        save: 是否保存结果

    返回:
        包含关键词难度分数的字典

    难度等级:
        - 0-20: 容易
        - 21-40: 中等
        - 41-60: 较难
        - 61-80: 困难
        - 81-100: 非常困难

    示例:
        >>> result = get_bulk_keyword_difficulty(["seo 工具", "关键词研究"])
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_bulk_keyword_difficulty_live([{
            "keywords": keywords[:1000],
            "location_name": location,
            "language_name": language
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="keyword_difficulty",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_keywords"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_historical_search_volume(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    include_serp_info: bool = False,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的历史搜索量和趋势数据。

    返回自 2019 年以来的月度搜索量数据，
    可用于分析季节性趋势和搜索量变化。

    参数:
        keywords: 关键词列表（最多 700 个）
        location_name: 目标位置
        language_name: 目标语言
        include_serp_info: 包含 SERP 功能
        save: 是否保存结果

    返回:
        包含历史搜索量和月度细分的字典

    数据字段:
        - keyword: 关键词
        - monthly_searches: 月度搜索量数组
        - year: 年份
        - month: 月份
        - search_volume: 该月搜索量

    示例:
        >>> result = get_historical_search_volume(["ai 工具", "chatgpt"])
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_historical_search_volume_live([{
            "keywords": keywords[:700],
            "location_name": location,
            "language_name": language,
            "include_serp_info": include_serp_info
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="historical_search_volume",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_keywords"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_search_intent(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的搜索意图分类。

    将关键词分类为以下类型：
    - 信息性 (Informational): 用户寻求信息或答案
    - 导航性 (Navigational): 用户寻找特定网站或品牌
    - 交易性 (Transactional): 用户有意进行购买
    - 商业调查 (Commercial): 用户比较不同选项

    参数:
        keywords: 关键词列表（最多 1000 个）
        location_name: 目标位置
        language_name: 目标语言
        save: 是否保存结果

    返回:
        包含搜索意图分类的字典

    示例:
        >>> result = get_search_intent(["购买 python 课程", "什么是 python"])
        >>> # 返回: ["transactional", "informational"]
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_search_intent_live([{
            "keywords": keywords[:1000],
            "location_name": location,
            "language_name": language
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="search_intent",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_keywords"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_domain_keywords(
    target_domain: str,
    location_name: str = None,
    language_name: str = None,
    limit: int = 100,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取域名在自然搜索中排名的关键词。

    参数:
        target_domain: 要分析的域名（例如 "example.com"）
        location_name: 目标位置
        language_name: 目标语言
        limit: 最大结果数
        save: 是否保存结果

    返回:
        包含域名排名关键词的字典

    数据字段:
        - keyword: 关键词
        - rank: 排名位置
        - previous_rank: 上一期排名
        - change: 排名变化
        - traffic: 预估流量
        - keyword_difficulty: 关键词难度

    示例:
        >>> result = get_domain_keywords("竞争对手.com")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_ranked_keywords_live([{
            "target": target_domain,
            "location_name": location,
            "language_name": language,
            "limit": limit
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="domain_keywords",
                keyword=target_domain
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_competitors(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    limit: int = 20,
    save: bool = True
) -> Dict[str, Any]:
    """
    查找为相同关键词竞争的域名。

    分析关键词在搜索结果中的排名域名，找出主要竞争对手。

    参数:
        keywords: 要查找竞争对手的关键词
        location_name: 目标位置
        language_name: 目标语言
        limit: 返回的最大竞争对手数
        save: 是否保存结果

    返回:
        包含竞争对手域名及其指标的字典

    数据字段:
        - domain: 竞争对手域名
        - common_keywords: 共同关键词数
        - overlap_score: 重叠分数

    示例:
        >>> result = get_competitors(["视频编辑软件", "最佳视频编辑器"])
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.labs.google_competitors_domain_live([{
            "keywords": keywords,
            "location_name": location,
            "language_name": language,
            "limit": limit
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="labs",
                operation="competitors",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_keywords"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise