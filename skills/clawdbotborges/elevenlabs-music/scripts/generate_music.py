#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "elevenlabs>=1.0.0",
#     "python-dotenv",
# ]
# ///
"""
ElevenLabs 音乐生成脚本

使用 Eleven Music API 从文本提示生成音乐。

用法:
    uv run generate_music.py "您的提示词" [选项]

示例:
    uv run generate_music.py "upbeat jazz piano" --length 30
    uv run generate_music.py "epic orchestral battle music" --length 60 --instrumental
    uv run generate_music.py "sad acoustic guitar ballad" -o my_song.mp3
"""

import argparse
import os
import sys
from pathlib import Path

from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def generate_music(
    prompt: str,
    length_seconds: int = 30,
    output_path: str = None,
    instrumental: bool = False,
):
    """
    从文本提示生成音乐。
    
    参数:
        prompt: 描述要生成的音乐的文本提示
        length_seconds: 音乐长度（秒），默认 30 秒
        output_path: 输出文件路径，默认 /tmp/music.mp3
        instrumental: 是否强制器乐模式（无人声），默认 False
    
    返回:
        生成的音频文件路径
    """
    # 检查 API 密钥
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("错误: 未在环境中找到 ELEVENLABS_API_KEY", file=sys.stderr)
        print("设置方法: export ELEVENLABS_API_KEY='您的密钥'", file=sys.stderr)
        sys.exit(1)

    # 初始化 ElevenLabs 客户端
    client = ElevenLabs(api_key=api_key)
    
    # 转换长度为毫秒，并限制在有效范围内（3秒 - 600秒）
    length_ms = length_seconds * 1000
    length_ms = max(3000, min(600000, length_ms))
    
    print(f"🎵 正在生成音乐...", file=sys.stderr)
    print(f"   提示词: {prompt[:80]}{'...' if len(prompt) > 80 else ''}", file=sys.stderr)
    print(f"   长度: {length_ms // 1000}秒", file=sys.stderr)
    print(f"   器乐模式: {instrumental}", file=sys.stderr)
    print(file=sys.stderr)

    try:
        # 调用 ElevenLabs Music API 生成音乐
        audio_chunks = client.music.compose(
            prompt=prompt,
            music_length_ms=length_ms,
            force_instrumental=instrumental,
        )
        audio_data = b"".join(audio_chunks)
    except Exception as e:
        error_str = str(e)
        # 检查是否需要付费套餐
        if "limited_access" in error_str or "402" in error_str:
            print("❌ 错误: 音乐 API 需要付费的 ElevenLabs 套餐", file=sys.stderr)
            print("   升级地址: https://elevenlabs.io/pricing", file=sys.stderr)
            sys.exit(1)
        # 检查是否是提示词包含版权内容
        elif "bad_prompt" in error_str:
            print("❌ 错误: 提示词可能包含受版权保护的内容", file=sys.stderr)
            if hasattr(e, 'body'):
                suggestion = e.body.get('detail', {}).get('data', {}).get('prompt_suggestion', '')
                if suggestion:
                    print(f"   建议: {suggestion}", file=sys.stderr)
            sys.exit(1)
        else:
            raise

    # 确定输出路径
    if not output_path:
        output_path = Path("/tmp/music.mp3")
    else:
        output_path = Path(output_path)
    
    # 保存音频文件
    with open(output_path, "wb") as f:
        f.write(audio_data)
    
    print(f"✅ 已保存至: {output_path}", file=sys.stderr)
    # 仅打印路径到标准输出，便于捕获
    print(output_path)
    return str(output_path)


def main():
    """
    主函数：解析命令行参数并调用音乐生成函数。
    """
    parser = argparse.ArgumentParser(
        description="使用 ElevenLabs Eleven Music API 生成音乐",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s "upbeat electronic dance track"
  %(prog)s "calm lo-fi beats for studying" --length 120
  %(prog)s "epic orchestral" --instrumental
  %(prog)s "jazz piano trio" -o ~/Music/jazz.mp3
        """,
    )
    
    parser.add_argument("prompt", help="要生成的音乐的文本描述")
    parser.add_argument(
        "-l", "--length",
        type=int,
        default=30,
        help="长度（秒）（3-600，默认: 30）",
    )
    parser.add_argument(
        "-o", "--output",
        help="输出文件路径（默认: /tmp/music.mp3）",
    )
    parser.add_argument(
        "-i", "--instrumental",
        action="store_true",
        help="强制器乐模式（无人声）",
    )

    args = parser.parse_args()

    output_file = generate_music(
        prompt=args.prompt,
        length_seconds=args.length,
        output_path=args.output,
        instrumental=args.instrumental,
    )
    
    return output_file


if __name__ == "__main__":
    main()
