#!/usr/bin/env python3
"""
本地语音转文字脚本，使用 OpenAI Whisper（在模型下载后完全离线运行）。
"""

import json
import sys
import warnings

import click

# 忽略所有警告信息
warnings.filterwarnings("ignore")

# 支持的 Whisper 模型列表
MODELS = ["tiny", "tiny.en", "base", "base.en", "small", "small.en",
          "medium", "medium.en", "large-v3", "turbo"]


@click.command()
@click.argument("audio_file", type=click.Path(exists=True))
@click.option("-m", "--model", default="base", type=click.Choice(MODELS), help="Whisper 模型大小")
@click.option("-l", "--language", default=None, help="语言代码（省略时自动检测）")
@click.option("-t", "--timestamps", is_flag=True, help="包含单词级别的时间戳")
@click.option("-j", "--json", "as_json", is_flag=True, help="输出为 JSON 格式")
@click.option("-q", "--quiet", is_flag=True, help="隐藏进度消息")
def main(audio_file, model, language, timestamps, as_json, quiet):
    """使用 OpenAI Whisper 进行本地语音转文字。"""
    try:
        import whisper
    except ImportError:
        click.echo("错误: openai-whisper 未安装", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"正在加载模型: {model}...", err=True)

    try:
        whisper_model = whisper.load_model(model)
    except Exception as e:
        click.echo(f"错误加载模型: {e}", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"正在转录: {audio_file}...", err=True)

    try:
        result = whisper_model.transcribe(audio_file, language=language,
                                          word_timestamps=timestamps, verbose=False)
    except Exception as e:
        click.echo(f"错误转录: {e}", err=True)
        sys.exit(1)

    text = result["text"].strip()

    if as_json:
        output = {"text": text, "language": result.get("language", "unknown")}
        if timestamps and "segments" in result:
            output["segments"] = [
                {"start": s["start"], "end": s["end"], "text": s["text"],
                 **({"words": s["words"]} if "words" in s else {})}
                for s in result["segments"]
            ]
        click.echo(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        click.echo(text)
        if timestamps and "segments" in result:
            click.echo("\n--- 片段 ---", err=True)
            for seg in result["segments"]:
                click.echo(f"  [{seg['start']:.2f}秒 - {seg['end']:.2f}秒]: {seg['text']}", err=True)


if __name__ == "__main__":
    main()
