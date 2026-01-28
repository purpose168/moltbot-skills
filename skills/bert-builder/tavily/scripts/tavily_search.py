#!/usr/bin/env python3
"""
Tavily AI 搜索 - 为 LLM 和 AI 应用优化的搜索工具
依赖: pip install tavily-python
"""

import argparse
import json
import sys
import os
from typing import Optional, List


def search(
    query: str,
    api_key: str,
    search_depth: str = "basic",
    topic: str = "general",
    max_results: int = 5,
    include_answer: bool = True,
    include_raw_content: bool = False,
    include_images: bool = False,
    include_domains: Optional[List[str]] = None,
    exclude_domains: Optional[List[str]] = None,
) -> dict:
    """
    执行 Tavily 搜索查询。
    
    参数:
        query: 搜索查询字符串
        api_key: Tavily API 密钥 (tvly-...)
        search_depth: "basic"（快速）或 "advanced"（综合）
        topic: "general"（默认）或 "news"（当前事件）
        max_results: 返回结果数量 (1-10)
        include_answer: 包含 AI 生成的答案摘要
        include_raw_content: 包含来源的原始 HTML 内容
        include_images: 在结果中包含相关图片
        include_domains: 要特别包含的域名列表
        exclude_domains: 要排除的域名列表
    
    返回:
        dict: Tavily API 响应
    """
    try:
        from tavily import TavilyClient
    except ImportError:
        return {
            "error": "未安装 tavily-python 软件包。运行: pip install tavily-python",
            "install_command": "pip install tavily-python"
        }
    
    if not api_key:
        return {
            "error": "需要 Tavily API 密钥。在 https://tavily.com 获取",
            "setup_instructions": "设置 TAVILY_API_KEY 环境变量或传递 --api-key 参数"
        }
    
    try:
        client = TavilyClient(api_key=api_key)
        
        # 构建搜索参数
        search_params = {
            "query": query,
            "search_depth": search_depth,
            "topic": topic,
            "max_results": max_results,
            "include_answer": include_answer,
            "include_raw_content": include_raw_content,
            "include_images": include_images,
        }
        
        if include_domains:
            search_params["include_domains"] = include_domains
        if exclude_domains:
            search_params["exclude_domains"] = exclude_domains
        
        response = client.search(**search_params)
        
        return {
            "success": True,
            "query": query,
            "answer": response.get("answer"),
            "results": response.get("results", []),
            "images": response.get("images", []),
            "response_time": response.get("response_time"),
            "usage": response.get("usage", {}),
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "query": query
        }


def main():
    parser = argparse.ArgumentParser(
        description="Tavily AI 搜索 - 为 LLM 优化的搜索工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本搜索
  %(prog)s "什么是量子计算？"
  
  # 带有更多结果的高级搜索
  %(prog)s "气候变化的解决方案" --depth advanced --max-results 10
  
  # 新闻焦点搜索
  %(prog)s "AI 发展" --topic news
  
  # 域名过滤
  %(prog)s "Python 教程" --include-domains python.org --exclude-domains w3schools.com
  
  # 在结果中包含图片
  %(prog)s "埃菲尔铁塔" --images
  
  环境变量:
  TAVILY_API_KEY    您的 Tavily API 密钥（在 https://tavily.com 获取）
        """
    )
    
    parser.add_argument(
        "query",
        help="搜索查询"
    )
    
    parser.add_argument(
        "--api-key",
        help="Tavily API 密钥（或设置 TAVILY_API_KEY 环境变量）"
    )
    
    parser.add_argument(
        "--depth",
        choices=["basic", "advanced"],
        default="basic",
        help="搜索深度: 'basic'（快速）或 'advanced'（综合）"
    )
    
    parser.add_argument(
        "--topic",
        choices=["general", "news"],
        default="general",
        help="搜索主题: 'general' 或 'news'（当前事件）"
    )
    
    parser.add_argument(
        "--max-results",
        type=int,
        default=5,
        help="最大结果数量 (1-10)"
    )
    
    parser.add_argument(
        "--no-answer",
        action="store_true",
        help="排除 AI 生成的答案摘要"
    )
    
    parser.add_argument(
        "--raw-content",
        action="store_true",
        help="包含来源的原始 HTML 内容"
    )
    
    parser.add_argument(
        "--images",
        action="store_true",
        help="在结果中包含相关图片"
    )
    
    parser.add_argument(
        "--include-domains",
        nargs="+",
        help="要特别包含的域名列表"
    )
    
    parser.add_argument(
        "--exclude-domains",
        nargs="+",
        help="要排除的域名列表"
    )
    
    parser.add_argument(
        "--json",
        action="store_true",
        help="输出原始 JSON 响应"
    )
    
    args = parser.parse_args()
    
    # 从参数或环境变量获取 API 密钥
    api_key = args.api_key or os.getenv("TAVILY_API_KEY")
    
    result = search(
        query=args.query,
        api_key=api_key,
        search_depth=args.depth,
        topic=args.topic,
        max_results=args.max_results,
        include_answer=not args.no_answer,
        include_raw_content=args.raw_content,
        include_images=args.images,
        include_domains=args.include_domains,
        exclude_domains=args.exclude_domains,
    )
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if "error" in result:
            print(f"错误: {result['error']}", file=sys.stderr)
            if "install_command" in result:
                print(f"\n安装命令: {result['install_command']}", file=sys.stderr)
            if "setup_instructions" in result:
                print(f"\n设置说明: {result['setup_instructions']}", file=sys.stderr)
            sys.exit(1)
        
        # 格式化人类可读的输出
        print(f"查询: {result['query']}")
        print(f"响应时间: {result.get('response_time', 'N/A')}秒")
        print(f"消耗积分: {result.get('usage', {}).get('credits', 'N/A')}\n")
        
        if result.get("answer"):
            print("=== AI 答案 ===")
            print(result["answer"])
            print()
        
        if result.get("results"):
            print("=== 结果 ===")
            for i, item in enumerate(result["results"], 1):
                print(f"\n{i}. {item.get('title', '无标题')}")
                print(f"   URL: {item.get('url', 'N/A')}")
                print(f"   评分: {item.get('score', 'N/A'):.3f}")
                if item.get("content"):
                    content = item["content"]
                    if len(content) > 200:
                        content = content[:200] + "..."
                    print(f"   {content}")
        
        if result.get("images"):
            print(f"\n=== 图片 ({len(result['images'])}) ===")
            for img_url in result["images"][:5]:  # 显示前5张
                print(f"   {img_url}")


if __name__ == "__main__":
    main()
