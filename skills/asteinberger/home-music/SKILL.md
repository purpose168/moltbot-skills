---
name: home-music
description: 控制全屋音乐场景，结合 Spotify 播放和 Airfoil 扬声器路由。提供早晨、派对、放松模式的快速预设。
homepage: local
metadata: {"clawdbot":{"os":["darwin"]}}
triggers:
  - music scene
  - morning music
  - party mode
  - chill music
  - house music
  - stop music
---

```
    ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫
    
    H O M E   M U S I C
    
    ╔══════════════════════════════════════════╗
    ║   全屋音乐场景                            ║
    ║   一个命令。所有扬声器。完美。            ║
    ╚══════════════════════════════════════════╝
    
    ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫
```

> *"为什么要点击 17 次，一个命令就能搞定？"* – Owen

---

## 此技能功能介绍

**Home Music** 将 Spotify + Airfoil 组合成神奇的音乐场景。一个命令 – 正确的播放列表在正确的扬声器上以完美的音量播放。

**想象一下：**
- 你醒来 -> `home-music morning` -> 浴室里播放轻柔的音乐
- 朋友到来 -> `home-music party` -> 所有扬声器播放摇滚
- 该放松了 -> `home-music chill` -> 到处是休闲氛围
- 一天结束 -> `home-music off` -> 安静、平和、宁静

---

## 依赖项

| 所需项 | 用途 | 链接 |
|------|-----|------|
| **macOS** | 此技能使用 AppleScript | — |
| **Spotify 桌面应用** | 音乐来源！必须运行。 | [spotify.com](https://spotify.com) |
| **Airfoil** | 将音频路由到 AirPlay 扬声器 | [rogueamoeba.com](https://rogueamoeba.com/airfoil/) |
| **spotify-applescript** | Clawdbot Spotify 控制技能 | `skills/spotify-applescript/` |

> **重要提示：** 在启动任何场景之前，Spotify 和 Airfoil 必须正在运行！

---

## 场景

### 早晨
*一天的温柔开始*

```bash
home-music morning
```
- **扬声器：** Sonos Move
- **音量：** 40%
- **播放列表：** Morning Playlist
- **氛围：** 咖啡 + 好心情

---

### 派对
*是时候庆祝了！*

```bash
home-music party
```
- **扬声器：** 全部（计算机、MacBook、Sonos Move、客厅电视）
- **音量：** 70%
- **播放列表：** Rock Party Mix
- **氛围：** 邻居们讨厌这个

---

### 放松
*纯粹放松*

```bash
home-music chill
```
- **扬声器：** Sonos Move
- **音量：** 30%
- **播放列表：** Chill Lounge
- **氛围：** 嗯...

---

### 关闭
*安静*

```bash
home-music off
```
- 暂停 Spotify
- 断开所有扬声器连接
- **氛围：** 终于，平静与安宁

---

### 状态
*现在正在播放什么？*

```bash
home-music status
```

显示：
- 当前 Spotify 曲目
- 已连接的扬声器

---

## 安装

```bash
# 使脚本可执行
chmod +x ~/clawd/skills/home-music/home-music.sh

# 创建全局访问符号链接
sudo ln -sf ~/clawd/skills/home-music/home-music.sh /usr/local/bin/home-music
```

现在 `home-music` 可以在终端的任何地方使用！

---

## 自定义播放列表和场景

### 更改播放列表

打开 `home-music.sh` 并找到播放列表配置：

```bash
# === 播放列表配置 ===
PLAYLIST_MORNING="spotify:playlist:19n65kQ5NEKgkvSAla5IF6"
PLAYLIST_PARTY="spotify:playlist:37i9dQZF1DXaXB8fQg7xif"
PLAYLIST_CHILL="spotify:playlist:37i9dQZF1DWTwnEm1IYyoj"
```

**如何查找播放列表 URI：**
1. 在 Spotify 中右键点击播放列表
2. "分享" -> "复制 Spotify URI"
3. 或复制 URL 并提取 `/playlist/` 部分

### 添加新场景

在 `main` 代码块中添加新的 case：

```bash
# 在 home-music.sh 中的 "scene_chill" 函数之后：

scene_workout() {
    echo "启动运动场景..."
    airfoil_set_source_spotify
    airfoil_connect "Sonos Move"
    sleep 0.5
    airfoil_volume "Sonos Move" 0.8
    "$SPOTIFY_CMD" play "spotify:playlist:YOUR_WORKOUT_PLAYLIST"
    "$SPOTIFY_CMD" volume 100
    echo "运动：Sonos Move @ 80%，锻炼起来！"
}

# 在 case 代码块中：
    workout)
        scene_workout
        ;;
```

### 可用扬声器

```bash
ALL_SPEAKERS=("Computer" "Andy's M5 Macbook" "Sonos Move" "Living Room TV")
```

你可以添加任何 AirPlay 扬声器 – 只要它们在 Airfoil 中可见即可。

---

## 故障排除

### "扬声器无法连接"

**检查 1：** Airfoil 是否在运行？
```bash
pgrep -x Airfoil || echo "Airfoil 未运行！"
```

**检查 2：** 扬声器是否在网络上？
- 打开 Airfoil 应用
- 检查扬声器是否出现在列表中
- 尝试手动连接

**检查 3：** 名称是否完全正确？
- 扬声器名称区分大小写！
- 打开 Airfoil 并复制精确名称

---

### "没有声音"

**检查 1：** Spotify 是否正在播放？
```bash
~/clawd/skills/spotify-applescript/spotify.sh status
```

**检查 2：** Airfoil 音频源是否正确？
- 打开 Airfoil
- 检查是否选择了 "Spotify" 作为音频源
- 如果没有：点击"源" -> 选择 Spotify

**检查 3：** 扬声器音量？
```bash
# 手动检查音量
osascript -e 'tell application "Airfoil" to get volume of (first speaker whose name is "Sonos Move")'
```

---

### "Spotify 无法启动"

**Spotify 是否打开？**
```bash
pgrep -x Spotify || open -a Spotify
```

**spotify-applescript 是否已安装？**
```bash
ls ~/clawd/skills/spotify-applescript/spotify.sh
```

---

### "权限被拒绝"

```bash
chmod +x ~/clawd/skills/home-music/home-music.sh
```

---

## 直接 Airfoil 命令

如果你想手动控制 Airfoil：

```bash
# 连接扬声器
osascript -e 'tell application "Airfoil" to connect to (first speaker whose name is "Sonos Move")'

# 设置扬声器音量（0.0 - 1.0）
osascript -e 'tell application "Airfoil" to set (volume of (first speaker whose name is "Sonos Move")) to 0.5'

# 断开扬声器
osascript -e 'tell application "Airfoil" to disconnect from (first speaker whose name is "Sonos Move")'

# 列出已连接的扬声器
osascript -e 'tell application "Airfoil" to get name of every speaker whose connected is true'

# 设置音频源
osascript -e 'tell application "Airfoil"
    set theSource to (first application source whose name contains "Spotify")
    set current audio source to theSource
end tell'
```

---

## 文件结构

```
skills/home-music/
├── SKILL.md        # 此文档
└── home-music.sh   # 主脚本
```

---

## 专业提示

1. **设置别名**以更快地访问：
   ```bash
   alias mm="home-music morning"
   alias mp="home-music party"
   alias mc="home-music chill"
   alias mo="home-music off"
   ```

2. **与 Clawdbot 结合使用：**
   > "嘿，启动派对模式"
   > "播放一些放松的音乐"
   > "停止音乐"

3. **组合场景：** 创建带有爵士乐播放列表的 `dinner` 场景，音量 25% – 非常适合客人！

---

## 致谢

```
╭─────────────────────────────────────────────╮
│                                             │
│   用 由 Owen the Frog 精心制作              │
│                                             │
│   "Ribbit。音乐让一切变得更好。"             │
│                                             │
╰─────────────────────────────────────────────╯
```

**作者：** Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 协助）  
**版本：** 1.0.0  
**许可证：** MIT  
**池塘：** 那个有睡莲的水塘

---

*这个技能改善了你的生活吗？Owen 感谢苍蝇。*
