"""终端输出的 ASCII/Braille 图表生成。"""

from ouracli.chart_utils import bucket_regular_data, bucket_timeseries_data


def create_heartrate_bar_chart_ascii(
    heartrate_data: list[dict], width: int = 72, height: int = 10
) -> str:
    """
    使用 Braille 字符从心率数据创建 ASCII 条形图。

    参数:
        heartrate_data: 包含 'timestamp' 和 'bpm' 键的字典列表
        width: 图表宽度（字符数，默认 72 = 144 个桶）
        height: 图表高度（字符数，默认 10）

    返回:
        ASCII 条形图字符串
    """
    if not heartrate_data:
        return "无心率数据"

    # 从原始数据中获取实际的最小值/最大值用于 Y 轴标签
    all_bpms: list[float] = [
        float(reading.get("bpm"))  # type: ignore[arg-type]
        for reading in heartrate_data
        if reading.get("bpm") is not None
    ]
    actual_min: float = (min(all_bpms) - 10) if all_bpms else 0.0
    actual_max: float = max(all_bpms) if all_bpms else 100.0

    # 创建 144 个桶（24 小时 * 6 = 每 10 分钟一个桶）
    bucket_averages = bucket_timeseries_data(
        heartrate_data, "timestamp", "bpm", bucket_minutes=10, buckets_per_day=144
    )

    # 将 None 替换为 0 用于 ASCII 图表
    buckets = [v if v is not None else 0 for v in bucket_averages]

    return _create_ascii_bar_chart_from_buckets(
        buckets, width, height, "BPM", actual_min, actual_max
    )


def create_ascii_bar_chart(met_items: list[float], width: int = 72, height: int = 10) -> str:
    """
    使用 Braille 字符从 MET 数据创建 ASCII 条形图，以获得更高的分辨率。

    参数:
        met_items: MET 值列表（通常为一整天的 1440 个项目）
        width: 图表宽度（字符数，默认 72 = 144 个桶 = 每桶 10 分钟）
        height: 图表高度（字符数，默认 10）

    返回:
        ASCII 条形图字符串
    """
    if not met_items:
        return "无 MET 数据"

    # 将项目分组到桶中 - 使用 2x 宽度，因为我们将在每个字符中打包 2 个条形
    # 1440 个项目 -> 144 个桶 = 每个桶 10 个项目（每 10 分钟）
    num_buckets = width * 2
    buckets = bucket_regular_data(met_items, target_buckets=num_buckets, aggregation="max")

    return _create_ascii_bar_chart_from_buckets(buckets, width, height, "MET")


