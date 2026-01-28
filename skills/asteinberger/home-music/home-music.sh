#!/bin/bash
# ============================================================================
# Home Music - 通过 Spotify + Airfoil 控制全屋音乐场景
# 作者：Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 🐸 协助）
# 许可证：MIT
# ============================================================================
#
# 功能说明：
# 此脚本用于控制全屋音乐场景，将 Spotify 播放与 Airfoil 扬声器路由相结合。
# 支持早晨、派对、放松等多种预设场景，一键启动相应的播放列表和扬声器。
#
# 使用方法：
#   ./home-music.sh <场景名称>
#
# 场景选项：
#   morning   - 早晨场景：Sonos Move @ 40%，轻柔播放列表
#   party     - 派对场景：所有扬声器 @ 70%，摇滚派对
#   chill     - 放松场景：Sonos Move @ 30%，休闲音乐
#   off       - 关闭场景：暂停并断开所有扬声器
#   status    - 状态查询：显示当前播放和连接状态
#
# 依赖项：
#   - Spotify 桌面应用（必须运行）
#   - Airfoil 应用（必须运行）
#   - spotify-applescript 技能脚本
#
# 配置说明：
#   - PLAYLIST_* 变量：定义各场景的 Spotify 播放列表 URI
#   - ALL_SPEAKERS 数组：定义可用的 AirPlay 扬声器列表
# ============================================================================

set -euo pipefail

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Spotify 控制脚本路径
SPOTIFY_CMD="/Users/asteinberger/clawd/skills/spotify-applescript/spotify.sh"

# ============================================================================
# 播放列表配置
# ============================================================================
# 编辑这些 URI 以自定义您的音乐场景
# 查找 URI 方法：在 Spotify 中右键点击播放列表 → 分享 → 复制 Spotify URI
PLAYLIST_MORNING="spotify:playlist:19n65kQ5NEKgkvSAla5IF6"  # 早晨轻柔
PLAYLIST_PARTY="spotify:playlist:37i9dQZF1DXaXB8fQg7xif"   # 摇滚派对
PLAYLIST_CHILL="spotify:playlist:37i9dQZF1DWTwnEm1IYyoj"   # 休闲音乐

# ============================================================================
# 扬声器配置
# ============================================================================
# 家中所有可用的 AirPlay 扬声器
# 名称必须与 Airfoil 中显示的完全一致（区分大小写！）
ALL_SPEAKERS=("Computer" "Andy's M5 Macbook" "Sonos Move" "Living Room TV")

# ============================================================================
# Airfoil 控制函数
# 这些函数通过 AppleScript 控制扬声器连接和音量
# ============================================================================

# 根据名称连接单个扬声器
airfoil_connect() {
    local speaker="$1"
    osascript -e "tell application \"Airfoil\" to connect to (first speaker whose name is \"$speaker\")" 2>/dev/null || true
}

# 根据名称断开单个扬声器
airfoil_disconnect() {
    local speaker="$1"
    osascript -e "tell application \"Airfoil\" to disconnect from (first speaker whose name is \"$speaker\")" 2>/dev/null || true
}

# 设置扬声器音量（0.0 到 1.0）
airfoil_volume() {
    local speaker="$1"
    local volume="$2"
    osascript -e "tell application \"Airfoil\" to set (volume of (first speaker whose name is \"$speaker\")) to $volume" 2>/dev/null || true
}

# 断开 ALL_SPEAKERS 列表中的所有扬声器
airfoil_disconnect_all() {
    for speaker in "${ALL_SPEAKERS[@]}"; do
        airfoil_disconnect "$speaker"
    done
}

# 将 Airfoil 的音频源设置为 Spotify
# 这确保正确的应用程序音频被路由
airfoil_set_source_spotify() {
    osascript -e 'tell application "Airfoil"
        set theSource to (first application source whose name contains "Spotify")
        set current audio source to theSource
    end tell' 2>/dev/null || true
}

# 获取当前已连接的扬声器列表
airfoil_connected_speakers() {
    osascript -e 'tell application "Airfoil" to get name of every speaker whose connected is true' 2>/dev/null || echo "None"
}

