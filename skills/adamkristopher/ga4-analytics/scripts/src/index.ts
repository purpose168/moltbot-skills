/**
 * GA4 分析工具包 - 主入口点
 * 
 * Google Analytics 4 数据分析的简单接口。
 * 所有结果都会自动保存到 /results 目录，并带有时间戳。
 * 
 * 使用方法:
 *   import { siteOverview, trafficAnalysis } from './index.js';
 *   const overview = await siteOverview('30d');
 */

// 重新导出所有 API 函数
export * from './api/reports.js';
export * from './api/realtime.js';
export * from './api/metadata.js';
export * from './api/searchConsole.js';
export * from './api/indexing.js';
export * from './api/bulk-lookup.js';

// 重新导出核心工具函数
export { getClient, getPropertyId, getSearchConsoleClient, getIndexingClient, getSiteUrl, resetClient } from './core/client.js';
export { saveResult, loadResult, listResults, getLatestResult } from './core/storage.js';
export { getSettings, validateSettings } from './config/settings.js';

// 导入用于编排函数
import {
  runReport,
  getPageViews,
  getTrafficSources,
  getUserDemographics,
  getEventCounts,
  getConversions,
  parseDateRange,
  type DateRange,
} from './api/reports.js';
import { getActiveUsers, getRealtimeEvents, getRealtimePages } from './api/realtime.js';
import { getPropertyMetadata } from './api/metadata.js';
import { saveResult } from './core/storage.js';
import {
  getTopQueries,
  getTopPages as getSearchConsoleTopPages,
  getDevicePerformance,
  getCountryPerformance,
  type SearchConsoleDateRange,
} from './api/searchConsole.js';
import { requestIndexing, inspectUrl } from './api/indexing.js';

// ============================================================================
// 高层编排函数
// ============================================================================

/**
 * 综合网站概览 - 组合多个报告
 * 
 * 获取网站流量的综合视图，包括页面浏览量、流量来源、用户人口统计和事件数据
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含多个分析结果的对象
 */
export async function siteOverview(dateRange?: string | DateRange) {
  console.log('\n📊 正在生成网站概览...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取页面浏览量...');
  results.pageViews = await getPageViews(dateRange);

  console.log('  → 获取流量来源...');
  results.trafficSources = await getTrafficSources(dateRange);

  console.log('  → 获取用户人口统计...');
  results.demographics = await getUserDemographics(dateRange);

  console.log('  → 获取事件计数...');
  results.events = await getEventCounts(dateRange);

  // 保存组合结果
  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'reports', 'site_overview', dateStr);

  console.log('✅ 网站概览生成完成\n');
  return results;
}

/**
 * 深入分析流量来源
 * 
 * 详细分析网站流量的来源分布，包括来源/媒介、会话和新访客/回访访客
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含流量分析结果的对象
 */
export async function trafficAnalysis(dateRange?: string | DateRange) {
  console.log('\n🚗 正在分析流量来源...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取流量来源...');
  results.sources = await getTrafficSources(dateRange);

  console.log('  → 获取按来源划分的会话数据...');
  results.sessions = await runReport({
    dimensions: ['sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'engagedSessions', 'averageSessionDuration', 'bounceRate'],
    dateRange,
  });

  console.log('  → 获取新访客与回访访客...');
  results.newVsReturning = await runReport({
    dimensions: ['newVsReturning'],
    metrics: ['activeUsers', 'sessions', 'conversions'],
    dateRange,
  });

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'reports', 'traffic_analysis', dateStr);

  console.log('✅ 流量分析完成\n');
  return results;
}

/**
 * 内容效果分析
 * 
 * 分析网页的表现，包括页面浏览量、着陆页和退出页
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含内容分析结果的对象
 */
export async function contentPerformance(dateRange?: string | DateRange) {
  console.log('\n📄 正在分析内容效果...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取页面浏览量...');
  results.pages = await getPageViews(dateRange);

  console.log('  → 获取着陆页...');
  results.landingPages = await runReport({
    dimensions: ['landingPage'],
    metrics: ['sessions', 'activeUsers', 'bounceRate', 'averageSessionDuration'],
    dateRange,
  });

  console.log('  → 获取退出页...');
  results.exitPages = await runReport({
    dimensions: ['pagePath'],
    metrics: ['exits', 'screenPageViews'],
    dateRange,
  });

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'reports', 'content_performance', dateStr);

  console.log('✅ 内容效果分析完成\n');
  return results;
}

/**
 * 用户行为分析
 * 
 * 分析用户的行为模式，包括人口统计、事件和每日参与度指标
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含用户行为分析结果的对象
 */
