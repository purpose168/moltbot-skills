#!/usr/bin/env python3
"""
Simmer 天气交易技能

使用 NOAA 天气预报交易 Polymarket 天气市场。
灵感来自 gopfan2 的 200 万美元天气交易策略。

使用方法:
    python weather_trader.py              # 运行交易扫描
    python weather_trader.py --dry-run    # 显示机会但不交易
    python weather_trader.py --positions  # 仅显示当前持仓

环境变量要求:
    SIMMER_API_KEY - 从 simmer.markets/dashboard 获取
"""

import os
import sys
import re
import json
import argparse
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

# =============================================================================
# 配置
# =============================================================================

# Simmer API 基础地址
SIMMER_API_BASE = "https://api.simmer.markets"
# NOAA 天气 API 基础地址
NOAA_API_BASE = "https://api.weather.gov"

# Polymarket 交易约束
MIN_SHARES_PER_ORDER = 5.0  # Polymarket 要求最少 5 股
MIN_TICK_SIZE = 0.01        # 最小可交易价格单位

# 策略参数 - 可通过环境变量配置
# 用户可以通过 Clawdbot 聊天在设置期间配置这些参数
ENTRY_THRESHOLD = float(os.environ.get("SIMMER_WEATHER_ENTRY", "0.15"))   # 入场阈值
EXIT_THRESHOLD = float(os.environ.get("SIMMER_WEATHER_EXIT", "0.45"))     # 出场阈值
MAX_POSITION_USD = float(os.environ.get("SIMMER_WEATHER_MAX_POSITION", "2.00"))  # 最大仓位（美元）

# 支持的位置（与 Polymarket 解析源匹配）
LOCATIONS = {
    "NYC": {"lat": 40.7769, "lon": -73.8740, "name": "纽约市（拉瓜迪亚机场）"},
    "Chicago": {"lat": 41.9742, "lon": -87.9073, "name": "芝加哥（奥黑尔机场）"},
    "Seattle": {"lat": 47.4502, "lon": -122.3088, "name": "西雅图（塔科马机场）"},
    "Atlanta": {"lat": 33.6407, "lon": -84.4277, "name": "亚特兰大（哈茨菲尔德机场）"},
    "Dallas": {"lat": 32.8998, "lon": -97.0403, "name": "达拉斯（沃斯堡机场）"},
    "Miami": {"lat": 25.7959, "lon": -80.2870, "name": "迈阿密（国际机场）"},
}

# 活跃位置 - 可通过环境变量配置（逗号分隔）
# 示例: SIMMER_WEATHER_LOCATIONS="NYC,Chicago,Miami"
_locations_env = os.environ.get("SIMMER_WEATHER_LOCATIONS", "NYC")
ACTIVE_LOCATIONS = [loc.strip().upper() for loc in _locations_env.split(",") if loc.strip()]

# =============================================================================
# NOAA 天气 API
# =============================================================================

def fetch_json(url, headers=None):
    """
    从 URL 获取 JSON 数据，包含错误处理。

    参数:
        url: 要请求的 URL 地址
        headers: 可选的请求头字典

    返回:
        解析后的 JSON 数据（字典或列表），失败时返回 None
    """
    try:
        req = Request(url, headers=headers or {})
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        print(f"  HTTP 错误 {e.code}: {url}")
        return None
    except URLError as e:
        print(f"  URL 错误: {e.reason}")
        return None
    except Exception as e:
        print(f"  获取 {url} 时出错: {e}")
        return None


