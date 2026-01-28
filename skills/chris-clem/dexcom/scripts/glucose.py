#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pydexcom", "fire"]
# ///

"""
Dexcom 血糖监测脚本

此脚本用于通过 Dexcom Share API 获取实时血糖数据。
支持格式化输出和 JSON 原始数据两种模式。

使用方法：
    uv run {baseDir}/scripts/glucose.py now    # 格式化的血糖报告
    uv run {baseDir}/scripts/glucose.py json    # 原始 JSON 数据
"""

import json
import os

from pydexcom import Dexcom
import fire


def get_reading():
    """
    获取当前血糖读数
    
    从 Dexcom Share API 获取实时血糖数据，
    包括血糖值、趋势描述和时间戳。
    
    需要设置以下环境变量：
        DEXCOM_USER: Dexcom 账户邮箱
        DEXCOM_PASSWORD: Dexcom 账户密码
        DEXCOM_REGION: 地区代码（"ous" 或 "us"，默认为 "ous"）
    
    返回:
        dict: 包含以下键的字典：
            - mg_dl: 血糖值（毫克/分升）
            - mmol_l: 血糖值（毫摩尔/升）
            - trend: 血糖趋势描述
            - time: 读数时间戳
    """
    # 从环境变量获取凭据
    username = os.getenv("DEXCOM_USER")
    password = os.getenv("DEXCOM_PASSWORD")
    region = os.getenv("DEXCOM_REGION", "ous")

    # 验证凭据是否设置
    if not username or not password:
        raise SystemExit("错误: 未设置 DEXCOM_USER 或 DEXCOM_PASSWORD 环境变量")

    # 初始化 Dexcom 客户端
    dexcom = Dexcom(username=username, password=password, region=region)
    
    # 获取当前血糖读数
    reading = dexcom.get_current_glucose_reading()
    
    # 返回结构化数据
    return {
        "mg_dl": reading.mg_dl,
        "mmol_l": reading.mmol_l,
        "trend": reading.trend_description,
        "time": str(reading.datetime),
    }


def report():
    """
    打印格式化的血糖报告
    
    获取当前血糖数据并以用户友好的格式显示，
    包含血糖值、趋势箭头、状态指示和时间戳。
    """
    r = get_reading()
    
    # 趋势箭头映射（英文描述 -> 表情符号）
    trend_emoji = {
        "rising quickly": "⬆️⬆️",   # 快速上升
        "rising": "⬆️",             # 上升
        "rising slightly": "↗️",     # 略微上升
        "steady": "➡️",              # 稳定
        "falling slightly": "↘️",    # 略微下降
        "falling": "⬇️",             # 下降
        "falling quickly": "⬇️⬇️",   # 快速下降
    }.get(r["trend"].lower(), "❓")  # 未知趋势

    mg = r["mg_dl"]
    
    # 根据血糖值确定状态
    # 血糖范围参考（mg/dL）：
    # - < 70: 低血糖（Low）
    # - 70-79: 偏低（Low）
    # - 80-140: 正常范围（In range）
    # - 141-180: 偏高（High）
    # - > 180: 高血糖（High）
    if mg < 70:
        status = "🔴 低血糖"  # LOW
    elif mg < 80:
        status = "🟡 偏低"    # Low
    elif mg <= 140:
        status = "🟢 正常范围"  # In range
    elif mg <= 180:
        status = "🟡 偏高"    # High
    else:
        status = "🔴 高血糖"  # HIGH

    # 打印格式化的报告
    print(f"🩸 血糖: {mg} mg/dL ({r['mmol_l']:.1f} mmol/L)")
    print(f"📈 趋势: {r['trend']} {trend_emoji}")
    print(f"🎯 状态: {status}")
    print(f"⏰ {r['time']}")


def json_output():
    """
    以 JSON 格式输出原始血糖数据
    
    将血糖读数以 JSON 格式打印到标准输出，
    便于程序化处理或集成到其他系统。
    """
    print(json.dumps(get_reading(), indent=2, sort_keys=True))


if __name__ == "__main__":
    # 使用 fire 库创建命令行接口
    fire.Fire(
        {
            "now": report,       # now 子命令：格式化的血糖报告
            "json": json_output, # json 子命令：原始 JSON 数据
        }
    )