export async function userBehavior(dateRange?: string | DateRange) {
  console.log('\n👤 正在分析用户行为...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取人口统计...');
  results.demographics = await getUserDemographics(dateRange);

  console.log('  → 获取事件数据...');
  results.events = await getEventCounts(dateRange);

  console.log('  → 获取参与度指标...');
  results.engagement = await runReport({
    dimensions: ['date'],
    metrics: ['activeUsers', 'engagedSessions', 'engagementRate', 'averageSessionDuration'],
    dateRange,
  });

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'reports', 'user_behavior', dateStr);

  console.log('✅ 用户行为分析完成\n');
  return results;
}

/**
 * 比较两个日期范围
 * 
 * 并排比较两个不同时间段的指标，发现趋势和变化
 * 
 * @param range1 第一个日期范围
 * @param range2 第二个日期范围
 * @param dimensions 可选的维度列表，默认为日期
 * @param metrics 可选的指标列表，默认为活跃用户、会话和页面浏览量
 * @returns 包含两个时间段数据的比较结果
 */
export async function compareDateRanges(
  range1: DateRange,
  range2: DateRange,
  dimensions: string[] = ['date'],
  metrics: string[] = ['activeUsers', 'sessions', 'screenPageViews']
) {
  console.log('\n📈 正在比较日期范围...');

  console.log(`  → 获取 ${range1.startDate} 到 ${range1.endDate} 的数据...`);
  const period1 = await runReport({
    dimensions,
    metrics,
    dateRange: range1,
    save: false,
  });

  console.log(`  → 获取 ${range2.startDate} 到 ${range2.endDate} 的数据...`);
  const period2 = await runReport({
    dimensions,
    metrics,
    dateRange: range2,
    save: false,
  });

  const comparison = {
    period1: { dateRange: range1, data: period1 },
    period2: { dateRange: range2, data: period2 },
  };

  saveResult(comparison, 'reports', 'date_comparison');

  console.log('✅ 日期范围比较完成\n');
  return comparison;
}

/**
 * 获取当前实时数据快照
 * 
 * 获取网站上当前的实时数据，包括活跃用户、当前页面和当前事件
 * 
 * @returns 包含实时数据的对象
 */
export async function liveSnapshot() {
  console.log('\n⚡ 正在获取实时数据快照...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取活跃用户...');
  results.activeUsers = await getActiveUsers();

  console.log('  → 获取当前页面...');
  results.currentPages = await getRealtimePages();

  console.log('  → 获取当前事件...');
  results.currentEvents = await getRealtimeEvents();

  saveResult(results, 'realtime', 'snapshot');

  console.log('✅ 实时快照完成\n');
  return results;
}

// ============================================================================
// Search Console 编排函数
// ============================================================================

/**
 * 综合 Search Console 概览
 * 
 * 获取 Search Console 数据的综合视图，包括热门查询、页面、设备分布和国家分布
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含 Search Console 分析结果的对象
 */
export async function searchConsoleOverview(dateRange?: string | SearchConsoleDateRange) {
  console.log('\n🔍 正在生成 Search Console 概览...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取热门查询...');
  results.topQueries = await getTopQueries(dateRange);

  console.log('  → 获取热门页面...');
  results.topPages = await getSearchConsoleTopPages(dateRange);

  console.log('  → 获取设备效果...');
  results.devicePerformance = await getDevicePerformance(dateRange);

  console.log('  → 获取国家效果...');
  results.countryPerformance = await getCountryPerformance(dateRange);

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'searchconsole', 'overview', dateStr);

  console.log('✅ Search Console 概览完成\n');
  return results;
}

/**
 * 深入分析关键词/查询
 * 
 * 分析搜索查询的表现，包括查询和设备分布
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含关键词分析结果的 object
 */
export async function keywordAnalysis(dateRange?: string | SearchConsoleDateRange) {
  console.log('\n🔑 正在分析关键词...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取热门查询...');
  results.queries = await getTopQueries(dateRange);

  console.log('  → 获取查询的设备分布...');
  results.deviceBreakdown = await getDevicePerformance(dateRange);

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'searchconsole', 'keyword_analysis', dateStr);

  console.log('✅ 关键词分析完成\n');
  return results;
}

/**
 * SEO 页面效果分析
 * 
 * 分析页面的 SEO 表现，包括热门页面和国家分布
 * 
 * @param dateRange 可选的日期范围，默认为 30 天
 * @returns 包含 SEO 页面分析结果的 object
 */
