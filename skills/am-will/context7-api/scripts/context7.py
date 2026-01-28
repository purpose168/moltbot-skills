#!/usr/bin/env python3
"""
Context7 API 客户端 - 用于搜索库和获取文档。
"""

import argparse
import json
import sys
import urllib.request
import urllib.parse
import urllib.error
import os

# Context7 API 基础地址
API_BASE = "https://context7.com/api/v2"
# API 密钥，从环境变量获取，默认使用提供的密钥
API_KEY = os.environ.get("CONTEXT7_API_KEY", "ctx7sk-d6069954-149e-4a74-ae8f-85092cbfcd6f")


def make_request(url: str) -> dict | str:
    """
    向 Context7 API 发出经过身份验证的请求。

    参数:
        url: 要请求的 API 端点 URL

    返回:
        如果响应是 JSON 格式，返回解析后的字典
        否则返回原始字符串
        如果发生错误，返回包含错误信息的字典
    """
    headers = {"Authorization": f"Bearer {API_KEY}"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content_type = response.headers.get("Content-Type", "")
            data = response.read().decode("utf-8")
            if "application/json" in content_type:
                return json.loads(data)
            return data
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.reason}", "body": e.read().decode("utf-8")}
    except urllib.error.URLError as e:
        return {"error": f"URL 错误: {e.reason}"}


def search_libraries(library_name: str, query: str = "") -> dict:
    """
    按名称和可选查询搜索库。

    参数:
        library_name: 要搜索的库名称（例如 "react"、"next.js"）
        query: 可选的查询字符串，用于过滤结果

    返回:
        包含搜索结果的字典
    """
    params = {"libraryName": library_name}
    if query:
        params["query"] = query

    url = f"{API_BASE}/libs/search?{urllib.parse.urlencode(params)}"
    return make_request(url)


def get_context(library_id: str, query: str, output_type: str = "txt", tokens: int = None) -> str | dict:
    """
    获取特定库的文档上下文。

    参数:
        library_id: 库的 ID（来自搜索结果，例如 "/vercel/next.js"）
        query: 描述您需要的查询（例如 "setup ssr"）
        output_type: 输出格式（"txt" 返回 Markdown 格式文本，"json" 返回 JSON）
        tokens: 返回的最大令牌数（可选）

    返回:
        文档内容（字符串或字典格式）
    """
    params = {
        "libraryId": library_id,
        "query": query,
        "type": output_type
    }
    if tokens:
        params["tokens"] = tokens

    url = f"{API_BASE}/context?{urllib.parse.urlencode(params)}"
    return make_request(url)


def main():
    """主函数，解析命令行参数并执行相应的操作。"""
    parser = argparse.ArgumentParser(description="Context7 API 客户端")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 搜索命令
    search_parser = subparsers.add_parser("search", help="搜索库")
    search_parser.add_argument("library_name", help="要搜索的库名称（例如 'react', 'next.js'）")
    search_parser.add_argument("--query", "-q", default="", help="用于过滤结果的可选查询")

    # 上下文命令
    context_parser = subparsers.add_parser("context", help="获取文档上下文")
    context_parser.add_argument("library_id", help="来自搜索结果的库 ID（例如 '/vercel/next.js'）")
    context_parser.add_argument("query", help="描述您需要的查询（例如 'setup ssr'）")
    context_parser.add_argument("--type", "-t", default="txt", choices=["txt", "json"], help="输出格式（txt 返回 Markdown 格式文本）")
    context_parser.add_argument("--tokens", type=int, help="返回的最大令牌数")

    args = parser.parse_args()

    if args.command == "search":
        result = search_libraries(args.library_name, args.query)
        if isinstance(result, dict):
            print(json.dumps(result, indent=2))
        else:
            print(result)

    elif args.command == "context":
        result = get_context(args.library_id, args.query, args.type, args.tokens)
        if isinstance(result, dict):
            print(json.dumps(result, indent=2))
        else:
            print(result)


if __name__ == "__main__":
    main()