def get_noaa_forecast(location: str) -> dict:
    """
    获取指定位置的 NOAA 天气预报。

    参数:
        location: 位置代码（如 "NYC", "Chicago"）

    返回:
        字典，键为日期，值为 {"high": 最高温度, "low": 最低温度}
        例如: {"2026-01-28": {"high": 45, "low": 32}}
    """
    if location not in LOCATIONS:
        print(f"  未知位置: {location}")
        return {}

    loc = LOCATIONS[location]
    headers = {
        "User-Agent": "SimmerWeatherSkill/1.0 (https://simmer.markets)",
        "Accept": "application/geo+json",
    }

    # 步骤 1: 获取坐标的网格信息
    points_url = f"{NOAA_API_BASE}/points/{loc['lat']},{loc['lon']}"
    points_data = fetch_json(points_url, headers)

    if not points_data or "properties" not in points_data:
        print(f"  无法获取 {location} 的 NOAA 网格信息")
        return {}

    forecast_url = points_data["properties"].get("forecast")
    if not forecast_url:
        print(f"  {location} 没有预报 URL")
        return {}

    # 步骤 2: 获取天气预报
    forecast_data = fetch_json(forecast_url, headers)

    if not forecast_data or "properties" not in forecast_data:
        print(f"  无法获取 {location} 的 NOAA 预报")
        return {}

    # 将时间段解析为每日预报
    periods = forecast_data["properties"].get("periods", [])
    forecasts = {}

    for period in periods:
        start_time = period.get("startTime", "")
        if not start_time:
            continue

        date_str = start_time[:10]  # "2026-01-28"
        temp = period.get("temperature")
        is_daytime = period.get("isDaytime", True)

        if date_str not in forecasts:
            forecasts[date_str] = {"high": None, "low": None}

        if is_daytime:
            forecasts[date_str]["high"] = temp
        else:
            forecasts[date_str]["low"] = temp

    return forecasts


# =============================================================================
# 市场解析
# =============================================================================

def parse_weather_event(event_name: str) -> dict:
    """
    解析天气事件名称，提取位置、日期和温度指标。

    参数:
        event_name: 市场事件名称

    返回:
        包含 location、date、metric 的字典
        例如: parse_weather_event("Highest temperature in NYC on January 19?")
        返回: {"location": "NYC", "date": "2026-01-19", "metric": "high"}

    返回 None 如果解析失败。
    """
    if not event_name:
        return None

    event_lower = event_name.lower()

    # 检测温度指标（最高/最低）
    if 'highest' in event_lower or 'high temp' in event_lower:
        metric = 'high'
    elif 'lowest' in event_lower or 'low temp' in event_lower:
        metric = 'low'
    else:
        metric = 'high'  # 默认使用最高温度

    # 检测位置
    location = None
    location_aliases = {
        'nyc': 'NYC', 'new york': 'NYC', 'laguardia': 'NYC', 'la guardia': 'NYC',
        'chicago': 'Chicago', "o'hare": 'Chicago', 'ohare': 'Chicago',
        'seattle': 'Seattle', 'sea-tac': 'Seattle',
        'atlanta': 'Atlanta', 'hartsfield': 'Atlanta',
        'dallas': 'Dallas', 'dfw': 'Dallas',
        'miami': 'Miami',
    }

    for alias, loc in location_aliases.items():
        if alias in event_lower:
            location = loc
            break

    if not location:
        return None

    # 解析日期（格式: "on January 19"）
    month_day_match = re.search(r'on\s+([a-zA-Z]+)\s+(\d{1,2})', event_name, re.IGNORECASE)
    if not month_day_match:
        return None

    month_name = month_day_match.group(1).lower()
    day = int(month_day_match.group(2))

    # 月份映射
    month_map = {
        'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
        'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
        'august': 8, 'aug': 8, 'september': 9, 'sep': 9, 'october': 10, 'oct': 10,
        'november': 11, 'nov': 11, 'december': 12, 'dec': 12,
    }

    month = month_map.get(month_name)
    if not month:
        return None

    # 确定年份（当前年份，如果日期已过则加一年）
    now = datetime.now(timezone.utc)
    year = now.year
    try:
        target_date = datetime(year, month, day, tzinfo=timezone.utc)
        if target_date < now - timedelta(days=30):
            year += 1
        date_str = f"{year}-{month:02d}-{day:02d}"
    except ValueError:
        return None

    return {"location": location, "date": date_str, "metric": metric}


def parse_temperature_bucket(outcome_name: str) -> tuple:
    """
    从结果名称解析温度区间。

    参数:
        outcome_name: 市场结果名称

    返回:
        (最低温度, 最高温度) 元组，或 None 如果解析失败

    示例:
        "32-33°F" → (32, 33)
        "25°F or below" → (-999, 25)
        "36°F or higher" → (36, 999)
    """
    if not outcome_name:
        return None

    # "X°F or below" 格式
    below_match = re.search(r'(\d+)\s*°?[fF]?\s*(or below|or less)', outcome_name, re.IGNORECASE)
    if below_match:
        return (-999, int(below_match.group(1)))

    # "X°F or higher" 格式
    above_match = re.search(r'(\d+)\s*°?[fF]?\s*(or higher|or above|or more)', outcome_name, re.IGNORECASE)
    if above_match:
        return (int(above_match.group(1)), 999)

    # "X-Y°F" 范围格式
    range_match = re.search(r'(\d+)\s*[-–to]+\s*(\d+)', outcome_name)
    if range_match:
        low, high = int(range_match.group(1)), int(range_match.group(2))
        return (min(low, high), max(low, high))

    return None


