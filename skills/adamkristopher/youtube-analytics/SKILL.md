---
name: youtube-analytics
description: "YouTube Data API v3 分析工具包。分析 YouTube 频道、视频和搜索结果。当用户要求：检查 YouTube 频道统计、分析视频表现、比较频道、搜索视频、获取订阅者数量、查看参与度指标、查找热门视频、获取频道上传或分析 YouTube 竞争时使用。需要来自 Google Cloud Console 的 YouTube Data API v3 密钥。"
---

# YouTube 分析工具包

## 设置

安装依赖项：

```bash
cd scripts && npm install
```

通过在项目根目录创建 `.env` 文件来配置凭据：

```
YOUTUBE_API_KEY=AIzaSy...your-api-key
YOUTUBE_DEFAULT_MAX_RESULTS=50
```

**先决条件**：需要启用 YouTube Data API v3 的 Google Cloud 项目。从 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 获取您的 API 密钥。

## 快速开始

| 用户说 | 要调用的函数 |
|-----------|-----------------|
| "分析这个 YouTube 频道" | `analyzeChannel(channelId)` |
| "比较这两个频道" | `compareChannels([id1, id2])` |
| "这个视频表现如何？" | `analyzeVideo(videoId)` |
| "搜索 YouTube [主题]" | `searchAndAnalyze(query)` |
| "获取这个频道的统计" | `getChannelStats(channelId)` |
| "获取这个视频的浏览量" | `getVideoStats(videoId)` |
| "查找关于 [主题] 的频道" | `searchChannels(query)` |
| "显示这个频道最近的上传" | `getChannelVideos(channelId)` |

通过从 `scripts/src/index.ts` 导入来执行函数：

```typescript
import { analyzeChannel, searchAndAnalyze } from './scripts/src/index.js';

const analysis = await analyzeChannel('UCxxxxxxxx');
```

或直接使用 tsx 运行：

```bash
npx tsx scripts/src/index.ts
```

## 工作流程模式

每个分析都遵循三个阶段：

### 1. 分析
运行 API 函数。每次调用都会访问 YouTube Data API 并返回结构化数据。

### 2. 自动保存
所有结果会自动保存到 `results/{category}/` 的 JSON 文件中。文件命名模式：
- 命名结果：`{sanitized_name}.json`
- 自动生成：`YYYYMMDD_HHMMSS__{operation}.json`

### 3. 总结
分析后，读取保存的 JSON 文件并在 `results/summaries/` 中创建包含数据表、比较和见解的 markdown 摘要。

## 高层函数

| 函数 | 用途 | 收集内容 |
|----------|---------|----------------|
| `analyzeChannel(channelId)` | 完整频道分析 | 频道信息、最近视频、每视频平均浏览量 |
| `compareChannels(channelIds)` | 比较多个频道 | 订阅者、浏览量、视频数量的并排对比 |
| `analyzeVideo(videoId)` | 视频表现分析 | 浏览量、点赞、评论、点赞率、评论率 |
| `searchAndAnalyze(query, maxResults?)` | 搜索+统计 | 带有完整视频统计的搜索结果 |

## 单独的 API 函数

要进行细粒度控制，请从 API 模块导入特定函数。请参阅 [references/api-reference.md](references/api-reference.md) 获取包含参数、类型和示例的 13 个 API 函数的完整列表。

### 频道函数

| 函数 | 用途 |
|----------|---------|
| `getChannel(channelId)` | 获取完整的频道详情 |
| `getChannelStats(channelId)` | 获取简化的统计（订阅者、浏览量、视频数） |
| `getMultipleChannels(channelIds)` | 批量获取多个频道 |

### 视频函数

| 函数 | 用途 |
|----------|---------|
| `getVideo(videoId)` | 获取完整的视频详情 |
| `getVideoStats(videoId)` | 获取简化的统计（浏览量、点赞、评论） |
| `getMultipleVideos(videoIds)` | 批量获取多个视频 |
| `getChannelVideos(channelId)` | 获取频道最近的上传 |

### 搜索函数

| 函数 | 用途 |
|----------|---------|
| `searchVideos(query, options?)` | 搜索视频 |
| `searchChannels(query, options?)` | 搜索频道 |

## 结果存储

结果自动保存到 `results/`，结构如下：

```
results/
├── channels/       # 频道数据和比较
├── videos/         # 视频数据和分析
├── search/         # 搜索结果
└── summaries/      # 人类可读的 markdown 摘要
```

### 管理结果

```typescript
import { listResults, loadResult, getLatestResult } from './scripts/src/index.js';

// 列出最近的结果
const files = listResults('channels', 10);

// 加载特定结果
const data = loadResult(files[0]);

// 获取某个操作最近的结果
const latest = getLatestResult('channels', 'channel_analysis');
```

## 提示

1. **使用频道 ID** — 频道 ID 以 `UC` 开头（例如 `UCxxxxxxxx`）。您可以在频道 URL 或页面源代码中找到它们。
2. **请求摘要** — 拉取数据后，请求带有表格和见解的 markdown 摘要。
3. **比较频道** — 使用 `compareChannels()` 并排基准测试竞争对手。
4. **批量请求** — 使用 `getMultipleChannels()` 或 `getMultipleVideos()` 进行高效的批量查询。
5. **搜索+分析** — `searchAndAnalyze()` 将搜索与完整视频统计结合在一次调用中。