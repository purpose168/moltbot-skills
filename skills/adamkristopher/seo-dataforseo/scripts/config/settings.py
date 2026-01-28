"""DataForSEO 工具包配置管理模块。

此模块负责从环境变量加载配置。
支持从 .env 文件加载凭据和其他设置。
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# 从当前工作目录的 .env 文件加载环境变量
load_dotenv()


class Settings:
    """
    从环境变量加载的应用程序配置。

    此配置类包含所有 DataForSEO API 的设置项：
    - 认证凭据（登录名和密码）
    - 默认位置和语言设置
    - 结果存储目录
    - API 调用限制

    使用方法:
        from config.settings import settings

        # 访问配置值
        login = settings.DATAFORSEO_LOGIN
        results_dir = settings.RESULTS_DIR

        # 验证配置
        settings.validate()
    """

    # =====================
    # 认证配置
    # =====================
    # DataForSEO 账户登录名
    DATAFORSEO_LOGIN: str = os.getenv("DATAFORSEO_LOGIN", "")
    # DataForSEO 账户密码
    DATAFORSEO_PASSWORD: str = os.getenv("DATAFORSEO_PASSWORD", "")

    # =====================
    # 默认位置/语言设置
    # =====================
    # 目标位置名称（用于 API 请求）
    DEFAULT_LOCATION_NAME: str = "United States"
    # 目标位置代码（美国 = 2840）
    # 完整列表参考: https://dataforseo.com/api/keywords_data/meta
    DEFAULT_LOCATION_CODE: int = 2840
    # 目标语言名称
    DEFAULT_LANGUAGE_NAME: str = "English"
    # 目标语言代码
    DEFAULT_LANGUAGE_CODE: str = "en"

    # =====================
    # 结果存储配置
    # =====================
    # 结果保存目录（默认为当前工作目录下的 results 文件夹）
    RESULTS_DIR: Path = Path.cwd() / "results"

    # =====================
    # API 调用限制（参考）
    # =====================
    # 搜索量 API 最大关键词数
    MAX_KEYWORDS_SEARCH_VOLUME: int = 700
    # 关键词概览 API 最大关键词数
    MAX_KEYWORDS_OVERVIEW: int = 700
    # 关键词难度 API 最大关键词数
    MAX_KEYWORDS_DIFFICULTY: int = 1000
    # 关键词创意 API 最大种子词数
    MAX_KEYWORDS_IDEAS: int = 200
    # Trends API 最大关键词数（用于比较）
    MAX_TRENDS_KEYWORDS: int = 5

    @classmethod
    def validate(cls) -> bool:
        """
        验证必需的配置项是否存在。

        在使用 API 之前，应调用此方法验证凭据是否已设置。
        如果缺少必需的凭据，将抛出 ValueError 异常。

        必需的环境变量:
            - DATAFORSEO_LOGIN: DataForSEO 账户登录邮箱
            - DATAFORSEO_PASSWORD: DataForSEO 账户密码

        获取凭据:
            访问 https://app.dataforseo.com/api-access

        返回:
            True 表示验证通过

        异常:
            ValueError: 当缺少必需的凭据时
        """
        if not cls.DATAFORSEO_LOGIN or not cls.DATAFORSEO_PASSWORD:
            raise ValueError(
                "DATAFORSEO_LOGIN 和 DATAFORSEO_PASSWORD 必须在 .env 文件中设置。 "
                "请从 https://app.dataforseo.com/api-access 获取您的凭据"
            )
        return True


# 全局配置实例
settings = Settings()