export async function seoPagePerformance(dateRange?: string | SearchConsoleDateRange) {
  console.log('\n📄 正在分析 SEO 页面效果...');
  const results: Record<string, unknown> = {};

  console.log('  → 获取按点击量排名的热门页面...');
  results.topPages = await getSearchConsoleTopPages(dateRange);

  console.log('  → 获取国家分布...');
  results.countryBreakdown = await getCountryPerformance(dateRange);

  const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
  saveResult(results, 'searchconsole', 'seo_page_performance', dateStr);

  console.log('✅ SEO 页面效果分析完成\n');
  return results;
}

/**
 * 请求重新索引更新的 URL
 * 
 * 通知 Google 重新抓取和索引指定的 URL
 * 
 * @param urls 要请求重新索引的 URL 数组
 * @returns 包含每个 URL 状态的结果数组
 */
export async function reindexUrls(urls: string[]) {
  console.log(`\n🔄 正在请求重新索引 ${urls.length} 个 URL...`);
  const results: Array<{ url: string; status: string; error?: string }> = [];

  for (const url of urls) {
    try {
      console.log(`  → 请求索引: ${url}`);
      const result = await requestIndexing(url, { save: false });
      results.push({ url, status: '已提交', ...result });
    } catch (error) {
      console.log(`  ✗ 失败: ${url}`);
      results.push({ url, status: '失败', error: String(error) });
    }
  }

  saveResult(results, 'indexing', 'reindex_batch');
  console.log('✅ 重新索引请求完成\n');
  return results;
}

/**
 * 检查 URL 的索引状态
 * 
 * 检查指定 URL 是否已被 Google 索引
 * 
 * @param urls 要检查的 URL 数组
 * @returns 包含每个 URL 索引状态的 result 数组
 */
export async function checkIndexStatus(urls: string[]) {
  console.log(`\n🔎 正在检查 ${urls.length} 个 URL 的索引状态...`);
  const results: Array<{ url: string; indexed: boolean; status: unknown }> = [];

  for (const url of urls) {
    try {
      console.log(`  → 检查: ${url}`);
      const result = await inspectUrl(url, { save: false });
      results.push({
        url,
        indexed: result.indexStatus.verdict === 'PASS',
        status: result.indexStatus,
      });
    } catch (error) {
      console.log(`  ✗ 失败: ${url}`);
      results.push({ url, indexed: false, status: { error: String(error) } });
    }
  }

  saveResult(results, 'indexing', 'index_status_check');
  console.log('✅ 索引状态检查完成\n');
  return results;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取可用的维度和指标
 * 
 * 返回 GA4 属性支持的所有维度和指标的列表
 * 
 * @returns 包含维度和指标元数据的 object
 */
export async function getAvailableFields() {
  console.log('\n📋 正在获取可用字段...');
  const metadata = await getPropertyMetadata();
  console.log(`  → 发现 ${metadata.dimensions?.length || 0} 个维度`);
  console.log(`  → 发现 ${metadata.metrics?.length || 0} 个指标`);
  console.log('✅ 字段获取完成\n');
  return metadata;
}

// 直接运行时打印帮助信息
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(`
GA4 分析工具包
=====================

GA4 高层函数:
  - siteOverview(dateRange?)        综合网站快照
  - trafficAnalysis(dateRange?)     深入分析来源
  - contentPerformance(dateRange?)  热门页面分析
  - userBehavior(dateRange?)        参与度模式
  - compareDateRanges(range1, range2)  期间比较
  - liveSnapshot()                  实时数据

Search Console 函数:
  - searchConsoleOverview(dateRange?)  综合 SEO 快照
  - keywordAnalysis(dateRange?)        查询/关键词分析
  - seoPagePerformance(dateRange?)     页面级 SEO 指标
  - getTopQueries(dateRange?)          热门搜索查询
  - getTopPages(dateRange?)            按点击量排名的热门页面
  - getDevicePerformance(dateRange?)   移动端 vs 桌面端
  - getCountryPerformance(dateRange?)  按国家划分的流量

索引函数:
  - reindexUrls(urls)                  请求重新索引 URL
  - checkIndexStatus(urls)             检查 URL 是否已索引
  - requestIndexing(url)               请求单个 URL 重新抓取
  - inspectUrl(url)                    检查 URL 索引状态

底层 GA4 函数:
  - runReport({ dimensions, metrics, dateRange })
  - getPageViews(dateRange?)
  - getTrafficSources(dateRange?)
  - getUserDemographics(dateRange?)
  - getEventCounts(dateRange?)
  - getActiveUsers()
  - getRealtimeEvents()
  - getPropertyMetadata()

所有结果都会自动保存到 /results 目录。
`);
}