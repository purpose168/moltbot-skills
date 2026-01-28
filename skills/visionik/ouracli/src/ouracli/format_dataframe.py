"""Oura数据的DataFrame格式化工具。"""

from typing import Any

import pandas as pd


def format_dataframe(data: Any) -> str:
    """
    将数据格式化为pandas DataFrame。

    参数:
        data: 要格式化的数据（字典或字典列表）

    返回:
        DataFrame的字符串表示形式
    """
    # 处理字典类型数据
    if isinstance(data, dict):
        # 检查字典是否包含列表值
        if all(isinstance(v, list) for v in data.values()):
            result = []
            # 遍历字典中的每个键值对
            for key, values in data.items():
                if values:
                    # 添加标题和分隔线
                    result.append(f"\n{key}:\n{'-' * 40}")
                    # 将列表转换为DataFrame
                    df = pd.DataFrame(values)
                    # 将DataFrame转换为字符串（不包含索引）
                    result.append(df.to_string(index=False))
            # 返回结果或"无数据"提示
            return "\n".join(result) if result else "无数据"
        # 单个字典 - 转换为DataFrame
        df = pd.DataFrame([data])
        return str(df.to_string(index=False))
    # 处理列表类型数据
    if isinstance(data, list):
        if not data:
            return "无数据"
        # 将列表转换为DataFrame
        df = pd.DataFrame(data)
        return str(df.to_string(index=False))
    # 其他类型 - 直接转换为字符串
    return str(data)
