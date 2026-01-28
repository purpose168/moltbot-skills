#!/usr/bin/env python3
"""
航班跟踪器 - 使用 AviationStack API
获取实时航班数据并以 Flighty 风格格式显示
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    print("错误: 未安装 'requests' 库。安装命令: pip3 install requests")
    sys.exit(1)


def get_api_key() -> Optional[str]:
    """从环境变量获取 API 密钥"""
    api_key = os.environ.get('AVIATIONSTACK_API_KEY')
    if not api_key:
        print("错误: 未设置 AVIATIONSTACK_API_KEY 环境变量")
        print("获取免费 API 密钥: https://aviationstack.com/signup/free")
        print("然后设置: export AVIATIONSTACK_API_KEY='your-key-here'")
        sys.exit(1)
    return api_key


def fetch_flight_data(flight_number: str, api_key: str) -> dict:
    """从 AviationStack API 获取航班数据"""
    base_url = "http://api.aviationstack.com/v1/flights"
    
    params = {
        'access_key': api_key,
        'flight_iata': flight_number.upper()
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"获取航班数据时出错: {e}")
        sys.exit(1)


def format_time(time_str: Optional[str]) -> str:
    """将 ISO 时间字符串格式化为可读格式"""
    if not time_str:
        return "N/A"
    
    try:
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        return dt.strftime("%I:%M %p %Z")
    except (ValueError, AttributeError):
        return time_str or "N/A"


def format_date(time_str: Optional[str]) -> str:
    """将 ISO 时间字符串格式化为日期"""
    if not time_str:
        return ""
    
    try:
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        return dt.strftime("%b %d")
    except (ValueError, AttributeError):
        return ""


def get_status_emoji(status: Optional[str]) -> str:
    """获取航班状态的表情符号"""
    if not status:
        return "⚪"
    
    status_lower = status.lower()
    if "active" in status_lower or "airborne" in status_lower or "en-route" in status_lower:
        return "🟢"
    elif "landed" in status_lower or "arrived" in status_lower:
        return "✅"
    elif "scheduled" in status_lower:
        return "🟡"
    elif "delayed" in status_lower:
        return "🟠"
    elif "cancelled" in status_lower or "canceled" in status_lower:
        return "🔴"
    else:
        return "⚪"


def calculate_delay(scheduled: Optional[str], actual: Optional[str]) -> Optional[str]:
    """计算延误时间（分钟）"""
    if not scheduled or not actual:
        return None
    
    try:
        sched_dt = datetime.fromisoformat(scheduled.replace('Z', '+00:00'))
        actual_dt = datetime.fromisoformat(actual.replace('Z', '+00:00'))
        diff = (actual_dt - sched_dt).total_seconds() / 60
        
        if diff > 5:
            return f"{int(diff)} 分钟延误"
        elif diff < -5:
            return f"{int(abs(diff))} 分钟提前"
        else:
            return "准点"
    except (ValueError, AttributeError):
        return None


def display_flight(flight_data: dict) -> None:
    """以 Flighty 风格格式显示航班数据"""
    
    if not flight_data.get('data') or len(flight_data['data']) == 0:
        print("❌ 未找到该航班号")
        return
    
    # 获取第一个航班结果
    flight = flight_data['data'][0]
    
    # 提取数据
    flight_num = flight.get('flight', {})
    airline = flight.get('airline', {})
    departure = flight.get('departure', {})
    arrival = flight.get('arrival', {})
    aircraft = flight.get('aircraft', {})
    live = flight.get('live', {})
    flight_status = flight.get('flight_status', '')
    
    # 航空公司信息
    airline_name = airline.get('name', '未知航空公司')
    flight_iata = flight_num.get('iata', flight_num.get('icao', 'N/A'))
    
    # 出发信息
    dep_airport = departure.get('airport', '未知')
    dep_iata = departure.get('iata', 'N/A')
    dep_terminal = departure.get('terminal', '')
    dep_gate = departure.get('gate', '')
    dep_scheduled = departure.get('scheduled')
    dep_estimated = departure.get('estimated')
    dep_actual = departure.get('actual')
    
    # 到达信息
    arr_airport = arrival.get('airport', '未知')
    arr_iata = arrival.get('iata', 'N/A')
    arr_terminal = arrival.get('terminal', '')
    arr_gate = arrival.get('gate', '')
    arr_scheduled = arrival.get('scheduled')
    arr_estimated = arrival.get('estimated')
    arr_actual = arrival.get('actual')
    
    # 飞机信息
    aircraft_reg = aircraft.get('registration', '')
    aircraft_iata = aircraft.get('iata', '')
    aircraft_icao = aircraft.get('icao', '')
    
    # 实时位置
    altitude = live.get('altitude') if live else None
    speed = live.get('speed_horizontal') if live else None
    latitude = live.get('latitude') if live else None
    longitude = live.get('longitude') if live else None
    
    # 计算延误
    dep_delay = calculate_delay(dep_scheduled, dep_actual or dep_estimated)
    arr_delay = calculate_delay(arr_scheduled, arr_actual or arr_estimated)
    
    # 状态表情符号
    status_emoji = get_status_emoji(flight_status)
    
    # 以 Flighty 风格显示
    print("─" * 50)
    print(f"\n✈️  **{airline_name.upper()} {flight_iata}**")
    if aircraft_iata or aircraft_icao:
        print(f"🛩️  {aircraft_icao or aircraft_iata}{' • ' + aircraft_reg if aircraft_reg else ''}")
    print()
    
    # 出发
    print("**🛫 出发**")
    print(f"{dep_airport} ({dep_iata})")
    if dep_terminal:
        print(f"航站楼 {dep_terminal}{', 登机口 ' + dep_gate if dep_gate else ''}")
    print(f"计划时间: {format_time(dep_scheduled)}")
    if dep_estimated and dep_estimated != dep_scheduled:
        print(f"预计时间: {format_time(dep_estimated)}", end="")
        if dep_delay:
            print(f" ⏱️  *{dep_delay}*")
        else:
            print()
    if dep_actual:
        print(f"实际时间: {format_time(dep_actual)}")
    print()
    
    # 到达
    print("**🛬 到达**")
    print(f"{arr_airport} ({arr_iata})")
    if arr_terminal:
        print(f"航站楼 {arr_terminal}{', 登机口 ' + arr_gate if arr_gate else ''}")
    print(f"计划时间: {format_time(arr_scheduled)}")
    if arr_estimated and arr_estimated != arr_scheduled:
        print(f"预计时间: {format_time(arr_estimated)}", end="")
        if arr_delay:
            print(f" ⏱️  *{arr_delay}*")
        else:
            print()
    if arr_actual:
        print(f"实际时间: {format_time(arr_actual)}")
    print()
    
    # 航班状态和进度
    print("**📊 航班状态**")
    print(f"状态: {status_emoji} **{flight_status.upper()}**")
    
    if altitude or speed:
        print()
        if altitude:
            print(f"高度: {int(altitude):,} 英尺")
        if speed:
            print(f"速度: {int(speed)} 公里/小时")
        if latitude and longitude:
            print(f"位置: {latitude:.4f}, {longitude:.4f}")
    
    print("\n" + "─" * 50)


def main():
    parser = argparse.ArgumentParser(
        description='使用 AviationStack API 实时跟踪航班',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s AA100
  %(prog)s UA2402
  %(prog)s BA123 --json

设置:
  1. 获取免费 API 密钥: https://aviationstack.com/signup/free
  2. 设置环境变量: export AVIATIONSTACK_API_KEY='your-key-here'
        """
    )
    
    parser.add_argument(
        'flight_number',
        help='航班号（例如 AA100, UA2402）'
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='输出原始 JSON 数据而不是格式化显示'
    )
    
    args = parser.parse_args()
    
    # 获取 API 密钥
    api_key = get_api_key()
    
    # 获取航班数据
    flight_data = fetch_flight_data(args.flight_number, api_key)
    
    # 显示结果
    if args.json:
        print(json.dumps(flight_data, indent=2))
    else:
        display_flight(flight_data)


if __name__ == '__main__':
    main()
