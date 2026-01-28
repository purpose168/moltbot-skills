#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gemini 深度研究 API 客户端

此脚本通过 Gemini 的深度研究智能体执行复杂的长时间运行的研究任务。

功能特性：
1. 将复杂查询分解为子问题进行系统性研究
2. 自动搜索网络并收集相关信息
3. 将发现综合成结构化的综合报告
4. 支持流式进度更新
5. 自动保存结果到带时间戳的文件

依赖：
    requests - HTTP 请求库
    datetime - 日期时间处理
    pathlib - 文件路径处理

使用前请设置以下环境变量：
    GEMINI_API_KEY - Google Gemini API 密钥

使用方法：
    python deep_research.py --query "研究主题"
    python deep_research.py --query "研究主题" --format "输出格式"
    python deep_research.py --query "研究主题" --stream
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
import requests

# ============================================================================
# API 常量定义
# ============================================================================

# Gemini API 基础 URL
API_BASE = "https://generativelanguage.googleapis.com/v1beta"
# 深度研究代理模型名称
AGENT_MODEL = "deep-research-pro-preview-12-2025"


# ============================================================================
# API 交互函数
# ============================================================================

def create_interaction(api_key, query, output_format=None, file_search_store=None):
    """
    创建新的深度研究交互会话
    
    此函数向 Gemini API 发送请求，创建一个新的深度研究任务。
    研究智能体将自动分解查询、搜索网络并综合结果。
    
    参数:
        api_key: Gemini API 密钥
        query: 研究查询主题
        output_format: 自定义输出格式说明（可选）
        file_search_store: 文件搜索存储名称（可选，用于结合本地文件）
    
    返回:
        dict: API 响应，包含交互 ID
        
    异常:
        SystemExit: 如果创建失败（HTTP 状态码非 200）
    """
    # 设置请求头，包含 API 密钥
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key
    }
    
    # 构建请求负载
    payload = {
        "input": query,
        "agent": AGENT_MODEL,
        "background": True  # 在后台运行长时间任务
    }
    
    # 如果指定了输出格式，将其添加到查询中
    if output_format:
        payload["input"] = f"{query}\n\n请按以下格式输出：\n{output_format}"
    
    # 如果指定了文件搜索存储，添加工具配置
    if file_search_store:
        payload["tools"] = [{
            "type": "file_search",
            "file_search_store_names": [file_search_store]
        }]
    
    # 发送 POST 请求创建交互
    response = requests.post(
        f"{API_BASE}/interactions",
        headers=headers,
        json=payload
    )
    
    # 检查响应状态
    if response.status_code != 200:
        print(f"创建交互失败: {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)
    
    return response.json()


def poll_interaction(api_key, interaction_id, stream=False):
    """
    轮询交互状态直到完成
    
    此函数定期向 Gemini API 查询研究任务的进度和状态，
    等待任务完成或失败。
    
    参数:
        api_key: Gemini API 密钥
        interaction_id: 交互会话 ID
        stream: 是否显示流式进度更新
    
    返回:
        dict: 完成的交互数据，包含最终报告
        
    异常:
        SystemExit: 如果轮询失败或研究任务失败
    """
    # 设置请求头
    headers = {
        "x-goog-api-key": api_key
    }
    
    # 持续轮询直到完成
    while True:
        # 发送 GET 请求查询交互状态
        response = requests.get(
            f"{API_BASE}/interactions/{interaction_id}",
            headers=headers
        )
        
        # 检查响应状态
        if response.status_code != 200:
            print(f"轮询交互失败: {response.status_code}", file=sys.stderr)
            print(response.text, file=sys.stderr)
            sys.exit(1)
        
        data = response.json()
        status = data.get("status", "UNKNOWN")
        
        # 如果启用流式输出，显示进度消息
        if stream:
            if "statusMessage" in data:
                print(f"[{status}] {data['statusMessage']}", file=sys.stderr)
        
        # 检查任务状态
        if status == "completed":
            return data
        elif status == "failed":
            print(f"研究失败: {data.get('error', '未知错误')}", file=sys.stderr)
            sys.exit(1)
        
        # 等待 10 秒后再次轮询
        time.sleep(10)


def extract_report(interaction_data):
    """
    从交互数据中提取最终报告文本
    
    此函数尝试从交互响应中提取 AI 生成的最终研究报告。
    它会检查多个可能的位置来查找报告内容。
    
    参数:
        interaction_data: 交互响应数据
        
    返回:
        str 或 None: 提取的报告文本，如果找不到则返回 None
    """
    # 首先检查顶层 output 字段
    if "output" in interaction_data:
        output = interaction_data["output"]
        if isinstance(output, dict) and "text" in output:
            return output["text"]
        elif isinstance(output, str):
            return output
    
    # 回退方案：检查消息历史
    messages = interaction_data.get("messages", [])
    # 从后往前查找模型生成的最后一条消息
    for msg in reversed(messages):
        if msg.get("role") == "model" and "parts" in msg:
            for part in msg["parts"]:
                if "text" in part:
                    return part["text"]
    
    return None


# ============================================================================
# 主程序入口
# ============================================================================

def main():
    """
    主函数：解析命令行参数并执行深度研究任务
    
    流程：
    1. 解析命令行参数
    2. 获取 API 密钥
    3. 创建研究交互
    4. 轮询直到研究完成
    5. 提取并保存报告
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="Gemini 深度研究 API 客户端")
    
    # 添加命令行参数
    parser.add_argument("--query", required=True, help="研究查询")
    parser.add_argument("--format", help="自定义输出格式说明")
    parser.add_argument("--file-search-store", help="文件搜索存储名称（可选）")
    parser.add_argument("--stream", action="store_true", help="显示流式进度更新")
    parser.add_argument("--output-dir", default=".", help="结果输出目录")
    parser.add_argument("--api-key", help="Gemini API 密钥（覆盖 GEMINI_API_KEY 环境变量）")
    
    # 解析参数
    args = parser.parse_args()
    
    # 获取 API 密钥（优先使用命令行参数，其次使用环境变量）
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("错误：未提供 API 密钥。", file=sys.stderr)
        print("请执行以下操作之一：", file=sys.stderr)
        print("  1. 提供 --api-key 参数", file=sys.stderr)
        print("  2. 设置 GEMINI_API_KEY 环境变量", file=sys.stderr)
        sys.exit(1)
    
    # 开始研究任务
    print(f"开始深度研究：{args.query}", file=sys.stderr)
    interaction = create_interaction(
        api_key,
        args.query,
        output_format=args.format,
        file_search_store=args.file_search_store
    )
    
    # 获取交互 ID
    interaction_id = interaction.get("id")
    if not interaction_id:
        print(f"错误：响应中缺少交互 ID：{interaction}", file=sys.stderr)
        sys.exit(1)
    print(f"交互已启动：{interaction_id}", file=sys.stderr)
    
    # 轮询直到获得结果
    print("正在等待结果（这可能需要几分钟）...", file=sys.stderr)
    result = poll_interaction(api_key, interaction_id, stream=args.stream)
    
    # 提取最终报告
    report = extract_report(result)
    
    # 如果无法提取报告，使用原始 JSON 数据
    if not report:
        print("警告：无法从响应中提取报告文本", file=sys.stderr)
        report = json.dumps(result, indent=2)
    
    # 保存结果到文件
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 生成输出文件路径
    md_path = output_dir / f"deep-research-{timestamp}.md"
    json_path = output_dir / f"deep-research-{timestamp}.json"
    
    # 保存报告（Markdown 格式）
    md_path.write_text(report)
    # 保存完整数据（JSON 格式）
    json_path.write_text(json.dumps(result, indent=2))
    
    # 打印完成信息
    print(f"\n研究完成！", file=sys.stderr)
    print(f"报告已保存：{md_path}", file=sys.stderr)
    print(f"完整数据已保存：{json_path}", file=sys.stderr)
    
    # 将报告打印到标准输出
    print(report)


# ============================================================================
# 程序入口点
# ============================================================================

if __name__ == "__main__":
    main()
