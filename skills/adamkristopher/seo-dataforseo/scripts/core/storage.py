"""API 响应结果持久化存储工具模块。

此模块提供将 API 响应保存到文件系统的功能。
所有结果都会自动保存到 results 目录下，并带有时间戳和操作名称。
便于后续查询、分析和比较。
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# 将父目录添加到导入路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import settings


def get_timestamp() -> str:
    """
    生成用于文件名的 时间戳字符串。

    格式: YYYYMMDD_HHMMSS
    例如: 20240115_143022

    返回:
        格式化的时间戳字符串
    """
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def sanitize_filename(name: str) -> str:
    """
    清理字符串用于文件名。

    将特殊字符替换为下划线，确保文件名合法。
    同时限制文件名长度为 100 个字符。

    参数:
        name: 原始字符串

    返回:
        清理后的字符串

    替换的字符:
        / \\ : * ? " < > | 空格
    """
    for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' ']:
        name = name.replace(char, '_')
    return name[:100]  # 限制长度


def save_result(
    data: Any,
    category: str,
    operation: str,
    keyword: Optional[str] = None,
    extra_info: Optional[str] = None
) -> Path:
    """
    将 API 结果保存到 JSON 文件。

    此函数自动创建必要的目录结构，并以 JSON 格式保存结果。
    文件名包含时间戳、操作名称和关键词，便于识别和排序。

    参数:
        data: 要保存的 API 响应数据
        category: 结果分类目录名称
            - keywords_data: 关键词数据（搜索量、CPC、竞争）
            - labs: 实验室数据（建议、难度、意图）
            - serp: SERP 数据（搜索排名结果）
            - trends: 趋势数据（Google Trends）
        operation: 操作名称
            例如: search_volume, keyword_suggestions, google_serp 等
        keyword: 请求中使用的主要关键词（用于文件名）
        extra_info: 额外信息（用于文件名）

    返回:
        保存文件的 Path 对象

    文件命名格式:
        {时间戳}__{operation}__{keyword}__{extra_info}.json

    示例:
        >>> save_result(data, 'labs', 'keyword_suggestions', 'python')
        # 保存到: results/labs/20240115_143022__keyword_suggestions__python.json
    """
    # 确保分类目录存在
    category_dir = settings.RESULTS_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    # 构建文件名
    timestamp = get_timestamp()
    parts = [timestamp, operation]

    if keyword:
        parts.append(sanitize_filename(keyword))
    if extra_info:
        parts.append(sanitize_filename(extra_info))

    filename = "__".join(parts) + ".json"
    filepath = category_dir / filename

    # 准备数据用于 JSON 序列化
    # 如果数据对象有 to_dict 方法，转换为字典
    if hasattr(data, 'to_dict'):
        data = data.to_dict()

    # 使用元数据包装器保存
    result_wrapper = {
        "metadata": {
            "saved_at": datetime.now().isoformat(),  # 保存时间
            "category": category,                    # 分类
            "operation": operation,                  # 操作名称
            "keyword": keyword,                      # 关键词
            "extra_info": extra_info                 # 额外信息
        },
        "data": data                                 # 实际数据
    }

    # 写入文件，使用 UTF-8 编码确保中文正确保存
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(result_wrapper, f, indent=2, ensure_ascii=False, default=str)

    print(f"结果已保存到: {filepath}")
    return filepath


def load_result(filepath: Path) -> Dict[str, Any]:
    """
    从 JSON 文件加载之前保存的结果。

    参数:
        filepath: JSON 文件的路径

    返回:
        包含元数据和实际数据的字典

    示例:
        >>> result = load_result(Path("results/labs/20240115_143022__suggestions__python.json"))
        >>> data = result["data"]
        >>> metadata = result["metadata"]
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def list_results(
    category: Optional[str] = None,
    operation: Optional[str] = None,
    limit: int = 50
) -> List[Path]:
    """
    列出保存的结果文件，可按类别/操作进行筛选。

    参数:
        category: 按类别筛选（keywords_data, labs, serp, trends）
        operation: 按操作名称筛选
        limit: 返回的最大文件数（默认: 50）

    返回:
        文件路径列表，按日期降序排序（最新在前）

    示例:
        # 列出所有结果
        >>> all_results = list_results()

        # 列出 labs 类别最近 10 个结果
        >>> labs_results = list_results(category='labs', limit=10)

        # 列出包含 'suggestions' 的结果
        >>> suggestion_results = list_results(operation='suggestions')
    """
    base_dir = settings.RESULTS_DIR

    if category:
        base_dir = base_dir / category

    # 如果目录不存在，返回空列表
    if not base_dir.exists():
        return []

    # 构建搜索模式
    pattern = f"*{operation}*" if operation else "*"
    # 查找匹配的 JSON 文件，按修改时间降序排序
    files = sorted(base_dir.glob(f"**/{pattern}.json"), reverse=True)

    return files[:limit]


def get_latest_result(category: str, operation: Optional[str] = None) -> Optional[Dict]:
    """
    获取某个类别/操作的最新结果。

    参数:
        category: 要搜索的类别
        operation: 按操作名称过滤（可选）

    返回:
        加载的结果数据，如果不存在则返回 None

    示例:
        >>> latest = get_latest_result('labs', 'keyword_suggestions')
        >>> if latest:
        ...     data = latest["data"]
    """
    files = list_results(category=category, operation=operation, limit=1)
    if files:
        return load_result(files[0])
    return None