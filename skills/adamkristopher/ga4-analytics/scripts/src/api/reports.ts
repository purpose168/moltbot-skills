/**
 * 报告 API - 标准 GA4 报告生成
 * 
 * 此模块提供与 Google Analytics 4 Data API 的交互
 * 用于生成各种标准的网站分析报告
 */

import { getClient, getPropertyId } from '../core/client.js';
import { saveResult } from '../core/storage.js';
import { getSettings } from '../config/settings.js';

/**
 * 日期范围配置
 */
export interface DateRange {
  /** 开始日期（ISO 格式或 GA4 相对格式，如 "30daysAgo"） */
  startDate: string;
  /** 结束日期（ISO 格式或 "today"） */
  endDate: string;
}

/**
 * 报告选项
 */
export interface ReportOptions {
  /** 维度列表（例如 ['pagePath', 'pageTitle']） */
  dimensions: string[];
  /** 指标列表（例如 ['screenPageViews', 'activeUsers']） */
  metrics: string[];
  /** 日期范围，可为简写格式（如 "30d"）或显式日期对象 */
  dateRange?: string | DateRange;
  /** 维度过滤器 */
  filters?: Record<string, string>;
  /** 排序方式 */
  orderBy?: string[];
  /** 结果数量限制 */
  limit?: number;
  /** 是否保存结果到文件（默认: true） */
  save?: boolean;
}

/**
 * 报告响应结构
 */
export interface ReportResponse {
  /** 维度标题 */
  dimensionHeaders?: Array<{ name: string }>;
  /** 指标标题 */
  metricHeaders?: Array<{ name: string }>;
  /** 数据行 */
  rows?: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
  /** 总行数 */
  rowCount?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 解析简写日期范围（如 "7d"、"30d"）为 GA4 日期范围格式
 * 
 * @param range 简写日期范围或日期对象
 * @returns GA4 格式的日期范围对象
 * 
 * 支持的格式：
 * - "7d"、"30d"、"90d" 等简写格式
 * - DateRange 对象（直接返回）
 * - 未定义时使用默认日期范围（30天）
 */
export function parseDateRange(range: string | DateRange | undefined): DateRange {
  // 如果未提供范围，使用默认设置
  if (!range) {
    const settings = getSettings();
    range = settings.defaultDateRange;
  }

  // 如果已经是对象，直接返回
  if (typeof range === 'object') {
    return range;
  }

  // 解析简写格式，如 "7d"、"30d"
  const match = range.match(/^(\d+)d$/);
  if (match) {
    const days = parseInt(match[1], 10);
    return {
      startDate: `${days}daysAgo`,
      endDate: 'today',
    };
  }

  // 默认返回 30 天
  return {
    startDate: '30daysAgo',
    endDate: 'today',
  };
}

/**
 * 运行自定义 GA4 报告
 * 
 * @param options 报告选项对象
 * @returns 报告响应数据
 * 
 * 此函数是 GA4 API 的核心函数，允许灵活指定维度和指标
 * 自动处理日期范围解析和结果保存
 */
export async function runReport(options: ReportOptions): Promise<ReportResponse> {
  const {
    dimensions,
    metrics,
    dateRange,
    filters,
    orderBy,
    limit,
    save = true,
  } = options;

  // 获取客户端和属性 ID
  const client = getClient();
  const property = getPropertyId();
  const parsedDateRange = parseDateRange(dateRange);

  // 构建请求对象
  const request = {
    property,
    dateRanges: [parsedDateRange],
    dimensions: dimensions.map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    ...(limit && { limit }),
  };

  // 执行报告请求
  const [response] = await client.runReport(request);

  // 如果需要保存，保存结果
  if (save) {
    const operation = dimensions.join('_') || 'custom';
    const extra = typeof dateRange === 'string' ? dateRange : undefined;
    saveResult(response, 'reports', operation, extra);
  }

  return response as ReportResponse;
}

/**
 * 获取页面浏览量数据
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含页面路径、标题、浏览量和用户数的报告响应
 */
export async function getPageViews(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['pagePath', 'pageTitle'],
    metrics: ['screenPageViews', 'activeUsers', 'averageSessionDuration'],
    dateRange,
  });
}

/**
 * 获取流量来源数据
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含来源、媒介和广告系列数据的报告响应
 */
export async function getTrafficSources(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['sessionSource', 'sessionMedium', 'sessionCampaignName'],
    metrics: ['sessions', 'activeUsers', 'newUsers', 'bounceRate'],
    dateRange,
  });
}

/**
 * 获取用户人口统计数据（国家、设备、浏览器）
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含用户分布数据的报告响应
 */
export async function getUserDemographics(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['country', 'deviceCategory', 'browser'],
    metrics: ['activeUsers', 'sessions', 'newUsers'],
    dateRange,
  });
}

/**
 * 获取事件计数数据
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含事件名称和计数数据的报告响应
 */
export async function getEventCounts(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['eventName'],
    metrics: ['eventCount', 'eventCountPerUser', 'activeUsers'],
    dateRange,
  });
}

/**
 * 获取转化数据
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含事件名称、来源和转化数据的报告响应
 */
export async function getConversions(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['eventName', 'sessionSource'],
    metrics: ['conversions', 'totalRevenue'],
    dateRange,
  });
}

/**
 * 获取电商收入数据
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含日期、交易 ID 和收入数据的报告响应
 */
export async function getEcommerceRevenue(dateRange?: string | DateRange): Promise<ReportResponse> {
  return runReport({
    dimensions: ['date', 'transactionId'],
    metrics: ['totalRevenue', 'ecommercePurchases', 'averagePurchaseRevenue'],
    dateRange,
  });
}