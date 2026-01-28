#!/usr/bin/env python3
"""
gcal-pro: OAuth 2.0 身份验证模块
处理安全的本地令牌存储和凭据管理。

主要功能：
1. 管理 OAuth 2.0 身份验证流程
2. 安全存储和刷新访问令牌
3. 根据许可证层级动态调整 API 权限范围
4. 提供命令行界面进行身份验证管理
"""

import os
import sys
import json
from pathlib import Path
from typing import Optional, Tuple

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# =============================================================================
# 配置常量
# =============================================================================

# 配置目录路径： ~/.config/gcal-pro/
CONFIG_DIR = Path.home() / ".config" / "gcal-pro"

# 客户端密钥文件路径： ~/.config/gcal-pro/client_secret.json
# 此文件包含 OAuth 2.0 客户端凭据，从 Google Cloud Console 下载
CLIENT_SECRET_FILE = CONFIG_DIR / "client_secret.json"

# 令牌文件路径： ~/.config/gcal-pro/token.json
# 此文件包含用户的访问令牌和刷新令牌，由 OAuth 流程自动生成
TOKEN_FILE = CONFIG_DIR / "token.json"

# 许可证文件路径： ~/.config/gcal-pro/license.json
# 此文件包含用户的许可证信息，用于确定功能层级
LICENSE_FILE = CONFIG_DIR / "license.json"

# =============================================================================
# API 权限范围定义
# =============================================================================

# 免费层权限范围：只读日历访问
# 仅允许查看日历和事件，不能进行修改
SCOPES_FREE = ["https://www.googleapis.com/auth/calendar.readonly"]

# 专业层权限范围：读写日历事件
# 允许查看日历、创建、修改和删除事件
SCOPES_PRO = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events"
]


def get_config_dir() -> Path:
    """
    确保配置目录存在并返回其路径。

    如果目录不存在，此函数会递归创建所有必需的父目录。
    这确保了应用程序有权限写入配置文件。

    Returns:
        Path: 配置目录的 Path 对象
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return CONFIG_DIR


def check_client_secret() -> bool:
    """
    检查客户端密钥文件是否存在。

    在进行 OAuth 身份验证之前，必须确保 client_secret.json 文件已正确放置。
    此文件包含应用程序的 OAuth 客户端 ID 和密钥。

    Returns:
        bool: 如果文件存在返回 True，否则返回 False
    """
    return CLIENT_SECRET_FILE.exists()


def is_pro_user() -> bool:
    """
    检查用户是否拥有专业版许可证。

    此函数首先尝试从 gcal_license 模块导入 is_pro 函数，
    如果导入失败，则直接读取许可证文件进行验证。
    这种设计确保了模块间的松耦合。

    Returns:
        bool: 如果用户拥有有效的专业版许可证返回 True，否则返回 False
    """
    try:
        from gcal_license import is_pro
        return is_pro()
    except ImportError:
        # 降级方案：直接检查许可证文件
        if not LICENSE_FILE.exists():
            return False
        try:
            with open(LICENSE_FILE, "r") as f:
                license_data = json.load(f)
                # 检查许可证层级是否为 "pro" 且状态有效
                return license_data.get("tier") == "pro" and license_data.get("valid", False)
        except (json.JSONDecodeError, IOError):
            return False


def get_scopes() -> list:
    """
    根据用户的许可证层级返回相应的 API 权限范围。

    免费用户只能访问只读权限，而专业用户可以读写日历事件。
    这种分层设计允许在不牺牲安全性的情况下提供免费试用。

    Returns:
        list: 权限范围列表
    """
    return SCOPES_PRO if is_pro_user() else SCOPES_FREE


def get_credentials(force_refresh: bool = False) -> Optional[Credentials]:
    """
    获取有效的凭据对象，根据需要刷新或重新进行身份验证。

    此函数实现了完整的凭据管理流程：
    1. 检查客户端密钥文件是否存在
    2. 尝试从本地令牌文件加载现有凭据
    3. 如果凭据已过期，尝试刷新
    4. 如果无法刷新，则启动新的 OAuth 流程

    Args:
        force_refresh: 如果为 True，即使存在有效令牌也强制重新认证

    Returns:
        Credentials: 有效的 Google 凭据对象，如果认证失败则返回 None
    """
    get_config_dir()

    # 检查必需的客户端密钥文件
    if not check_client_secret():
        print(f"错误：未在 {CLIENT_SECRET_FILE} 找到 client_secret.json")
        print("请先完成 Google Cloud 设置。")
        return None

    creds = None
    scopes = get_scopes()

    # 尝试加载现有令牌（除非强制刷新）
    if TOKEN_FILE.exists() and not force_refresh:
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), scopes)
        except Exception as e:
            print(f"警告：无法加载现有令牌：{e}")
            creds = None

    # 检查凭据是否需要刷新
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _save_token(creds)
        except Exception as e:
            print(f"令牌刷新失败：{e}")
            creds = None

    # 需要进行新的身份验证
    if not creds or not creds.valid:
        try:
            # 从客户端密钥文件创建 OAuth 流程
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_SECRET_FILE), scopes
            )
            # 启动本地服务器进行身份验证
            creds = flow.run_local_server(
                port=8080,
                prompt="consent",
                success_message="身份验证成功！您可以关闭此窗口。"
            )
            _save_token(creds)
            print("[OK] 身份验证成功！")
        except Exception as e:
            print(f"身份验证失败：{e}")
            return None

    return creds


def _save_token(creds: Credentials) -> None:
    """
    将凭据保存到令牌文件。

    此函数将凭据对象序列化为 JSON 格式并写入文件。
    同时会设置文件权限为仅所有者可读写（Unix 系统）。

    Args:
        creds: 要保存的 Google 凭据对象
    """
    with open(TOKEN_FILE, "w") as token_file:
        token_file.write(creds.to_json())

    # 设置安全的文件权限（仅所有者可读写）
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except (OSError, AttributeError):
        pass  # Windows 不支持相同的 chmod 方式


def get_calendar_service():
    """
    获取已身份验证的 Google Calendar API 服务对象。

    此函数封装了 API 服务的构建过程，
    负责处理所有与身份验证相关的细节。

    Returns:
        Google Calendar API 服务对象，如果认证失败则返回 None
    """
    creds = get_credentials()
    if not creds:
        return None

    try:
        service = build("calendar", "v3", credentials=creds)
        return service
    except Exception as e:
        print(f"构建日历服务失败：{e}")
        return None


def revoke_credentials() -> bool:
    """
    撤销当前凭据并删除本地令牌。

    此函数执行两个操作：
    1. 尝试通过 Google OAuth 服务撤销访问令牌
    2. 删除本地的令牌文件

    撤销是尽力而为的操作，即使 Google 端的撤销失败，
    本地令牌仍会被删除。

    Returns:
        bool: 如果成功执行返回 True
    """
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE))
            # 尝试通过 Google 撤销
            import requests
            requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": creds.token},
                headers={"content-type": "application/x-www-form-urlencoded"}
            )
        except Exception:
            pass  # 撤销是尽力而为的操作

        # 删除本地令牌
        TOKEN_FILE.unlink()
        print("[OK] 凭据已撤销，本地令牌已删除。")
        return True
    else:
        print("没有可撤销的凭据。")
        return False


def get_auth_status() -> dict:
    """
    获取当前身份验证状态的详细信息。

    此函数返回一个包含以下信息的字典：
    - 配置目录路径
    - 客户端密钥文件是否存在
    - 令牌文件是否存在
    - 用户是否为专业版
    - 是否已通过身份验证
    - 当前拥有的权限范围

    Returns:
        dict: 包含身份验证状态的字典
    """
    status = {
        "config_dir": str(CONFIG_DIR),
        "client_secret_exists": check_client_secret(),
        "token_exists": TOKEN_FILE.exists(),
        "is_pro": is_pro_user(),
        "authenticated": False,
        "scopes": []
    }

    # 检查令牌的有效性
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE))
            # 有效或可刷新的令牌都视为已认证
            status["authenticated"] = creds.valid or (creds.expired and creds.refresh_token)
            status["scopes"] = list(creds.scopes) if creds.scopes else []
        except Exception:
            pass

    return status


# =============================================================================
# 命令行界面
# =============================================================================

if __name__ == "__main__":
    import argparse

    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="gcal-pro 身份验证管理")
    parser.add_argument("command", choices=["auth", "status", "revoke"],
                        help="身份验证命令：auth-认证，status-状态，revoke-撤销")
    parser.add_argument("--force", action="store_true",
                        help="强制重新进行身份验证")

    args = parser.parse_args()

    # 处理认证命令
    if args.command == "auth":
        creds = get_credentials(force_refresh=args.force)
        if creds:
            print(f"[OK] 身份验证成功")
            print(f"  令牌存储位置：{TOKEN_FILE}")
        else:
            sys.exit(1)

    # 处理状态查询命令
    elif args.command == "status":
        status = get_auth_status()
        print(f"配置目录：    {status['config_dir']}")
        print(f"客户端密钥：  {'[OK] 已找到' if status['client_secret_exists'] else '[X] 缺失'}")
        print(f"令牌：        {'[OK] 已找到' if status['token_exists'] else '[X] 缺失'}")
        print(f"已认证：      {'[OK] 是' if status['authenticated'] else '[X] 否'}")
        print(f"层级：        {'专业版' if status['is_pro'] else '免费版'}")
        if status['scopes']:
            print(f"权限范围：    {', '.join(status['scopes'])}")

    # 处理撤销命令
    elif args.command == "revoke":
        revoke_credentials()
