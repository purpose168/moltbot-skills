#!/usr/bin/env python3
"""
Cloudflare 命令行工具 - DNS、缓存、Workers 路由

使用方法：
    cloudflare.py verify
    cloudflare.py zones [--json]
    cloudflare.py zone <domain> [--json]
    cloudflare.py dns list <domain> [--json]
    cloudflare.py dns add <domain> --type TYPE --name NAME --content CONTENT [--proxied] [--ttl TTL]
    cloudflare.py dns update <domain> <record_id> [--content CONTENT] [--proxied]
    cloudflare.py dns delete <domain> <record_id> [--yes]
    cloudflare.py cache purge <domain> [--all] [--urls URLS] [--prefix PREFIX]
    cloudflare.py routes list <domain> [--json]
    cloudflare.py routes add <domain> --pattern PATTERN --worker WORKER

功能：
- 验证 Cloudflare API 令牌
- 管理域名区域（zones）
- 管理 DNS 记录（添加、更新、删除、列出）
- 清除缓存（全部、特定 URL、前缀）
- 管理 Workers 路由
"""

import argparse
import json
import os
import sys
from typing import Optional

import requests


def confirm(prompt: str, default: bool = False) -> bool:
    """
    请求确认
    
    参数:
        prompt: 提示信息
        default: 默认值
        
    返回:
        用户的确认结果
    """
    if default:
        choice = input(f"{prompt} [Y/n]: ").strip().lower()
        return choice != 'n'
    else:
        choice = input(f"{prompt} [y/N]: ").strip().lower()
        return choice == 'y'


