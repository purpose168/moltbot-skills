#!/usr/bin/env python3
"""
spotify-api.py - Spotify API 助手工具

功能说明：
- 获取最近播放的历史记录
- 查询热门艺术家和歌曲
- 基于用户品味生成音乐推荐
- 支持原始 API 调用

使用方法：
    python3 scripts/spotify-api.py recent              # 最近播放
    python3 scripts/spotify-api.py top-artists         # 热门艺术家（默认 6 个月）
    python3 scripts/spotify-api.py top-artists short_term  # 热门艺术家（4 周）
    python3 scripts/spotify-api.py top-tracks          # 热门歌曲
    python3 scripts/spotify-api.py recommend           # 基于品味推荐
    python3 scripts/spotify-api.py json /me            # 原始 API 调用
"""

import json
import urllib.request
import urllib.parse
import base64
import sys
import os
from pathlib import Path
from datetime import datetime

# ============================================================================
# 配置常量
# ============================================================================

# 从环境变量读取 Spotify 客户端凭据
CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")

# 令牌文件存储路径：~/.config/spotify-clawd/token.json
TOKEN_FILE = Path.home() / ".config" / "spotify-clawd" / "token.json"

# Spotify API 基础 URL
SPOTIFY_API_BASE = "https://api.spotify.com/v1"


# ============================================================================
# 令牌管理函数
# ============================================================================

def load_token():
    """
    从本地文件加载访问令牌。

    令牌文件包含 OAuth 流程获取的 access_token 和 refresh_token。

    Returns:
        dict: 令牌数据字典，包含 access_token、refresh_token、expires_at 等

    Raises:
        SystemExit: 如果令牌文件不存在，提示用户先运行认证流程
    """
    if not TOKEN_FILE.exists():
        print("错误：未经过身份验证。请先运行 spotify-auth.py。")
        sys.exit(1)
    return json.loads(TOKEN_FILE.read_text())


def save_token(token_data):
    """
    将令牌数据保存到本地文件。

    Args:
        token_data: 包含 access_token 和 refresh_token 的字典
    """
    TOKEN_FILE.write_text(json.dumps(token_data, indent=2))


def refresh_token(token_data):
    """
    刷新访问令牌。

    当 access_token 过期时，使用 refresh_token 获取新的访问令牌。
    这是 OAuth 2.0 刷新令牌流程的实现。

    Args:
        token_data: 包含 refresh_token 的令牌字典

    Returns:
        dict: 包含新 access_token 的令牌字典
    """
    # 构建 Basic Auth 头（客户端 ID 和密钥 Base64 编码）
    auth_header = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()

    # 构建刷新令牌请求参数
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": token_data["refresh_token"],
    }).encode()

    # 发送令牌刷新请求
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    )

    with urllib.request.urlopen(req) as resp:
        new_data = json.load(resp)

    # 如果响应中没有返回新的 refresh_token，保留原有的
    if "refresh_token" not in new_data:
        new_data["refresh_token"] = token_data["refresh_token"]

    save_token(new_data)
    return new_data


# ============================================================================
# API 请求函数
# ============================================================================

def api_request(endpoint, token_data, params=None):
    """
    发送 Spotify API 请求。

    处理令牌过期自动刷新和错误处理。

    Args:
        endpoint: API 端点路径（如 "/me/player/recently-played"）
        token_data: 令牌字典
        params: 可选的查询参数字典

    Returns:
        dict: API 响应数据

    Raises:
        urllib.error.HTTPError: API 请求错误
    """
    url = f"{SPOTIFY_API_BASE}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token_data['access_token']}"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            # 令牌过期，刷新后重试
            token_data = refresh_token(token_data)
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            with urllib.request.urlopen(req) as resp:
                return json.load(resp)
        raise


# ============================================================================
# 数据获取函数
# ============================================================================

def get_recently_played(token_data, limit=20):
    """
    获取最近播放的歌曲。

    Args:
        token_data: 令牌字典
        limit: 返回结果数量（默认 20）

    Returns:
        dict: 最近播放列表响应
    """
    return api_request("/me/player/recently-played", token_data, {"limit": limit})


