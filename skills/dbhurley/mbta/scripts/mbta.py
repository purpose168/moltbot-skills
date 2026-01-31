#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MBTA 交通 CLI - 从 MBTA v3 API 查询实时预测。

使用方法：
    mbta.py next [--stop STOP] [--route ROUTE] [--limit N]
    mbta.py departures [--config CONFIG]
    mbta.py stops --search QUERY
    mbta.py routes [--type TYPE]
    mbta.py alerts [--route ROUTE]
    mbta.py dashboard [--config CONFIG] [--port PORT]

环境变量：
    MBTA_API_KEY - 可选但推荐用于更高的速率限制
                   免费获取：https://api-v3.mbta.com/portal
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

MBTA_API_BASE = "https://api-v3.mbta.com"
MBTA_API_KEY = os.getenv("MBTA_API_KEY")

HEADERS = {"accept": "application/json"}
if MBTA_API_KEY:
    HEADERS["x-api-key"] = MBTA_API_KEY

# 路线类型映射
ROUTE_TYPES = {
    0: "轻轨",      # Green Line
    1: "重轨",      # Red, Orange, Blue Lines
    2: "通勤铁路",
    3: "公交",
    4: "轮渡",
}


def api_get(endpoint: str, params: dict = None) -> dict:
    """向 MBTA API 发送 GET 请求。"""
    try:
        resp = requests.get(
            f"{MBTA_API_BASE}/{endpoint}",
            params=params or {},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"错误: API 请求失败 - {e}", file=sys.stderr)
        sys.exit(1)


def parse_iso8601(dt_str: Optional[str]) -> Optional[datetime]:
    """解析 ISO8601 格式的时间字符串。"""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


def now_utc() -> datetime:
    """获取当前 UTC 时间。"""
    return datetime.now(timezone.utc)


