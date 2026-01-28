# API 参考

YouTube 分析工具包的所有模块的完整函数参考。

## 目录

- [频道 API](#频道-api)（3个函数）
- [视频 API](#视频-api)（4个函数）
- [搜索 API](#搜索-api)（2个函数）
- [编排](#编排)（4个函数）
- [存储](#存储)（4个函数）

---

## 频道 API

导入：`from './api/channels.js'`

### `getChannel(channelId, options?)`

通过 ID 获取完整的频道详情。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelId` | `string` | 必需 | YouTube 频道 ID（以 UC 开头） |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<ChannelResponse>` — `{id, title, description, customUrl?, publishedAt, country?, thumbnails?, statistics: {viewCount, subscriberCount, videoCount}, uploadsPlaylistId?}`

### `getChannelStats(channelId)`

获取简化的频道统计数据（数字形式）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelId` | `string` | 必需 | YouTube 频道 ID |

**返回：** `Promise<ChannelStats>` — `{subscribers: number, views: number, videoCount: number}`

### `getMultipleChannels(channelIds, options?)`

在单个 API 调用中获取多个频道。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelIds` | `string[]` | 必需 | 频道 ID 数组 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<ChannelResponse[]>`

---

## 视频 API

导入：`from './api/videos.js'`

### `getVideo(videoId, options?)`

通过 ID 获取完整的视频详情。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `videoId` | `string` | 必需 | YouTube 视频 ID |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<VideoResponse>` — `{id, title, description, publishedAt, channelId, channelTitle, tags?, thumbnails?, statistics: {viewCount, likeCount, commentCount}, duration?}`

### `getVideoStats(videoId)`

获取简化的视频统计数据（数字形式）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `videoId` | `string` | 必需 | YouTube 视频 ID |

**返回：** `Promise<VideoStats>` — `{views: number, likes: number, comments: number}`

### `getMultipleVideos(videoIds, options?)`

在单个 API 调用中获取多个视频。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `videoIds` | `string[]` | 必需 | 视频 ID 数组 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<VideoResponse[]>`

### `getChannelVideos(channelId, options?)`

从频道的上传播放列表获取视频。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelId` | `string` | 必需 | YouTube 频道 ID |
| `options.maxResults` | `number` | `50` | 返回的最大视频数 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<VideoResponse[]>` — 来自频道最近上传的完整视频详情数组。

---

## 搜索 API

导入：`from './api/search.js'`

### `searchVideos(query, options?)`

在 YouTube 上搜索视频。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `query` | `string` | 必需 | 搜索查询字符串 |
| `options.maxResults` | `number` | `50` | 最大结果数 |
| `options.publishedAfter` | `string` | `undefined` | ISO 日期过滤器（例如 `"2024-01-01T00:00:00Z"`） |
| `options.publishedBefore` | `string` | `undefined` | ISO 日期过滤器 |
| `options.order` | `string` | `"relevance"` | 排序顺序：`date`、`rating`、`relevance`、`title`、`videoCount`、`viewCount` |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<SearchResponse>` — `{items: [{id: {kind, videoId?, channelId?}, snippet: {title, description, publishedAt, channelId, channelTitle, thumbnails?}}], pageInfo?, nextPageToken?, prevPageToken?}`

### `searchChannels(query, options?)`

在 YouTube 上搜索频道。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `query` | `string` | 必需 | 搜索查询字符串 |
| `options.maxResults` | `number` | `50` | 最大结果数 |
| `options.order` | `string` | `"relevance"` | 排序顺序：`date`、`rating`、`relevance`、`title`、`videoCount`、`viewCount` |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<SearchResponse>`

---

## 编排

导入：`from './index.js'`

### `analyzeChannel(channelId)`

综合频道分析 — 获取频道信息、最近视频，并计算每视频平均浏览量。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelId` | `string` | 必需 | YouTube 频道 ID |

**返回：** `Promise<ChannelAnalysis>` — `{channel: ChannelResponse, recentVideos: VideoResponse[], stats: {subscribers, totalViews, videoCount, avgViewsPerVideo}}`

### `compareChannels(channelIds)`

并排比较多个 YouTube 频道。返回按订阅者数量排序的频道。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `channelIds` | `string[]` | 必需 | 要比较的频道 ID 数组 |

**返回：** `Promise<{channels: [{id, title, subscribers, views, videoCount, viewsPerVideo}], summary: {totalChannels, totalSubscribers, totalViews, topBySubscribers}}>`

### `analyzeVideo(videoId)`

分析单个视频的表现及参与度指标。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `videoId` | `string` | 必需 | YouTube 视频 ID |

**返回：** `Promise<VideoAnalysis>` — `{video: VideoResponse, engagement: {views, likes, comments, likeRate, commentRate}}`

### `searchAndAnalyze(query, maxResults?)`

搜索视频并获取每个结果的完整统计信息。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `query` | `string` | 必需 | 搜索查询 |
| `maxResults` | `number` | `10` | 结果数量 |

**返回：** `Promise<{query, videos: [{id, title, channelTitle, views, likes, comments, publishedAt}]}>`

---

## 存储

导入：`from './core/storage.js'`

### `saveResult<T>(data, category, operation, name?)`

将结果数据保存到带元数据包装器的 JSON 文件。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `data` | `T` | 必需 | 要保存的数据 |
| `category` | `string` | 必需 | 类别目录（例如 `"channels"`、`"videos"`） |
| `operation` | `string` | 必需 | 操作名称（例如 `"channel_analysis"`） |
| `name` | `string` | `undefined` | 文件名的可选名称 |

**返回：** `string` — 保存文件的完整路径

### `loadResult<T>(filepath)`

从 JSON 文件加载先前保存的结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `filepath` | `string` | 必需 | JSON 文件的路径 |

**返回：** `SavedResult<T> | null`

### `listResults(category, limit?)`

列出某个类别的保存结果文件，按最新排序。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `category` | `string` | 必需 | 要列出的类别 |
| `limit` | `number` | `undefined` | 返回的最大结果数 |

**返回：** `string[]` — 文件路径数组

### `getLatestResult<T>(category, operation?)`

获取某个类别最近的结果，可选择按操作名称过滤。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `category` | `string` | 必需 | 要搜索的类别 |
| `operation` | `string` | `undefined` | 按操作名称过滤 |

**返回：** `SavedResult<T> | null`