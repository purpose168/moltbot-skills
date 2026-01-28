"""DataForSEO API 客户端初始化模块。

此模块提供 DataForSEO API 的客户端管理功能。
使用单例模式确保在整个应用程序中共享相同的客户端实例。
"""

import sys
from pathlib import Path

# 将父目录添加到导入路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 导入 DataForSEO 客户端库
from dataforseo_client import configuration as dfs_config
from dataforseo_client import api_client as dfs_api_provider
from dataforseo_client.api.serp_api import SerpApi
from dataforseo_client.api.keywords_data_api import KeywordsDataApi
from dataforseo_client.api.dataforseo_labs_api import DataforseoLabsApi

from config.settings import settings


class DataForSEOClient:
    """
    DataForSEO API 的单例客户端管理器。

    此类负责管理所有 DataForSEO API 的连接和认证。
    使用单例模式确保在整个应用程序中只创建一个客户端实例。

    包含的 API:
    - SERP API: 搜索引擎结果页面数据
    - Keywords Data API: 关键词数据（搜索量、CPC等）
    - DataForSEO Labs API: 高级关键词分析（建议、难度、意图等）
    """

    # 类变量，用于存储单例实例
    _instance = None
    # API 客户端实例
    _api_client = None
    # 配置实例
    _configuration = None

    def __new__(cls):
        """创建单例实例，确保只创建一个客户端对象。"""
        if cls._instance is None:
            # 调用父类的 __new__ 方法创建实例
            cls._instance = super().__new__(cls)
            # 初始化实例
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """使用凭据初始化 API 客户端。"""
        # 验证配置是否有效
        settings.validate()
        # 创建配置对象，设置用户名和密码
        self._configuration = dfs_config.Configuration(
            username=settings.DATAFORSEO_LOGIN,
            password=settings.DATAFORSEO_PASSWORD
        )
        # 创建 API 客户端实例
        self._api_client = dfs_api_provider.ApiClient(self._configuration)

    @property
    def serp(self) -> SerpApi:
        """
        获取 SERP API 实例。

        用于获取搜索引擎结果页面数据，包括：
        - Google 自然搜索结果
        - YouTube 搜索结果
        - Google 新闻、图片、地图结果
        - 精选摘要数据

        返回:
            SerpApi 实例
        """
        return SerpApi(self._api_client)

    @property
    def keywords_data(self) -> KeywordsDataApi:
        """
        获取关键词数据 API 实例。

        用于获取基础关键词数据，包括：
        - 搜索量
        - CPC（每次点击成本）
        - 竞争度
        - 关键词难度
        - 域名相关关键词

        返回:
            KeywordsDataApi 实例
        """
        return KeywordsDataApi(self._api_client)

    @property
    def labs(self) -> DataforseoLabsApi:
        """
        获取 DataForSEO Labs API 实例。

        用于获取高级关键词分析数据，包括：
        - 关键词建议
        - 关键词创意
        - 相关关键词
        - 搜索意图
        - 关键词难度
        - 历史搜索量
        - 竞争对手分析

        返回:
            DataforseoLabsApi 实例
        """
        return DataforseoLabsApi(self._api_client)

    @property
    def api_client(self):
        """
        获取原始 API 客户端用于自定义请求。

        如果需要执行自定义 API 调用，可以直接访问底层 API 客户端。

        返回:
            ApiClient 实例
        """
        return self._api_client

    def close(self):
        """关闭 API 客户端连接。"""
        if self._api_client:
            self._api_client.close()


def get_client() -> DataForSEOClient:
    """
    获取或创建 DataForSEO 客户端实例。

    这是获取 DataForSEO API 客户端的主要入口点。
    使用单例模式，确保整个应用程序共享同一个客户端。

    返回:
        DataForSEOClient 实例

    示例:
        >>> client = get_client()
        >>> result = client.serp.get_google_serp(...)
        >>> client.close()  # 使用完毕后关闭连接
    """
    return DataForSEOClient()