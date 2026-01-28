#!/bin/bash
# ============================================================================
# Airfoil AirPlay 扬声器控制
# 通过 osascript 使用 AppleScript
# 作者：Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 🐸 协助）
# ============================================================================
#
# 功能说明：
# 此脚本用于通过命令行控制 Airfoil 应用程序，实现 AirPlay 扬声器的
# 连接、断开、音量调节和状态查询。所有操作通过 AppleScript 实现。
#
# 使用方法：
#   ./airfoil.sh <命令> [参数]
#
# 可用命令：
#   list                     列出所有可用扬声器
#   connect <扬声器>         连接到指定扬声器
#   disconnect <扬声器>      从指定扬声器断开
#   volume <扬声器> <0-100>  设置扬声器音量
#   status                   显示已连接的扬声器及其音量
#
# 依赖项：
#   - macOS 操作系统
#   - Airfoil 应用程序（需单独安装）
#   - osascript 命令（macOS 内置）
#   - bc 命令（用于音量计算，可能需要单独安装）
#
# 安装 Airfoil：
#   brew install --cask airfoil
# ============================================================================

set -e

# 获取命令和参数
CMD="${1:-help}"
SPEAKER="$2"
VALUE="$3"

# ============================================================================
# 命令处理
# ============================================================================

case "$CMD" in
    list)
        # 列出所有可用的 AirPlay 扬声器
        osascript -e 'tell application "Airfoil" to get name of every speaker'
        ;;
    
    connect)
        # 连接到指定扬声器
        if [[ -z "$SPEAKER" ]]; then
            echo "用法：$0 connect <扬声器>" >&2
            exit 1
        fi
        osascript -e "tell application \"Airfoil\" to connect to (first speaker whose name is \"$SPEAKER\")"
        echo "已连接：$SPEAKER"
        ;;
    
    disconnect)
        # 从指定扬声器断开连接
        if [[ -z "$SPEAKER" ]]; then
            echo "用法：$0 disconnect <扬声器>" >&2
            exit 1
        fi
        osascript -e "tell application \"Airfoil\" to disconnect from (first speaker whose name is \"$SPEAKER\")"
        echo "已断开：$SPEAKER"
        ;;
    
    volume)
        # 设置扬声器音量
        if [[ -z "$SPEAKER" ]] || [[ -z "$VALUE" ]]; then
            echo "用法：$0 volume <扬声器> <0-100>" >&2
            exit 1
        fi
        
        # 将 0-100 转换为 0.0-1.0（Airfoil 内部使用的比例）
        VOL=$(echo "scale=2; $VALUE / 100" | bc)
        osascript -e "tell application \"Airfoil\" to set (volume of (first speaker whose name is \"$SPEAKER\")) to $VOL"
        echo "音量 $SPEAKER：$VALUE%"
        ;;
    
    status)
        # 显示已连接的扬声器及其音量级别
        osascript <<'EOF'
tell application "Airfoil"
    set output to ""
    repeat with s in (every speaker whose connected is true)
        set speakerName to name of s
        set speakerVol to volume of s
        set volPercent to round (speakerVol * 100)
        set output to output & speakerName & ": " & volPercent & "%" & linefeed
    end repeat
    if output is "" then
        return "没有已连接的扬声器"
    else
        return text 1 thru -2 of output
    end if
end tell
EOF
        ;;
    
    help|*)
        # 显示帮助信息
        echo "Airfoil 扬声器控制 🔊"
        echo ""
        echo "用法：$0 <命令> [参数]"
        echo ""
        echo "可用命令："
        echo "  list                     列出所有可用扬声器"
        echo "  connect <扬声器>         连接到扬声器"
        echo "  disconnect <扬声器>      从扬声器断开连接"
        echo "  volume <扬声器> <0-100>  设置扬声器音量"
        echo "  status                   显示已连接的扬声器及其音量"
        echo ""
        echo "作者：Andy Steinberger（由 Owen the Frog 🐸 协助）"
        ;;
esac
