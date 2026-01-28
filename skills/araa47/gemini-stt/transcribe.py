#!/usr/bin/env python3
"""
基于 Gemini 的语音转文字转录脚本。

支持两种认证方式：
1. GEMINI_API_KEY - 直接访问 Gemini API
2. Google Vertex AI - 使用应用程序默认凭据（ADC）

Vertex AI 需要：
- gcloud auth application-default login
- GOOGLE_CLOUD_PROJECT 或 CLOUDSDK_CORE_PROJECT 环境变量

用法：
    python transcribe.py <audio_file> [--model MODEL] [--vertex] [--project PROJECT] [--region REGION]

支持的音频格式：audio/ogg (opus), audio/mp3, audio/wav, audio/m4a
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

# 默认使用的 Gemini 模型
DEFAULT_MODEL = "gemini-2.0-flash-lite"
# Vertex AI 默认区域
DEFAULT_VERTEX_REGION = "us-central1"

# 支持的音频文件扩展名与对应的 MIME 类型映射
SUPPORTED_EXTENSIONS = {
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
}


def get_mime_type(file_path: str) -> str:
    """根据文件扩展名确定 MIME 类型。"""
    ext = os.path.splitext(file_path)[1].lower()
    return SUPPORTED_EXTENSIONS.get(ext, "audio/ogg")


def get_gcloud_access_token() -> str | None:
    """从 gcloud CLI 获取访问令牌（应用程序默认凭据）。"""
    try:
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    return None


def get_gcloud_project() -> str | None:
    """从 gcloud 配置获取项目 ID。"""
    # 首先检查环境变量
    for env_var in ["GOOGLE_CLOUD_PROJECT", "CLOUDSDK_CORE_PROJECT", "GCLOUD_PROJECT"]:
        project = os.environ.get(env_var)
        if project:
            return project
    
    # 回退到 gcloud 配置
    try:
        result = subprocess.run(
            ["gcloud", "config", "get-value", "project"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    return None


def transcribe_with_api_key(file_path: str, api_key: str, model: str) -> str:
    """使用 API 密钥通过直接 Gemini API 进行转录。"""
    with open(file_path, "rb") as f:
        audio_data = f.read()

    b64_data = base64.b64encode(audio_data).decode("utf-8")
    mime_type = get_mime_type(file_path)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "精确转录此音频文件。只返回转录文本，不要前言。"
                    },
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}},
                ]
            }
        ]
    }

    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers
    )

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["candidates"][0]["content"]["parts"][0]["text"]


def transcribe_with_vertex(file_path: str, access_token: str, project: str, region: str, model: str) -> str:
    """使用 ADC 通过 Google Vertex AI 进行转录。"""
    with open(file_path, "rb") as f:
        audio_data = f.read()

    b64_data = base64.b64encode(audio_data).decode("utf-8")
    mime_type = get_mime_type(file_path)

    url = f"https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "精确转录此音频文件。只返回转录文本，不要前言。"
                    },
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}},
                ]
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers
    )

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["candidates"][0]["content"]["parts"][0]["text"]


def transcribe(file_path: str, api_key: str | None = None, model: str = DEFAULT_MODEL,
               use_vertex: bool = False, project: str | None = None, region: str = DEFAULT_VERTEX_REGION) -> str:
    """
    使用 Gemini API 或 Vertex AI 转录音频文件。

    参数:
        file_path: 音频文件路径
        api_key: Gemini API 密钥（使用 Vertex 时可选）
        model: 使用的 Gemini 模型
        use_vertex: 强制使用 Vertex AI
        project: GCP 项目 ID（用于 Vertex）
        region: GCP 区域（用于 Vertex，默认：us-central1）

    返回:
        转录的文本

    异常:
        FileNotFoundError: 音频文件不存在
        RuntimeError: API 调用失败
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"音频文件未找到: {file_path}")

    try:
        # 如果提供了 API 密钥且不强制使用 Vertex，则使用直接 API
        if api_key and not use_vertex:
            return transcribe_with_api_key(file_path, api_key, model)
        
        # 尝试使用 ADC 的 Vertex AI
        access_token = get_gcloud_access_token()
        if access_token:
            project = project or get_gcloud_project()
            if not project:
                raise RuntimeError("未配置 GCP 项目。设置 GOOGLE_CLOUD_PROJECT 或运行 'gcloud config set project PROJECT_ID'")
            return transcribe_with_vertex(file_path, access_token, project, region, model)
        
        # 如果有 API 密钥，回退到 API 密钥认证
        if api_key:
            return transcribe_with_api_key(file_path, api_key, model)
        
        raise RuntimeError("没有可用的认证方式。设置 GEMINI_API_KEY 或运行 'gcloud auth application-default login'")
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP 错误 {e.code}: {error_body}")
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"意外的 API 响应格式: {e}")


def main():
    """主函数：解析命令行参数并执行转录。"""
    parser = argparse.ArgumentParser(
        description="使用 Google's Gemini API 或 Vertex AI 转录音频文件"
    )
    parser.add_argument("audio_file", help="要转录的音频文件路径")
    parser.add_argument(
        "--model",
        "-m",
        default=DEFAULT_MODEL,
        help=f"要使用的 Gemini 模型（默认: {DEFAULT_MODEL}）",
    )
    parser.add_argument(
        "--vertex",
        "-v",
        action="store_true",
        help="强制使用 Vertex AI（使用 ADC）",
    )
    parser.add_argument(
        "--project",
        "-p",
        help="GCP 项目 ID（用于 Vertex AI，默认为 gcloud 配置）",
    )
    parser.add_argument(
        "--region",
        "-r",
        default=DEFAULT_VERTEX_REGION,
        help=f"GCP 区域（用于 Vertex AI，默认: {DEFAULT_VERTEX_REGION}）",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    
    # 如果没有 API 键且不强制使用 Vertex，则自动检测
    if not api_key and not args.vertex:
        # 检查 ADC 是否可用
        if get_gcloud_access_token():
            args.vertex = True
        else:
            print("错误: 没有可用的认证方式。", file=sys.stderr)
            print("  方式1: 设置 GEMINI_API_KEY 环境变量", file=sys.stderr)
            print("  方式2: 运行 'gcloud auth application-default login' 使用 Vertex AI", file=sys.stderr)
            sys.exit(1)

    try:
        text = transcribe(
            args.audio_file,
            api_key=api_key,
            model=args.model,
            use_vertex=args.vertex,
            project=args.project,
            region=args.region,
        )
        print(text)
    except FileNotFoundError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
