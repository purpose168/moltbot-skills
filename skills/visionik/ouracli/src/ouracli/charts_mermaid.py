"""Mermaid图表生成器，用于Markdown输出。"""


def create_mermaid_heartrate_chart(heartrate_data: list[dict]) -> str:
    """
    从心率数据创建Mermaid条形图。

    参数:
        heartrate_data: 包含'timestamp'和'bpm'键的字典列表

    返回:
        Mermaid图表定义字符串
    """
    from datetime import datetime

    # 检查数据是否为空
    if not heartrate_data:
        return "无心率数据"

    # 将数据按小时分组（24小时）
    hourly_buckets: list[list[float]] = [[] for _ in range(24)]

    # 遍历每条心率数据
    for reading in heartrate_data:
        timestamp_str = reading.get("timestamp", "")
        bpm = reading.get("bpm")

        # 确保时间戳和BPM值都存在
        if timestamp_str and bpm is not None:
            try:
                # 解析时间戳并提取小时
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                hour = dt.hour
                # 将BPM值添加到对应小时的桶中
                hourly_buckets[hour].append(bpm)
            except (ValueError, AttributeError):
                # 跳过无效数据
                continue

    # 计算每个小时的平均BPM
    hourly_data = []
    for hour in range(24):
        if hourly_buckets[hour]:
            avg_bpm = sum(hourly_buckets[hour]) / len(hourly_buckets[hour])
            hourly_data.append((hour, avg_bpm))

    # 再次检查是否有有效数据
    if not hourly_data:
        return "无心率数据"

    # 构建带暗色主题的Mermaid条形图
    lines = []
    lines.append("```mermaid")
    lines.append("%%{init: {'theme':'dark'}}%%")
    lines.append("xychart-beta")
    lines.append('    title "24小时心率"')
    lines.append('    x-axis "小时" [' + ", ".join([f'"{h:02d}"' for h, _ in hourly_data]) + "]")
    lines.append('    y-axis "平均BPM" 40 --> 120')
    lines.append("    bar [" + ", ".join([f"{bpm:.0f}" for _, bpm in hourly_data]) + "]")
    lines.append("```")

    return "\n".join(lines)


def create_mermaid_bar_chart(met_items: list[float]) -> str:
    """
    从MET活动数据创建Mermaid条形图。

    参数:
        met_items: MET值列表（每分钟一个，通常一天1440个项目）

    返回:
        Mermaid图表定义字符串
    """
    # 将数据按小时分组（每小时60分钟）
    hourly_buckets = []
    for hour in range(24):
        start_idx = hour * 60
        end_idx = start_idx + 60
        if start_idx < len(met_items):
            bucket = met_items[start_idx:end_idx]
            if bucket:
                avg_met = sum(bucket) / len(bucket)
                hourly_buckets.append((hour, avg_met))

    # 构建带暗色主题的Mermaid条形图
    lines = []
    lines.append("```mermaid")
    lines.append("%%{init: {'theme':'dark'}}%%")
    lines.append("xychart-beta")
    lines.append('    title "24小时MET活动"')
    lines.append('    x-axis "小时" [' + ", ".join([f'"{h:02d}"' for h, _ in hourly_buckets]) + "]")
    lines.append('    y-axis "平均MET" 0 --> 6')
    lines.append("    bar [" + ", ".join([f"{met:.2f}" for _, met in hourly_buckets]) + "]")
    lines.append("```")

    return "\n".join(lines)
