#!/usr/bin/env python3
"""
将对抗性提示分析导出到markdown文件。
"""

import sys
from datetime import datetime
from pathlib import Path


def export_analysis(content: str, problem_summary: str = "analysis") -> str:
    """
    将分析内容导出到markdown文件。
    
    参数:
        content: 要导出的完整分析内容
        problem_summary: 文件名的简短描述（默认: "analysis"）
    
    返回:
        创建的文件路径
    """
    # 创建带时间戳的文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 清理problem_summary以用于文件名
    safe_summary = "".join(c for c in problem_summary if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_summary = safe_summary.replace(' ', '_')[:50]  # 限制长度
    
    filename = f"adversarial_analysis_{safe_summary}_{timestamp}.md"
    filepath = Path.home() / filename
    
    # 将内容写入文件
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# 对抗性分析: {problem_summary}\n\n")
        f.write(f"*生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
        f.write("---\n\n")
        f.write(content)
    
    return str(filepath)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python export_analysis.py <content> [problem_summary]")
        sys.exit(1)
    
    content = sys.argv[1]
    problem_summary = sys.argv[2] if len(sys.argv) > 2 else "analysis"
    
    filepath = export_analysis(content, problem_summary)
    print(f"✅ 分析已导出到: {filepath}")