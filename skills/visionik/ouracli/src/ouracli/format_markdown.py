"""Oura数据的Markdown格式化工具。"""

from typing import Any

from ouracli.charts_mermaid import create_mermaid_bar_chart, create_mermaid_heartrate_chart
from ouracli.format_utils import EXCLUDE_FIELDS, humanize_key, sort_dict_keys


def format_markdown_item(data: Any, heading_level: int = 3) -> str:
    """
    将单个项目格式化为带有正确标题层次结构的Markdown。
    对简单键值对使用表格。

    参数:
        data: 要格式化的数据
        heading_level: 当前标题级别（3表示###子部分）

    返回:
        格式化的Markdown字符串
    """
    lines: list[str] = []

    if isinstance(data, dict):
        # 对字典键进行排序
        sorted_keys = sort_dict_keys(data)

        # 分离简单键值对和复杂嵌套结构
        simple_kvs = []
        complex_items: list[tuple[str, dict[Any, Any] | list[Any], str, str]] = []

        for key in sorted_keys:
            # 跳过需要排除的字段
            if key in EXCLUDE_FIELDS:
                continue

            value = data[key]
            # 将键转换为人类可读格式
            human_key = humanize_key(key)

            if isinstance(value, dict):
                # 特殊处理MET数据
                if key == "met" and "items" in value:
                    complex_items.append((key, value, human_key, "met"))
                # 贡献者和其他嵌套字典
                elif not any(isinstance(v, (dict, list)) for v in value.values()):
                    # 扁平字典 - 用作带有表格的子部分
                    complex_items.append((key, value, human_key, "flat_dict"))
                else:
                    # 复杂嵌套结构
                    complex_items.append((key, value, human_key, "complex"))
            elif isinstance(value, list):
                # 检查是否为心率时间序列数据
                if (
                    value
                    and isinstance(value[0], dict)
                    and "bpm" in value[0]
                    and "timestamp" in value[0]
                ):
                    complex_items.append((key, value, human_key, "heartrate"))
                # 复杂项目列表获取自己的子部分
                elif value and isinstance(value[0], dict):
                    complex_items.append((key, value, human_key, "complex_list"))
                else:
                    # 简单列表值 - 视为简单键值对
                    simple_kvs.append((human_key, ", ".join(map(str, value))))
            else:
                # 简单键值对
                simple_kvs.append((human_key, value))

        # 将简单键值对渲染为表格
        if simple_kvs:
            lines.append("| 字段 | 值 |")
            lines.append("|-------|-------|")
            for k, v in simple_kvs:
                lines.append(f"| {k} | {v} |")
            lines.append("")

        # 将复杂项渲染为子部分
        for _key, value, human_key, item_type in complex_items:
            if item_type == "met" and isinstance(value, dict):
                lines.append(f"\n{'#' * heading_level} {human_key}\n")
                if "interval" in value:
                    lines.append(f"**间隔:** {value['interval']} 秒\n")
                if value["items"]:
                    lines.append("**活动图表:**\n")
                    chart = create_mermaid_bar_chart(value["items"])
                    lines.append(chart)
                    lines.append("")
            elif item_type == "flat_dict" and isinstance(value, dict):
                lines.append(f"\n{'#' * heading_level} {human_key}\n")
                # 将扁平字典渲染为表格
                lines.append("| 字段 | 值 |")
                lines.append("|-------|-------|")
                for subkey, subvalue in value.items():
                    if subkey not in EXCLUDE_FIELDS:
                        sub_human_key = humanize_key(subkey)
                        lines.append(f"| {sub_human_key} | {subvalue} |")
                lines.append("")
            elif item_type == "complex":
                lines.append(f"\n{'#' * heading_level} {human_key}\n")
                lines.append(format_markdown_item(value, heading_level + 1))
            elif item_type == "heartrate" and isinstance(value, list):
                lines.append(f"\n{'#' * heading_level} {human_key}\n")
                lines.append("**心率图表:**\n")
                chart = create_mermaid_heartrate_chart(value)
                lines.append(chart)
                lines.append("")
            elif item_type == "complex_list" and isinstance(value, list):
                lines.append(f"\n{'#' * heading_level} {human_key}\n")
                for item in value:
                    lines.append(format_markdown_item(item, heading_level + 1))

    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                lines.append(format_markdown_item(item, heading_level))
            else:
                lines.append(f"- {item}")
    else:
        lines.append(str(data))

    return "\n".join(lines)


def format_markdown(data: Any, title: str | None = None) -> str:
    """
    将数据格式化为带有正确标题层次结构的Markdown。
    # 顶级类别（活动、睡眠等）
    ## 日期/天
    ### 子部分（贡献者、MET等）

    参数:
        data: 要格式化的数据
        title: 当数据是列表时，顶级标题的可选标题

    返回:
        Markdown格式化的字符串
    """
    lines: list[str] = []

    if isinstance(data, dict):
        # 检查字典是否包含按类别列出的数据（例如，活动、睡眠等）
        if all(isinstance(v, list) for v in data.values()):
            for key, values in data.items():
                # 格式化部分标题
                section_title = key.replace("_", " ").title()
                lines.append(f"# {section_title}\n")

                if not values:
                    lines.append("*无数据*\n")
                    continue

                # 格式化列表中的每个项目
                for item in values:
                    if isinstance(item, dict):
                        # 如果有day字段，添加日标题
                        if "day" in item:
                            lines.append(f"\n## {item['day']}\n")
                        lines.append(format_markdown_item(item, heading_level=3))
                        lines.append("")  # 项目之间的空行
                    else:
                        lines.append(f"- {item}")
        else:
            # 单个字典 - 格式化为部分
            lines.append("# 数据\n")
            lines.append(format_markdown_item(data, heading_level=2))

    elif isinstance(data, list):
        if not data:
            lines.append("*无数据*")
        else:
            # 检查是否为心率时间序列数据
            if data and isinstance(data[0], dict) and "bpm" in data[0] and "timestamp" in data[0]:
                # 按天分组心率数据
                from datetime import datetime

                if title:
                    lines.append(f"# {title}\n")

                by_day: dict[str, list] = {}
                for reading in data:
                    timestamp_str = reading.get("timestamp", "")
                    if timestamp_str:
                        try:
                            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                            day_key = dt.strftime("%Y-%m-%d")
                            if day_key not in by_day:
                                by_day[day_key] = []
                            by_day[day_key].append(reading)
                        except (ValueError, AttributeError):
                            continue

                # 为每天创建图表
                for day in sorted(by_day.keys()):
                    day_data = by_day[day]
                    lines.append(f"## {day}\n")
                    lines.append("**心率图表:**\n")
                    chart = create_mermaid_heartrate_chart(day_data)
                    lines.append(chart)
                    lines.append("")
            else:
                # 如果提供了标题，则添加
                if title:
                    lines.append(f"# {title}\n")

                for item in data:
                    if isinstance(item, dict):
                        if "day" in item:
                            lines.append(f"\n## {item['day']}\n")
                        lines.append(format_markdown_item(item, heading_level=3))
                        lines.append("")  # 空行
                    else:
                        lines.append(f"- {item}")
    else:
        lines.append(str(data))

    return "\n".join(lines)