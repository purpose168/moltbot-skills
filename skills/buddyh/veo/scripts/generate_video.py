#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
# ]
# ///
"""
使用 Google Veo API 生成视频的脚本。

功能说明：
- 根据文本描述生成高质量视频
- 支持自定义视频时长、宽高比和模型选择
- 自动下载生成的视频文件并保存到本地
- 输出符合 Clawdbot 格式的媒体文件标记

使用方式：
    uv run generate_video.py --prompt "你的视频描述" --filename "output.mp4" [--duration 8] [--aspect-ratio 16:9] [--model MODEL]

参数说明：
    --prompt, -p: 视频描述文本（必填）
    --filename, -f: 输出文件名，如 output.mp4（必填）
    --duration, -d: 视频时长（秒），默认 8 秒
    --aspect-ratio, -a: 宽高比，默认 16:9
    --model, -m: 使用的 Veo 模型，默认 veo-3.1-generate-preview
"""

import argparse
import os
import sys
import time
from pathlib import Path


def main():
    """
    主函数：解析命令行参数并执行视频生成流程
    
    处理流程：
    1. 解析用户输入的命令行参数
    2. 初始化 Google GenAI 客户端
    3. 配置视频生成参数并发起请求
    4. 轮询等待视频生成完成
    5. 下载并保存生成的视频文件
    """
    # 创建命令行参数解析器，设置程序描述信息
    parser = argparse.ArgumentParser(
        description="使用 Google Veo API 生成视频"
    )
    
    # 添加视频描述参数（必填）
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="视频描述/提示文本"
    )
    
    # 添加输出文件名参数（必填）
    parser.add_argument(
        "--filename", "-f",
        required=True,
        help="输出文件名（如：output.mp4）"
    )
    
    # 添加视频时长参数（可选，默认 8 秒）
    parser.add_argument(
        "--duration", "-d",
        type=int,
        default=8,
        help="视频时长（秒），默认值为 8"
    )
    
    # 添加宽高比参数（可选，默认 16:9）
    parser.add_argument(
        "--aspect-ratio", "-a",
        choices=["16:9", "9:16", "1:1"],
        default="16:9",
        help="视频宽高比，默认值为 16:9"
    )
    
    # 添加模型选择参数（可选，默认 veo-3.1-generate-preview）
    parser.add_argument(
        "--model", "-m",
        default="veo-3.1-generate-preview",
        help="使用的 Veo 模型版本（默认：veo-3.1-generate-preview）"
    )

    # 解析命令行参数
    args = parser.parse_args()

    # 在导入 google-genai 库之前先解析参数，以便快速失败
    # 如果库未安装会立即提示错误
    from google import genai
    from google.genai import types

    # 初始化客户端（依赖 GEMINI_API_KEY 环境变量）
    client = genai.Client()

    # 设置输出路径
    output_path = Path(args.filename)
    # 确保输出目录存在，如果不存在则创建（包括所有父目录）
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 打印视频生成参数信息
    print(f"正在使用模型 {args.model} 生成视频...")
    print(f"  视频描述：{args.prompt}")
    print(f"  视频时长：{args.duration} 秒")
    print(f"  宽高比：{args.aspect_ratio}")

    try:
        # 发起视频生成请求
        operation = client.models.generate_videos(
            model=args.model,
            prompt=args.prompt,
            config=types.GenerateVideosConfig(
                duration_seconds=args.duration,
                aspect_ratio=args.aspect_ratio,
            )
        )

        print(f"视频生成任务已启动：{operation.name}")

        # 轮询等待视频生成完成
        # 每隔 10 秒检查一次操作状态
        while not operation.done:
            print("正在等待视频生成完成...")
            time.sleep(10)
            # 刷新操作状态，获取最新的生成进度
            operation = client.operations.get(operation)

        print("视频生成完成！")

        # 获取生成的视频对象
        generated_video = operation.response.generated_videos[0]

        # 下载视频文件
        print("正在下载视频...")
        client.files.download(file=generated_video.video)
        generated_video.video.save(str(output_path))

        # 验证文件是否成功保存并报告结果
        if output_path.exists():
            # 计算文件大小（MB）
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"\n视频已保存：{output_path}（{size_mb:.2f} MB）")
            # 输出 MEDIA: 标记，便于 Clawdbot 自动识别和附件
            print(f"MEDIA: {output_path}")
        else:
            # 文件保存失败，输出错误信息并退出程序
            print("错误：视频文件未能成功保存。", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        # 捕获并处理视频生成过程中的异常
        print(f"视频生成过程中发生错误：{e}", file=sys.stderr)
        import traceback
        # 打印完整的错误堆栈信息，便于调试
        traceback.print_exc()
        # 异常退出程序
        sys.exit(1)


if __name__ == "__main__":
    # 当脚本直接运行时执行主函数
    main()
