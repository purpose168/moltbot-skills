---
name: gifhorse
description: 搜索视频对白并创建带有时间轴字幕的反应 GIF。非常适合从电影和电视节目创建值得发 memes 的片段。
homepage: https://github.com/Coyote-git/gifhorse
metadata: {"clawdbot":{"emoji":"🐴","requires":{"bins":["gifhorse","ffmpeg"]},"install":[{"id":"gifhorse-setup","kind":"shell","command":"git clone https://github.com/Coyote-git/gifhorse.git ~/gifhorse && cd ~/gifhorse && python3 -m venv venv && source venv/bin/activate && pip install -e .","bins":["gifhorse"],"label":"安装 gifhorse CLI 工具"},{"id":"ffmpeg-full","kind":"shell","command":"brew install ffmpeg-full","bins":["ffmpeg"],"label":"安装 FFmpeg-full (macOS)"}],"config":{"examples":[{"GIFHORSE_DB":"~/gifhorse/transcriptions.db"}]}}}
---

# GifHorse - 对话搜索和 GIF 制作器

通过搜索对白并添加时间轴字幕，从您的视频库创建反应 GIF。

## GifHorse 功能

1. **转录视频** - 使用字幕文件（.srt）或 Whisper AI 提取带时间戳的对白
2. **搜索对白** - 立即在整个视频库中查找引语
3. **预览片段** - 在创建 GIF 之前准确查看将要捕获的内容
4. **创建 GIF** - 生成带有精确时间轴字幕和可选水印的 GIF

## 设置

### 首次设置

1. 安装 gifhorse（通过上方的安装按钮）
2. 安装用于字幕渲染的 FFmpeg-full（通过上方的安装按钮）
3. 转录您的视频库：

```bash
cd ~/gifhorse && source venv/bin/activate
gifhorse transcribe ~/Movies --use-subtitles
```

gifhorse 命令必须在其虚拟环境中运行。您可以通过以下方式激活它：

```bash
cd ~/gifhorse && source venv/bin/activate
```

或使用激活助手：

```bash
source ~/gifhorse/activate.sh
```

## 可用命令

### 转录视频

从您的视频中提取对白（每个视频一次）：

```bash
# 快速方式：使用现有的字幕文件（.srt）
gifhorse transcribe /path/to/videos --use-subtitles

# 较慢但全面：使用 Whisper AI（如果没有字幕）
gifhorse transcribe /path/to/video.mp4
```

**专业提示：** 有字幕时使用 `--use-subtitles` - 它比 Whisper 快 100 倍！

### 搜索对白

在整个库中查找引语：

```bash
# 基本搜索
gifhorse search "令人难忘的引语"

# 搜索周围上下文
gifhorse search "令人难忘的引语" --context 2
```

### 创建前预览

准确查看将要捕获的内容：

```bash
gifhorse preview "令人难忘的引语" 1
gifhorse preview "引语" 1 --include-before 1 --include-after 1
```

### 创建 GIF

生成带有字幕的 GIF：

```bash
# 基本 GIF
gifhorse create "令人难忘的引语" 1 --output reaction.gif

# 带水印
gifhorse create "引语" 1 --watermark "@用户名"

# 高质量用于社交媒体
gifhorse create "引语" 1 --width 720 --fps 24 --quality high --watermark "@句柄"

# 包含对话上下文
gifhorse create "引语" 1 --include-before 2 --include-after 1
```

### 检查状态

```bash
# 查看转录统计
gifhorse stats

# 列出所有已转录的视频
gifhorse list
```

## 时间控制选项

精确控制要捕获的内容：

- `--include-before N` - 包含匹配前 N 个对话片段
- `--include-after N` - 包含匹配后 N 个对话片段
- `--padding-before 秒` - 在对话开始前添加缓冲秒数（默认: 1.0）
- `--padding-after 秒` - 在对话结束后添加缓冲秒数（默认: 1.0）
- `--start-offset 秒` - 手动调整开始时间（可以为负）
- `--end-offset 秒` - 手动调整结束时间（可以为负）

**重要提示：** 对于对话后的反应，使用 `--padding-after` 而不是 `--include-after`。include-after 选项会捕获直到下一个对话片段的所有时间（可能是 30+ 秒！）。

## 质量选项

- `--quality low|medium|high` - 调色板质量（影响文件大小）
- `--fps N` - 每秒帧数（默认: 15，使用 24 以获得流畅效果）
- `--width N` - 宽度（像素）（默认: 480，使用 720 获得高清）
- `--no-subtitles` - 创建不带字幕叠加的 GIF

## 水印选项

为您的 GIF 添加品牌标识：

- `--watermark 文本` - 水印文本（例如："@gifhorse"）
- `--watermark-position tl|tr|bl|br` - 位置：左上、右上、左下、右下（默认: br）
- `--watermark-opacity N` - 不透明度 0.0 到 1.0（默认: 0.7）

## 常见工作流程

### 快速反应 GIF

```bash
gifhorse search "完美"
gifhorse create "完美" 1 --padding-after 2.0 --output perfect.gif
```

### 完整对话交流

```bash
gifhorse search "关键短语"
gifhorse preview "关键短语" 1 --include-before 2 --include-after 1
gifhorse create "关键短语" 1 --include-before 2 --include-after 1
```

### Twitter/X 高质量

```bash
gifhorse create "引语" 1 --width 720 --fps 24 --quality high --watermark "@句柄" --output tweet.gif
```

### 带对话后反应的场景

```bash
gifhorse create "令人难忘的台词" 1 --padding-after 3.0 --watermark "@我"
```

## 提示与技巧

1. **始终先预览** - 使用 `preview` 在创建前验证时间
2. **使用字幕文件** - 比 Whisper 转录快 100 倍
3. **注意文件大小** - 高质量 + 长持续时间 = 大文件（20秒可达 20+ MB）
4. **Padding vs Include** - 对于反应，使用 `--padding-after` 而不是 `--include-after`
5. **带上下文搜索** - 添加 `--context 2` 查看周围对话
6. **测试水印位置** - 右下角（br）通常效果最好

## 文件大小指南

- **低质量，10秒，360p:** ~1-2 MB
- **中等质量，10秒，480p:** ~3-5 MB
- **高质量，20秒，720p:** ~20+ MB

## 故障排除

### "command not found: gifhorse"

激活虚拟环境：

```bash
cd ~/gifhorse && source venv/bin/activate
```

### 字幕渲染错误

确保已安装 FFmpeg-full：

```bash
brew install ffmpeg-full
```

### 视频文件未找到

数据库存储绝对路径。如果在转录后移动了视频，请在新的位置重新转录。

## 网络共享支持

GifHorse 支持网络挂载的视频：

```bash
# 挂载网络共享（macOS）
open "smb://服务器IP/共享名"

# 从网络转录
gifhorse transcribe "/Volumes/服务器IP/Movies"
```

## 何时使用此技能

当用户想要以下操作时调用 gifhorse：
- 在视频库中搜索对白或引语
- 从电影或电视节目创建反应 GIF
- 为视频片段添加字幕
- 转录视频以进行可搜索的对白
- 在创建 GIF 之前预览其外观
- 为社交媒体添加水印到 GIF

## 了解更多

- **GitHub:** https://github.com/Coyote-git/gifhorse
- **使用指南:** https://github.com/Coyote-git/gifhorse/blob/main/USAGE_GUIDE.md
- **路线图:** https://github.com/Coyote-git/gifhorse/blob/main/ROADMAP.md

## 许可证

MIT
