---
name: spotify
description: 在 macOS 上控制 Spotify 播放。播放/暂停、跳过曲目、控制音量、播放艺术家/专辑/播放列表。当用户要求播放音乐、控制 Spotify、更改歌曲或调整 Spotify 音量时使用。
metadata: {"clawdbot":{"emoji":"🎵","requires":{"bins":["spotify"],"os":"darwin"},"install":[{"id":"brew","kind":"brew","packages":["shpotify"],"bins":["spotify"],"label":"安装 spotify 命令行工具 (brew)"}]}}
---

# Spotify 命令行工具

在 macOS 上控制 Spotify。无需 API 密钥。

## 命令

```bash
spotify play                     # 继续播放
spotify pause                    # 暂停/切换
spotify next                     # 下一曲
spotify prev                     # 上一曲
spotify stop                     # 停止

spotify vol up                   # 增加 10%
spotify vol down                 # 减少 10%
spotify vol 50                   # 设置为 50%

spotify status                   # 当前曲目信息
```

## 按名称播放

1. 在网络上搜索 Spotify URL：`"Daft Punk" site:open.spotify.com`
2. 从 URL 获取 ID：`open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi` → ID 是 `4tZwfgrHOc3mvqYlEYSvVi`
3. 使用 AppleScript 播放：

```bash
# 艺术家
osascript -e 'tell application "Spotify" to play track "spotify:artist:4tZwfgrHOc3mvqYlEYSvVi"'

# 专辑
osascript -e 'tell application "Spotify" to play track "spotify:album:4m2880jivSbbyEGAKfITCa"'

# 曲目
osascript -e 'tell application "Spotify" to play track "spotify:track:2KHRENHQzTIQ001nlP9Gdc"'
```

## 注意事项

- **仅 macOS** - 使用 AppleScript
- Spotify 桌面应用必须运行
- 通过 Spotify Connect 与 Sonos 配合使用