# ============================================================================
# 场景函数
# 每个场景配置扬声器并启动相应的播放列表
# ============================================================================

# 早晨场景：一天的温柔开始
# - 仅 Sonos Move，音量 40%
# - 轻柔的播放列表，平静唤醒
scene_morning() {
    echo "🌅 启动早晨场景..."
    
    # 将 Airfoil 音频源设置为 Spotify
    airfoil_set_source_spotify
    
    # 连接 Sonos Move，音量 40%
    airfoil_connect "Sonos Move"
    sleep 0.5
    airfoil_volume "Sonos Move" 0.4
    
    # 启动播放列表
    "$SPOTIFY_CMD" play "$PLAYLIST_MORNING"
    "$SPOTIFY_CMD" volume 100
    
    echo "✅ 早晨：Sonos Move @ 40%，Morning Playlist"
}

# 派对场景：所有扬声器，最大欢乐
# - 家中每个扬声器，音量 70%
# - 摇滚派对播放列表，最大能量
scene_party() {
    echo "🎉 启动派对场景..."
    
    # 将 Airfoil 音频源设置为 Spotify
    airfoil_set_source_spotify
    
    # 以 70% 音量连接所有扬声器
    for speaker in "${ALL_SPEAKERS[@]}"; do
        airfoil_connect "$speaker"
        sleep 0.3
        airfoil_volume "$speaker" 0.7
    done
    
    # 以最大 Spotify 音量启动播放列表
    "$SPOTIFY_CMD" play "$PLAYLIST_PARTY"
    "$SPOTIFY_CMD" volume 100
    
    echo "✅ 派对：所有扬声器 @ 70%，Party Mix"
}

# 放松场景：放松模式
# - 仅 Sonos Move，音量 30%
# - 休闲播放列表，放松身心
scene_chill() {
    echo "😌 启动放松场景..."
    
    # 将 Airfoil 音频源设置为 Spotify
    airfoil_set_source_spotify
    
    # 连接 Sonos Move，音量 30%
    airfoil_connect "Sonos Move"
    sleep 0.5
    airfoil_volume "Sonos Move" 0.3
    
    # 启动播放列表
    "$SPOTIFY_CMD" play "$PLAYLIST_CHILL"
    "$SPOTIFY_CMD" volume 100
    
    echo "✅ 放松：Sonos Move @ 30%，Chill Lounge"
}

# 关闭场景：停止一切
# - 暂停 Spotify
# - 断开所有扬声器
scene_off() {
    echo "🔇 停止音乐..."
    
    # 暂停 Spotify
    "$SPOTIFY_CMD" pause 2>/dev/null || true
    
    # 断开所有扬声器
    airfoil_disconnect_all
    
    echo "✅ 音乐已停止，所有扬声器已断开"
}

# 显示当前状态：正在播放什么，哪些扬声器已连接
show_status() {
    echo "🏠 Home Music 状态"
    echo "===================="
    echo ""
    echo "Spotify："
    "$SPOTIFY_CMD" status 2>/dev/null || echo "  未播放"
    echo ""
    echo "已连接的扬声器："
    local connected
    connected=$(airfoil_connected_speakers)
    if [[ "$connected" == "None" || -z "$connected" ]]; then
        echo "  无"
    else
        echo "  $connected"
    fi
}

# ============================================================================
# 主函数 - 命令分发器
# ============================================================================

case "${1:-}" in
    morning)
        scene_morning
        ;;
    party)
        scene_party
        ;;
    chill)
        scene_chill
        ;;
    off|stop)
        scene_off
        ;;
    status)
        show_status
        ;;
    *)
        cat <<EOF
🏠 Home Music - 全屋音乐场景

用法：home-music <场景>

可用场景：
  morning    Morning Playlist on Sonos Move（40% 音量）
  party      派对模式 - 所有扬声器（70% 音量）
  chill      Chill Playlist on Sonos Move（30% 音量）
  off        停止音乐，断开所有扬声器
  status     显示当前状态

使用示例：
  home-music morning
  home-music party
  home-music off
EOF
        exit 1
        ;;
esac
