"""Google Trends API - 跨 Google 搜索、YouTube、新闻、图片和购物的趋势数据。

此模块提供与 DataForSEO Google Trends API 的交互。
用于获取关键词的搜索趋势数据，包括：
- Google 搜索趋势
- YouTube 趋势
- 新闻趋势
- 图片趋势
- 购物趋势
- 实时热门搜索
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


def get_trends_explore(
    keywords: List[str],
    location_name: str = None,
    search_type: str = "web",
    time_range: str = "past_12_months",
    date_from: str = None,
    date_to: str = None,
    category_code: int = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google Trends 数据。

    返回关键词的趋势图表数据、区域热度、相关主题和查询。

    参数:
        keywords: 要比较的关键词列表（最多 5 个）
        location_name: 目标位置（未指定时默认为全球）
        search_type: 搜索类型
            - "web": Google 网页搜索
            - "news": Google 新闻
            - "youtube": YouTube
            - "images": Google 图片
            - "froogle": Google 购物
        time_range: 预设时间范围
            - "past_hour": 过去1小时
            - "past_4_hours": 过去4小时
            - "past_day": 过去1天
            - "past_7_days": 过去7天
            - "past_month": 过去1个月
            - "past_3_months": 过去3个月
            - "past_12_months": 过去12个月
            - "past_5_years": 过去5年
        date_from: 自定义开始日期（yyyy-mm-dd），覆盖 time_range
        date_to: 自定义结束日期（yyyy-mm-dd）
        category_code: Google Trends 类别过滤器
        save: 是否保存结果

    返回:
        包含趋势图表数据、区域热度、相关主题和查询的字典

    数据字段:
        - trends: 趋势数据数组
        - geo: 区域热度数据
        - related_topics: 相关主题
        - related_queries: 相关查询

    示例:
        >>> result = get_trends_explore(["python", "javascript"], search_type="youtube")
        >>> result = get_trends_explore(["ai 视频编辑"], time_range="past_12_months")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME

    # 构建请求参数
    request_params = {
        "keywords": keywords[:5],  # API 限制最多 5 个关键词
        "location_name": location,
        "type": search_type
    }

    # 添加时间参数
    if date_from and date_to:
        request_params["date_from"] = date_from
        request_params["date_to"] = date_to
    else:
        request_params["time_range"] = time_range

    if category_code:
        request_params["category_code"] = category_code

    try:
        response = client.keywords_data.google_trends_explore_live([request_params])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="trends",
                operation="explore",
                keyword="_vs_".join(keywords[:3]),
                extra_info=f"{search_type}_{time_range}"
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_youtube_trends(
    keywords: List[str],
    location_name: str = None,
    time_range: str = "past_12_months",
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 YouTube 特定趋势数据。

    这是 get_trends_explore 的便捷包装器，搜索类型固定为 YouTube。

    参数:
        keywords: 要比较的关键词列表（最多 5 个）
        location_name: 目标位置
        time_range: 趋势数据的时间范围
        save: 是否保存结果

    返回:
        包含 YouTube 趋势数据的字典

    示例:
        >>> result = get_youtube_trends(["短视频教程", "youtube 短视频"])
    """
    return get_trends_explore(
        keywords=keywords,
        location_name=location_name,
        search_type="youtube",
        time_range=time_range,
        save=save
    )


def get_news_trends(
    keywords: List[str],
    location_name: str = None,
    time_range: str = "past_12_months",
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 新闻趋势数据。

    参数:
        keywords: 要比较的关键词列表（最多 5 个）
        location_name: 目标位置
        time_range: 趋势数据的时间范围
        save: 是否保存结果

    返回:
        包含新闻趋势数据的字典

    示例:
        >>> result = get_news_trends(["人工智能", "机器学习"])
    """
    return get_trends_explore(
        keywords=keywords,
        location_name=location_name,
        search_type="news",
        time_range=time_range,
        save=save
    )


def get_shopping_trends(
    keywords: List[str],
    location_name: str = None,
    time_range: str = "past_12_months",
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 购物趋势数据。

    参数:
        keywords: 要比较的关键词列表（最多 5 个）
        location_name: 目标位置
        time_range: 趋势数据的时间范围
        save: 是否保存结果

    返回:
        包含购物/电商趋势数据的字典

    示例:
        >>> result = get_shopping_trends(["无线耳机", "蓝牙耳机"])
    """
    return get_trends_explore(
        keywords=keywords,
        location_name=location_name,
        search_type="froogle",  # Google Shopping
        time_range=time_range,
        save=save
    )


def compare_keyword_trends(
    keywords: List[str],
    location_name: str = None,
    search_types: List[str] = None,
    time_range: str = "past_12_months",
    save: bool = True
) -> Dict[str, Dict[str, Any]]:
    """
    跨多个搜索类型比较关键词趋势。

    参数:
        keywords: 要比较的关键词（最多 5 个）
        location_name: 目标位置
        search_types: 要比较的搜索类型列表（默认为 web, youtube）
        time_range: 时间范围
        save: 是否保存单个结果

    返回:
        包含 search_type 键和趋势数据值的字典

    返回数据结构:
        {
            "web": {...},      # 网页搜索趋势
            "youtube": {...},  # YouTube 趋势
            "news": {...},     # 新闻趋势
            ...
        }

    示例:
        >>> result = compare_keyword_trends(
        ...     ["视频编辑教程"],
        ...     search_types=["web", "youtube", "images"]
        ... )
    """
    if search_types is None:
        search_types = ["web", "youtube"]

    results = {}
    for search_type in search_types:
        results[search_type] = get_trends_explore(
            keywords=keywords,
            location_name=location_name,
            search_type=search_type,
            time_range=time_range,
            save=save
        )

    return results


def get_trending_now(
    location_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取当前实时热门搜索。

    返回指定位置的当前热门搜索查询。

    参数:
        location_name: 目标位置
        save: 是否保存结果

    返回:
        包含热门搜索数据的字典

    数据字段:
        - date: 日期
        - trending_searches: 热门搜索列表
        - trending_score: 热门分数

    示例:
        >>> result = get_trending_now()
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME

    try:
        response = client.keywords_data.google_trends_trending_now_live([{
            "location_name": location
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="trends",
                operation="trending_now",
                keyword=location
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise