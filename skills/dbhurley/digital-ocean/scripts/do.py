#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx", "rich"]
# ///
"""Digital Ocean 命令行工具 - 管理 droplet、域名和基础设施。

用法：
    do.py account               显示账户信息
    do.py droplets              列出所有 droplet
    do.py droplet <id>          获取 droplet 详情
    do.py domains               列出域名
    do.py records <domain>      列出域名的 DNS 记录
    do.py power-on <id>         开启 droplet
    do.py power-off <id>        关闭 droplet
    do.py reboot <id>           重启 droplet
"""

import json
import os
import sys
import httpx
from rich.console import Console
from rich.table import Table

console = Console()

API_URL = "https://api.digitalocean.com/v2"  # Digital Ocean API 基础 URL
TOKEN = os.environ.get("DO_API_TOKEN")  # 从环境变量获取 API 令牌


def api_get(endpoint: str, params: dict = None) -> dict:
    """发送 GET 请求到 Digital Ocean API
    
    参数：
        endpoint: API 端点路径
        params: 查询参数
    
    返回：
        dict: API 响应的 JSON 数据
    """
    if not TOKEN:
        console.print("[red]错误: DO_API_TOKEN 未设置[/red]")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    resp = httpx.get(f"{API_URL}{endpoint}", params=params, headers=headers, timeout=30)
    resp.raise_for_status()  # 检查响应状态码
    return resp.json()


def api_post(endpoint: str, data: dict = None) -> dict:
    """发送 POST 请求到 Digital Ocean API
    
    参数：
        endpoint: API 端点路径
        data: 请求体数据
    
    返回：
        dict: API 响应的 JSON 数据
    """
    if not TOKEN:
        console.print("[red]错误: DO_API_TOKEN 未设置[/red]")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    resp = httpx.post(f"{API_URL}{endpoint}", json=data, headers=headers, timeout=30)
    resp.raise_for_status()  # 检查响应状态码
    return resp.json()


def cmd_account():
    """显示账户信息"""
    data = api_get("/account")
    acct = data.get("account", {})
    console.print(f"[bold]邮箱:[/bold] {acct.get('email')}")
    console.print(f"[bold]状态:[/bold] {acct.get('status')}")
    console.print(f"[bold]Droplet 限制:[/bold] {acct.get('droplet_limit')}")
    console.print(f"[bold]邮箱已验证:[/bold] {acct.get('email_verified')}")


def cmd_droplets():
    """列出所有 droplet"""
    data = api_get("/droplets")
    droplets = data.get("droplets", [])
    
    if not droplets:
        console.print("[dim]未找到 droplet[/dim]")
        return
    
    table = Table(title="Droplet 列表")
    table.add_column("ID", style="cyan")
    table.add_column("名称", style="green")
    table.add_column("状态")
    table.add_column("IP 地址")
    table.add_column("区域")
    table.add_column("规格")
    
    for d in droplets:
        ip = ""
        # 查找公共 IP 地址
        for net in d.get("networks", {}).get("v4", []):
            if net.get("type") == "public":
                ip = net.get("ip_address", "")
                break
        
        # 根据状态设置颜色
        status_style = "green" if d.get("status") == "active" else "yellow"
        table.add_row(
            str(d.get("id")),
            d.get("name"),
            f"[{status_style}]{d.get('status')}[/{status_style}]",
            ip,
            d.get("region", {}).get("slug", ""),
            d.get("size_slug", "")
        )
    
    console.print(table)


def cmd_droplet(droplet_id: str):
    """获取 droplet 详情"""
    data = api_get(f"/droplets/{droplet_id}")
    d = data.get("droplet", {})
    
    ip = ""
    # 查找公共 IP 地址
    for net in d.get("networks", {}).get("v4", []):
        if net.get("type") == "public":
            ip = net.get("ip_address", "")
            break
    
    # 打印详细信息
    console.print(f"[bold cyan]ID:[/bold cyan] {d.get('id')}")
    console.print(f"[bold]名称:[/bold] {d.get('name')}")
    console.print(f"[bold]状态:[/bold] {d.get('status')}")
    console.print(f"[bold]IP 地址:[/bold] {ip}")
    console.print(f"[bold]区域:[/bold] {d.get('region', {}).get('name')}")
    console.print(f"[bold]规格:[/bold] {d.get('size_slug')} ({d.get('memory')}MB RAM, {d.get('vcpus')} vCPUs)")
    console.print(f"[bold]磁盘:[/bold] {d.get('disk')}GB")
    console.print(f"[bold]镜像:[/bold] {d.get('image', {}).get('name')}")
    console.print(f"[bold]创建时间:[/bold] {d.get('created_at')}")
    
    # 打印标签
    tags = d.get("tags", [])
    if tags:
        console.print(f"[bold]标签:[/bold] {', '.join(tags)}")


def cmd_domains():
    """列出域名"""
    data = api_get("/domains")
    domains = data.get("domains", [])
    
    if not domains:
        console.print("[dim]未找到域名[/dim]")
        return
    
    table = Table(title="域名列表")
    table.add_column("名称", style="cyan")
    table.add_column("TTL")
    
    for d in domains:
        table.add_row(d.get("name"), str(d.get("ttl", "")))
    
    console.print(table)


def cmd_records(domain: str):
    """列出域名的 DNS 记录"""
    data = api_get(f"/domains/{domain}/records")
    records = data.get("domain_records", [])
    
    if not records:
        console.print(f"[dim]未找到 {domain} 的记录[/dim]")
        return
    
    table = Table(title=f"DNS 记录: {domain}")
    table.add_column("ID", style="dim")
    table.add_column("类型", style="cyan")
    table.add_column("名称", style="green")
    table.add_column("数据")
    table.add_column("TTL")
    
    for r in records:
        table.add_row(
            str(r.get("id")),
            r.get("type"),
            r.get("name"),
            r.get("data", "")[:50],  # 限制数据长度
            str(r.get("ttl", ""))
        )
    
    console.print(table)


def cmd_action(droplet_id: str, action: str):
    """对 droplet 执行操作"""
    data = api_post(f"/droplets/{droplet_id}/actions", {"type": action})
    act = data.get("action", {})
    console.print(f"[green]✓[/green] 操作 '{action}' 已启动 (ID: {act.get('id')}, 状态: {act.get('status')})")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        console.print(__doc__)
        return
    
    cmd = sys.argv[1]
    
    if cmd == "account":
        cmd_account()
    elif cmd == "droplets":
        cmd_droplets()
    elif cmd == "droplet" and len(sys.argv) > 2:
        cmd_droplet(sys.argv[2])
    elif cmd == "domains":
        cmd_domains()
    elif cmd == "records" and len(sys.argv) > 2:
        cmd_records(sys.argv[2])
    elif cmd == "power-on" and len(sys.argv) > 2:
        cmd_action(sys.argv[2], "power_on")
    elif cmd == "power-off" and len(sys.argv) > 2:
        cmd_action(sys.argv[2], "power_off")
    elif cmd == "reboot" and len(sys.argv) > 2:
        cmd_action(sys.argv[2], "reboot")
    else:
        console.print(__doc__)


if __name__ == "__main__":
    main()
