#!/usr/bin/env python3
"""
Apollo.io 富化 CLI 工具 for Clawdbot。

通过 Apollo API 富化联系人和公司。

支持的命令：
- enrich: 富化单个个人
- bulk-enrich: 批量富化最多 10 个人
- company: 富化公司/组织
- search: 搜索人员
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse

# Apollo API 的基础 URL
API_BASE = "https://api.apollo.io/api/v1"


def get_api_key():
    """
    从环境变量中获取 API 密钥。
    
    返回:
        str: Apollo API 密钥
        
    退出:
        如果环境变量未设置，则退出程序并显示错误信息
    """
    api_key = os.environ.get("APOLLO_API_KEY")
    if not api_key:
        print("错误: APOLLO_API_KEY 环境变量未设置", file=sys.stderr)
        print("获取密钥的地址: https://app.apollo.io/#/settings/integrations/api", file=sys.stderr)
        sys.exit(1)
    return api_key


def api_request(method, endpoint, params=None, data=None):
    """
    向 Apollo API 发起请求。
    
    参数:
        method: HTTP 方法（GET、POST 等）
        endpoint: API 端点路径
        params: URL 查询参数（可选）
        data: 请求体数据（可选）
        
    返回:
        dict: API 响应的 JSON 数据
        
    退出:
        遇到 HTTP 错误或网络错误时退出程序
    """
    api_key = get_api_key()
    
    # 构建完整的 URL
    url = f"{API_BASE}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    
    # 设置请求头，包含 API 密钥和内容类型
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cache-Control": "no-cache"
    }
    
    # 序列化请求数据为 JSON
    body = json.dumps(data).encode('utf-8') if data else None
    
    # 创建请求对象
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        # 发送请求并获取响应，设置超时为 30 秒
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        # 处理 HTTP 错误
        error_body = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_body)
            print(f"错误 {e.code}: {error_json.get('message', error_body)}", file=sys.stderr)
        except:
            print(f"错误 {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        # 处理网络错误
        print(f"网络错误: {e.reason}", file=sys.stderr)
        sys.exit(1)


def format_person(person):
    """
    格式化个人数据以便显示。
    
    参数:
        person: 个人数据字典
        
    返回:
        str: 格式化的字符串表示
    """
    if not person:
        return "未找到匹配"
    
    lines = []
    lines.append(f"👤 {person.get('name', 'Unknown')}")
    
    # 添加职位信息
    if person.get('title'):
        lines.append(f"   职位: {person['title']}")
    if person.get('headline'):
        lines.append(f"   标题: {person['headline']}")
    
    # 添加公司信息
    org = person.get('organization') or {}
    if org.get('name'):
        lines.append(f"   公司: {org['name']}")
    
    # 添加电子邮件信息
    if person.get('email'):
        lines.append(f"   📧 电子邮件: {person['email']}")
    if person.get('personal_emails'):
        for email in person['personal_emails'][:2]:
            lines.append(f"   📧 个人: {email}")
    
    # 添加电话号码信息
    if person.get('phone_numbers'):
        for phone in person['phone_numbers'][:2]:
            ptype = phone.get('type', 'phone')
            lines.append(f"   📱 {ptype}: {phone.get('sanitized_number', phone.get('number', 'N/A'))}")
    
    # 添加 LinkedIn 信息
    if person.get('linkedin_url'):
        lines.append(f"   🔗 LinkedIn: {person['linkedin_url']}")
    
    # 添加位置信息
    if person.get('city') or person.get('state') or person.get('country'):
        location = ", ".join(filter(None, [person.get('city'), person.get('state'), person.get('country')]))
        lines.append(f"   📍 位置: {location}")
    
    return "\n".join(lines)


def format_company(org):
    """
    格式化组织（公司）数据以便显示。
    
    参数:
        org: 公司数据字典
        
    返回:
        str: 格式化的字符串表示
    """
    if not org:
        return "未找到匹配"
    
    lines = []
    lines.append(f"🏢 {org.get('name', 'Unknown')}")
    
    # 添加基本信息
    if org.get('website_url'):
        lines.append(f"   网站: {org['website_url']}")
    if org.get('industry'):
        lines.append(f"   行业: {org['industry']}")
    if org.get('estimated_num_employees'):
        lines.append(f"   员工数: {org['estimated_num_employees']}")
    if org.get('annual_revenue_printed'):
        lines.append(f"   收入: {org['annual_revenue_printed']}")
    if org.get('total_funding_printed'):
        lines.append(f"   资金: {org['total_funding_printed']}")
    if org.get('founded_year'):
        lines.append(f"   成立年份: {org['founded_year']}")
    if org.get('short_description'):
        lines.append(f"   描述: {org['short_description'][:200]}")
    if org.get('linkedin_url'):
        lines.append(f"   🔗 LinkedIn: {org['linkedin_url']}")
    if org.get('phone'):
        lines.append(f"   📞 电话: {org['phone']}")
    
    # 添加位置信息
    if org.get('city') or org.get('state') or org.get('country'):
        location = ", ".join(filter(None, [org.get('city'), org.get('state'), org.get('country')]))
        lines.append(f"   📍 总部: {location}")
    
    # 添加技术栈信息
    if org.get('technologies'):
        techs = org['technologies'][:10]
        lines.append(f"   💻 技术: {', '.join(techs)}")
    
    return "\n".join(lines)


def cmd_enrich(args):
    """富化单个个人。"""
    params = {}
    
    # 根据提供的参数构建查询参数
    if args.email:
        params['email'] = args.email
    if args.name:
        # 将姓名拆分为名和姓
        parts = args.name.split(' ', 1)
        params['first_name'] = parts[0]
        if len(parts) > 1:
            params['last_name'] = parts[1]
    if args.first_name:
        params['first_name'] = args.first_name
    if args.last_name:
        params['last_name'] = args.last_name
    if args.domain:
        params['domain'] = args.domain
    if args.linkedin:
        params['linkedin_url'] = args.linkedin
    
    # 处理个人联系信息显示选项
    if args.reveal_email:
        params['reveal_personal_emails'] = 'true'
    if args.reveal_phone:
        params['reveal_phone_number'] = 'true'
    
    # 验证是否提供了必要的参数
    if not params:
        print("错误: 请提供至少 --email、--name 或 --linkedin", file=sys.stderr)
        sys.exit(1)
    
    # 调用 API 进行人员匹配和富化
    result = api_request("POST", "/people/match", params=params)
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        person = result.get('person')
        print(format_person(person))


def cmd_bulk_enrich(args):
    """批量富化多个人员。"""
    # 从 JSON 文件读取联系人列表
    with open(args.file) as f:
        contacts = json.load(f)
    
    # 验证输入格式
    if not isinstance(contacts, list):
        print("错误: JSON 文件必须包含联系人数组", file=sys.stderr)
        sys.exit(1)
    
    # Apollo 限制批量操作最多 10 个联系人
    if len(contacts) > 10:
        print(f"警告: Apollo 限制批量操作最多 10 个。正在处理前 10 个，共 {len(contacts)} 个", file=sys.stderr)
        contacts = contacts[:10]
    
    # 构建请求参数
    params = {
        'reveal_personal_emails': 'true' if args.reveal_email else 'false',
        'reveal_phone_number': 'true' if args.reveal_phone else 'false'
    }
    
    # 构建请求体
    data = {'details': contacts}
    
    # 调用批量富化 API
    result = api_request("POST", "/people/bulk_match", params=params, data=data)
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        matches = result.get('matches', [])
        print(f"已富化 {len(matches)} 个联系人:\n")
        for match in matches:
            print(format_person(match))
            print()


def cmd_company(args):
    """富化公司/组织。"""
    params = {'domain': args.domain}
    
    # 调用公司富化 API
    result = api_request("GET", "/organizations/enrich", params=params)
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        org = result.get('organization')
        print(format_company(org))


def cmd_search(args):
    """搜索人员。"""
    # 构建基础请求数据
    data = {
        'page': 1,
        'per_page': args.limit or 25
    }
    
    # 添加搜索条件
    if args.titles:
        data['person_titles'] = [t.strip() for t in args.titles.split(',')]
    if args.domain:
        data['q_organization_domains'] = args.domain
    if args.locations:
        data['person_locations'] = [l.strip() for l in args.locations.split(',')]
    if args.keywords:
        data['q_keywords'] = args.keywords
    
    # 调用搜索 API
    result = api_request("POST", "/mixed_people/search", data=data)
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        people = result.get('people', [])
        total = result.get('pagination', {}).get('total_entries', len(people))
        print(f"找到 {total} 个结果（显示 {len(people)} 个）:\n")
        for person in people:
            print(format_person(person))
            print()


def main():
    """
    主函数：解析命令行参数并执行相应命令。
    """
    parser = argparse.ArgumentParser(
        description="Clawdbot 的 Apollo.io 富化 CLI 工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  apollo.py enrich --email john@acme.com
  apollo.py enrich --name "John Smith" --domain acme.com
  apollo.py company --domain stripe.com
  apollo.py search --titles "CEO,CTO" --domain acme.com
  apollo.py bulk-enrich --file contacts.json
        """
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # ========== 富化单个个人的命令 ==========
    enrich = subparsers.add_parser("enrich", help="富化单个个人")
    enrich.add_argument("--email", "-e", help="电子邮件地址")
    enrich.add_argument("--name", "-n", help="全名")
    enrich.add_argument("--first-name", help="名")
    enrich.add_argument("--last-name", help="姓")
    enrich.add_argument("--domain", "-d", help="公司域名")
    enrich.add_argument("--linkedin", "-l", help="LinkedIn URL")
    enrich.add_argument("--reveal-email", action="store_true", help="包含个人电子邮件")
    enrich.add_argument("--reveal-phone", action="store_true", help="包含电话号码")
    enrich.add_argument("--json", action="store_true", help="JSON 格式输出")
    
    # ========== 批量富化的命令 ==========
    bulk = subparsers.add_parser("bulk-enrich", help="批量富化最多 10 个人")
    bulk.add_argument("--file", "-f", required=True, help="包含联系人数组的 JSON 文件")
    bulk.add_argument("--reveal-email", action="store_true", help="包含个人电子邮件")
    bulk.add_argument("--reveal-phone", action="store_true", help="包含电话号码")
    bulk.add_argument("--json", action="store_true", help="JSON 格式输出")
    
    # ========== 公司富化的命令 ==========
    company = subparsers.add_parser("company", help="富化公司")
    company.add_argument("--domain", "-d", required=True, help="公司域名")
    company.add_argument("--json", action="store_true", help="JSON 格式输出")
    
    # ========== 人员搜索的命令 ==========
    search = subparsers.add_parser("search", help="搜索人员")
    search.add_argument("--titles", "-t", help="职位名称（逗号分隔）")
    search.add_argument("--domain", "-d", help="公司域名")
    search.add_argument("--locations", "-l", help="位置（逗号分隔）")
    search.add_argument("--keywords", "-k", help="关键词")
    search.add_argument("--limit", type=int, default=25, help="最大结果数（默认: 25）")
    search.add_argument("--json", action="store_true", help="JSON 格式输出")
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 命令映射表
    commands = {
        "enrich": cmd_enrich,
        "bulk-enrich": cmd_bulk_enrich,
        "company": cmd_company,
        "search": cmd_search,
    }
    
    # 执行对应的命令
    commands[args.command](args)


if __name__ == "__main__":
    main()
