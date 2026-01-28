---
name: spotify-applescript
description: 通过 AppleScript 控制 Spotify 桌面应用。播放歌单、曲目、专辑、剧集和管理播放。在 macOS Spotify 应用上无需 API 密钥或 OAuth 即可可靠工作。
homepage: https://github.com/andrewjiang/HoloClawd-Open-Firmware
metadata: {"clawdbot":{"emoji":"🎵","os":["darwin"]}}
triggers:
  - spotify
  - play music
  - play playlist
  - play episode
  - pause music
  - next track
  - previous track
---

# Spotify AppleScript 控制

使用 AppleScript 控制 Spotify 桌面应用。在 macOS Spotify 应用上无需 API 速率限制或 OAuth 即可可靠工作。

## 要求

- 在 macOS 上安装并运行 Spotify 桌面应用
- 无需设置 - 直接可用

## 快速开始

```bash
# 播放歌单
spotify play "spotify:playlist:665eC1myDA8iSepZ0HOZdG"
spotify play "https://open.spotify.com/playlist/665eC1myDA8iSepZ0HOZdG"

# 播放剧集
spotify play "spotify:episode:5yJKH11UlF3sS3gcKKaUYx"
spotify play "https://open.spotify.com/episode/5yJKH11UlF3sS3gcKKaUYx"

# 播放曲目
spotify play "spotify:track:7hQJA50XrCWABAu5v6QZ4i"

# 播放控制
spotify pause          # 切换播放/暂停
spotify next           # 下一首
spotify prev           # 上一首
spotify status         # 当前曲目信息

# 音量控制
spotify volume 50      # 设置音量 (0-100)
spotify mute           # 静音
spotify unmute         # 取消静音
```

## Spotify CLI 包装器

`spotify` 命令是位于 `{baseDir}/spotify.sh` 的包装器脚本

### 命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `play <uri>` | 播放曲目/专辑/歌单/剧集 | `spotify play spotify:track:xxx` |
| `pause` | 切换播放/暂停 | `spotify pause` |
| `next` | 下一首 | `spotify next` |
| `prev` | 上一首 | `spotify prev` |
| `status` | 显示当前曲目信息 | `spotify status` |
| `volume <0-100>` | 设置音量 | `spotify volume 75` |
| `mute` | 静音 | `spotify mute` |
| `unmute` | 取消静音 | `spotify unmute` |

### URI 格式

接受 Spotify URI 和 open.spotify.com URL：

- `spotify:track:7hQJA50XrCWABAu5v6QZ4i`
- `https://open.spotify.com/track/7hQJA50XrCWABAu5v6QZ4i`
- `spotify:playlist:665eC1myDA8iSepZ0HOZdG`
- `https://open.spotify.com/playlist/665eC1myDA8iSepZ0HOZdG?si=xxx`
- `spotify:episode:5yJKH11UlF3sS3gcKKaUYx`
- `https://open.spotify.com/episode/5yJKH11UlF3sS3gcKKaUYx`
- `spotify:album:xxx`
- `spotify:artist:xxx`

脚本会自动将 URL 转换为 URI。

## 直接 AppleScript 命令

要获得更多控制，直接使用 AppleScript：

```bash
# 播放
osascript -e 'tell application "Spotify" to play track "spotify:playlist:xxx"'

# 暂停/播放切换
osascript -e 'tell application "Spotify" to playpause'

# 下一首/上一首
osascript -e 'tell application "Spotify" to next track'
osascript -e 'tell application "Spotify" to previous track'

# 获取当前曲目
osascript -e 'tell application "Spotify"
  set trackName to name of current track
  set artistName to artist of current track
  return trackName & " by " & artistName
end tell'

# 获取播放器状态
osascript -e 'tell application "Spotify" to player state'

# 设置音量 (0-100)
osascript -e 'tell application "Spotify" to set sound volume to 75'

# 获取当前位置（秒）
osascript -e 'tell application "Spotify" to player position'

# 设置位置（秒）
osascript -e 'tell application "Spotify" to set player position to 30'
```

## 可用属性

```applescript
tell application "Spotify"
  name of current track          -- 曲目名称
  artist of current track        -- 艺术家名称
  album of current track         -- 专辑名称
  duration of current track      -- 时长（毫秒）
  player position                -- 位置（秒）
  player state                   -- playing/paused/stopped
  sound volume                   -- 0-100
  repeating                      -- true/false
  repeating enabled              -- true/false
  shuffling                      -- true/false
  shuffling enabled              -- true/false
end tell
```

## 示例

### 助手使用

当用户说：
- "播放我的能量歌单" → 提取歌单 URI 并运行 `spotify play <uri>`
- "暂停音乐" → 运行 `spotify pause`
- "下一首" → 运行 `spotify next`
- "现在播放什么？" → 运行 `spotify status`

### 播放特定剧集

```bash
spotify play https://open.spotify.com/episode/5yJKH11UlF3sS3gcKKaUYx
```

### 获取完整曲目信息

```bash
osascript -e 'tell application "Spotify"
  return "曲目: " & (name of current track) & "\n艺术家: " & (artist of current track) & "\n专辑: " & (album of current track) & "\n状态: " & (player state as string)
end tell'
```

## 安装

该技能是自包含的。要使 `spotify` 命令在系统范围内可用：

```bash
chmod +x {baseDir}/spotify.sh
sudo ln -sf {baseDir}/spotify.sh /usr/local/bin/spotify
```

或将技能目录添加到 PATH。

## 故障排除

**"Spotify got an error"**
- 确保 Spotify 桌面应用正在运行
- Spotify 必须至少启动一次以接受 AppleScript 命令

**播放命令无反应**
- 验证 URI 格式是否正确
- 尝试先从 Spotify 应用播放以确保内容存在

**没有声音**
- 检查系统音量和 Spotify 应用音量
- 确保在 Spotify 首选中选择了正确的输出设备

## 限制

- 需要 Spotify 桌面应用正在运行
- 仅限 macOS（使用 AppleScript）
- 无法搜索或浏览资料库（使用网络界面或应用进行发现）
- 无法管理歌单（添加/删除曲目）

对于歌单管理和搜索，请使用网络界面或考虑使用 `spotify-player` 技能（需要 OAuth 设置）。
