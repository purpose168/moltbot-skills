"""API 模块 - 用于 DataForSEO API 端点。

此模块包含所有 API 功能模块：
- keywords_data: 关键词数据 API（搜索量、CPC、竞争度）
- labs: 实验室 API（建议、难度、意图、相关词）
- serp: SERP API（搜索结果页面数据）
- trends: 趋势 API（Google Trends 数据）
"""

# 子模块在导入时可用
from . import keywords_data
from . import labs
from . import serp
from . import trends