"""灵活日期规格的日期范围解析工具。"""

import re
from datetime import datetime, timedelta


def parse_date_range(date_spec: str) -> tuple[str, str]:
    """
    将灵活的日期范围规格解析为 start_date 和 end_date。

    支持：
    - today（今天）
    - yesterday（昨天）
    - 1 day, 2 days, n days（1天，2天，n天）
    - 1 week, 2 weeks, n weeks（1周，2周，n周）
    - 1 month, 2 months, n months（1个月，2个月，n个月）
    - YYYY-MM-DD + period（例如 "2024-01-01 7 days"）

    参数:
        date_spec: 日期规格字符串

    返回:
        格式为 YYYY-MM-DD 的 (start_date, end_date) 元组

    示例:
        >>> parse_date_range("today")
        ('2024-01-01', '2024-01-01')
        >>> parse_date_range("7 days")
        ('2023-12-25', '2024-01-01')
        >>> parse_date_range("2024-01-01 7 days")
        ('2024-01-01', '2024-01-08')
    """
    date_spec = date_spec.strip().lower()
    today = datetime.now().date()

    # 处理 "today"
    if date_spec == "today":
        date_str = today.strftime("%Y-%m-%d")
        return (date_str, date_str)

    # 处理 "yesterday"
    if date_spec == "yesterday":
        yesterday = today - timedelta(days=1)
        date_str = yesterday.strftime("%Y-%m-%d")
        return (date_str, date_str)

    # 处理 "n day(s)", "n week(s)", "n month(s)"
    relative_pattern = r"^(\d+)\s+(day|days|week|weeks|month|months)$"
    match = re.match(relative_pattern, date_spec)
    if match:
        n = int(match.group(1))
        unit = match.group(2)

        if unit in ("day", "days"):
            start = today - timedelta(days=n - 1)
        elif unit in ("week", "weeks"):
            start = today - timedelta(weeks=n)
        elif unit in ("month", "months"):
            # 近似：每月 30 天
            start = today - timedelta(days=n * 30)
        else:
            raise ValueError(f"未知单位：{unit}")

        return (start.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))

    # 处理 "YYYY-MM-DD + period"
    start_plus_pattern = r"^(\d{4}-\d{2}-\d{2})\s+(\d+)\s+(day|days|week|weeks|month|months)$"
    match = re.match(start_plus_pattern, date_spec)
    if match:
        start_str = match.group(1)
        n = int(match.group(2))
        unit = match.group(3)

        start = datetime.strptime(start_str, "%Y-%m-%d").date()

        if unit in ("day", "days"):
            end = start + timedelta(days=n)
        elif unit in ("week", "weeks"):
            end = start + timedelta(weeks=n)
        elif unit in ("month", "months"):
            # 近似：每月 30 天
            end = start + timedelta(days=n * 30)
        else:
            raise ValueError(f"未知单位：{unit}")

        return (start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))

    # 处理直接日期 "YYYY-MM-DD"
    date_pattern = r"^\d{4}-\d{2}-\d{2}$"
    if re.match(date_pattern, date_spec):
        return (date_spec, date_spec)

    raise ValueError(f"无效的日期规格：{date_spec}")
