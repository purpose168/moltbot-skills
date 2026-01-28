"""图表生成的共享工具。"""

from datetime import datetime


def bucket_timeseries_data(
    data: list[dict],
    timestamp_key: str,
    value_key: str,
    bucket_minutes: int,
    buckets_per_day: int,
) -> list[float | None]:
    """将不规则的时间序列数据放入固定间隔的桶中。

    参数:
        data: 包含时间戳和值键的字典列表
        timestamp_key: 数据中时间戳字段的键
        value_key: 数据中值字段的键
        bucket_minutes: 每个桶的分钟数
        buckets_per_day: 24小时期间的总桶数

    返回:
        每个桶的平均值列表（缺失数据为None）
    """
    # 初始化桶列表
    buckets: list[list[float]] = [[] for _ in range(buckets_per_day)]

    for reading in data:
        timestamp_str = reading.get(timestamp_key, "")
        value = reading.get(value_key)

        if timestamp_str and value is not None:
            try:
                # 解析时间戳
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                # 计算总分钟数
                total_minutes = dt.hour * 60 + dt.minute
                # 计算桶索引
                bucket_idx = total_minutes // bucket_minutes
                if 0 <= bucket_idx < buckets_per_day:
                    buckets[bucket_idx].append(float(value))
            except (ValueError, AttributeError):
                # 跳过无效数据
                continue

    # 计算每个桶的平均值
    return [sum(bucket) / len(bucket) if bucket else None for bucket in buckets]


def bucket_regular_data(
    data: list[float],
    target_buckets: int,
    aggregation: str = "max",
) -> list[float]:
    """将常规数据（例如每分钟）放入更大的桶中。

    参数:
        data: 值列表（例如每分钟分辨率的1440个项目）
        target_buckets: 要创建的桶数
        aggregation: 聚合方法（'max'或'avg'）

    返回:
        每个桶的聚合值列表
    """
    if not data:
        return []

    # 计算桶大小
    bucket_size = len(data) // target_buckets
    if bucket_size == 0:
        bucket_size = 1

    buckets = []
    for i in range(0, len(data), bucket_size):
        bucket = data[i : i + bucket_size]
        if bucket:
            if aggregation == "max":
                buckets.append(max(bucket))
            else:  # avg
                buckets.append(sum(bucket) / len(bucket))

    return buckets[:target_buckets]


def create_hour_labels(num_buckets: int, buckets_per_hour: int) -> list[str]:
    """为图表X轴创建小时标签。

    参数:
        num_buckets: 总桶数
        buckets_per_hour: 每小时的桶数（例如5分钟分辨率为12）

    返回:
        标签列表（小时标记和空字符串）
    """
    labels = []
    for i in range(num_buckets):
        if i % buckets_per_hour == 0:
            hour = i // buckets_per_hour
            labels.append(f"{hour:02d}")
        else:
            labels.append("")
    return labels
