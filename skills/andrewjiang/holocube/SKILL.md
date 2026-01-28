---
name: holocube
description: 使用 HoloClawd 固件控制 GeekMagic HelloCubic-Lite 全息立方体显示屏。支持绘图 API、带有龙虾吉祥物的番茄钟计时器、GIF 上传和程序化动画。
homepage: https://github.com/andrewjiang/HoloClawd-Open-Firmware
metadata: {"clawdbot":{"emoji":"🦞","os":["darwin","linux"]}}
triggers:
  - holocube
  - holo cube
  - holoclawd
  - cubic
  - geekmagic
  - display gif
  - cube animation
  - pomodoro
  - lobster timer
  - water tracker
  - hydration
  - drink water
---

# HoloCube 控制器

通过 REST API 控制带有 HoloClawd 固件的 GeekMagic HelloCubic-Lite。

**固件：** https://github.com/andrewjiang/HoloClawd-Open-Firmware

## 设备信息

- **型号：** 带有 HoloClawd 固件的 HelloCubic-Lite
- **显示屏：** 240x240px ST7789 TFT
- **默认 IP：** 192.168.7.80（可配置）

## 快速开始

**番茄钟计时器**（Andrew 的本地版本，带有 Spotify 集成）：

```bash
# 运行带有龙虾吉祥物的番茄钟计时器（25 分钟工作，5 分钟休息）
# 使用硬编码的 Spotify URI 来播放专注/休息音乐
cd ~/Bao/clawd && uv run --script pomodoro.py

# 带自定义任务标签（最多 20 个字符）
cd ~/Bao/clawd && uv run --script pomodoro.py --task "BUILD NETWORK"

# 自定义时间
cd ~/Bao/clawd && uv run --script pomodoro.py --work 50 --short 10 --long 20

# 禁用 Spotify
cd ~/Bao/clawd && uv run --script pomodoro.py --no-spotify
```

**绘图 API**（需要来自仓库的 holocube_client.py）：

```bash
# 在显示屏上绘制一些内容
python3 -c "
from holocube_client import HoloCube, Color, draw_lobster
cube = HoloCube('192.168.7.80')
cube.clear(Color.BLACK)
draw_lobster(cube, 120, 120)  # 在中心绘制龙虾
"
```

## Python 客户端库

`holocube_client.py` 模块提供完整的程序化控制：

```python
from holocube_client import HoloCube, Color, draw_lobster, draw_confetti

cube = HoloCube("192.168.7.80")

# 绘图原语
cube.clear("#000000")                              # 清屏
cube.pixel(x, y, color)                            # 单个像素
cube.line(x0, y0, x1, y1, color)                   # 线条
cube.rect(x, y, w, h, color, fill=True)            # 矩形
cube.circle(x, y, r, color, fill=True)             # 圆形
cube.triangle(x0, y0, x1, y1, x2, y2, color)       # 三角形
cube.ellipse(x, y, rx, ry, color, fill=True)       # 椭圆
cube.roundrect(x, y, w, h, r, color, fill=True)    # 圆角矩形
cube.text(x, y, "Hello", size=3, color="#00ffff")  # 文本

# 高级助手函数
cube.centered_text(y, "Centered", size=2)
cube.show_message(["Line 1", "Line 2"], colors=[Color.CYAN, Color.WHITE])
cube.show_timer(seconds, label="FOCUS")
cube.show_progress(0.75, label="Loading")

# 龙虾吉祥物
draw_lobster(cube, 120, 120)                       # 正常龙虾
draw_lobster(cube, 120, 120, happy=True, frame=0)  # 派对模式带彩带
draw_confetti(cube, 120, 120, frame=1)             # 动画彩带
```

## 番茄钟计时器

完整的番茄钟计时器带有可爱的龙虾伙伴。**使用 Andrew 的本地版本**位于 `~/Bao/clawd/pomodoro.py`：

```bash
# 始终从本地目录运行
cd ~/Bao/clawd

# 默认：25 分钟工作，5 分钟休息（带 Spotify）
uv run --script pomodoro.py

# 带自定义任务标签
uv run --script pomodoro.py --task "CODE REVIEW"
uv run --script pomodoro.py -t "BUILD NETWORK"

# 自定义时间
uv run --script pomodoro.py --work 50 --short 10 --long 20

# 禁用 Spotify
uv run --script pomodoro.py --no-spotify
```

**Andrew 的版本**（~/Bao/clawd/pomodoro.py）：
- 硬编码的 Spotify URI：
  - 专注：`spotify:episode:5yJKH11UlF3sS3gcKKaUYx`
  - 休息：`spotify:episode:4U4OloHPFBNHWt0GOKENVF`
- 使用 `~/clawd/skills/spotify-applescript/spotify.sh` 进行播放

选项：
- `--task`, `-t`: 工作期间显示的任务标签（最多 20 个字符，自动大写）
- `--work`: 工作时长（分钟，默认：25）
- `--short`: 短休息时长（分钟，默认：5）
- `--long`: 长休息时长（分钟，默认：15）
- `--sessions`: 长休息前的会话数（默认：4）
- `--no-spotify`: 禁用自动音乐播放

功能：
- 龙虾吉祥物看着你工作（专注的表情）
- 休息期间：快乐的龙虾带有闪烁的彩带
- 会话之间的闪烁提示
- 跟踪完成的会话
- 通过 AppleScript 自动 Spotify 播放（macOS）
- 左上角的水分跟踪器（与 water.py 共享）

## 水分跟踪

使用左上角可爱的水滴图标跟踪每日饮水量：

```bash
cd ~/Bao/clawd

# 显示当前计数
uv run --script water.py

# 加一杯 (+1)
uv run --script water.py add

# 加多杯
uv run --script water.py add 2

# 设置特定计数
uv run --script water.py set 5

# 重置为 0
uv run --script water.py reset

# 更改每日目标
uv run --script water.py goal 10
```

状态持久化到 `~/.holocube_water.json`，每天自动重置。在番茄钟会话期间，左上角也会显示水分跟踪器。

## 库存固件工具

### holocube.py - GIF 上传（库存固件）

```bash
uv run --script holocube.py upload animation.gif
uv run --script holocube.py show animation.gif
uv run --script holocube.py list
```

### gifgen.py - 程序化动画生成器

```bash
uv run --script gifgen.py fire output.gif
uv run --script gifgen.py plasma output.gif
uv run --script gifgen.py matrix output.gif
uv run --script gifgen.py sparkle output.gif
```

## 绘图 API 端点

HoloClawd 固件公开了这些 REST 端点：

```bash
# 清屏
curl -X POST http://192.168.7.80/api/v1/draw/clear -d '{"color":"#000000"}'

# 绘制形状
curl -X POST http://192.168.7.80/api/v1/draw/circle -d '{"x":120,"y":120,"r":50,"color":"#ff0000","fill":true}'
curl -X POST http://192.168.7.80/api/v1/draw/rect -d '{"x":10,"y":10,"w":100,"h":50,"color":"#00ff00"}'
curl -X POST http://192.168.7.80/api/v1/draw/triangle -d '{"x0":120,"y0":50,"x1":80,"y1":150,"x2":160,"y2":150,"color":"#0000ff"}'
curl -X POST http://192.168.7.80/api/v1/draw/ellipse -d '{"x":120,"y":120,"rx":60,"ry":30,"color":"#ffff00"}'
curl -X POST http://192.168.7.80/api/v1/draw/line -d '{"x0":0,"y0":0,"x1":240,"y1":240,"color":"#ffffff"}'
curl -X POST http://192.168.7.80/api/v1/draw/text -d '{"x":60,"y":100,"text":"Hello","size":3,"color":"#00ffff"}'

# 批量执行多个命令
curl -X POST http://192.168.7.80/api/v1/draw/batch -d '{"commands":[...]}'
```

## 固件

**来源：** https://github.com/andrewjiang/HoloClawd-Open-Firmware

构建和烧录：
```bash
git clone https://github.com/andrewjiang/HoloClawd-Open-Firmware.git
cd HoloClawd-Open-Firmware
pio run                    # 构建
curl -X POST -F "file=@.pio/build/esp12e/firmware.bin" http://192.168.7.80/api/v1/ota/fw
```

## 颜色参考

```python
Color.BLACK   = "#000000"
Color.WHITE   = "#ffffff"
Color.RED     = "#ff0000"
Color.GREEN   = "#00ff00"
Color.BLUE    = "#0000ff"
Color.CYAN    = "#00ffff"
Color.MAGENTA = "#ff00ff"
Color.YELLOW  = "#ffff00"
Color.ORANGE  = "#ff6600"
Color.PURPLE  = "#9900ff"
```

## 故障排除

- **无法连接**：检查 WiFi，设备应在 192.168.7.80
- **绘图慢**：每次 HTTP 调用约需 50 毫秒，复杂绘图使用批量 API
- **屏幕闪烁**：仅在第一帧时清屏，文本更新使用背景颜色
