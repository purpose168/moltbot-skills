"""核心模块 - 包含客户端和存储工具。

此模块提供 DataForSEO API 的核心功能：
- get_client(): 获取 DataForSEO API 客户端实例
- save_result(): 将 API 结果保存到文件
- load_result(): 从文件加载保存的结果
- list_results(): 列出保存的结果文件
"""

from .client import get_client
from .storage import save_result, load_result, list_results

# 导出公共 API
__all__ = ["get_client", "save_result", "load_result", "list_results"]