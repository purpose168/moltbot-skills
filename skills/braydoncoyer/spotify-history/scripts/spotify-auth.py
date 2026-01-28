#!/usr/bin/env python3
"""
spotify-auth.py - Spotify OAuth 认证流程

功能说明：
- 实现 Spotify OAuth 2.0 授权码流程
- 获取访问令牌和刷新令牌
- 支持本地浏览器和无头模式

OAuth 流程：
1. 构建授权 URL 并在浏览器中打开
2. 用户登录 Spotify 并授权应用
3. Spotify 重定向到本地回调服务器
4. 回调服务器接收授权码
5. 用授权码交换访问令牌和刷新令牌

使用方法：
    python3 scripts/spotify-auth.py           # 使用浏览器
    python3 scripts/spotify-auth.py --headless # 无头模式（无浏览器）
"""

import http.server
import urllib.parse
import webbrowser
import json
import base64
import os
from pathlib import Path

# ============================================================================
# 配置常量
# ============================================================================

# 从环境变量读取客户端凭据
CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")

# OAuth 回调 URL（必须与 Spotify 应用设置中一致）
REDIRECT_URI = "http://127.0.0.1:8888/callback"

# 所需的 API 权限范围
SCOPES = "user-read-recently-played user-top-read user-read-playback-state user-read-currently-playing"

# 令牌文件存储路径：~/.config/spotify-clawd/token.json
TOKEN_FILE = Path.home() / ".config" / "spotify-clawd" / "token.json"


# ============================================================================
# OAuth 回调处理
# ============================================================================

# 全局变量：存储授权码
auth_code = None


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    """
    HTTP 请求处理器：处理 OAuth 回调请求。

    当用户完成 Spotify 授权后，Spotify 会将浏览器重定向到
    REDIRECT_URI，并附带授权码或错误信息。
    """

    def do_GET(self):
        """
        处理 GET 请求（OAuth 回调）。
        """
        global auth_code
        # 解析查询参数
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)

        if "code" in params:
            # 成功获取授权码
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"<html><body><h1>授权成功！</h1><p>您可以关闭此窗口。</p></body></html>")
        elif "error" in params:
            # 授权过程中发生错误
            self.send_response(400)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(f"<html><body><h1>错误</h1><p>{params.get('error', ['未知错误'])}</p></body></html>".encode())
        else:
            # 未找到请求的资源
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """
        抑制默认的日志输出。
        """
        pass  # 不记录日志


# ============================================================================
# OAuth 辅助函数
# ============================================================================

def get_auth_url():
    """
    构建 Spotify OAuth 授权 URL。

    用户访问此 URL 后，将被要求登录 Spotify 并授权应用访问。

    Returns:
        str: 完整的授权 URL
    """
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
    }
    return "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(params)


def exchange_code(code):
    """
    用授权码交换访问令牌。

    这是 OAuth 2.0 授权码流程的最后一步。
    用授权码向 Spotify API 发送请求，获取 access_token 和 refresh_token。

    Args:
        code: 授权码（从回调 URL 中获取）

    Returns:
        dict: 包含 access_token、refresh_token、expires_in 等的令牌字典
    """
    import urllib.request

    # 构建 Basic Auth 头（客户端 ID 和密钥 Base64 编码）
    auth_header = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()

    # 构建令牌请求参数
    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode()

    # 发送令牌请求
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    )

    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def save_token(token_data):
    """
    安全保存令牌数据到本地文件。

    设置文件权限为仅所有者可读写（0600），确保令牌安全。

    Args:
        token_data: 包含 access_token 和 refresh_token 的字典
    """
    # 创建目录（如果不存在）
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    # 保存令牌
    TOKEN_FILE.write_text(json.dumps(token_data, indent=2))
    # 设置安全的文件权限
    TOKEN_FILE.chmod(0o600)
    print(f"令牌已保存到 {TOKEN_FILE}")


# ============================================================================
# 主函数（命令行入口）
# ============================================================================

def main():
    """
    主函数：启动 OAuth 授权流程。
    """
    # 检查客户端凭据是否已配置
    if not CLIENT_ID or not CLIENT_SECRET:
        print("错误：请先设置 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET 环境变量")
        return 1

    # 启动本地回调服务器
    server = http.server.HTTPServer(("127.0.0.1", 8888), CallbackHandler)

    # 打开浏览器进行授权
    auth_url = get_auth_url()
    print(f"正在打开浏览器进行授权...")
    print(f"如果浏览器未打开，请访问：{auth_url}")
    webbrowser.open(auth_url)

    # 等待授权完成
    print("等待授权完成...")
    while auth_code is None:
        server.handle_request()

    # 用授权码交换令牌
    print("正在交换授权码获取令牌...")
    token_data = exchange_code(auth_code)

    # 保存令牌
    save_token(token_data)
    print("完成！Spotify 已成功连接。")

    return 0


if __name__ == "__main__":
    exit(main())
