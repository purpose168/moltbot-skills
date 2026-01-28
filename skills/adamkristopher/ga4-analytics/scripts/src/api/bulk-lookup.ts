/**
 * 批量 URL 查找 - 获取特定页面的 GA4 指标
 * 
 * 此模块提供了一种便捷的方式来查找特定 URL 列表的分析数据
 * 类似于批量 URL 查找字段的功能
 */

import { getClient, getPropertyId } from '../core/client.js';
import { saveResult } from '../core/storage.js';
import { getSettings } from '../config/settings.js';
import type { ReportResponse, DateRange } from './reports.js';

/**
 * 批量 URL 查找选项
 */
export interface BulkLookupOptions {
  /** 日期范围（例如 "7d"、"30d"）或显式日期 */
  dateRange?: string | DateRange;
  /** 要检索的自定义指标（默认为标准页面指标） */
  metrics?: string[];
  /** 是否将结果保存到文件（默认: true） */
  save?: boolean;
}

/**
 * GA4 API 的维度过滤器表达式
 */
export interface DimensionFilterExpression {
  filter: {
    /** 字段名称 */
    fieldName: string;
    /** 列表过滤器 */
    inListFilter?: {
      /** 值列表 */
      values: string[];
      /** 是否区分大小写 */
      caseSensitive?: boolean;
    };
    /** 字符串过滤器 */
    stringFilter?: {
      /** 匹配类型 */
      matchType: string;
      /** 匹配值 */
      value: string;
      /** 是否区分大小写 */
      caseSensitive?: boolean;
    };
  };
}

/**
 * 批量 URL 查找的默认指标
 */
const DEFAULT_METRICS = [
  'screenPageViews',
  'activeUsers',
  'averageSessionDuration',
  'bounceRate',
  'engagementRate',
];

/**
 * 规范化 URL 以确保格式一致
 * 
 * - 修剪空白
 * - 如果缺少则添加前导斜杠
 * - 保留尾随斜杠
 * 
 * @param urls 要规范化的 URL 数组
 * @returns 规范化后的 URL 数组
 */
export function normalizeUrls(urls: string[]): string[] {
  return urls.map(url => {
    // 修剪空白
    let normalized = url.trim();

    // 如果缺少前导斜杠，添加一个
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized;
  });
}

/**
 * 为给定的 URL 构建维度过滤器表达式
 * 
 * @param urls 要按其过滤的页面路径数组
 * @returns 过滤器表达式，如果没有提供 URL 则返回 null
 */
export function buildUrlFilter(urls: string[]): DimensionFilterExpression | null {
  // 如果没有 URL，返回 null
  if (urls.length === 0) {
    return null;
  }

  return {
    filter: {
      fieldName: 'pagePath',
      inListFilter: {
        values: urls,
        caseSensitive: false,
      },
    },
  };
}

/**
 * 解析简写日期范围（如 "7d"、"30d"）为 GA4 日期范围格式
 * 
 * @param range 简写日期范围或日期对象
 * @returns GA4 格式的日期范围对象
 */
function parseDateRange(range: string | DateRange | undefined): DateRange {
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
 * 获取特定页面的 GA4 指标（批量 URL 查找）
 * 
 * @param urls 要查找的页面路径数组（例如 ['/pricing', '/about']）
 * @param 可选配置
 * @returns 包含指定 URL 指标的报告响应
 * 
 * @示例
 * ```typescript
 * // 获取特定页面的指标
 * const result = await getMetricsForUrls(['/pricing', '/about', '/blog']);
 * 
 * // 使用自定义日期范围和指标
 * const result = await getMetricsForUrls(['/pricing'], {
 *   dateRange: '7d',
 *   metrics: ['sessions', 'bounceRate'],
 * });
 * ```
 */
export async function getMetricsForUrls(
  urls: string[],
  options: BulkLookupOptions = {}
): Promise<ReportResponse> {
  const { dateRange, metrics = DEFAULT_METRICS, save = true } = options;

  // 规范化 URL
  const normalizedUrls = normalizeUrls(urls);

  // 处理空 URL 数组
  if (normalizedUrls.length === 0) {
    return {
      rows: [],
      rowCount: 0,
    };
  }

  // 构建过滤器
  const dimensionFilter = buildUrlFilter(normalizedUrls);

  // 获取客户端和属性
  const client = getClient();
  const property = getPropertyId();
  const parsedDateRange = parseDateRange(dateRange);

  // 构建并执行请求
  const request = {
    property,
    dateRanges: [parsedDateRange],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: metrics.map(name => ({ name })),
    dimensionFilter,
  };

  const [response] = await client.runReport(request);

  // 如果请求保存，则保存结果
  if (save) {
    const dateStr = typeof dateRange === 'string' ? dateRange : 'custom';
    saveResult(response, 'reports', 'bulk_url_lookup', dateStr);
  }

  return response as ReportResponse;
}