# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "click"]
# ///
"""
加密货币价格跟踪器 - 使用 CoinGecko API 跟踪加密货币价格、设置警报和搜索币种

功能：
- 获取加密货币当前价格
- 搜索加密货币
- 设置价格和百分比变化警报
- 管理和检查警报
- 支持常见币种别名

使用示例：
  # 获取比特币价格
  uv run crypto.py price bitcoin
  
  # 搜索币种
  uv run crypto.py search doge
  
  # 设置价格警报
  uv run crypto.py alert user1 bitcoin above 100000
  
  # 检查警报
  uv run crypto.py check-alerts
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import click
import httpx

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
DATA_DIR = Path(__file__).parent.parent / "data"
ALERTS_FILE = DATA_DIR / "alerts.json"

# 常见币种别名
COIN_ALIASES = {
    "btc": "bitcoin",
    "eth": "ethereum",
    "sol": "solana",
    "doge": "dogecoin",
    "ada": "cardano",
    "xrp": "ripple",
    "dot": "polkadot",
    "matic": "polygon",
    "link": "chainlink",
    "avax": "avalanche-2",
    "atom": "cosmos",
    "uni": "uniswap",
    "ltc": "litecoin",
    "shib": "shiba-inu",
}


def resolve_coin(coin: str) -> str:
    """
    解析币种别名到 CoinGecko ID
    
    参数:
        coin: 币种名称或别名
        
    返回:
        CoinGecko 币种 ID
    """
    return COIN_ALIASES.get(coin.lower(), coin.lower())


def load_alerts() -> dict:
    """
    从 JSON 文件加载警报
    
    返回:
        警报数据字典
    """
    if not ALERTS_FILE.exists():
        return {"alerts": []}
    try:
        return json.loads(ALERTS_FILE.read_text())
    except (json.JSONDecodeError, IOError):
        return {"alerts": []}


def save_alerts(data: dict) -> None:
    """
    保存警报到 JSON 文件
    
    参数:
        data: 警报数据字典
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ALERTS_FILE.write_text(json.dumps(data, indent=2))