def format_minutes(delta_min: float) -> str:
    """格式化分钟数用于显示。"""
    if delta_min < 1:
        return "现在"
    elif delta_min < 60:
        return f"{int(delta_min)} 分钟"
    else:
        hours = int(delta_min // 60)
        mins = int(delta_min % 60)
        return f"{hours}小时 {mins}分钟"


def get_predictions(
    stop_id: str,
    route_id: Optional[str] = None,
    direction_id: Optional[int] = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """获取站点的发车预测。"""
    params = {
        "filter[stop]": stop_id,
        "sort": "departure_time",
        "page[limit]": limit * 2,  # 获取额外的结果用于过滤
        "include": "trip,route",
    }
    if route_id:
        params["filter[route]"] = route_id
    if direction_id is not None:
        params["filter[direction_id]"] = str(direction_id)

    data = api_get("predictions", params)
    
    # 构建查找映射
    trips = {}
    routes = {}
    for item in data.get("included", []):
        if item.get("type") == "trip":
            trips[item["id"]] = item
        elif item.get("type") == "route":
            routes[item["id"]] = item

    results = []
    now = now_utc()

    for pred in data.get("data", []):
        attrs = pred.get("attributes", {})
        
        # 获取行程信息
        trip_id = pred.get("relationships", {}).get("trip", {}).get("data", {}).get("id")
        trip = trips.get(trip_id, {})
        trip_attrs = trip.get("attributes", {})
        
        # 获取路线信息
        route_ref = pred.get("relationships", {}).get("route", {}).get("data", {}).get("id")
        route = routes.get(route_ref, {})
        route_attrs = route.get("attributes", {})
        
        # 解析发车时间
        dep_str = attrs.get("departure_time") or attrs.get("arrival_time")
        dep_dt = parse_iso8601(dep_str)
        if not dep_dt:
            continue
            
        delta = dep_dt - now
        delta_min = delta.total_seconds() / 60.0
        
        # 跳过已发车的
        if delta_min < -1:
            continue
            
        headsign = trip_attrs.get("headsign") or attrs.get("headsign", "")
        
        results.append({
            "route": route_ref or "未知",
            "route_name": route_attrs.get("long_name", route_ref),
            "route_color": route_attrs.get("color", ""),
            "headsign": headsign,
            "departure_time": dep_dt.astimezone().strftime("%H:%M"),
            "minutes": round(delta_min),
            "minutes_display": format_minutes(delta_min),
            "status": attrs.get("status"),
            "direction_id": attrs.get("direction_id"),
        })

    # 按分钟数排序并限制数量
    results.sort(key=lambda x: x["minutes"])
    return results[:limit]


def search_stops(query: str, limit: int = 10) -> list[dict]:
    """按名称搜索站点。先搜索车站，然后搜索公交站点。"""
    results = []
    query_lower = query.lower()
    
    # 首先搜索车站（location_type=1）- 这些是主要的交通枢纽
    for location_type in ["1", "0"]:
        params = {
            "filter[location_type]": location_type,
            "page[limit]": 1000,
        }
        
        data = api_get("stops", params)
        
        for stop in data.get("data", []):
            attrs = stop.get("attributes", {})
            name = attrs.get("name", "")
            
            if query_lower in name.lower():
                # 跳过重复
                if any(r["id"] == stop["id"] for r in results):
                    continue
                    
                results.append({
                    "id": stop["id"],
                    "name": name,
                    "description": attrs.get("description", ""),
                    "municipality": attrs.get("municipality", ""),
                    "wheelchair_accessible": attrs.get("wheelchair_boarding") == 1,
                    "is_station": location_type == "1",
                })
        
        # 如果从车站搜索中获得了足够的结果，则不搜索公交站点
        if len(results) >= limit:
            break
    
    # 按相关性排序（车站优先，然后是精确匹配，以查询开头，包含查询）
    def sort_key(s):
        name_lower = s["name"].lower()
        station_priority = 0 if s.get("is_station") else 1
        if name_lower == query_lower:
            return (station_priority, 0, name_lower)
        elif name_lower.startswith(query_lower):
            return (station_priority, 1, name_lower)
        else:
            return (station_priority, 2, name_lower)
    
    results.sort(key=sort_key)
    return results[:limit]


def get_routes(route_type: Optional[int] = None) -> list[dict]:
    """获取所有路线，可选按类型过滤。"""
    params = {}
    if route_type is not None:
        params["filter[type]"] = str(route_type)
    
    data = api_get("routes", params)
    
    results = []
    for route in data.get("data", []):
        attrs = route.get("attributes", {})
        results.append({
            "id": route["id"],
            "name": attrs.get("long_name", route["id"]),
            "short_name": attrs.get("short_name", ""),
            "type": ROUTE_TYPES.get(attrs.get("type"), "未知"),
            "color": attrs.get("color", ""),
            "description": attrs.get("description", ""),
        })
    
    return results


def get_alerts(route_id: Optional[str] = None) -> list[dict]:
    """获取活跃的服务警报。"""
    params = {
        "filter[activity]": "BOARD,EXIT,RIDE",
    }
    if route_id:
        params["filter[route]"] = route_id
    
    data = api_get("alerts", params)
    
    results = []
    for alert in data.get("data", []):
        attrs = alert.get("attributes", {})
        
        # 获取受影响的路线
        affected = []
        for entity in attrs.get("informed_entity", []):
            if "route" in entity:
                affected.append(entity["route"])
        
        results.append({
            "id": alert["id"],
            "header": attrs.get("header", ""),
            "description": attrs.get("description", ""),
            "severity": attrs.get("severity", ""),
            "effect": attrs.get("effect", ""),
            "affected_routes": list(set(affected)),
            "url": attrs.get("url"),
        })
    
    return results


def load_config(config_path: str) -> dict:
    """从 YAML 文件加载配置。"""
    if not YAML_AVAILABLE:
        print("错误: 需要 PyYAML。安装命令: pip install pyyaml", file=sys.stderr)
        sys.exit(1)
    
    path = Path(config_path)
    if not path.exists():
        print(f"错误: 配置文件不存在: {config_path}", file=sys.stderr)
        sys.exit(1)
    
    with open(path) as f:
        return yaml.safe_load(f)


def get_all_departures(config: dict) -> list[dict]:
    """获取所有配置站点的发车信息。"""
    results = []
    
    for panel in config.get("panels", []):
        panel_result = {
            "title": panel.get("title", "未知"),
            "walk_minutes": panel.get("walk_minutes", 5),  # 过滤掉赶不上的列车
            "services": [],
        }
        
        for service in panel.get("services", []):
            predictions = get_predictions(
                stop_id=service["stop_id"],
                route_id=service.get("route_id"),
                direction_id=service.get("direction_id"),
                limit=service.get("limit", 3),
            )
            
            # 如果指定了车头标识，则过滤
            headsign_filter = service.get("headsign_contains", "").lower()
            if headsign_filter:
                predictions = [
                    p for p in predictions
                    if headsign_filter in p["headsign"].lower()
                ]
            
            # 应用步行时间过滤
            walk_min = panel.get("walk_minutes", 0)
            predictions = [
                p for p in predictions
                if p["minutes"] >= walk_min - 1
            ]
            
            # 标记警告
            for p in predictions:
                p["warning"] = walk_min <= p["minutes"] < walk_min + 2
            
            panel_result["services"].append({
                "label": service.get("label", service.get("route_id", "未知")),
                "destination": service.get("destination", ""),
                "predictions": predictions[:3],
            })
        
        results.append(panel_result)
    
    return results


def print_predictions(predictions: list[dict], title: str = None):
    """美化打印预测结果。"""
    if title:
        print(f"\n🚇 {title}")
        print("-" * 40)
    
    if not predictions:
        print("  没有即将到来的发车")
        return
    
    for p in predictions:
        warning = "⚠️ " if p.get("warning") else ""
        route = p["route"]
        headsign = p["headsign"]
        mins = p["minutes_display"]
        time = p["departure_time"]
        
        print(f"  {warning}{route} → {headsign}")
        print(f"     {mins} (在 {time})")


def cmd_next(args):
    """处理 'next' 命令 - 快速查询发车时间。"""
    if not args.stop:
        print("错误: --stop 是必需的", file=sys.stderr)
        sys.exit(1)
    
    predictions = get_predictions(
        stop_id=args.stop,
        route_id=args.route,
        limit=args.limit,
    )
    
    if args.json:
        print(json.dumps(predictions, indent=2))
    else:
        print_predictions(predictions, f"从 {args.stop} 出发")


def cmd_departures(args):
    """处理 'departures' 命令 - 所有配置站点的发车信息。"""
    config = load_config(args.config)
    results = get_all_departures(config)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for panel in results:
            print(f"\n{'='*50}")
            print(f"📍 {panel['title']} (步行: {panel['walk_minutes']} 分钟)")
            print("=" * 50)
            
            for service in panel["services"]:
                label = service["label"]
                dest = service["destination"]
                print(f"\n  {label} {dest}")
                
                if not service["predictions"]:
                    print("    没有即将到来的发车")
                    continue
                
                for p in service["predictions"]:
                    warning = "⚠️ " if p.get("warning") else "  "
                    print(f"    {warning}{p['minutes_display']} (在 {p['departure_time']})")


def cmd_stops(args):
    """处理 'stops' 命令 - 搜索站点。"""
    results = search_stops(args.search)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n🔍 匹配 '{args.search}' 的站点:")
        print("-" * 40)
        
        if not results:
            print("  未找到站点")
            return
        
        for stop in results:
            access = "♿" if stop["wheelchair_accessible"] else ""
            print(f"  {stop['id']}: {stop['name']} {access}")
            if stop["municipality"]:
                print(f"     ({stop['municipality']})")


def cmd_routes(args):
    """处理 'routes' 命令 - 列出路线。"""
    route_type = None
    if args.type:
        type_map = {
            "rail": 1,
            "subway": 1,
            "light": 0,
            "green": 0,
            "bus": 3,
            "commuter": 2,
            "ferry": 4,
        }
        route_type = type_map.get(args.type.lower())
    
    results = get_routes(route_type)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n🚇 MBTA 路线:")
        print("-" * 40)
        
        current_type = None
        for route in results:
            if route["type"] != current_type:
                current_type = route["type"]
                print(f"\n{current_type}:")
            
            name = route["name"] or route["short_name"]
            print(f"  {route['id']}: {name}")


def cmd_alerts(args):
    """处理 'alerts' 命令 - 服务警报。"""
    results = get_alerts(args.route)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n⚠️  服务警报:")
        print("-" * 40)
        
        if not results:
            print("  没有活跃的警报")
            return
        
        for alert in results:
            routes = ", ".join(alert["affected_routes"][:3])
            print(f"\n  [{alert['severity']}] {routes}")
            print(f"  {alert['header']}")
            if alert["effect"]:
                print(f"  影响: {alert['effect']}")


def cmd_dashboard(args):
    """处理 'dashboard' 命令 - 启动网络服务器。"""
    try:
        from flask import Flask, render_template_string
    except ImportError:
        print("错误: 仪表板需要 Flask。安装命令: pip install flask", file=sys.stderr)
        sys.exit(1)
    
    config = load_config(args.config)
    
    app = Flask(__name__)
    
    TEMPLATE = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>MBTA Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f4f4f4; }
            .panel { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 15px; }
            .service { margin-bottom: 15px; }
            .service-label { font-weight: bold; color: #555; }
            .prediction { margin-left: 20px; margin-top: 5px; }
            .warning { color: #d9534f; font-weight: bold; }
            .time { font-size: 14px; color: #666; }
            .no-pred { color: #999; font-style: italic; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <h1>🚇 MBTA Dashboard</h1>
        {% for panel in panels %}
        <div class="panel">
            <div class="title">{{ panel.title }}</div>
            <div class="subtitle">步行时间: {{ panel.walk_minutes }} 分钟</div>
            {% for service in panel.services %}
            <div class="service">
                <div class="service-label">{{ service.label }} {{ service.destination }}</div>
                {% if service.predictions %}
                    {% for pred in service.predictions %}
                    <div class="prediction">
                        {% if pred.warning %}<span class="warning">⚠️ </span>{% endif %}
                        {{ pred.minutes_display }} ({{ pred.departure_time }})
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="prediction no-pred">没有即将到来的发车</div>
                {% endif %}
            </div>
            {% endfor %}
        </div>
        {% endfor %}
        <div class="footer">
            <p>Last updated: {{ now }}</p>
            <p>Data from MBTA API</p>
        </div>
    </body>
    </html>
    """
    
    @app.route('/')
    def index():
        panels = get_all_departures(config)
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return render_template_string(TEMPLATE, panels=panels, now=now)
    
    port = args.port or 6639
    print(f"\n🌐 启动 MBTA 仪表板在 http://localhost:{port}")
    print(f"  按 Ctrl+C 停止")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 仪表板已停止")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="MBTA 交通 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n示例:\n"+
              "  python mbta.py next --stop place-alfcl  # Alewife 的下一班车\n"+
              "  python mbta.py stops --search Porter     # 搜索 Porter 站点\n"+
              "  python mbta.py routes --type rail        # 仅列出地铁线路\n"+
              "  python mbta.py alerts --route Red        # 红线警报"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # next 命令
    p_next = subparsers.add_parser("next", help="查询站点的下一班车")
    p_next.add_argument("--stop", required=True, help="站点 ID (例如: place-alfcl)")
    p_next.add_argument("--route", help="路线 ID (例如: Red)")
    p_next.add_argument("--limit", type=int, default=5, help="结果数量")
    p_next.add_argument("--json", action="store_true", help="JSON 输出")
    p_next.set_defaults(func=cmd_next)
    
    # departures 命令
    p_departures = subparsers.add_parser("departures", help="获取所有配置站点的发车信息")
    p_departures.add_argument("--config", default="config.yaml", help="配置文件路径")
    p_departures.add_argument("--json", action="store_true", help="JSON 输出")
    p_departures.set_defaults(func=cmd_departures)
    
    # stops 命令
    p_stops = subparsers.add_parser("stops", help="搜索站点")
    p_stops.add_argument("--search", required=True, help="搜索关键词")
    p_stops.add_argument("--json", action="store_true", help="JSON 输出")
    p_stops.set_defaults(func=cmd_stops)
    
    # routes 命令
    p_routes = subparsers.add_parser("routes", help="列出路线")
    p_routes.add_argument("--type", help="路线类型 (rail, bus, ferry)")
    p_routes.add_argument("--json", action="store_true", help="JSON 输出")
    p_routes.set_defaults(func=cmd_routes)
    
    # alerts 命令
    p_alerts = subparsers.add_parser("alerts", help="获取服务警报")
    p_alerts.add_argument("--route", help="路线 ID (例如: Red)")
    p_alerts.add_argument("--json", action="store_true", help="JSON 输出")
    p_alerts.set_defaults(func=cmd_alerts)
    
    # dashboard 命令
    p_dashboard = subparsers.add_parser("dashboard", help="启动网络仪表板")
    p_dashboard.add_argument("--config", default="config.yaml", help="配置文件路径")
    p_dashboard.add_argument("--port", type=int, help="端口号")
    p_dashboard.set_defaults(func=cmd_dashboard)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        args.func(args)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
