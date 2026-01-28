---
name: ga4-analytics
description: "Google Analytics 4、Search Console 和 Indexing API 工具包。分析网站流量、页面性能、用户人口统计、实时访客、搜索查询和 SEO 指标。当用户要求：检查网站流量、分析页面浏览量、查看流量来源、查看用户人口统计、获取实时访客数据、检查 Search Console 查询、分析 SEO 性能、请求 URL 重新索引、检查索引状态、比较日期范围、查看跳出率、查看转化数据或获取电商收入时使用。需要具有 GA4 和 Search Console 访问权限的 Google Cloud 服务账户。"
---

# GA4 分析工具包

## 设置

安装依赖项：

```bash
cd scripts && npm install
```

通过在项目根目录创建 `.env` 文件来配置凭据：

```
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SEARCH_CONSOLE_SITE_URL=https://your-domain.com
GA4_DEFAULT_DATE_RANGE=30d
```

**先决条件**：需要启用 Analytics Data API、Search Console API 和 Indexing API 的 Google Cloud 项目。还需要对您的 GA4 属性和 Search Console 具有访问权限的服务账户。

## 快速开始

| 用户说 | 要调用的函数 |
|-----------|-----------------|
| "显示最近30天的网站流量" | `siteOverview("30d")` |
| "我排名靠前的搜索查询是什么？" | `searchConsoleOverview("30d")` |
| "网站上现在有哪些人？" | `liveSnapshot()` |
| "重新索引这些 URL" | `reindexUrls(["https://example.com/page1", ...])` |
| "比较本月与上月" | `compareDateRanges({startDate: "30daysAgo", endDate: "today"}, {startDate: "60daysAgo", endDate: "31daysAgo"})` |
| "哪些页面获得最多流量？" | `contentPerformance("30d")` |

通过从 `scripts/src/index.ts` 导入来执行函数：

```typescript
import { siteOverview, searchConsoleOverview } from './scripts/src/index.js';

const overview = await siteOverview('30d');
```

或直接使用 tsx 运行：

```bash
npx tsx scripts/src/index.ts
```

## 工作流程模式

每个分析都遵循三个阶段：

### 1. 分析
运行 API 函数。每次调用都会访问 Google API 并返回结构化数据。

### 2. 自动保存
所有结果会自动保存到 `results/{category}/` 目录下带时间戳的 JSON 文件。文件命名模式：`YYYYMMDD_HHMMSS__operation__extra_info.json`

### 3. 总结
分析后，读取保存的 JSON 文件并在 `results/summaries/` 中创建包含数据表、趋势和建议的 markdown 摘要。

## 高层函数

### GA4 分析

| 函数 | 用途 | 收集内容 |
|----------|---------|----------------|
| `siteOverview(dateRange?)` | 综合网站快照 | 页面浏览量、流量来源、人口统计、事件 |
| `trafficAnalysis(dateRange?)` | 流量深入分析 | 来源、按来源/媒介的会话数、新访客与回访访客 |
| `contentPerformance(dateRange?)` | 热门页面分析 | 页面浏览量、着陆页、退出页 |
| `userBehavior(dateRange?)` | 参与度模式 | 人口统计、事件、每日参与度指标 |
| `compareDateRanges(range1, range2)` | 期间比较 | 两个日期范围的并排指标 |
| `liveSnapshot()` | 实时数据 | 活跃用户、当前页面、当前事件 |

### Search Console

| 函数 | 用途 | 收集内容 |
|----------|---------|----------------|
| `searchConsoleOverview(dateRange?)` | SEO 快照 | 排名靠前的查询、页面、设备、国家分布 |
| `keywordAnalysis(dateRange?)` | 关键词深入分析 | 带设备分布的查询 |
| `seoPagePerformance(dateRange?)` | 页面 SEO 指标 | 按点击量排名靠前的页面、国家分布 |

### 索引

| 函数 | 用途 |
|----------|---------|
| `reindexUrls(urls)` | 请求多个 URL 重新索引 |
| `checkIndexStatus(urls)` | 检查 URL 是否已索引 |

### 工具函数

| 函数 | 用途 |
|----------|---------|
| `getAvailableFields()` | 列出所有可用的 GA4 维度和指标 |

### 单独的 API 函数

要进行细粒度控制，请从 API 模块导入特定函数。请参阅 [references/api-reference.md](references/api-reference.md) 获取包含参数、类型和示例的 30+ API 函数的完整列表。

## 日期范围

所有函数都接受灵活的日期范围格式：

| 格式 | 示例 | 描述 |
|--------|---------|-------------|
| 简写 | `"7d"`、`"30d"`、`"90d"` | 从多少天前到今天 |
| 显式 | `{startDate: "2024-01-01", endDate: "2024-01-31"}` | 特定日期 |
| GA4 相对格式 | `{startDate: "30daysAgo", endDate: "today"}` | GA4 相对格式 |

默认值为 `"30d"`（可通过 `.env` 中的 `GA4_DEFAULT_DATE_RANGE` 配置）。

## 结果存储

结果自动保存到 `results/`，结构如下：

```
results/
├── reports/          # GA4 标准报告
├── realtime/         # 实时快照
├── searchconsole/    # Search Console 数据
├── indexing/         # Indexing API 结果
└── summaries/        # 人类可读的 markdown 摘要
```

### 管理结果

```typescript
import { listResults, loadResult, getLatestResult } from './scripts/src/index.js';

// 列出最近的结果
const files = listResults('reports', 10);

// 加载特定结果
const data = loadResult(files[0]);

// 获取某个操作最近的结果
const latest = getLatestResult('reports', 'site_overview');
```

## 常见维度和指标

### 维度
`pagePath`、`pageTitle`、`sessionSource`、`sessionMedium`、`country`、`deviceCategory`、`browser`、`date`、`eventName`、`landingPage`、`newVsReturning`

### 指标
`screenPageViews`、`activeUsers`、`sessions`、`newUsers`、`bounceRate`、`averageSessionDuration`、`engagementRate`、`conversions`、`totalRevenue`、`eventCount`

## 提示

1. **指定日期范围** — "最近7天"或"最近90天"与默认的30天会给出不同的见解
2. **请求摘要** — 拉取数据后，请求带有表格和见解的 markdown 摘要
3. **比较期间** — 使用 `compareDateRanges()` 发现趋势（本月与上月对比）
4. **检查实时数据** — `liveSnapshot()` 显示网站上现在有哪些人
5. **结合 GA4 + Search Console** — 流量数据加上搜索查询数据给出完整画面