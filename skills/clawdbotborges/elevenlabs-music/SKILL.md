---
name: elevenlabs-music
description: 使用 ElevenLabs Eleven Music API 从文本提示生成音乐。用于创建歌曲、主题曲、广告曲、摇篮曲或任何根据描述生成的音频。支持带 AI 生成歌词的人声、器乐曲目和多种风格。需要付费的 ElevenLabs 套餐。
metadata: {"clawdbot":{"emoji":"🎵","requires":{"bins":["uv"],"env":["ELEVENLABS_API_KEY"]},"primaryEnv":"ELEVENLABS_API_KEY"}}
---

# ElevenLabs 音乐生成

从文本提示生成完整歌曲，包含 AI 生成的歌词和人声。

## 快速开始

```bash
# 基本生成（30秒）
uv run {baseDir}/scripts/generate_music.py "upbeat jazz piano"

# 更长曲目（3分钟）
uv run {baseDir}/scripts/generate_music.py "epic orchestral battle music" --length 180

# 仅器乐（无人声）
uv run {baseDir}/scripts/generate_music.py "lo-fi hip hop beats" --length 120 --instrumental

# 自定义输出路径
uv run {baseDir}/scripts/generate_music.py "romantic bossa nova" -o /tmp/bossa.mp3
```

## 选项

| 标志 | 描述 |
|------|-------------|
| `-l, --length` | 持续时间（秒）（3-600，默认: 30） |
| `-o, --output` | 输出文件路径（默认: /tmp/music.mp3） |
| `-i, --instrumental` | 强制器乐模式，无人声 |

## 提示工程技巧

### 明确风格
- 包含流派、情绪、节奏和乐器
- 参考年代："90年代巴西浪漫 pagode"、"1960年代科幻 TV 主题曲"
- 描述能量："从轻柔到爆发"、"轻松私密"

### 人声歌曲
- 指定语言："葡萄牙语人声"、"日语演唱"
- 描述人声风格："深情男声"、"空灵女声合唱"
- 包含歌词主题："关于爱和 saudade"、"庆祝友谊"

### 避免版权问题
- 不要直接提及艺术家/乐队名称
- 描述风格："经典 90 年代浪漫桑巴风格"而不是"像 Raça Negra"
- 如果被拒绝，API 会返回建议的替代提示

### 示例提示

**MPB（巴西流行音乐）**
```
一首深情的 MPB 曲目，以轻柔的原声吉他、温暖的尼龙弦和梦幻的 Rhodes 钢琴为特色。
受波萨诺瓦影响的节奏，配以柔和的鼓刷。人声用葡萄牙语表达 saudade 和生命之美的主题。
```

**史诗管弦乐**
```
史诗军事进行曲，强大的铜管乐号角、隆通鼓和高亢合唱。胜利且英雄，
有深沉的低音大号、大胆的小鼓鼓滚和声部旋律，逐渐走向辉煌的 crescendo。
```

**摇篮曲**
```
轻柔的管弦乐摇篮曲，配以 sweeping 弦乐、柔和铜管和空灵的无词女高音人声。
平静而庄严，唤起奇妙和希望。非常适合在梦中冒险时入睡。
```

**喜剧摇滚**
```
巴西喜剧摇滚，带有荒谬、搞笑的葡萄牙语歌词，充满了双关语。
将充满活力的摇滚吉他与意想不到的节奏混合——forró 变奏、pagode 时刻。
戏剧性、夸张的人声唱着荒谬的情况。
```

## 要求

- **ElevenLabs API 密钥**: 设置 `ELEVENLABS_API_KEY` 环境变量
- **付费套餐**: 音乐 API 需要 Creator 套餐或更高
- **uv**: 用于运行带有依赖项的 Python 脚本

## 支持的功能

- 最长 10 分钟的文本到音乐生成
- AI 生成的歌词和多语言人声（英语、西班牙语、葡萄牙语、德语、日语等）
- 仅器乐模式
- 绝大多数音乐风格和流派