class CloudflareClient:
    """
    Cloudflare API 客户端
    """
    
    API_BASE = "https://api.cloudflare.com/client/v4"
    
    def __init__(self, api_token: str):
        """
        初始化客户端
        
        参数:
            api_token: Cloudflare API 令牌
        """
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        self._zone_cache = {}  # 区域缓存，提高性能
    
    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """
        发送 API 请求
        
        参数:
            method: 请求方法（GET、POST、PUT、DELETE）
            endpoint: API 端点
            data: 请求数据
            
        返回:
            API 响应结果
        """
        url = f"{self.API_BASE}/{endpoint}"
        
        try:
            resp = requests.request(method, url, headers=self.headers, json=data, timeout=30)
        except requests.exceptions.Timeout:
            raise Exception("请求超时 - Cloudflare API 可能较慢")
        except requests.exceptions.ConnectionError:
            raise Exception("连接失败 - 检查你的网络连接")
        
        try:
            result = resp.json()
        except json.JSONDecodeError:
            raise Exception(f"API 响应无效 (状态 {resp.status_code})")
        
        if not result.get("success", False):
            errors = result.get("errors", [])
            if errors:
                # 提取有意义的错误信息
                error_parts = []
                for e in errors:
                    code = e.get("code", "")
                    msg = e.get("message", str(e))
                    if code == 10000:
                        error_parts.append("认证失败 - 检查你的 API 令牌")
                    elif code == 7003:
                        error_parts.append("区域未找到或无权限")
                    elif code == 81057:
                        error_parts.append("记录已存在")
                    else:
                        error_parts.append(f"{msg} (代码 {code})" if code else msg)
                raise Exception("; ".join(error_parts))
            else:
                raise Exception(f"API 错误 (状态 {resp.status_code})")
        
        return result
    
    def verify_token(self) -> dict:
        """
        验证 API 令牌并返回令牌详情
        
        返回:
            令牌信息
        """
        result = self._request("GET", "user/tokens/verify")
        return result.get("result", {})
    
    # === 区域（Zones） ===
    
    def list_zones(self) -> list:
        """
        列出所有区域
        
        返回:
            区域列表
        """
        result = self._request("GET", "zones")
        return result.get("result", [])
    
    def get_zone_id(self, domain: str) -> Optional[str]:
        """
        通过域名获取区域 ID
        
        参数:
            domain: 域名或区域 ID
            
        返回:
            区域 ID
        """
        if domain in self._zone_cache:
            return self._zone_cache[domain]
        
        # 检查是否已经是区域 ID
        if len(domain) == 32 and domain.isalnum():
            return domain
        
        zones = self.list_zones()
        for zone in zones:
            if zone.get("name") == domain:
                self._zone_cache[domain] = zone.get("id")
                return zone.get("id")
        
        return None
    
    def get_zone(self, domain: str) -> dict:
        """
        获取区域详情
        
        参数:
            domain: 域名或区域 ID
            
        返回:
            区域详情
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        result = self._request("GET", f"zones/{zone_id}")
        return result.get("result", {})
    
    # === DNS 记录 ===
    
    def list_dns_records(self, domain: str) -> list:
        """
        列出区域的 DNS 记录
        
        参数:
            domain: 域名或区域 ID
            
        返回:
            DNS 记录列表
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        result = self._request("GET", f"zones/{zone_id}/dns_records")
        return result.get("result", [])
    
    def add_dns_record(self, domain: str, record_type: str, name: str, content: str, 
                       proxied: bool = False, ttl: int = 1) -> dict:
        """
        添加 DNS 记录
        
        参数:
            domain: 域名或区域 ID
            record_type: 记录类型（A、AAAA、CNAME、TXT、MX 等）
            name: 记录名称（@ 表示顶点域名）
            content: 记录内容
            proxied: 是否启用 Cloudflare 代理
            ttl: 生存时间（1 = 自动）
            
        返回:
            创建的记录信息
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        data = {
            "type": record_type.upper(),
            "name": name,
            "content": content,
            "proxied": proxied,
            "ttl": ttl  # 1 = auto
        }
        
        result = self._request("POST", f"zones/{zone_id}/dns_records", data)
        return result.get("result", {})
    
    def update_dns_record(self, domain: str, record_id: str, 
                          content: str = None, proxied: bool = None) -> dict:
        """
        更新 DNS 记录
        
        参数:
            domain: 域名或区域 ID
            record_id: 记录 ID
            content: 新内容（可选）
            proxied: 是否启用代理（可选）
            
        返回:
            更新后的记录信息
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        # 获取现有记录
        existing = self._request("GET", f"zones/{zone_id}/dns_records/{record_id}")
        record = existing.get("result", {})
        
        data = {
            "type": record.get("type"),
            "name": record.get("name"),
            "content": content if content else record.get("content"),
            "proxied": proxied if proxied is not None else record.get("proxied"),
            "ttl": record.get("ttl", 1)
        }
        
        result = self._request("PUT", f"zones/{zone_id}/dns_records/{record_id}", data)
        return result.get("result", {})
    
    def delete_dns_record(self, domain: str, record_id: str) -> bool:
        """
        删除 DNS 记录
        
        参数:
            domain: 域名或区域 ID
            record_id: 记录 ID
            
        返回:
            是否删除成功
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        self._request("DELETE", f"zones/{zone_id}/dns_records/{record_id}")
        return True
    
    # === 缓存 ===
    
    def purge_cache(self, domain: str, purge_all: bool = False, 
                    urls: list = None, prefixes: list = None) -> dict:
        """
        清除区域的缓存
        
        参数:
            domain: 域名或区域 ID
            purge_all: 是否清除所有缓存
            urls: 要清除的 URL 列表
            prefixes: 要清除的前缀列表
            
        返回:
            清除结果
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        if purge_all:
            data = {"purge_everything": True}
        elif urls:
            data = {"files": urls}
        elif prefixes:
            data = {"prefixes": prefixes}
        else:
            raise Exception("必须指定 --all、--urls 或 --prefix")
        
        result = self._request("POST", f"zones/{zone_id}/purge_cache", data)
        return result.get("result", {})
    
    # === Workers 路由 ===
    
    def list_routes(self, domain: str) -> list:
        """
        列出区域的 Workers 路由
        
        参数:
            domain: 域名或区域 ID
            
        返回:
            路由列表
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        result = self._request("GET", f"zones/{zone_id}/workers/routes")
        return result.get("result", [])
    
    def add_route(self, domain: str, pattern: str, worker: str) -> dict:
        """
        添加 Workers 路由
        
        参数:
            domain: 域名或区域 ID
            pattern: 路由模式（如 *.example.com/*）
            worker: Worker 脚本名称
            
        返回:
            创建的路由信息
        """
        zone_id = self.get_zone_id(domain)
        if not zone_id:
            raise Exception(f"区域未找到: {domain}")
        
        data = {
            "pattern": pattern,
            "script": worker
        }
        
        result = self._request("POST", f"zones/{zone_id}/workers/routes", data)
        return result.get("result", {})


def main():
    """
    主函数 - 处理命令行参数并执行相应操作
    """
    parser = argparse.ArgumentParser(description="Cloudflare 命令行工具")
    parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # verify - 验证令牌
    subparsers.add_parser("verify", help="验证 API 令牌")
    
    # zones - 列出区域
    subparsers.add_parser("zones", help="列出区域")
    
    # zone - 获取区域详情
    zone_p = subparsers.add_parser("zone", help="获取区域详情")
    zone_p.add_argument("domain", help="域名或区域 ID")
    
    # dns - DNS 命令
    dns_p = subparsers.add_parser("dns", help="DNS 命令")
    dns_sub = dns_p.add_subparsers(dest="dns_action")
    
    dns_list = dns_sub.add_parser("list", help="列出 DNS 记录")
    dns_list.add_argument("domain")
    
    dns_add = dns_sub.add_parser("add", help="添加 DNS 记录")
    dns_add.add_argument("domain")
    dns_add.add_argument("--type", required=True, help="记录类型（A、AAAA、CNAME、TXT、MX）")
    dns_add.add_argument("--name", required=True, help="记录名称（@ 表示顶点域名）")
    dns_add.add_argument("--content", required=True, help="记录内容")
    dns_add.add_argument("--proxied", action="store_true", help="启用 Cloudflare 代理")
    dns_add.add_argument("--ttl", type=int, default=1, help="TTL (1=自动)")
    
    dns_update = dns_sub.add_parser("update", help="更新 DNS 记录")
    dns_update.add_argument("domain")
    dns_update.add_argument("record_id")
    dns_update.add_argument("--content", help="新内容")
    dns_update.add_argument("--proxied", action="store_true", help="启用代理")
    dns_update.add_argument("--no-proxied", action="store_true", help="禁用代理")
    
    dns_delete = dns_sub.add_parser("delete", help="删除 DNS 记录")
    dns_delete.add_argument("domain")
    dns_delete.add_argument("record_id")
    dns_delete.add_argument("--yes", "-y", action="store_true", help="跳过确认")
    
    # cache - 缓存命令
    cache_p = subparsers.add_parser("cache", help="缓存命令")
    cache_sub = cache_p.add_subparsers(dest="cache_action")
    
    cache_purge = cache_sub.add_parser("purge", help="清除缓存")
    cache_purge.add_argument("domain")
    cache_purge.add_argument("--all", action="store_true", help="清除所有缓存")
    cache_purge.add_argument("--urls", help="要清除的逗号分隔 URL")
    cache_purge.add_argument("--prefix", help="要清除的 URL 前缀")
    cache_purge.add_argument("--yes", "-y", action="store_true", help="跳过确认")
    
    # routes - Workers 路由命令
    routes_p = subparsers.add_parser("routes", help="Workers 路由命令")
    routes_sub = routes_p.add_subparsers(dest="routes_action")
    
    routes_list = routes_sub.add_parser("list", help="列出路由")
    routes_list.add_argument("domain")
    
    routes_add = routes_sub.add_parser("add", help="添加路由")
    routes_add.add_argument("domain")
    routes_add.add_argument("--pattern", required=True, help="路由模式")
    routes_add.add_argument("--worker", required=True, help="Worker 脚本名称")
    
    args = parser.parse_args()
    
    # 获取令牌
    api_token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not api_token:
        print("错误: 需要 CLOUDFLARE_API_TOKEN", file=sys.stderr)
        sys.exit(1)
    
    client = CloudflareClient(api_token)
    
    try:
        if args.command == "verify":
            result = client.verify_token()
            status = result.get("status", "unknown")
            if status == "active":
                print("✅ 令牌有效")
                print(f"   状态: {status}")
                print(f"   ID: {result.get('id', 'N/A')}")
                if args.json:
                    print(json.dumps(result, indent=2))
            else:
                print(f"⚠️  令牌状态: {status}")
                sys.exit(1)
        
        elif args.command == "zones":
            zones = client.list_zones()
            if args.json:
                print(json.dumps(zones, indent=2))
            else:
                if not zones:
                    print("未找到区域（检查令牌权限）")
                else:
                    for z in zones:
                        status = "✓" if z.get("status") == "active" else "○"
                        print(f"{status} {z.get('name')} ({z.get('id')[:8]}...)")
        
        elif args.command == "zone":
            zone = client.get_zone(args.domain)
            if args.json:
                print(json.dumps(zone, indent=2))
            else:
                print(f"区域: {zone.get('name')}")
                print(f"ID: {zone.get('id')}")
                print(f"状态: {zone.get('status')}")
                print(f"域名服务器: {', '.join(zone.get('name_servers', []))}")
        
        elif args.command == "dns":
            if args.dns_action == "list":
                records = client.list_dns_records(args.domain)
                if args.json:
                    print(json.dumps(records, indent=2))
                else:
                    for r in records:
                        proxy = "☁️" if r.get("proxied") else "  "
                        print(f"{proxy} {r.get('type'):6} {r.get('name'):30} → {r.get('content')}")
                        print(f"   ID: {r.get('id')}")
            
            elif args.dns_action == "add":
                record = client.add_dns_record(
                    args.domain, args.type, args.name, args.content,
                    proxied=args.proxied, ttl=args.ttl
                )
                print(f"✅ 创建了 {args.type} 记录: {record.get('name')} → {record.get('content')}")
                print(f"   ID: {record.get('id')}")
            
            elif args.dns_action == "update":
                proxied = None
                if args.proxied:
                    proxied = True
                elif args.no_proxied:
                    proxied = False
                
                record = client.update_dns_record(args.domain, args.record_id, 
                                                   content=args.content, proxied=proxied)
                print(f"✅ 更新: {record.get('name')} → {record.get('content')}")
            
            elif args.dns_action == "delete":
                # 获取记录详情用于确认
                records = client.list_dns_records(args.domain)
                record = next((r for r in records if r.get("id") == args.record_id), None)
                
                if not record:
                    print(f"❌ 记录未找到: {args.record_id}", file=sys.stderr)
                    sys.exit(1)
                
                record_info = f"{record.get('type')} {record.get('name')} → {record.get('content')}"
                
                if not args.yes:
                    print(f"即将删除: {record_info}")
                    if not confirm("确定吗？"):
                        print("已取消")
                        sys.exit(0)
                
                client.delete_dns_record(args.domain, args.record_id)
                print(f"✅ 已删除: {record_info}")
        
        elif args.command == "cache":
            if args.cache_action == "purge":
                urls = args.urls.split(",") if args.urls else None
                prefixes = [args.prefix] if args.prefix else None
                
                # 清除所有缓存时需要确认
                if args.all and not args.yes:
                    print(f"⚠️  这将清除 {args.domain} 的所有缓存内容")
                    if not confirm("确定吗？"):
                        print("已取消")
                        sys.exit(0)
                
                result = client.purge_cache(args.domain, purge_all=args.all, 
                                           urls=urls, prefixes=prefixes)
                if args.all:
                    print(f"✅ 已清除 {args.domain} 的所有缓存")
                elif urls:
                    print(f"✅ 已从缓存中清除 {len(urls)} 个 URL")
                else:
                    print(f"✅ 已按前缀清除 {args.domain} 的缓存")
                    
                if args.json:
                    print(json.dumps(result, indent=2))
        
        elif args.command == "routes":
            if args.routes_action == "list":
                routes = client.list_routes(args.domain)
                if args.json:
                    print(json.dumps(routes, indent=2))
                else:
                    for r in routes:
                        print(f"• {r.get('pattern')} → {r.get('script', 'disabled')}")
                        print(f"  ID: {r.get('id')}")
            
            elif args.routes_action == "add":
                route = client.add_route(args.domain, args.pattern, args.worker)
                print(f"✅ 创建了路由: {args.pattern} → {args.worker}")
                print(f"   ID: {route.get('id')}")
        
        else:
            parser.print_help()
    
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
