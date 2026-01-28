# API 参考

GA4 分析工具包的所有函数的完整参考。

## 目录

- [报告 API](#报告-api)（7个函数）
- [实时 API](#实时-api)（4个函数）
- [元数据 API](#元数据-api)（3个函数）
- [Search Console API](#search-console-api)（6个函数）
- [索引 API](#索引-api)（4个函数）
- [批量查询 API](#批量查询-api)（3个函数）
- [存储](#存储)（4个函数）

---

## 报告 API

导入：`from './api/reports.js'`

### `parseDateRange(range?)`

解析简写日期范围（例如 "7d"、"30d"）为 GA4 日期范围格式。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `range` | `string \| DateRange \| undefined` | 设置默认值 | 要解析的日期范围 |

**返回：** `DateRange` — `{startDate: string, endDate: string}`

### `runReport(options)`

使用任意维度和指标运行自定义 GA4 报告。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `options.dimensions` | `string[]` | 必需 | GA4 维度名称 |
| `options.metrics` | `string[]` | 必需 | GA4 指标名称 |
| `options.dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |
| `options.filters` | `Record<string, string>` | `undefined` | 维度过滤器 |
| `options.orderBy` | `string[]` | `undefined` | 排序顺序 |
| `options.limit` | `number` | `undefined` | 行数限制 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<ReportResponse>` — 带有维度和指标值的行

### `getPageViews(dateRange?)`

获取页面浏览量数据，包括路径、标题、用户和会话持续时间。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `pagePath`、`pageTitle`
**指标：** `screenPageViews`、`activeUsers`、`averageSessionDuration`

### `getTrafficSources(dateRange?)`

按来源、媒介和广告系列获取流量来源数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `sessionSource`、`sessionMedium`、`sessionCampaignName`
**指标：** `sessions`、`activeUsers`、`newUsers`、`bounceRate`

### `getUserDemographics(dateRange?)`

按国家、设备和浏览器获取用户人口统计数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `country`、`deviceCategory`、`browser`
**指标：** `activeUsers`、`sessions`、`newUsers`

### `getEventCounts(dateRange?)`

按事件名称获取事件计数数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `eventName`
**指标：** `eventCount`、`eventCountPerUser`、`activeUsers`

### `getConversions(dateRange?)`

按事件名称和来源获取转化数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `eventName`、`sessionSource`
**指标：** `conversions`、`totalRevenue`

### `getEcommerceRevenue(dateRange?)`

按日期和交易获取电商收入数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |

**维度：** `date`、`transactionId`
**指标：** `totalRevenue`、`ecommercePurchases`、`averagePurchaseRevenue`

---

## 实时 API

导入：`from './api/realtime.js'`

### `getActiveUsers(save?)`

获取当前活跃用户（按屏幕/页面名称）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<RealtimeResponse>` — 按 `unifiedScreenName` 分组的活跃用户

### `getRealtimeEvents(save?)`

获取当前触发的事件。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<RealtimeResponse>` — 按 `eventName` 分组的事件计数

### `getRealtimePages(save?)`

获取当前查看的页面。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<RealtimeResponse>` — 按 `unifiedScreenName` 分组的页面浏览量

### `getRealtimeSources(save?)`

获取当前流量来源。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<RealtimeResponse>` — 按 `firstUserSource` 和 `firstUserMedium` 分组的活跃用户

---

## 元数据 API

导入：`from './api/metadata.js'`

### `getAvailableDimensions(save?)`

获取 GA4 属性的所有可用维度。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<MetadataResponse>` — `{apiName, uiName, description}` 对象的数组

### `getAvailableMetrics(save?)`

获取 GA4 属性的所有可用指标。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<MetadataResponse>` — `{apiName, uiName, description}` 对象的数组

### `getPropertyMetadata(save?)`

获取完整的属性元数据（维度 + 指标组合）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<MetadataResponse>` — 完整的元数据响应

---

## Search Console API

导入：`from './api/searchConsole.js'`

### `querySearchAnalytics(options)`

运行自定义 Search Console 分析查询。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `options.dimensions` | `string[]` | `["query"]` | 维度：`query`、`page`、`device`、`country`、`searchAppearance` |
| `options.dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |
| `options.rowLimit` | `number` | `1000` | 最大行数 |
| `options.startRow` | `number` | `0` | 分页偏移量 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<SearchAnalyticsResponse>` — 带有 `{keys, clicks, impressions, ctr, position}` 的行

### `getTopQueries(dateRange?)`

按点击量获取排名靠前的100个搜索查询。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |

**返回：** `Promise<SearchAnalyticsResponse>`

### `getTopPages(dateRange?)`

按搜索展示获取排名靠前的100个页面。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |

**返回：** `Promise<SearchAnalyticsResponse>`

### `getDevicePerformance(dateRange?)`

按设备类型（桌面、移动、平板）获取搜索表现分布。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |

**返回：** `Promise<SearchAnalyticsResponse>`

### `getCountryPerformance(dateRange?)`

按国家获取搜索表现（前50名）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |

**返回：** `Promise<SearchAnalyticsResponse>`

### `getSearchAppearance(dateRange?)`

获取搜索展示数据（富结果、AMP 等）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `dateRange` | `string \| SearchConsoleDateRange` | `"30d"` | 日期范围 |

**返回：** `Promise<SearchAnalyticsResponse>`

---

## 索引 API

导入：`from './api/indexing.js'`

### `requestIndexing(url, options?)`

请求 Google 重新抓取单个 URL。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `url` | `string` | 必需 | 要请求索引的完整 URL |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<UrlNotificationResult>` — `{url, type: 'URL_UPDATED', notifyTime}`

### `requestIndexingBatch(urls, options?)`

请求重新抓取多个 URL（按顺序处理以避免速率限制）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `urls` | `string[]` | 必需 | URL 数组 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<UrlNotificationResult[]>`

### `removeFromIndex(url, options?)`

请求从 Google 索引中移除 URL。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `url` | `string` | 必需 | 要移除的 URL |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<UrlNotificationResult>` — `{url, type: 'URL_DELETED', notifyTime}`

### `inspectUrl(url, options?)`

检查 URL 的索引状态、移动可用性和富结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `url` | `string` | 必需 | 要检查的 URL |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<UrlInspectionResult>` — 包含 `indexStatus.verdict`（'PASS' | 'FAIL' | 'NEUTRAL'）、`coverageState`、`lastCrawlTime`、`mobileUsability`、`richResults`

---

## 批量查询 API

导入：`from './api/bulk-lookup.js'`

### `normalizeUrls(urls)`

规范化页面路径：修剪空白，添加前导斜杠。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `urls` | `string[]` | 必需 | 页面路径数组 |

**返回：** `string[]` — 规范化后的路径

### `buildUrlFilter(urls)`

为页面路径列表构建 GA4 维度过滤器表达式。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `urls` | `string[]` | 必需 | 规范化的页面路径 |

**返回：** `DimensionFilterExpression | null`

### `getMetricsForUrls(urls, options?)`

获取特定页面路径的 GA4 指标（批量查询）。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `urls` | `string[]` | 必需 | 页面路径（例如 `["/pricing", "/about"]`） |
| `options.dateRange` | `string \| DateRange` | `"30d"` | 日期范围 |
| `options.metrics` | `string[]` | `["screenPageViews", "activeUsers", "averageSessionDuration", "bounceRate", "engagementRate"]` | 要检索的指标 |
| `options.save` | `boolean` | `true` | 将结果保存为 JSON |

**返回：** `Promise<ReportResponse>` — 每个 URL 的指标

---

## 存储

导入：`from './core/storage.js'`

### `saveResult<T>(data, category, operation, extraInfo?)`

将结果数据保存到带元数据包装器的带时间戳的 JSON 文件。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `data` | `T` | 必需 | 要保存的数据 |
| `category` | `string` | 必需 | 类别目录（例如 `"reports"`、`"realtime"`） |
| `operation` | `string` | 必需 | 操作名称（例如 `"page_views"`） |
| `extraInfo` | `string` | `undefined` | 文件名的可选额外信息 |

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