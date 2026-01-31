#!/usr/bin/env python3
"""
航班跟踪命令行工具 - 检查状态、延误情况并设置提醒。

使用方法:
    flights.py status <flight> [--date DATE]
    flights.py search <origin> <dest> [--date DATE] [--airline AIRLINE]
    flights.py track <flight> [--notify]
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("安装依赖项: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# 航空公司代码
AIRLINES = {
    "MX": "Breeze Airways",
    "AA": "American Airlines",
    "DL": "Delta",
    "UA": "United",
    "WN": "Southwest",
    "B6": "JetBlue",
    "AS": "Alaska",
    "NK": "Spirit",
    "F9": "Frontier",
}


def get_flightaware_status(flight_number: str, date: str = None) -> dict:
    """
    从 FlightAware 获取航班状态。
    
    参数:
        flight_number: 航班号（例如：MX123, AA100）
        date: 日期（可选，格式：YYYY-MM-DD）
        
    返回:
        包含航班状态信息的字典
    """
    # 清理航班号格式
    flight = flight_number.upper().replace(" ", "")
    
    # 构建 URL
    url = f"https://www.flightaware.com/live/flight/{flight}"
    if date:
        url += f"/{date}"
    
    headers = {"User-Agent": USER_AGENT}
    
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}"}
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # 尝试提取航班数据
        data = {"flight": flight, "source": "flightaware", "url": url}
        
        # 查找航班状态
        status_elem = soup.select_one(".flightPageStatus")
        if status_elem:
            data["status"] = status_elem.get_text(strip=True)
        
        # 查找出发/到达信息
        for row in soup.select(".flightPageSummaryRow"):
            label = row.select_one(".flightPageSummaryLabel")
            value = row.select_one(".flightPageSummaryValue")
            if label and value:
                key = label.get_text(strip=True).lower().replace(" ", "_")
                data[key] = value.get_text(strip=True)
        
        # 尝试使用新布局的选择器
        origin = soup.select_one("[data-origin]")
        dest = soup.select_one("[data-destination]")
        if origin:
            data["origin"] = origin.get("data-origin") or origin.get_text(strip=True)
        if dest:
            data["destination"] = dest.get("data-destination") or dest.get_text(strip=True)
        
        # 查找各种格式的时间信息
        time_blocks = soup.select(".flightPageDataBlock")
        for block in time_blocks:
            title = block.select_one(".flightPageDataTitle")
            value = block.select_one(".flightPageDataValue, .flightPageDataTime")
            if title and value:
                key = title.get_text(strip=True).lower().replace(" ", "_")
                data[key] = value.get_text(strip=True)
        
        return data
        
    except Exception as e:
        return {"error": str(e)}


def search_flights_flightaware(origin: str, dest: str, date: str = None, airline: str = None) -> list:
    """
    搜索两个机场之间的航班。
    
    参数:
        origin: 出发机场代码（例如：PVD）
        dest: 到达机场代码（例如：ORF）
        date: 日期（可选，格式：YYYY-MM-DD）
        airline: 航空公司代码（可选，例如：MX）
        
    返回:
        航班信息列表
    """
    origin = origin.upper()
    dest = dest.upper()
    
    # FlightAware 航线搜索
    url = f"https://www.flightaware.com/live/findflight?origin={origin}&destination={dest}"
    
    headers = {"User-Agent": USER_AGENT}
    
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        
        flights = []
        
        # FlightAware 在 JS 变量中返回 JSON
        import re
        match = re.search(r'FA\.findflight\.resultsContent\s*=\s*(\[.*?\]);', resp.text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                for flight in data:
                    flight_ident = flight.get("flightIdent", "")
                    # 从 HTML 中提取航班号
                    fn_match = re.search(r'>([A-Z]{2,3}\d+)<', flight_ident)
                    flight_num = fn_match.group(1) if fn_match else ""
                    
                    # 如果指定了航空公司，则过滤
                    if airline:
                        airline_upper = airline.upper()
                        if not flight_num.upper().startswith(airline_upper):
                            # 同时检查 Breeze 航空的 MXY 代码（对应 MX）
                            if airline_upper == "MX" and not flight_num.upper().startswith("MXY"):
                                continue
                            elif airline_upper != "MX":
                                continue
                    
                    # 只包含直飞航班
                    if flight.get("nonstop") != "Nonstop":
                        continue
                    
                    # 清理状态中的 HTML
                    status_raw = flight.get("flightStatus", "")
                    status = re.sub(r'<[^>]+>', '', status_raw).strip()
                    
                    # 清理时间信息
                    dep_time = re.sub(r'<[^>]+>', ' ', flight.get("flightDepartureTime", "")).strip()
                    arr_time = re.sub(r'<[^>]+>', ' ', flight.get("flightArrivalTime", "")).strip()
                    dep_day = re.sub(r'<[^>]+>', '', flight.get("flightDepartureDay", "")).strip()
                    
                    flight_data = {
                        "flight": flight_num,
                        "airline": flight.get("airlineName", ""),
                        "origin": flight.get("origin", ""),
                        "destination": flight.get("destination", ""),
                        "departure": f"{dep_day} {dep_time}",
                        "arrival": arr_time,
                        "status": status,
                        "aircraft": flight.get("aircraftType", ""),
                    }
                    flights.append(flight_data)
            except json.JSONDecodeError:
                pass
        
        return flights
        
    except Exception as e:
        return [{"error": str(e)}]


def get_aviationstack_status(flight_number: str, api_key: str) -> dict:
    """
    从 AviationStack API 获取航班状态。
    
    参数:
        flight_number: 航班号
        api_key: AviationStack API 密钥
        
    返回:
        包含航班状态信息的字典
    """
    url = "http://api.aviationstack.com/v1/flights"
    params = {
        "access_key": api_key,
        "flight_iata": flight_number.upper(),
    }
    
    try:
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        
        if data.get("error"):
            return {"error": data["error"].get("message", "API 错误")}
        
        flights = data.get("data", [])
        if not flights:
            return {"error": "未找到航班"}
        
        flight = flights[0]
        return {
            "flight": flight.get("flight", {}).get("iata"),
            "airline": flight.get("airline", {}).get("name"),
            "origin": flight.get("departure", {}).get("airport"),
            "origin_code": flight.get("departure", {}).get("iata"),
            "destination": flight.get("arrival", {}).get("airport"),
            "dest_code": flight.get("arrival", {}).get("iata"),
            "scheduled_departure": flight.get("departure", {}).get("scheduled"),
            "actual_departure": flight.get("departure", {}).get("actual"),
            "scheduled_arrival": flight.get("arrival", {}).get("scheduled"),
            "actual_arrival": flight.get("arrival", {}).get("actual"),
            "status": flight.get("flight_status"),
            "delay": flight.get("departure", {}).get("delay"),
            "source": "aviationstack",
        }
        
    except Exception as e:
        return {"error": str(e)}


def cmd_status(args):
    """
    获取航班状态命令。
    """
    api_key = os.environ.get("AVIATIONSTACK_API_KEY")
    
    # 如果有 API 密钥，先尝试使用 AviationStack
    if api_key:
        result = get_aviationstack_status(args.flight, api_key)
        if not result.get("error"):
            print(json.dumps(result, indent=2))
            return
    
    # 回退到 FlightAware 抓取
    result = get_flightaware_status(args.flight, args.date)
    print(json.dumps(result, indent=2))


def cmd_search(args):
    """
    搜索航班命令。
    """
    results = search_flights_flightaware(args.origin, args.dest, args.date, args.airline)
    print(json.dumps(results, indent=2))


def main():
    """
    主函数：解析命令行参数并执行相应操作。
    """
    parser = argparse.ArgumentParser(description="航班跟踪命令行工具")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # status 命令
    p = subparsers.add_parser("status", help="获取航班状态")
    p.add_argument("flight", help="航班号（例如：MX123, AA100）")
    p.add_argument("--date", help="日期（YYYY-MM-DD）")
    p.set_defaults(func=cmd_status)
    
    # search 命令
    p = subparsers.add_parser("search", help="按航线搜索航班")
    p.add_argument("origin", help="出发机场代码（例如：PVD）")
    p.add_argument("dest", help="到达机场代码（例如：ORF）")
    p.add_argument("--date", help="日期（YYYY-MM-DD）")
    p.add_argument("--airline", help="航空公司代码过滤（例如：MX）")
    p.set_defaults(func=cmd_search)
    
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