def get_top_artists(token_data, time_range="medium_term", limit=20):
    """
    获取热门艺术家。

    Args:
        token_data: 令牌字典
        time_range: 时间范围（short_term: 4周, medium_term: 6个月, long_term: 所有时间）
        limit: 返回结果数量（默认 20）

    Returns:
        dict: 热门艺术家列表响应
    """
    return api_request("/me/top/artists", token_data, {"time_range": time_range, "limit": limit})


def get_top_tracks(token_data, time_range="medium_term", limit=20):
    """
    获取热门歌曲。

    Args:
        token_data: 令牌字典
        time_range: 时间范围
        limit: 返回结果数量（默认 20）

    Returns:
        dict: 热门歌曲列表响应
    """
    return api_request("/me/top/tracks", token_data, {"time_range": time_range, "limit": limit})


def get_recommendations(token_data, seed_artists=None, seed_tracks=None, seed_genres=None, limit=20):
    """
    获取音乐推荐。

    基于用户喜欢的艺术家、歌曲和风格生成推荐列表。

    Args:
        token_data: 令牌字典
        seed_artists: 种子艺术家 ID 列表（最多 5 个）
        seed_tracks: 种子歌曲 ID 列表（最多 5 个）
        seed_genres: 种子风格列表（最多 5 个）
        limit: 返回结果数量（默认 20）

    Returns:
        dict: 推荐歌曲列表响应
    """
    params = {"limit": limit}
    if seed_artists:
        params["seed_artists"] = ",".join(seed_artists[:5])
    if seed_tracks:
        params["seed_tracks"] = ",".join(seed_tracks[:5])
    if seed_genres:
        params["seed_genres"] = ",".join(seed_genres[:5])
    return api_request("/recommendations", token_data, params)


# ============================================================================
# 主函数（命令行入口）
# ============================================================================

def main():
    """
    主函数：解析命令行参数并执行相应操作。
    """
    if len(sys.argv) < 2:
        print("用法：spotify-api.py <命令>")
        print("可用命令：recent, top-artists, top-tracks, recommend, json")
        return 1

    # 获取命令参数
    cmd = sys.argv[1]
    token_data = load_token()

    if cmd == "recent":
        # 最近播放
        data = get_recently_played(token_data)
        print("最近播放：")
        for item in data["items"]:
            track = item["track"]
            played_at = item["played_at"]
            artists = ", ".join(a["name"] for a in track["artists"])
            print(f"  {track['name']} - {artists} ({played_at[:10]})")

    elif cmd == "top-artists":
        # 热门艺术家
        time_range = sys.argv[2] if len(sys.argv) > 2 else "medium_term"
        data = get_top_artists(token_data, time_range)
        print(f"热门艺术家 ({time_range}):")
        for i, artist in enumerate(data["items"], 1):
            genres = ", ".join(artist["genres"][:3]) if artist["genres"] else "无"
            print(f"  {i}. {artist['name']} [{genres}]")

    elif cmd == "top-tracks":
        # 热门歌曲
        time_range = sys.argv[2] if len(sys.argv) > 2 else "medium_term"
        data = get_top_tracks(token_data, time_range)
        print(f"热门歌曲 ({time_range}):")
        for i, track in enumerate(data["items"], 1):
            artists = ", ".join(a["name"] for a in track["artists"])
            print(f"  {i}. {track['name']} - {artists}")

    elif cmd == "recommend":
        # 获取推荐
        # 首先获取热门艺术家作为种子
        top = get_top_artists(token_data, limit=5)
        seed_artists = [a["id"] for a in top["items"][:3]]

        data = get_recommendations(token_data, seed_artists=seed_artists)
        print("基于您热门艺术家的推荐：")
        for track in data["tracks"]:
            artists = ", ".join(a["name"] for a in track["artists"])
            print(f"  {track['name']} - {artists}")

    elif cmd == "json":
        # 原始 JSON 输出（任意 API 端点）
        endpoint = sys.argv[2] if len(sys.argv) > 2 else "/me"
        data = api_request(endpoint, token_data)
        print(json.dumps(data, indent=2))

    else:
        print(f"未知命令：{cmd}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
