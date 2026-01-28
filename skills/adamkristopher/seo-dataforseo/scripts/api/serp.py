"""SERP API - Google 和 YouTube 搜索结果数据。

此模块提供与 DataForSEO SERP API 的交互。
用于获取搜索引擎结果页面的详细数据，包括：
- Google 自然搜索结果
- YouTube 搜索结果
- Google 新闻、图片、 精选摘要数据地图结果
-
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional

# 将父目录添加到导入路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from dataforseo_client.rest import ApiException

from core.client import get_client
from core.storage import save_result
from config.settings import settings


def get_google_serp(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 100,
    device: str = "desktop",
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 自然搜索结果。

    返回关键词在 Google 搜索结果中的排名、URL、标题和 SERP 功能。

    参数:
        keyword: 搜索查询
        location_name: 目标位置
        language_name: 目标语言
        depth: 结果数量（最多 700 个）
        device: 设备类型（"desktop" 桌面或 "mobile" 移动）
        save: 是否保存结果

    返回:
        包含 SERP 数据的字典，包括排名、URL、标题和 SERP 功能

    数据字段:
        - keyword: 关键词
        - rank: 排名位置
        - url: 页面 URL
        - title: 页面标题
        - snippet: 搜索摘要
        - serp_features: SERP 功能列表（如精选摘要、知识面板等）

    示例:
        >>> result = get_google_serp("最佳视频编辑软件")
        >>> for item in result:
        ...     print(f"#{item['rank']} {item['title']}")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.google_organic_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": min(depth, 700),
            "device": device
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="google_organic",
                keyword=keyword,
                extra_info=device
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_youtube_serp(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 20,
    device: str = "desktop",
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 YouTube 自然搜索结果。

    返回 YouTube 视频的排名、标题、频道、浏览量等信息。

    参数:
        keyword: 搜索查询（最多 700 个字符）
        location_name: 目标位置
        language_name: 目标语言
        depth: 结果数量（最多 700 个，按每 20 个计费）
        device: 设备类型（"desktop" 或 "mobile"）
        save: 是否保存结果

    返回:
        包含 YouTube 视频排名、标题、频道、浏览量的字典

    数据字段:
        - title: 视频标题
        - channel: 频道名称
        - channel_id: 频道 ID
        - views: 观看次数
        - duration: 视频时长
        - publish_date: 发布日期
        - url: 视频 URL

    示例:
        >>> result = get_youtube_serp("python 入门教程")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.youtube_organic_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": min(depth, 700),
            "device": device
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="youtube_organic",
                keyword=keyword,
                extra_info=device
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_google_maps_serp(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 20,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 地图/本地搜索结果。

    用于查找本地商家、服务和地点信息。

    参数:
        keyword: 搜索查询（例如 "附近的咖啡店"）
        location_name: 目标位置
        language_name: 目标语言
        depth: 结果数量
        save: 是否保存结果

    返回:
        包含本地商家列表的字典

    数据字段:
        - name: 商家名称
        - address: 地址
        - rating: 评分
        - reviews: 评论数
        - category: 类别
        - phone: 电话

    示例:
        >>> result = get_google_maps_serp("市中心咖啡店")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.google_maps_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": depth
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="google_maps",
                keyword=keyword
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_google_news_serp(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 100,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 新闻搜索结果。

    返回新闻文章及其排名信息。

    参数:
        keyword: 搜索查询
        location_name: 目标位置
        language_name: 目标语言
        depth: 结果数量
        save: 是否保存结果

    返回:
        包含新闻文章和排名的字典

    数据字段:
        - title: 文章标题
        - url: 文章 URL
        - source: 新闻来源
        - date: 发布日期
        - snippet: 摘要

    示例:
        >>> result = get_google_news_serp("人工智能")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.google_news_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": depth
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="google_news",
                keyword=keyword
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_google_images_serp(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    depth: int = 100,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取关键词的 Google 图片搜索结果。

    返回图片搜索结果，包括 URL、标题、来源等。

    参数:
        keyword: 搜索查询
        location_name: 目标位置
        language_name: 目标语言
        depth: 结果数量
        save: 是否保存结果

    返回:
        包含图片结果的字典，包括 URL、标题、来源

    数据字段:
        - title: 图片标题
        - url: 图片 URL
        - source: 来源网站
        - width/height: 图片尺寸

    示例:
        >>> result = get_google_images_serp("python 编程标志")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.google_images_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": depth
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="google_images",
                keyword=keyword
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise


def get_featured_snippet(
    keyword: str,
    location_name: str = None,
    language_name: str = None,
    save: bool = True
) -> Dict[str, Any]:
    """
    获取专注于精选摘要和 SERP 功能的 Google SERP。

    返回桌面端前 10 个结果，重点关注精选摘要数据。

    参数:
        keyword: 搜索查询（最好是问题形式）
        location_name: 目标位置
        language_name: 目标语言
        save: 是否保存结果

    返回:
        包含 SERP 数据的字典，包括精选摘要详情

    精选摘要类型:
        - 段落: 文字段落形式的答案
        - 列表: 编号或项目符号列表
        - 表格: 表格形式的答案
        - 步骤: 操作步骤列表

    示例:
        >>> result = get_featured_snippet("如何编辑视频")
    """
    client = get_client()
    location = location_name or settings.DEFAULT_LOCATION_NAME
    language = language_name or settings.DEFAULT_LANGUAGE_NAME

    try:
        response = client.serp.google_organic_live_advanced([{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": 10,
            "device": "desktop"
        }])

        result = response.to_dict() if hasattr(response, 'to_dict') else response

        if save:
            save_result(
                result,
                category="serp",
                operation="featured_snippet",
                keyword=keyword
            )

        return result

    except ApiException as e:
        print(f"API 异常: {e}")
        raise