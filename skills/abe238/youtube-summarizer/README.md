# YouTube 摘要器

自动获取YouTube视频字幕，生成结构化摘要，并将完整字幕传递到消息平台。

## 特性

✅ **自动检测** - 识别消息中的YouTube URL  
✅ **云友好** - 在yt-dlp失败的VPS/云IP上工作  
✅ **结构化摘要** - 核心论点、关键见解和要点  
✅ **完整字幕** - 包含完整视频内容的可下载文本文件  
✅ **平台感知** - 自动向Telegram发送文件，在其他地方仅发送文本  
✅ **多语言** - 支持多种语言，以英语为备选  

## 安装

### 先决条件

1. **Node.js 18+** 已安装
2. **Clawdbot** 正在运行

### 通过 ClawdHub 安装

```bash
clawdhub install youtube-summarizer
```

### 手动安装

```bash
# 1. 克隆技能
cd /root/clawd/skills
git clone <此仓库URL> youtube-summarizer

# 2. 安装 MCP YouTube Transcript 依赖
cd /root/clawd
git clone https://github.com/kimtaeyoon83/mcp-server-youtube-transcript.git
cd mcp-server-youtube-transcript
npm install && npm run build
```

## 使用方法

只需在聊天中分享YouTube URL：

```
您: https://youtu.be/dQw4w9WgXcQ

智能体: 📹 **视频:** Never Gonna Give You Up
       👤 **频道:** Rick Astley | 👁️ **观看:** 14亿 | 📅 **发布:** 2009-10-25
       
       **🎯 核心论点:**
       一段关于在关系中坚定不移的承诺和忠诚的宣言...
       
       [结构化摘要如下]
       
       📄 完整字幕已附加（Telegram）或保存到 transcripts/
```

## 工作原理

1. **检测** YouTube URL 自动
2. **获取** 字幕使用 MCP 服务器（绕过云IP封锁）
3. **生成** 带有元数据的结构化摘要
4. **保存** 完整字幕到 `transcripts/YYYY-MM-DD_VIDEO_ID.txt`
5. **发送** 文件到 Telegram（如果在Telegram上下文中）
6. **回复** 格式化摘要

## 支持的 URL 格式

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- 直接视频ID: `VIDEO_ID`

## 输出格式

### 摘要结构

```markdown
📹 **视频:** [标题]
👤 **频道:** [作者] | 👁️ **观看:** [计数] | 📅 **发布:** [日期]

**🎯 核心论点:**
核心信息，1-2句

**💡 关键见解:**
- 见解1
- 见解2
- 见解3

**📝 值得注意的点:**
- 支持细节1
- 支持细节2

**🔑 要点:**
实用结论
```

### 字幕文件

保存到 `/root/clawd/transcripts/YYYY-MM-DD_VIDEO_ID.txt`，包含：
- 视频元数据标题
- 完整字幕文本
- URL引用

## 配置

无需配置！该技能自动：
- 检测您的消息平台
- 选择适当的传递方法
- 处理语言备选
- 如有需要，创建字幕目录

## 故障排除

### "字幕不可用"
- 视频可能未启用字幕
- 尝试其他视频
- 使用YouTube的手动字幕功能

### "MCP服务器未找到"
安装依赖：
```bash
cd /root/clawd
git clone https://github.com/kimtaeyoon83/mcp-server-youtube-transcript.git
cd mcp-server-youtube-transcript
npm install && npm run build
```

### "语言不可用"
如果请求的语言不可用，该技能会自动回退到英语。

## 为什么使用此技能？

### 问题
- yt-dlp 在云/VPS IP上被封锁
- YouTube 对机器人检测很严格
- 手动提取字幕很繁琐
- 需要结构化摘要，而非原始文本

### 解决方案
- 使用带有Android客户端模拟的MCP服务器
- 绕过云IP限制
- 自动生成结构化摘要
- 平台感知的文件传递

## 依赖项

- [MCP YouTube Transcript](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript) - 通过Android客户端模拟获取字幕
- Node.js 18+ - 运行环境
- Clawdbot - AI智能体框架

## 致谢

- 由 **abe238** 构建
- 使用 kimtaeyoon83 的 [mcp-server-youtube-transcript](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript)
- 灵感来自于在云服务器上对可靠YouTube转录的需求

## 许可证

MIT

## 贡献

欢迎改进！考虑：
- 额外的摘要模板
- 多语言摘要生成
- 基于时间戳的章节提取
- 视频元数据丰富

## 更新日志

### v1.0.0 (2026-01-26)
- 初始发布
- 自动检测YouTube URL
- 生成结构化摘要
- 保存完整字幕
- Telegram文件传递
- 通过MCP服务器绕过云IP