"""关键词数据 API - 从 Google Ads 获取搜索量、CPC 和关键词数据。

此模块提供与 DataForSEO Keywords Data API 的交互。
用于获取关键词的基础数据，包括搜索量、每次点击成本（CPC）、
竞争度以及与特定域名相关的关键词。
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


def get_search_volume(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的搜索量、CPC 和竞争数据。

    此函数查询 Google Ads 关键词规划师数据，返回关键词的：
    - 搜索量（每月搜索次数）
    - CPC（每次点击成本）
    - 竞争度指数
    - 搜索结果数
    - 关键词难度

    参数:
        keywords: 要分析的关键词列表（最多 700 个）
        location_name: 目标位置（默认：美国）
        language_name: 目标语言（默认：英语）
        save: 是否将结果保存到 JSON 文件

    返回:
        包含每个关键词搜索量数据的字典

    数据字段:
        - keyword: 关键词
        - search_volume: 搜索量
        - cpc: 每次点击成本（美元）
        - competition: 竞争度指数 (0-1)
        - competition_index: 竞争度百分比
        - number_of_results: 搜索结果数

    示例:
        >>> result = get_search_volume(["python 教程", "学习 python"])
        >>> print(result[0]["search_volume"])  # 输出: 10000
    """
    # 获取 DataForSEO 客户端
    client = get_client()
    # 使用提供的位置或默认值
    location = location_name or settings.DEFAULT_LOCATION_NAME
    # 使用提供的语言或默认值
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        # 调用 Google Ads 搜索量 API
        response = client.keywords_data.google_ads_search_volume_live([{
            "keywords": keywords[:700],  # 限制最多 700 个关键词
            "location_name": location,
            "language_name": language
        }])

        # 转换为字典格式
        result = response.to_dict() if hasattr(response, 'to_dict') else response

        # 保存结果（如果需要）
        if save:
            keyword_preview = keywords[0] if keywords else "bulk"
            save_result(
                result,
                category="keywords_data",
                operation="search_volume",
                keyword=keyword_preview,
                extra_info=f"{len(keywords)}_keywords"  # 记录关键词数量
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_keywords_for_site(
    target_domain: str,
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取与特定域名相关的关键词。

    此函数分析域名在 Google 搜索结果中的排名情况，
    返回该域名正在排名的所有关键词及其排名位置。

    参数:
        target_domain: 要分析的域名（例如 "example.com"）
        location_name: 目标位置
        language_name: 目标语言
        save: 是否保存结果

    返回:
        包含域名相关关键词数据的字典

    数据字段:
        - keyword: 关键词
        - rank: 排名位置
        - relevance: 相关性分数
        - domain: 域名

    示例:
        >>> result = get_keywords_for_site("竞争对手.com")
        >>> for item in result:
        ...     print(f"{item['keyword']}: 排名 #{item['rank']}")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        # 调用域名关键词 API
        response = client.keywords_data.google_ads_keywords_for_site_live([{
            "target": target_domain,
            "location_name": location,
            "language_name": language
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="keywords_data",
                operation="keywords_for_site",
                keyword=target_domain
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_ad_traffic_by_keywords(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    bid: float = 2.0,
    save: bool = True
) -> Dict[str, Any]:
    """
    估算关键词的广告流量潜力。

    此函数基于给定的每次点击成本（CPC）出价，
    估算关键词在 Google Ads 中的潜在流量。

    参数:
        keywords: 要分析的关键词列表
        location_name: 目标位置
        language_name: 目标语言
        bid: 用于估算的最大 CPC 出价（美元）
        save: 是否保存结果

    返回:
        包含流量估算数据的字典

    数据字段:
        - keyword: 关键词
        - cpc: 每次点击成本
        - impressions: 预估展示次数
        - clicks: 预估点击次数
        - cost: 预估日花费
        - position: 平均排名位置

    示例:
        >>> result = get_ad_traffic_by_keywords(
        ...     ["购买鞋子", "最佳跑鞋"],
        ...     bid=1.5
        ... )
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        # 调用广告流量估算 API
        response = client.keywords_data.google_ads_ad_traffic_by_keywords_live([{
            "keywords": keywords,
            "location_name": location,
            "language_name": language,
            "bid": bid  # CPC 出价
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="keywords_data",
                operation="ad_traffic",
                keyword=keywords[0] if keywords else "bulk"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_keywords_for_keywords(
    keywords: List[str],
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    从 Google Ads 关键词规划师获取关键词扩展创意。

    此函数使用 Google Ads 关键词规划师算法，
    基于种子关键词生成相关的关键词扩展建议。

    参数:
        keywords: 种子关键词列表（最多 20 个）
        location_name: 目标位置
        language_name: 目标语言
        save: 是否保存结果

    返回:
        包含扩展关键词创意的字典

    数据字段:
        - keyword: 扩展关键词
        - search_volume: 搜索量
        - cpc: CPC
        - competition: 竞争度

    示例:
        >>> result = get_keywords_for_keywords(["视频编辑", "视频软件"])
        >>> # 获取与原始关键词相关的长尾词
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        # 调用关键词扩展 API
        response = client.keywords_data.google_ads_keywords_for_keywords_live([{
            "keywords": keywords[:20],  # 限制最多 20 个种子词
            "location_name": location,
            "language_name": language
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="keywords_data",
                operation="keywords_for_keywords",
                keyword=keywords[0] if keywords else "bulk",
                extra_info=f"{len(keywords)}_seeds"  # 记录种子词数量
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise