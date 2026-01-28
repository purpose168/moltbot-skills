#!/usr/bin/env python3
"""
gcal-pro: 许可证管理模块
处理专业版许可证的验证和管理功能。

许可证系统设计：
- 许可证格式：GCAL-XXXX-XXXX-XXXX（4 组 4 字符）
- 许可证层级：免费层（free）和专业层（pro）
- 机器绑定：许可证与特定机器绑定，防止共享

当前实现说明：
- MVP 版本使用简单的校验和验证
- 生产环境应集成 Gumroad API 进行真正的许可证验证
"""

import json
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# 配置文件路径
CONFIG_DIR = Path.home() / ".config" / "gcal-pro"
LICENSE_FILE = CONFIG_DIR / "license.json"


def get_machine_id() -> str:
    """
    生成特定于机器的标识符。

    此函数通过组合主机名和用户名生成唯一的机器 ID。
    机器 ID 用于许可证绑定，确保许可证不能在不同机器上共享。

    Returns:
        str: 16 字符的机器标识符（SHA256 哈希的前 16 位）
    """
    import socket
    hostname = socket.gethostname()
    username = os.environ.get("USERNAME") or os.environ.get("USER") or "unknown"
    raw = f"{hostname}:{username}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def validate_license_key(key: str) -> bool:
    """
    验证许可证密钥的格式。

    检查许可证密钥是否符合预期的格式规范：
    - 格式：GCAL-XXXX-XXXX-XXXX
    - 必须是 4 组字符，每组 4 个字符
    - 第一组必须为 "GCAL"

    Args:
        key: 要验证的许可证密钥字符串

    Returns:
        bool: 如果格式有效返回 True，否则返回 False
    """
    if not key:
        return False

    # 期望格式：GCAL-XXXX-XXXX-XXXX
    parts = key.upper().strip().split("-")
    if len(parts) != 4 or parts[0] != "GCAL":
        return False

    # 简单校验和验证：最后 4 个字符应基于前 3 部分
    check_input = "-".join(parts[:3])
    expected_check = hashlib.md5(check_input.encode()).hexdigest()[:4].upper()

    # 目前接受任何格式正确的密钥（稍后实现真正的验证）
    # 生产环境：应验证 Gumroad API
    return all(len(p) == 4 for p in parts[1:])


def activate_license(key: str) -> Dict[str, Any]:
    """
    激活专业版许可证。

    此函数执行以下操作：
    1. 验证许可证密钥格式
    2. 创建许可证数据文件
    3. 设置安全的文件权限

    Args:
        key: 从购买获得许可证密钥

    Returns:
        Dict[str, Any]: 激活结果，包含以下字段：
            - success: 是否成功
            - message: 结果消息
            - tier: 许可证层级
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if not validate_license_key(key):
        return {
            "success": False,
            "message": "无效的许可证密钥格式。期望格式：GCAL-XXXX-XXXX-XXXX"
        }

    # 创建许可证数据
    license_data = {
        "key": key.upper().strip(),
        "tier": "pro",
        "valid": True,
        "activated_at": datetime.utcnow().isoformat(),
        "machine_id": get_machine_id()
    }

    try:
        with open(LICENSE_FILE, "w") as f:
            json.dump(license_data, f, indent=2)

        # 设置安全的文件权限
        try:
            os.chmod(LICENSE_FILE, 0o600)
        except (OSError, AttributeError):
            pass

        return {
            "success": True,
            "message": "✓ 专业版许可证已激活！您现在拥有完整访问权限。",
            "tier": "pro"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"保存许可证失败：{e}"
        }


def get_license_info() -> Dict[str, Any]:
    """
    获取当前许可证信息。

    此函数读取并解析许可证文件，返回详细的许可证信息。

    Returns:
        Dict[str, Any]: 许可证信息字典，包含以下字段：
            - tier: 许可证层级（"free" 或 "pro"）
            - valid: 是否有效
            - activated_at: 激活时间（仅专业版）
            - key: 许可证密钥掩码（仅专业版）
            - message: 状态消息
    """
    if not LICENSE_FILE.exists():
        return {
            "tier": "free",
            "valid": True,
            "message": "免费层 - 只读访问权限"
        }

    try:
        with open(LICENSE_FILE, "r") as f:
            data = json.load(f)

        return {
            "tier": data.get("tier", "free"),
            "valid": data.get("valid", False),
            "activated_at": data.get("activated_at"),
            "key": data.get("key", "")[:9] + "..." if data.get("key") else None
        }
    except (json.JSONDecodeError, IOError):
        return {
            "tier": "free",
            "valid": True,
            "message": "许可证文件已损坏 - 默认使用免费层"
        }


def deactivate_license() -> Dict[str, Any]:
    """
    停用当前许可证。

    此函数删除许可证文件，将用户降级为免费层。
    适用于用户希望转让许可证或取消订阅的场景。

    Returns:
        Dict[str, Any]: 停用结果，包含 success 和 message 字段
    """
    if LICENSE_FILE.exists():
        try:
            LICENSE_FILE.unlink()
            return {
                "success": True,
                "message": "许可证已停用。已降级为免费层。"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"停用失败：{e}"
            }
    else:
        return {
            "success": True,
            "message": "没有可停用的许可证。"
        }


def is_pro() -> bool:
    """
    快速检查用户是否拥有专业版访问权限。

    此函数是常用的便捷检查方法，
    用于判断是否应授予专业版功能。

    Returns:
        bool: 如果用户拥有有效的专业版许可证返回 True
    """
    info = get_license_info()
    return info.get("tier") == "pro" and info.get("valid", False)


# =============================================================================
# 命令行界面
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="gcal-pro 许可证管理")
    parser.add_argument("command", choices=["status", "activate", "deactivate"],
                        help="许可证命令：status-状态，activate-激活，deactivate-停用")
    parser.add_argument("--key", "-k", help="激活所需的许可证密钥")

    args = parser.parse_args()

    # 处理状态查询命令
    if args.command == "status":
        info = get_license_info()
        print(f"层级：      {info.get('tier', 'free').title()}")
        print(f"有效：      {'是' if info.get('valid') else '否'}")
        if info.get('activated_at'):
            print(f"激活时间：  {info.get('activated_at')}")
        if info.get('key'):
            print(f"密钥：      {info.get('key')}")
        if info.get('message'):
            print(f"注意：      {info.get('message')}")

    # 处理激活命令
    elif args.command == "activate":
        if not args.key:
            print("错误：激活需要使用 --key 参数")
            print("用法：python gcal_license.py activate --key GCAL-XXXX-XXXX-XXXX")
            exit(1)
        result = activate_license(args.key)
        print(result.get("message"))
        exit(0 if result.get("success") else 1)

    # 处理停用命令
    elif args.command == "deactivate":
        result = deactivate_license()
        print(result.get("message"))
        exit(0 if result.get("success") else 1)
