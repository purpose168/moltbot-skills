"""HTML 输出的 Chart.js 配置生成。"""

import json

from ouracli.chart_utils import bucket_regular_data, bucket_timeseries_data, create_hour_labels


def create_chartjs_heartrate_config(heartrate_data: list[dict], chart_id: str) -> str:
    """
    为心率数据创建 Chart.js 配置。

    参数:
        heartrate_data: 包含 'timestamp' 和 'bpm' 键的字典列表
        chart_id: 图表的唯一 ID

    返回:
        渲染图表的 JavaScript 代码
    """
    if not heartrate_data:
        return ""

    # 从原始数据获取 Y 轴范围的实际最小值/最大值
    all_bpms: list[float] = [
        float(reading.get("bpm"))  # type: ignore[arg-type]
        for reading in heartrate_data
        if reading.get("bpm") is not None
    ]
    if not all_bpms:
        return ""

    actual_min: float = min(all_bpms) - 10  # 最小值以下 10 BPM
    actual_max: float = max(all_bpms)

    # 创建 288 个桶（24 小时 * 12 = 每 5 分钟一个桶）
    bucket_averages = bucket_timeseries_data(
        heartrate_data, "timestamp", "bpm", bucket_minutes=5, buckets_per_day=288
    )

    # 创建标签：在小时边界显示小时标签
    labels = create_hour_labels(num_buckets=288, buckets_per_hour=12)

    # 将 None 转换为 null，数字保持原样用于 Chart.js
    data_values = [round(v) if v is not None else None for v in bucket_averages]

    return f"""
    new Chart(document.getElementById('{chart_id}'), {{
        type: 'bar',
        data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
                label: 'BPM (5分钟平均)',
                data: {json.dumps(data_values)},
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }}]
        }},
        options: {{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{
                legend: {{
                    display: false
                }},
                title: {{
                    display: true,
                    text: '24小时心率（5分钟分辨率）',
                    color: '#333',
                    font: {{
                        size: 16
                    }}
                }},
                tooltip: {{
                    callbacks: {{
                        title: function(context) {{
                            const idx = context[0].dataIndex;
                            const hour = Math.floor(idx / 12);
                            const minute = (idx % 12) * 5;
                            const hourStr = hour.toString().padStart(2, '0');
                            const minStr = minute.toString().padStart(2, '0');
                            return hourStr + ':' + minStr;
                        }}
                    }}
                }}
            }},
            scales: {{
                y: {{
                    beginAtZero: false,
                    min: {actual_min},
                    max: {actual_max},
                    title: {{
                        display: true,
                        text: 'BPM',
                        color: '#666'
                    }},
                    ticks: {{
                        color: '#666'
                    }},
                    grid: {{
                        color: 'rgba(0, 0, 0, 0.1)'
                    }}
                }},
                x: {{
                    title: {{
                        display: true,
                        text: '小时',
                        color: '#666'
                    }},
                    ticks: {{
                        color: '#666',
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    }},
                    grid: {{
                        color: function(context) {{
                            // 小时边界有较暗的网格线
                            const isHourBoundary = context.index % 12 === 0;
                            return isHourBoundary ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)';
                        }}
                    }}
                }}
            }}
        }}
    }});
    """


def create_chartjs_config(met_items: list[float], chart_id: str) -> str:
    """
    为 MET 活动数据创建 Chart.js 配置。

    参数:
        met_items: MET 值列表（每分钟一个，通常为 1440 个项目）
        chart_id: 图表的唯一 ID

    返回:
        渲染图表的 JavaScript 代码
    """
    # 分组为 5 分钟桶（288 个桶 = 24 小时 * 12）
    five_minute_buckets = bucket_regular_data(met_items, target_buckets=288, aggregation="avg")

    # 如有需要，用零填充
    while len(five_minute_buckets) < 288:
        five_minute_buckets.append(0)

    # 创建标签：在小时边界显示小时标签
    labels = create_hour_labels(num_buckets=288, buckets_per_hour=12)

    # MET 值四舍五入到 2 位小数
    data_values = [round(v, 2) for v in five_minute_buckets]

    return f"""
    new Chart(document.getElementById('{chart_id}'), {{
        type: 'bar',
        data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
                label: 'MET (5分钟平均)',
                data: {json.dumps(data_values)},
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }}]
        }},
        options: {{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {{
                legend: {{
                    display: false
                }},
                title: {{
                    display: true,
                    text: '24小时MET活动（5分钟分辨率）',
                    color: '#333',
                    font: {{
                        size: 16
                    }}
                }},
                tooltip: {{
                    callbacks: {{
                        title: function(context) {{
                            const idx = context[0].dataIndex;
                            const hour = Math.floor(idx / 12);
                            const minute = (idx % 12) * 5;
                            const hourStr = hour.toString().padStart(2, '0');
                            const minStr = minute.toString().padStart(2, '0');
                            return hourStr + ':' + minStr;
                        }}
                    }}
                }}
            }},
            scales: {{
                y: {{
                    beginAtZero: true,
                    max: 6,
                    title: {{
                        display: true,
                        text: 'MET',
                        color: '#666'
                    }},
                    ticks: {{
                        color: '#666'
                    }},
                    grid: {{
                        color: 'rgba(0, 0, 0, 0.1)'
                    }}
                }},
                x: {{
                    title: {{
                        display: true,
                        text: '小时',
                        color: '#666'
                    }},
                    ticks: {{
                        color: '#666',
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    }},
                    grid: {{
                        color: function(context) {{
                            // 小时边界有较暗的网格线
                            const isHourBoundary = context.index % 12 === 0;
                            return isHourBoundary ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)';
                        }}
                    }}
                }}
            }}
        }}
    }});
    """
