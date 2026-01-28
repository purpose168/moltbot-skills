#!/bin/bash
# Spotify AppleScript 控制包装器
#
# 功能: 通过 AppleScript 控制 Spotify 桌面应用
# 要求: macOS + Spotify 应用
set -euo pipefail

# 转换 Spotify URL 为 URI 格式
#
# 参数:
#   $1 - 输入的 Spotify URL 或 URI
# 返回:
#   标准输出的 Spotify URI
convert_to_uri() {
    local input="$1"
    
    # 已经是 spotify: URI 格式，直接返回
    if [[ "$input" =~ ^spotify: ]]; then
        echo "$input"
        return
    fi
    
    # 从 open.spotify.com URL 提取信息
    if [[ "$input" =~ open\.spotify\.com/([a-z]+)/([a-zA-Z0-9]+) ]]; then
        local type="${BASH_REMATCH[1]}"
        local id="${BASH_REMATCH[2]}"
        echo "spotify:${type}:${id}"
        return
    fi
    
    # 无法识别，返回原值
    echo "$input"
}

# 主命令处理
case "${1:-}" in
    play)
        # 播放音乐
        if [[ -z "${2:-}" ]]; then
            echo "用法: spotify play <uri|url>"
            exit 1
        fi
        uri=$(convert_to_uri "$2")
        osascript -e "tell application \"Spotify\" to play track \"$uri\""
        ;;
    
    pause|playpause)
        # 切换播放/暂停
        osascript -e 'tell application "Spotify" to playpause'
        ;;
    
    next)
        # 下一首
        osascript -e 'tell application "Spotify" to next track'
        ;;
    
    prev|previous)
        # 上一首
        osascript -e 'tell application "Spotify" to previous track'
        ;;
    
    status)
        # 显示当前播放状态（简洁格式）
        osascript -e 'tell application "Spotify"
            try
                set trackName to name of current track
                set artistName to artist of current track
                set albumName to album of current track
                set playerState to player state as string
                set vol to sound volume as integer
                return playerState & " | " & trackName & " - " & artistName & " | " & albumName & " | 音量: " & vol & "%"
            on error
                return "没有正在播放的曲目"
            end try
        end tell'
        ;;
    
    volume)
        # 获取或设置音量
        if [[ -z "${2:-}" ]]; then
            # 获取当前音量
            osascript -e 'tell application "Spotify" to sound volume'
        else
            # 设置音量 (0-100)
            osascript -e "tell application \"Spotify\" to set sound volume to $2"
        fi
        ;;
    
    mute)
        # 静音
        osascript -e 'tell application "Spotify" to set sound volume to 0'
        ;;
    
    unmute)
        # 取消静音（恢复默认音量 70%）
        osascript -e 'tell application "Spotify" to set sound volume to 70'
        ;;
    
    state)
        # 显示播放器状态（playing/paused）
        osascript -e 'tell application "Spotify" to player state'
        ;;
    
    info)
        # 显示详细曲目信息
        osascript -e 'tell application "Spotify"
            set trackName to name of current track
            set artistName to artist of current track
            set albumName to album of current track
            set trackDuration to duration of current track
            set trackPosition to player position
            set playerState to player state as string
            set isShuffling to shuffling as string
            set isRepeating to repeating as string
            return "曲目: " & trackName & "\n艺术家: " & artistName & "\n专辑: " & albumName & "\n位置: " & trackPosition & "秒 / " & (trackDuration / 1000) & "秒\n状态: " & playerState & "\n随机播放: " & isShuffling & "\n重复: " & isRepeating
        end tell'
        ;;
    
    *)
        # 显示帮助信息
        cat <<EOF
Spotify AppleScript 控制

用法: spotify <命令> [参数]

命令:
  play <uri|url>   播放曲目/专辑/歌单/剧集
  pause            切换播放/暂停
  next             下一首
  prev             上一首
  status           显示当前曲目（简洁）
  info             显示详细曲目信息
  state            显示播放器状态（playing/paused）
  volume [0-100]   获取或设置音量
  mute             静音
  unmute           取消静音

示例:
  spotify play spotify:playlist:665eC1myDA8iSepZ0HOZdG
  spotify play https://open.spotify.com/episode/5yJKH11UlF3sS3gcKKaUYx
  spotify pause
  spotify next
  spotify volume 75
  spotify status
EOF
        exit 1
        ;;
esac
