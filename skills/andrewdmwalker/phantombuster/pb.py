#!/usr/bin/env python3
"""
PhantomBuster CLI 工具 for Clawdbot。

控制您的 PhantomBuster 自动化智能体。

支持的命令：
- list: 列出所有智能体
- launch: 启动智能体
- output: 获取智能体输出
- status: 检查智能体状态
- abort: 中止正在运行的智能体
- get: 获取智能体详情
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

# PhantomBuster API 的基础 URL
API_BASE = "https://api.phantombuster.com/api/v2"


def get_api_key():
    """
    从环境变量中获取 API 密钥。
    
    返回:
        str: PhantomBuster API 密钥
        
    退出:
        如果环境变量未设置，则退出程序并显示错误信息
    """
    api_key = os.environ.get("PHANTOMBUSTER_API_KEY")
    if not api_key:
        print("错误: PHANTOMBUSTER_API_KEY 环境变量未设置", file=sys.stderr)
        print("获取密钥的地址: https://phantombuster.com/workspace-settings", file=sys.stderr)
        sys.exit(1)
    return api_key


def api_request(method, endpoint, data=None):
    """
    向 PhantomBuster API 发起请求。
    
    参数:
        method: HTTP 方法（GET、POST 等）
        endpoint: API 端点路径
        data: 请求体数据（可选）
        
    返回:
        dict: API 响应的 JSON 数据
        
    退出:
        遇到 HTTP 错误或网络错误时退出程序
    """
    api_key = get_api_key()
    url = f"{API_BASE}{endpoint}"
    
    # 设置请求头，包含 API 密钥和内容类型
    headers = {
        "X-Phantombuster-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # 序列化请求数据为 JSON
    if data:
        data = json.dumps(data).encode('utf-8')
    
    # 创建请求对象
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
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


def cmd_list(args):
    """列出所有智能体。"""
    result = api_request("GET", "/agents/fetch-all")
    
    # 处理响应数据
    agents = result if isinstance(result, list) else result.get("data", [])
    
    # 如果要求 JSON 格式输出
    if args.json:
        print(json.dumps(agents, indent=2))
        return
    
    # 显示摘要信息
    if not agents:
        print("未找到智能体。")
        return
    
    print(f"找到 {len(agents)} 个智能体:\n")
    for agent in agents:
        agent_id = agent.get("id", "?")
        name = agent.get("name", "未命名")
        script = agent.get("scriptName", agent.get("script", ""))
        last_status = agent.get("lastEndStatus", "unknown")
        
        # 状态表情符号映射
        status_emoji = {
            "finished": "✅",
            "error": "❌",
            "running": "🔄",
            "unknown": "❓"
        }.get(last_status, "❓")
        
        print(f"{status_emoji} [{agent_id}] {name}")
        if script:
            print(f"   脚本: {script}")
        print()


def cmd_launch(args):
    """启动智能体。"""
    data = {"id": args.agent_id}
    
    # 处理可选参数
    if args.argument:
        try:
            data["argument"] = json.loads(args.argument)
        except json.JSONDecodeError:
            # 作为字符串参数处理
            data["argument"] = args.argument
    
    # 调用启动 API
    result = api_request("POST", "/agents/launch", data)
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        container_id = result.get("containerId", "unknown")
        print(f"✅ 智能体 {args.agent_id} 已启动！")
        print(f"   容器 ID: {container_id}")


def cmd_output(args):
    """获取智能体输出。"""
    result = api_request("GET", f"/agents/fetch-output?id={args.agent_id}")
    
    # 如果要求 JSON 格式输出
    if args.json:
        print(json.dumps(result, indent=2))
        return
    
    # 解析并显示结果
    status = result.get("status", "unknown")
    output = result.get("output", "")
    result_object = result.get("resultObject")
    
    print(f"状态: {status}")
    
    # 显示控制台输出
    if output:
        print(f"\n--- 控制台输出 ---\n{output}")
    
    # 显示结果数据
    if result_object:
        print(f"\n--- 结果数据 ---")
        if isinstance(result_object, str):
            try:
                parsed = json.loads(result_object)
                print(json.dumps(parsed, indent=2))
            except:
                print(result_object)
        else:
            print(json.dumps(result_object, indent=2))


def cmd_status(args):
    """检查智能体状态。"""
    result = api_request("GET", f"/agents/fetch?id={args.agent_id}")
    
    # 如果要求 JSON 格式输出
    if args.json:
        print(json.dumps(result, indent=2))
        return
    
    # 解析并显示状态信息
    name = result.get("name", "未知")
    last_status = result.get("lastEndStatus", "unknown")
    last_end = result.get("lastEndMessage", "")
    running = result.get("runningContainers", 0)
    
    # 状态表情符号映射
    status_emoji = {
        "finished": "✅",
        "error": "❌",
        "running": "🔄"
    }.get(last_status, "❓")
    
    print(f"智能体: {name}")
    print(f"状态: {status_emoji} {last_status}")
    if running > 0:
        print(f"正在运行的容器: {running}")
    if last_end:
        print(f"最后消息: {last_end}")


def cmd_abort(args):
    """中止正在运行的智能体。"""
    result = api_request("POST", "/agents/abort", {"id": args.agent_id})
    
    # 根据输出格式显示结果
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"🛑 中止信号已发送到智能体 {args.agent_id}")


def cmd_get(args):
    """获取智能体详情。"""
    result = api_request("GET", f"/agents/fetch?id={args.agent_id}")
    
    # 如果要求 JSON 格式输出
    if args.json:
        print(json.dumps(result, indent=2))
        return
    
    # 显示智能体详细信息
    print(f"智能体: {result.get('name', '未知')}")
    print(f"ID: {result.get('id', '?')}")
    print(f"脚本: {result.get('scriptName', result.get('script', 'N/A'))}")
    print(f"最后状态: {result.get('lastEndStatus', 'unknown')}")
    print(f"最后消息: {result.get('lastEndMessage', 'N/A')}")
    print(f"运行中: {result.get('runningContainers', 0)} 个容器")
    
    # 显示智能体参数
    if result.get("argument"):
        print(f"\n参数:")
        arg = result["argument"]
        if isinstance(arg, str):
            try:
                print(json.dumps(json.loads(arg), indent=2))
            except:
                print(arg)
        else:
            print(json.dumps(arg, indent=2))


def main():
    """
    主函数：解析命令行参数并执行相应命令。
    """
    parser = argparse.ArgumentParser(
        description="Clawdbot 的 PhantomBuster CLI 工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  pb.py list                          # 列出所有智能体
  pb.py launch 12345                  # 按 ID 启动智能体
  pb.py output 12345                  # 从智能体获取输出
  pb.py status 12345                  # 检查智能体状态
  pb.py abort 12345                   # 中止正在运行的智能体
        """
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # ========== 列出命令 ==========
    list_parser = subparsers.add_parser("list", help="列出所有智能体")
    list_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # ========== 启动命令 ==========
    launch_parser = subparsers.add_parser("launch", help="启动智能体")
    launch_parser.add_argument("agent_id", help="智能体 ID")
    launch_parser.add_argument("--argument", "-a", help="要传递的 JSON 参数")
    launch_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # ========== 输出命令 ==========
    output_parser = subparsers.add_parser("output", help="获取智能体输出")
    output_parser.add_argument("agent_id", help="智能体 ID")
    output_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # ========== 状态命令 ==========
    status_parser = subparsers.add_parser("status", help="检查智能体状态")
    status_parser.add_argument("agent_id", help="智能体 ID")
    status_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # ========== 中止命令 ==========
    abort_parser = subparsers.add_parser("abort", help="中止正在运行的智能体")
    abort_parser.add_argument("agent_id", help="智能体 ID")
    abort_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # ========== 获取详情命令 ==========
    get_parser = subparsers.add_parser("get", help="获取智能体详情")
    get_parser.add_argument("agent_id", help="智能体 ID")
    get_parser.add_argument("--json", action="store_true", help="JSON 输出")
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 命令映射表
    commands = {
        "list": cmd_list,
        "launch": cmd_launch,
        "output": cmd_output,
        "status": cmd_status,
        "abort": cmd_abort,
        "get": cmd_get,
    }
    
    # 执行对应的命令
    commands[args.command](args)


if __name__ == "__main__":
    main()
