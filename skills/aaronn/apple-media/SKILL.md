---
name: apple-media
description: 通过 pyatv 控制 Apple TV、HomePod 和 AirPlay 设备（扫描、流式传输、播放控制、音量、导航）。
homepage: https://github.com/aaronn/clawd-apple-media-skill
metadata: {"clawdbot":{"emoji":"🎛️","requires":{"bins":["atvremote"]},"install":[{"id":"pipx","kind":"shell","command":"pipx install pyatv --python python3.13","bins":["atvremote"],"label":"通过 pipx 安装 pyatv (Python 3.13)"}]}}
---

# Apple 媒体遥控器

使用 `atvremote` 从命令行控制 Apple TV、HomePod 和 AirPlay 设备。

## 设置注意事项

- pyatv 与 Python 3.14+ 存在兼容性问题。安装时请使用 `--python python3.13`（或任何 ≤3.13 的版本）。
- 如果安装后 `~/.local/bin` 不在您的 PATH 中，请运行：`pipx ensurepath`
- 如果您的默认 Python 是 3.14+，您也可以直接调用：`python3.13 -m pyatv.scripts.atvremote <command>`

## 扫描设备

```bash
atvremote scan
atvremote --scan-hosts 10.0.0.50 scan          # 扫描特定 IP（更快）
atvremote --scan-hosts 10.0.0.50,10.0.0.51 scan  # 多个 IP
```

返回本地网络上所有可发现的 Apple TV、HomePod 和 AirPlay 设备，包括它们的名称、地址、协议和配对状态。

## 目标设备

使用 `-n <name>`（设备名称）、`-s <ip>`（地址）或 `-i <id>`（标识符）来指定目标：
```bash
atvremote -n "Kitchen" <command>
atvremote -s 10.0.0.50 <command>
atvremote -i AA:BB:CC:DD:EE:FF <command>
```

## 播放控制

```bash
atvremote -n "Kitchen" playing           # 当前播放信息（标题、艺术家、专辑、位置等）
atvremote -n "Kitchen" play              # 继续播放
atvremote -n "Kitchen" pause             # 暂停播放（可通过 play 恢复）
atvremote -n "Kitchen" play_pause        # 切换播放/暂停
atvremote -n "Kitchen" stop              # 停止播放（结束会话，无法恢复）
atvremote -n "Kitchen" next              # 下一曲
atvremote -n "Kitchen" previous          # 上一曲
atvremote -n "Kitchen" skip_forward      # 快进（约 10-30 秒，取决于应用）
atvremote -n "Kitchen" skip_backward     # 快退（约 10-30 秒，取决于应用）
atvremote -n "Kitchen" skip_forward=30   # 快进指定秒数
atvremote -n "Kitchen" set_position=120  # 跳转到指定位置（秒）
atvremote -n "Kitchen" set_shuffle=Songs # 随机播放：Off, Songs, Albums
atvremote -n "Kitchen" set_repeat=All    # 重复：Off, Track, All
```

## 音量

```bash
atvremote -n "Kitchen" volume            # 获取当前音量（0-100）
atvremote -n "Kitchen" set_volume=50     # 设置音量（0-100）
atvremote -n "Kitchen" volume_up         # 增加音量（约 2.5%）
atvremote -n "Kitchen" volume_down       # 减少音量（约 2.5%）
```

## 流式传输

将本地文件或 URL 流式传输到设备：
```bash
atvremote -n "Kitchen" stream_file=/path/to/audio.mp3   # 本地文件
atvremote -n "Kitchen" play_url=http://example.com/stream.mp3  # 远程 URL
```

支持常见的音频格式（MP3、WAV、AAC、FLAC 等）。

## 电源管理

```bash
atvremote -n "Apple TV" power_state      # 检查电源状态
atvremote -n "Apple TV" turn_on          # 唤醒设备
atvremote -n "Apple TV" turn_off         # 使设备睡眠
```

## 导航（Apple TV）

```bash
atvremote -n "Apple TV" up               # 方向键上
atvremote -n "Apple TV" down             # 方向键下
atvremote -n "Apple TV" left             # 方向键左
atvremote -n "Apple TV" right            # 方向键右
atvremote -n "Apple TV" select           # 按选择/确认
atvremote -n "Apple TV" menu             # 返回/菜单按钮
atvremote -n "Apple TV" home             # 主页按钮
atvremote -n "Apple TV" home_hold        # 长按主页（应用切换器）
atvremote -n "Apple TV" top_menu         # 进入主菜单
atvremote -n "Apple TV" control_center   # 打开控制中心
atvremote -n "Apple TV" guide            # 显示电子节目指南
atvremote -n "Apple TV" channel_up       # 下一个频道
atvremote -n "Apple TV" channel_down     # 上一个频道
atvremote -n "Apple TV" screensaver      # 激活屏幕保护程序
```

## 键盘输入（Apple TV）

当文本字段被激活时：
```bash
atvremote -n "Apple TV" text_get                 # 获取当前文本
atvremote -n "Apple TV" text_set="search query"  # 替换文本
atvremote -n "Apple TV" text_append=" more"      # 追加文本
atvremote -n "Apple TV" text_clear               # 清除文本
```

## 应用控制（Apple TV）

```bash
atvremote -n "Apple TV" app_list                          # 列出已安装的应用
atvremote -n "Apple TV" launch_app=com.apple.TVMusic      # 通过捆绑 ID 或 URL 启动
```

## 输出设备（多房间）

管理连接的音频输出（例如，将 HomePod 分组）：
```bash
atvremote -n "Apple TV" output_devices                    # 列出当前输出设备 ID
atvremote -n "Apple TV" add_output_devices=<device_id>    # 添加扬声器到组
atvremote -n "Apple TV" remove_output_devices=<device_id> # 从组中移除
atvremote -n "Apple TV" set_output_devices=<device_id>    # 设置特定输出
```

## 推送更新（实时监控）

监视实时播放变化：
```bash
atvremote -n "Kitchen" push_updates   # 打印发生的更新（按 ENTER 停止）
```

## 配对

某些设备（尤其是 Apple TV）在控制前需要配对：
```bash
atvremote -n "Living Room" pair                   # 配对（按照 PIN 提示操作）
atvremote -n "Living Room" --protocol airplay pair  # 配对特定协议
atvremote wizard                                  # 交互式引导设置
```

配对后，凭证会自动存储在 `~/.pyatv.conf` 中。

## 设备信息

```bash
atvremote -n "Kitchen" device_info       # 型号、操作系统版本、MAC 地址
atvremote -n "Kitchen" features          # 列出所有支持的功能
atvremote -n "Kitchen" app               # 当前播放媒体的应用
```

## 提示

- **暂停 vs 停止**：使用 `pause`/`play` 来暂停和恢复。`stop` 会完全结束会话 — 播放必须从源（Siri、家庭应用等）重新开始
- "Pairing: NotNeeded" 的 HomePod 可以立即流式传输
- Apple TV 通常需要先配对（设备支持的所有协议）
- `playing` 命令显示媒体类型、标题、艺术家、位置、随机播放/重复状态
- 对于立体声 HomePod 对，通过名称指定任一单元
- 当您知道设备 IP 时，使用 `--scan-hosts` 进行更快的定位
- 导航和键盘命令主要适用于 Apple TV（不适用于 HomePod）