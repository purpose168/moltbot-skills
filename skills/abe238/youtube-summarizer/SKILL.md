---
name: youtube-summarizer
description: 自动获取YouTube视频字幕，生成结构化摘要，并将完整字幕发送到消息平台。检测YouTube URL并提供元数据、关键见解和可下载的字幕。
version: 1.0.0
author: abe238
tags: [youtube, transcription, summarization, video, telegram]
---

# YouTube 摘要技能

自动从YouTube视频获取字幕，生成结构化摘要，并将完整字幕传递到消息平台。

## 何时使用

在以下情况激活此技能：
- 用户分享YouTube URL（youtube.com/watch, youtu.be, youtube.com/shorts）
- 用户要求总结或转录YouTube视频
- 用户请求有关YouTube视频内容的信息

## 依赖项

**必需：** MCP YouTube Transcript服务器必须安装在：
`/root/clawd/mcp-server-youtube-transcript`

如果不存在，请安装：
```bash
cd /root/clawd
git clone https://github.com/kimtaeyoon83/mcp-server-youtube-transcript.git
cd mcp-server-youtube-transcript
npm install && npm run build
```

## 工作流程

### 1. 检测 YouTube URL

从这些模式中提取视频ID：
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- 直接视频ID：`VIDEO_ID`（11个字符）

### 2. 获取字幕

运行此命令获取字幕：
```bash
cd /root/clawd/mcp-server-youtube-transcript && node --input-type=module -e "
import { getSubtitles } from './dist/youtube-fetcher.js';
const result = await getSubtitles({ videoID: 'VIDEO_ID', lang: 'en' });
console.log(JSON.stringify(result, null, 2));
" > /tmp/yt-transcript.json
```

将 `VIDEO_ID` 替换为提取的ID。从 `/tmp/yt-transcript.json` 读取输出。

### 3. 处理数据

解析JSON以提取：
- `result.metadata.title` - 视频标题
- `result.metadata.author` - 频道名称
- `result.metadata.viewCount` - 格式化的观看次数
- `result.metadata.publishDate` - 发布日期
- `result.actualLang` - 使用的语言
- `result.lines` - 字幕段数组

完整文本：`result.lines.map(l => l.text).join(' ')`

### 4. 生成摘要

使用此模板创建结构化摘要：

```markdown
📹 **视频：** [title]
👤 **频道：** [author] | 👁️ **观看：** [views] | 📅 **发布：** [date]

**🎯 核心论点：**
[1-2句核心论点/信息]

**💡 关键见解：**
- [见解1]
- [见解2]
- [见解3]
- [见解4]
- [见解5]

**📝 值得注意的点：**
- [附加点1]
- [附加点2]

**🔑 要点：**
[实际应用或结论]
```

目标：
- 核心论点：最多1-2句
- 关键见解：3-5个要点，每个1-2句
- 值得注意的点：2-4个支持细节
- 要点：可操作的结论

### 5. 保存完整字幕

将完整字幕保存到带时间戳的文件：
```
/root/clawd/transcripts/YYYY-MM-DD_VIDEO_ID.txt
```

在文件中包含：
- 视频元数据标题
- 完整字幕文本
- URL引用

### 6. 平台特定传递

**如果频道是Telegram：**
```bash
message --action send --channel telegram --target CHAT_ID \
  --filePath /root/clawd/transcripts/YYYY-MM-DD_VIDEO_ID.txt \
  --caption "📄 YouTube 字幕：[title]"
```

**如果频道是其他/网络聊天：**
只需回复摘要（无文件附件）。

### 7. 回复摘要

将结构化摘要作为对用户的响应发送。

## 错误处理

**如果获取字幕失败：**
- 检查视频是否启用了字幕
- 如果请求的语言不可用，尝试使用 `lang: 'en'` 作为备选
- 通知用户字幕不可用并建议替代方案：
  - 手动YouTube字幕功能
  - 视频可能没有字幕
  - 尝试其他视频

**如果MCP服务器未安装：**
- 提供安装说明
- 如果在适当的上下文中，主动提供自动安装

**如果视频ID提取失败：**
- 请用户提供完整的YouTube URL或视频ID

## 示例

请参阅 `examples/` 目录获取示例输出。

## 质量指南

- **简洁：** 摘要应在30秒内可浏览
- **准确：** 不要添加字幕中不存在的信息
- **结构化：** 使用一致的格式便于阅读
- **上下文相关：** 根据视频长度调整详细程度
  - 短视频（<5分钟）：简短摘要
  - 长视频（>30分钟）：更详细的分解

## 注意事项

- MCP服务器使用Android客户端模拟来绕过YouTube的云IP封锁
- 在yt-dlp经常失败的VPS/云环境中可靠工作
- 支持多种语言，自动回退到英语
- 字幕质量取决于YouTube的自动生成字幕或手动字幕