def get_prices(coins: list[str], detailed: bool = False) -> dict:
    """
    从 CoinGecko 获取当前价格
    
    参数:
        coins: 币种列表
        detailed: 是否包含详细信息（市值、交易量）
        
    返回:
        币种价格数据
    """
    coin_ids = ",".join(resolve_coin(c) for c in coins)
    params = {
        "ids": coin_ids,
        "vs_currencies": "usd",
        "include_24hr_change": "true",
    }
    if detailed:
        params["include_market_cap"] = "true"
        params["include_24hr_vol"] = "true"
    
    resp = httpx.get(f"{COINGECKO_BASE}/simple/price", params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


@click.group()
def cli():
    """
    加密货币价格警报工具 - 使用 CoinGecko API
    """
    pass


@cli.command()
@click.argument("coins", nargs=-1, required=True)
@click.option("--detailed", "-d", is_flag=True, help="包含市值和交易量")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 输出")
def price(coins: tuple[str], detailed: bool, json_output: bool):
    """
    获取一个或多个币种的当前价格
    """
    try:
        data = get_prices(list(coins), detailed)
        
        if json_output:
            click.echo(json.dumps(data, indent=2))
            return
        
        for coin in coins:
            coin_id = resolve_coin(coin)
            if coin_id not in data:
                click.echo(f"❌ {coin}: 未找到（尝试 'crypto.py search {coin}'）")
                continue
            
            info = data[coin_id]
            price_usd = info.get("usd", 0)
            change_24h = info.get("usd_24h_change", 0)
            
            # 格式化变化百分比并添加颜色指示器
            change_str = f"{change_24h:+.2f}%"
            emoji = "🟢" if change_24h >= 0 else "🔴"
            
            output = f"{emoji} {coin.upper()}: ${price_usd:,.2f} ({change_str})"
            
            if detailed:
                mcap = info.get("usd_market_cap", 0)
                vol = info.get("usd_24h_vol", 0)
                output += f"\n   市值: ${mcap:,.0f}"
                output += f"\n   24h 交易量: ${vol:,.0f}"
            
            click.echo(output)
            
    except httpx.HTTPError as e:
        click.echo(f"❌ API 错误: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("query")
@click.option("--limit", "-l", default=10, help="显示的最大结果数")
def search(query: str, limit: int):
    """
    通过名称或符号搜索币种
    """
    try:
        resp = httpx.get(f"{COINGECKO_BASE}/search", params={"query": query}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        coins = data.get("coins", [])[:limit]
        if not coins:
            click.echo(f"未找到匹配 '{query}' 的币种")
            return
        
        click.echo(f"找到 {len(coins)} 个匹配 '{query}' 的币种:\n")
        for coin in coins:
            click.echo(f"  {coin['symbol'].upper():8} → {coin['id']:30} ({coin['name']})")
        
        click.echo(f"\n使用 ID（中间列）在命令中，例如: crypto.py price {coins[0]['id']}")
        
    except httpx.HTTPError as e:
        click.echo(f"❌ API 错误: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("user_id")
@click.argument("coin")
@click.argument("alert_type", type=click.Choice(["above", "below", "change", "drop", "rise"]))
@click.argument("threshold", type=float)
@click.option("--cooldown", "-c", default=1, help="重复警报之间的冷却时间（默认: 1 小时）")
def alert(user_id: str, coin: str, alert_type: str, threshold: float, cooldown: int):
    """
    为用户设置价格或百分比警报
    """
    coin_id = resolve_coin(coin)
    
    # 验证币种存在
    try:
        data = get_prices([coin_id])
        if coin_id not in data:
            click.echo(f"❌ 币种 '{coin}' 未找到。尝试: crypto.py search {coin}")
            sys.exit(1)
        current_price = data[coin_id].get("usd", 0)
    except httpx.HTTPError as e:
        click.echo(f"❌ API 错误: {e}", err=True)
        sys.exit(1)
    
    alert_data = load_alerts()
    
    new_alert = {
        "id": uuid4().hex[:8],
        "user_id": user_id,
        "coin": coin_id,
        "type": alert_type,
        "threshold": threshold,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_triggered": None,
        "cooldown_hours": cooldown,
    }
    
    alert_data["alerts"].append(new_alert)
    save_alerts(alert_data)
    
    # 描述警报
    if alert_type == "above":
        desc = f"当 {coin_id.upper()} 价格 >= ${threshold:,.2f}"
    elif alert_type == "below":
        desc = f"当 {coin_id.upper()} 价格 <= ${threshold:,.2f}"
    elif alert_type == "change":
        desc = f"当 {coin_id.upper()} 24小时变化 >= ±{threshold}%"
    elif alert_type == "drop":
        desc = f"当 {coin_id.upper()} 下跌 >= {threshold}%"
    elif alert_type == "rise":
        desc = f"当 {coin_id.upper()} 上涨 >= {threshold}%"
    
    click.echo(f"✅ 为 {user_id} 设置警报")
    click.echo(f"   ID: {new_alert['id']}")
    click.echo(f"   触发条件: {desc}")
    click.echo(f"   当前价格: ${current_price:,.2f}")
    click.echo(f"   冷却时间: {cooldown}小时（通知间隔）")


@cli.command()
@click.argument("user_id")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 输出")
def alerts(user_id: str, json_output: bool):
    """
    列出用户的所有警报
    """
    alert_data = load_alerts()
    user_alerts = [a for a in alert_data["alerts"] if a["user_id"] == user_id]
    
    if json_output:
        click.echo(json.dumps(user_alerts, indent=2))
        return
    
    if not user_alerts:
        click.echo(f"未找到 {user_id} 的警报")
        return
    
    click.echo(f"{user_id} 的警报:\n")
    for a in user_alerts:
        if a["type"] in ("above", "below"):
            condition = f"{a['type']} ${a['threshold']:,.2f}"
        else:
            condition = f"{a['type']} {a['threshold']}%"
        
        status = ""
        if a.get("last_triggered"):
            status = f" (最后触发: {a['last_triggered'][:16]})"
        
        click.echo(f"  [{a['id']}] {a['coin'].upper()} {condition}{status}")


@cli.command("alert-rm")
@click.argument("alert_id")
def alert_rm(alert_id: str):
    """
    通过 ID 移除警报
    """
    alert_data = load_alerts()
    original_count = len(alert_data["alerts"])
    
    alert_data["alerts"] = [a for a in alert_data["alerts"] if a["id"] != alert_id]
    
    if len(alert_data["alerts"]) == original_count:
        click.echo(f"❌ 警报 '{alert_id}' 未找到")
        sys.exit(1)
    
    save_alerts(alert_data)
    click.echo(f"✅ 警报 '{alert_id}' 已移除")


@cli.command("check-alerts")
@click.option("--json-output", "-j", is_flag=True, help="将触发的警报输出为 JSON")
def check_alerts(json_output: bool):
    """
    检查所有警报并返回应该触发的警报
    """
    alert_data = load_alerts()
    alerts_list = alert_data.get("alerts", [])
    
    if not alerts_list:
        if json_output:
            click.echo(json.dumps({"triggered": []}, indent=2))
        else:
            click.echo("未配置警报")
        return
    
    # 获取唯一币种
    coins = list(set(a["coin"] for a in alerts_list))
    
    try:
        prices = get_prices(coins)
    except httpx.HTTPError as e:
        click.echo(f"❌ API 错误: {e}", err=True)
        sys.exit(1)
    
    now = datetime.now(timezone.utc)
    triggered = []
    
    for alert in alerts_list:
        coin_data = prices.get(alert["coin"])
        if not coin_data:
            continue
        
        price = coin_data.get("usd", 0)
        change_24h = coin_data.get("usd_24h_change", 0)
        
        # 检查冷却时间
        if alert.get("last_triggered"):
            last = datetime.fromisoformat(alert["last_triggered"].replace("Z", "+00:00"))
            hours_since = (now - last).total_seconds() / 3600
            if hours_since < alert.get("cooldown_hours", 1):
                continue
        
        # 检查条件
        should_trigger = False
        reason = ""
        
        if alert["type"] == "above" and price >= alert["threshold"]:
            should_trigger = True
            reason = f"${price:,.2f} >= ${alert['threshold']:,.2f}"
        elif alert["type"] == "below" and price <= alert["threshold"]:
            should_trigger = True
            reason = f"${price:,.2f} <= ${alert['threshold']:,.2f}"
        elif alert["type"] == "change" and abs(change_24h) >= alert["threshold"]:
            should_trigger = True
            reason = f"{change_24h:+.2f}% 变化 (阈值: ±{alert['threshold']}%)"
        elif alert["type"] == "drop" and change_24h <= -alert["threshold"]:
            should_trigger = True
            reason = f"{change_24h:+.2f}% 下跌 (阈值: -{alert['threshold']}%)"
        elif alert["type"] == "rise" and change_24h >= alert["threshold"]:
            should_trigger = True
            reason = f"{change_24h:+.2f}% 上涨 (阈值: +{alert['threshold']}%)"
        
        if should_trigger:
            alert["last_triggered"] = now.isoformat()
            triggered.append({
                "alert_id": alert["id"],
                "user_id": alert["user_id"],
                "coin": alert["coin"],
                "type": alert["type"],
                "threshold": alert["threshold"],
                "current_price": price,
                "change_24h": change_24h,
                "reason": reason,
            })
    
    # 保存更新的最后触发时间
    save_alerts(alert_data)
    
    if json_output:
        click.echo(json.dumps({"triggered": triggered}, indent=2))
        return
    
    if not triggered:
        click.echo("✓ 无警报触发")
        return
    
    click.echo(f"🚨 {len(triggered)} 个警报触发:\n")
    for t in triggered:
        click.echo(f"  用户: {t['user_id']}")
        click.echo(f"  币种: {t['coin'].upper()} @ ${t['current_price']:,.2f} ({t['change_24h']:+.2f}%)")
        click.echo(f"  原因: {t['reason']}")
        click.echo()


@cli.command("list-all")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 输出")
def list_all(json_output: bool):
    """
    列出所有警报（管理员视图）
    """
    alert_data = load_alerts()
    alerts_list = alert_data.get("alerts", [])
    
    if json_output:
        click.echo(json.dumps(alerts_list, indent=2))
        return
    
    if not alerts_list:
        click.echo("未配置警报")
        return
    
    click.echo(f"所有警报 ({len(alerts_list)}):\n")
    for a in alerts_list:
        if a["type"] in ("above", "below"):
            condition = f"{a['type']} ${a['threshold']:,.2f}"
        else:
            condition = f"{a['type']} {a['threshold']}%"
        
        click.echo(f"  [{a['id']}] {a['user_id']}: {a['coin'].upper()} {condition}")


if __name__ == "__main__":
    cli()