def _create_ascii_bar_chart_from_buckets(
    buckets: list[float],
    width: int,
    height: int,
    unit: str,
    actual_min: float | None = None,
    actual_max: float | None = None,
) -> str:
    """
    从预分桶数据创建 ASCII 条形图的内部函数。

    参数:
        buckets: 值列表（应为双列打包的 width * 2）
        width: 字符宽度
        height: 字符高度
        unit: 单位标签（例如 "MET" 或 "BPM"）
        actual_min: 源数据的实际最小值（用于 Y 轴标签）
        actual_max: 源数据的实际最大值（用于 Y 轴标签）

    返回:
        ASCII 条形图字符串
    """
    # 垂直条形的 Braille 模式
    # 点排列：1,2,3,7（左列），4,5,6,8（右列）
    #   1 • • 4
    #   2 • • 5
    #   3 • • 6
    #   7 • • 8
    # 位位置：0=1, 1=2, 2=3, 3=4, 4=5, 5=6, 6=7, 7=8
    braille_base = 0x2800

    # 左列模式（点 1,2,3,7）从底部到顶部
    left_patterns = [
        0b00000000,  # 0: 无点
        0b01000000,  # 1: 点 7（位 6）
        0b01000100,  # 2: 点 3,7（位 2,6）
        0b01000110,  # 3: 点 2,3,7（位 1,2,6）
        0b01000111,  # 4: 点 1,2,3,7（位 0,1,2,6）
    ]

    # 右列模式（点 4,5,6,8）从底部到顶部
    right_patterns = [
        0b00000000,  # 0: 无点
        0b10000000,  # 1: 点 8（位 7）
        0b10100000,  # 2: 点 6,8（位 5,7）
        0b10110000,  # 3: 点 5,6,8（位 4,5,7）
        0b10111000,  # 4: 点 4,5,6,8（位 3,4,5,7）
    ]

    # 查找缩放的最大值（使用提供的实际值，否则使用桶数据）
    max_val = actual_max if actual_max is not None else (max(buckets) if buckets else 1.0)
    if max_val == 0:
        max_val = 1.0

    # 查找最小值（使用提供的实际值，否则使用非零桶）
    if actual_min is not None:
        min_val = actual_min
    else:
        non_zero_vals = [v for v in buckets if v > 0]
        min_val = min(non_zero_vals) if non_zero_vals else 0

    # 每个字符有 4 个点的分辨率，所以总分辨率是 height * 4
    total_dots = height * 4

    # 计算 Y 轴标签（显示 5 个均匀分布的标签）
    y_labels = {}
    num_labels = min(5, height)  # 最多显示 5 个标签

    for i in range(num_labels):
        # 从顶部（最大值）到底部（最小值）均匀分布标签
        row = int(i * (height - 1) / (num_labels - 1))
        # 从最大值到最小值线性计算此行的值
        fraction = i / (num_labels - 1)
        value_at_row = max_val - fraction * (max_val - min_val)
        # 根据值范围选择适当的精度
        if max_val - min_val > 20:
            y_labels[row] = f"{value_at_row:.0f}"  # 大范围内使用整数
        else:
            y_labels[row] = f"{value_at_row:.1f}"  # 小范围内使用一位小数

    # 查找最大标签宽度以对齐
    max_label_width = max(len(label) for label in y_labels.values()) if y_labels else 0

    # 从上到下创建图表行
    lines = []
    for row in range(height):
        # 如果此行有标签，添加 Y 轴标签
        if row in y_labels:
            label = y_labels[row].rjust(max_label_width)
            line = f"{label} │ "
        else:
            line = " " * max_label_width + " │ "

        # 成对处理桶（左列和右列）
        for i in range(0, len(buckets), 2):
            left_val = buckets[i] if i < len(buckets) else 0
            right_val = buckets[i + 1] if i + 1 < len(buckets) else 0

            # 计算左条形的点（从最小值缩放到最大值）
            value_range = max_val - min_val
            if value_range > 0 and left_val > 0:
                left_dots_filled = int(((left_val - min_val) / value_range) * total_dots)
            else:
                left_dots_filled = 0

            row_bottom = total_dots - (row + 1) * 4
            row_top = row_bottom + 4

            if left_dots_filled <= row_bottom:
                left_pattern = left_patterns[0]
            elif left_dots_filled >= row_top:
                left_pattern = left_patterns[4]
            else:
                dots_in_row = left_dots_filled - row_bottom
                left_pattern = left_patterns[dots_in_row]

            # 计算右条形的点（从最小值缩放到最大值）
            if value_range > 0 and right_val > 0:
                right_dots_filled = int(((right_val - min_val) / value_range) * total_dots)
            else:
                right_dots_filled = 0

            if right_dots_filled <= row_bottom:
                right_pattern = right_patterns[0]
            elif right_dots_filled >= row_top:
                right_pattern = right_patterns[4]
            else:
                dots_in_row = right_dots_filled - row_bottom
                right_pattern = right_patterns[dots_in_row]

            # 组合左右模式
            combined_pattern = left_pattern | right_pattern
            char = chr(braille_base + combined_pattern)
            line += char
        lines.append(line)

    # 添加带有 Y 轴对齐的基线
    baseline = " " * max_label_width + " └" + "─" * width
    lines.append(baseline)

    # 添加小时标签（0-23）并与 Y 轴对齐
    # 每小时 = 6 个桶（60 分钟 / 10 分钟每桶）
    # 每个字符 2 个桶 = 每小时 3 个字符
    # 构建带有适当间距的小时标签（每小时 3 个字符）
    hour_parts = []
    for hour in range(24):
        if hour < 10:
            # 单个数字：" X "（空格，数字，空格）
            hour_parts.append(f" {hour} ")
        else:
            # 双数字："XX "（数字，数字，空格）
            hour_parts.append(f"{hour} ")

    # 修剪到正好 72 个字符并添加 Y 轴填充
    hour_line = " " * (max_label_width + 3) + "".join(hour_parts)[:width]
    lines.append(hour_line)

    return "\n".join(lines)
