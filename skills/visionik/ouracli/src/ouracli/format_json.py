"""Oura数据的JSON格式化工具。"""

import json
from typing import Any


def format_json(data: Any) -> str:
    """
    将数据格式化为JSON，其中MET数据的items数组在单行显示。

    参数:
        data: 要格式化的数据

    返回:
        JSON格式的字符串
    """
    # 第一次序列化：转换为紧凑的JSON以处理items数组
    compact = json.dumps(data, default=str)
    parsed = json.loads(compact)

    # 自定义格式化函数，特别处理met.items
    def custom_format(obj: Any, indent_level: int = 0) -> str:
        indent = "  " * indent_level
        next_indent = "  " * (indent_level + 1)

        if isinstance(obj, dict):
            # 检查是否为包含items和interval的met字典
            if "items" in obj and "interval" in obj:
                # MET数据的特殊格式化
                lines = []
                lines.append("{")
                for i, (k, v) in enumerate(obj.items()):
                    comma = "," if i < len(obj) - 1 else ""
                    if k == "items" and isinstance(v, list):
                        # 将items数组格式化为单行
                        items_str = json.dumps(v)
                        lines.append(f'{next_indent}"{k}": {items_str}{comma}')
                    else:
                        lines.append(f'{next_indent}"{k}": {json.dumps(v, default=str)}{comma}')
                lines.append(f"{indent}")
                return "\n".join(lines)
            # 常规字典格式化
            if not obj:
                return "{}"
            lines = []
            lines.append("{")
            items = list(obj.items())
            for i, (k, v) in enumerate(items):
                comma = "," if i < len(items) - 1 else ""
                formatted_value = custom_format(v, indent_level + 1)
                # 检查值是否为多行
                if "\n" in formatted_value:
                    lines.append(f'{next_indent}"{k}": {formatted_value}{comma}')
                else:
                    lines.append(f'{next_indent}"{k}": {formatted_value}{comma}')
            lines.append(f"{indent}")
            return "\n".join(lines)
        if isinstance(obj, list):
            if not obj:
                return "[]"
            # 检查是否所有项都是字典（如活动记录）
            if all(isinstance(item, dict) for item in obj):
                lines = []
                lines.append("[")
                for i, item in enumerate(obj):
                    comma = "," if i < len(obj) - 1 else ""
                    formatted_item = custom_format(item, indent_level + 1)
                    lines.append(f"{next_indent}{formatted_item}{comma}")
                lines.append(f"{indent}]")
                return "\n".join(lines)
            # 简单列表 - 保持在一行显示
            return json.dumps(obj, default=str)
        # 其他类型 - 直接使用json.dumps
        return json.dumps(obj, default=str)

    return custom_format(parsed)