# =============================================================================
# Simmer API
# =============================================================================

def get_api_key():
    """
    从环境变量获取 Simmer API 密钥。

    返回:
        API 密钥字符串

    如果环境变量未设置，则打印错误消息并退出程序。
    """
    key = os.environ.get("SIMMER_API_KEY")
    if not key:
        print("错误: 未设置 SIMMER_API_KEY 环境变量")
        print("从以下地址获取您的 API 密钥: simmer.markets/dashboard → SDK 选项卡")
        sys.exit(1)
    return key


def fetch_weather_markets():
    """
    从 Simmer API 获取天气标记的市场。

    返回:
    市场字典列表，每个市场包含 id、question、outcome_name、external_price_yes 等字段

    如果 API 调用失败，返回空列表。
    """
    url = f"{SIMMER_API_BASE}/api/markets?tags=weather&status=active&limit=100"
    data = fetch_json(url)

    if not data or "markets" not in data:
        print("  无法从 Simmer API 获取市场")
        return []

    return data["markets"]


def execute_trade(api_key: str, market_id: str, side: str, amount: float) -> dict:
    """
    通过 Simmer SDK API 执行交易。

    参数:
        api_key: Simmer API 密钥
        market_id: 市场 ID
        side: 交易方向（"yes" 或 "no"）
        amount: 交易金额（美元）

    返回:
        包含 success 字段和交易结果的字典
    """
    url = f"{SIMMER_API_BASE}/api/sdk/trade"

    payload = json.dumps({
        "market_id": market_id,
        "side": side,
        "amount": amount,
        "venue": "polymarket"  # 在 Polymarket 上真实交易
    }).encode()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        req = Request(url, data=payload, headers=headers, method="POST")
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return {"success": False, "error": f"HTTP {e.code}: {error_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def execute_sell(api_key: str, market_id: str, shares: float) -> dict:
    """
    通过 Simmer SDK API 执行卖出交易。

    参数:
        api_key: Simmer API 密钥
        market_id: 市场 ID
        shares: 要卖出的股数

    返回:
        包含 success 字段和交易结果的字典
    """
    url = f"{SIMMER_API_BASE}/api/sdk/trade"

    payload = json.dumps({
        "market_id": market_id,
        "side": "yes",
        "action": "sell",
        "shares": shares,
        "venue": "polymarket"
    }).encode()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        req = Request(url, data=payload, headers=headers, method="POST")
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return {"success": False, "error": f"HTTP {e.code}: {error_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_positions(api_key: str) -> list:
    """
    从 Simmer SDK API 获取当前持仓。

    参数:
        api_key: Simmer API 密钥

    返回:
        持仓字典列表，每个持仓包含 market_id、question、shares_yes、pnl 等字段
    """
    url = f"{SIMMER_API_BASE}/api/sdk/positions"

    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            return data.get("positions", [])
    except Exception as e:
        print(f"  获取持仓时出错: {e}")
        return []


def check_exit_opportunities(api_key: str, dry_run: bool = False) -> tuple[int, int]:
    """
    检查持仓中是否有平仓机会。

    检查当前持仓的价格是否达到出场阈值，
    如果达到则在模拟或真实执行卖出。

    参数:
        api_key: Simmer API 密钥
        dry_run: 如果为 True，仅显示操作而不实际执行

    返回:
        (发现的机会数, 实际执行数) 元组
    """
    positions = get_positions(api_key)

    if not positions:
        return 0, 0

    # 筛选天气相关持仓
    weather_positions = []
    for pos in positions:
        question = pos.get("question", "").lower()
        # 天气市场通常包含温度相关的问题
        if any(kw in question for kw in ["temperature", "°f", "highest temp", "lowest temp"]):
            weather_positions.append(pos)

    if not weather_positions:
        return 0, 0

    print(f"\n📈 正在检查 {len(weather_positions)} 个天气持仓的平仓机会...")

    exits_found = 0
    exits_executed = 0

    for pos in weather_positions:
        market_id = pos.get("market_id")
        current_price = pos.get("current_price") or pos.get("price_yes") or 0
        shares = pos.get("shares_yes") or pos.get("shares") or 0
        question = pos.get("question", "Unknown")[:50]

        if shares < MIN_SHARES_PER_ORDER:
            continue  # 持仓太小，无法卖出

        if current_price >= EXIT_THRESHOLD:
            exits_found += 1
            print(f"  📤 {question}...")
            print(f"     价格 ${current_price:.2f} >= 出场阈值 ${EXIT_THRESHOLD:.2f}")

            if dry_run:
                print(f"     [模拟运行] 将卖出 {shares:.1f} 股")
            else:
                print(f"     正在卖出 {shares:.1f} 股...")
                result = execute_sell(api_key, market_id, shares)

                if result.get("success"):
                    exits_executed += 1
                    print(f"     ✅ 以 ${current_price:.2f} 卖出 {shares:.1f} 股")
                else:
                    error = result.get("error", "未知错误")
                    print(f"     ❌ 卖出失败: {error}")
        else:
            print(f"  📊 {question}...")
            print(f"     价格 ${current_price:.2f} < 出场阈值 ${EXIT_THRESHOLD:.2f} - 持有")

    return exits_found, exits_executed


# =============================================================================
# 主策略逻辑
# =============================================================================

def run_weather_strategy(dry_run: bool = False, positions_only: bool = False, show_config: bool = False):
    """
    运行天气交易策略。

    此函数是主入口点，执行以下步骤:
    1. 显示当前配置
    2. 获取活跃的天气市场
    3. 获取 NOAA 天气预报
    4. 查找符合条件的市场并执行交易
    5. 检查现有持仓的平仓机会

    参数:
        dry_run: 如果为 True，仅显示机会而不实际交易
        positions_only: 如果为 True，仅显示当前持仓
        show_config: 如果为 True，仅显示配置信息
    """
    print("🌤️  Simmer 天气交易技能")
    print("=" * 50)

    # 显示当前配置
    print(f"\n⚙️  配置:")
    print(f"  入场阈值: {ENTRY_THRESHOLD:.0%}（低于此值买入）")
    print(f"  出场阈值:  {EXIT_THRESHOLD:.0%}（高于此值卖出）")
    print(f"  最大仓位:    ${MAX_POSITION_USD:.2f}")
    print(f"  位置:       {', '.join(ACTIVE_LOCATIONS)}")

    if show_config:
        print("\n  要更改设置，请设置环境变量:")
        print("    SIMMER_WEATHER_ENTRY=0.20")
        print("    SIMMER_WEATHER_EXIT=0.50")
        print("    SIMMER_WEATHER_MAX_POSITION=5.00")
        print("    SIMMER_WEATHER_LOCATIONS=NYC,Chicago,Miami")
        return

    api_key = get_api_key()

    # 仅显示持仓模式
    if positions_only:
        print("\n📊 当前持仓:")
        positions = get_positions(api_key)
        if not positions:
            print("  没有未平仓持仓")
        else:
            for pos in positions:
                print(f"  • {pos.get('question', 'Unknown')[:50]}...")
                print(f"    YES: {pos.get('shares_yes', 0):.1f} | NO: {pos.get('shares_no', 0):.1f} | 盈亏: ${pos.get('pnl', 0):.2f}")
        return

    # 获取天气市场
    print("\n📡 正在获取天气市场...")
    markets = fetch_weather_markets()
    print(f"  找到 {len(markets)} 个天气市场")

    if not markets:
        print("  没有可用的天气市场")
        return

    # 按事件分组市场
    events = {}
    for market in markets:
        event_id = market.get("event_id") or market.get("event_name", "unknown")
        if event_id not in events:
            events[event_id] = []
        events[event_id].append(market)

    print(f"  分组为 {len(events)} 个事件")

    # NOAA 预报缓存
    forecast_cache = {}
    trades_executed = 0
    opportunities_found = 0

    # 处理每个事件
    for event_id, event_markets in events.items():
        event_name = event_markets[0].get("event_name", "") if event_markets else ""
        event_info = parse_weather_event(event_name)

        if not event_info:
            continue

        location = event_info["location"]
        date_str = event_info["date"]
        metric = event_info["metric"]

        # 按活跃位置过滤
        if location not in ACTIVE_LOCATIONS:
            continue

        print(f"\n📍 {location} {date_str}（{metric} 温度）")

        # 获取预报（使用缓存）
        if location not in forecast_cache:
            print(f"  正在获取 NOAA 预报...")
            forecast_cache[location] = get_noaa_forecast(location)

        forecasts = forecast_cache[location]
        day_forecast = forecasts.get(date_str, {})
        forecast_temp = day_forecast.get(metric)

        if forecast_temp is None:
            print(f"  ⚠️  没有 {date_str} 的预报")
            continue

        print(f"  NOAA 预报: {forecast_temp}°F")

        # 查找匹配的温度区间
        matching_market = None
        for market in event_markets:
            outcome_name = market.get("outcome_name", "")
            bucket = parse_temperature_bucket(outcome_name)

            if bucket and bucket[0] <= forecast_temp <= bucket[1]:
                matching_market = market
                matching_bucket = bucket
                break

        if not matching_market:
            print(f"  ⚠️  没有找到 {forecast_temp}°F 的匹配区间")
            continue

        outcome_name = matching_market.get("outcome_name", "")
        price = matching_market.get("external_price_yes") or 0.5
        market_id = matching_market.get("id")

        print(f"  匹配区间: {outcome_name} @ ${price:.2f}")

        # 验证：跳过极端价格（市场已确定结果）
        if price < MIN_TICK_SIZE:
            print(f"  ⏸️  价格 ${price:.4f} 低于最小单位 ${MIN_TICK_SIZE} - 跳过（市场已极端）")
            continue
        if price > (1 - MIN_TICK_SIZE):
            print(f"  ⏸️  价格 ${price:.4f} 高于最大可交易价 - 跳过（市场已极端）")
            continue

        # 检查入场条件
        if price < ENTRY_THRESHOLD:
            # 验证：检查是否至少能买入 MIN_SHARES_PER_ORDER 股
            min_cost_for_shares = MIN_SHARES_PER_ORDER * price
            if min_cost_for_shares > MAX_POSITION_USD:
                print(f"  ⚠️  最大仓位 ${MAX_POSITION_USD:.2f} 太小，无法以 ${price:.2f} 买入 {MIN_SHARES_PER_ORDER} 股（需要 ${min_cost_for_shares:.2f}）")
                continue

            opportunities_found += 1
            print(f"  ✅ 低于阈值 (${ENTRY_THRESHOLD:.2f}) - 买入机会！")

            if dry_run:
                print(f"  [模拟运行] 将买入 ${MAX_POSITION_USD:.2f} 价值（约 {MAX_POSITION_USD/price:.1f} 股）")
            else:
                print(f"  正在执行交易...")
                result = execute_trade(api_key, market_id, "yes", MAX_POSITION_USD)

                if result.get("success"):
                    trades_executed += 1
                    shares = result.get("shares_bought") or result.get("shares") or 0
                    print(f"  ✅ 以 ${price:.2f} 买入 {shares:.1f} 股")
                else:
                    error = result.get("error", "未知错误")
                    print(f"  ❌ 交易失败: {error}")
        else:
            print(f"  ⏸️  价格 ${price:.2f} 高于阈值 ${ENTRY_THRESHOLD:.2f} - 跳过")

    # 检查现有持仓的平仓条件
    exits_found, exits_executed = check_exit_opportunities(api_key, dry_run)

    # 汇总
    print("\n" + "=" * 50)
    print("📊 汇总:")
    print(f"  扫描的事件数: {len(events)}")
    print(f"  入场机会: {opportunities_found}")
    print(f"  出场机会:  {exits_found}")
    print(f"  执行交易数:     {trades_executed + exits_executed}")

    if dry_run:
        print("\n  [模拟运行模式 - 未执行真实交易]")


# =============================================================================
# CLI 入口点
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simmer 天气交易技能")
    parser.add_argument("--dry-run", action="store_true", help="显示机会但不交易")
    parser.add_argument("--positions", action="store_true", help="仅显示当前持仓")
    parser.add_argument("--config", action="store_true", help="显示当前配置及更改方法")
    args = parser.parse_args()

    run_weather_strategy(dry_run=args.dry_run, positions_only=args.positions, show_config=args.config)