/**
 * Search Console API - Google Search Console 数据检索
 * 
 * 此模块提供与 Google Search Console API 的交互
 * 用于获取网站的搜索性能数据，包括查询、页面、设备和国家分布
 */

import { getSearchConsoleClient, getSiteUrl } from '../core/client.js';
import { saveResult } from '../core/storage.js';
import { getSettings } from '../config/settings.js';

/**
 * Search Console 日期范围配置
 */
export interface SearchConsoleDateRange {
  /** 开始日期（YYYY-MM-DD 格式） */
  startDate: string;
  /** 结束日期（YYYY-MM-DD 格式） */
  endDate: string;
}

/**
 * 搜索分析查询选项
 */
export interface SearchAnalyticsOptions {
  /** 维度列表（例如 ['query', 'page', 'device', 'country']） */
  dimensions?: string[];
  /** 日期范围 */
  dateRange?: string | SearchConsoleDateRange;
  /** 最大行数限制（默认: 1000） */
  rowLimit?: number;
  /** 起始行偏移量（用于分页） */
  startRow?: number;
  /** 是否保存结果到文件（默认: true） */
  save?: boolean;
}

/**
 * 搜索分析数据行结构
 */
export interface SearchAnalyticsRow {
  /** 维度值数组 */
  keys: string[];
  /** 点击次数 */
  clicks: number;
  /** 展示次数 */
  impressions: number;
  /** 点击率 */
  ctr: number;
  /** 平均排名位置 */
  position: number;
}

/**
 * 搜索分析响应结构
 */
export interface SearchAnalyticsResponse {
  /** 数据行列表 */
  rows?: SearchAnalyticsRow[];
  /** 响应聚合类型 */
  responseAggregationType?: string;
}

/**
 * 解析简写日期范围（如 "7d"、"30d"）为 Search Console 日期格式
 * 注意：Search Console 需要 YYYY-MM-DD 格式，而非 GA4 的 "NdaysAgo" 格式
 * 
 * @param range 简写日期范围或日期对象
 * @returns Search Console 格式的日期范围对象
 */
export function parseSearchConsoleDateRange(range: string | SearchConsoleDateRange | undefined): SearchConsoleDateRange {
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  // 默认返回 30 天
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 查询搜索分析数据
 * 
 * @param options 查询选项对象
 * @returns 搜索分析响应数据
 */
export async function querySearchAnalytics(options: SearchAnalyticsOptions): Promise<SearchAnalyticsResponse> {
  const {
    dimensions = ['query'],
    dateRange,
    rowLimit = 1000,
    startRow = 0,
    save = true,
  } = options;

  // 获取客户端和站点 URL
  const client = getSearchConsoleClient();
  const siteUrl = getSiteUrl();
  const parsedDateRange = parseSearchConsoleDateRange(dateRange);

  // 执行查询
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: parsedDateRange.startDate,
      endDate: parsedDateRange.endDate,
      dimensions,
      rowLimit,
      startRow,
    },
  });

  const result = response.data as SearchAnalyticsResponse;

  // 保存结果（如果需要）
  if (save) {
    const operation = dimensions.join('_') || 'query';
    const extra = typeof dateRange === 'string' ? dateRange : undefined;
    saveResult(result, 'searchconsole', operation, extra);
  }

  return result;
}

/**
 * 获取热门搜索查询
 * 
 * @param dateRange 可选的日期范围
 * @returns 按点击量排序的热门查询列表
 */
export async function getTopQueries(dateRange?: string | SearchConsoleDateRange): Promise<SearchAnalyticsResponse> {
  return querySearchAnalytics({
    dimensions: ['query'],
    dateRange,
    rowLimit: 100,
  });
}

/**
 * 获取按搜索效果排名的热门页面
 * 
 * @param dateRange 可选的日期范围
 * @returns 按点击量排序的热门页面列表
 */
export async function getTopPages(dateRange?: string | SearchConsoleDateRange): Promise<SearchAnalyticsResponse> {
  return querySearchAnalytics({
    dimensions: ['page'],
    dateRange,
    rowLimit: 100,
  });
}

/**
 * 获取按设备类型的搜索效果
 * 
 * @param dateRange 可选的日期范围
 * @returns 按设备（桌面、移动、平板）分布的效果数据
 */
export async function getDevicePerformance(dateRange?: string | SearchConsoleDateRange): Promise<SearchAnalyticsResponse> {
  return querySearchAnalytics({
    dimensions: ['device'],
    dateRange,
  });
}

/**
 * 获取按国家的搜索效果
 * 
 * @param dateRange 可选的日期范围
 * @returns 按国家分布的效果数据（前 50 名）
 */
export async function getCountryPerformance(dateRange?: string | SearchConsoleDateRange): Promise<SearchAnalyticsResponse> {
  return querySearchAnalytics({
    dimensions: ['country'],
    dateRange,
    rowLimit: 50,
  });
}

/**
 * 获取搜索展示数据（富结果、AMP 等）
 * 
 * @param dateRange 可选的日期范围
 * @returns 包含 SERP 功能展示情况的数据
 */
export async function getSearchAppearance(dateRange?: string | SearchConsoleDateRange): Promise<SearchAnalyticsResponse> {
  return querySearchAnalytics({
    dimensions: ['searchAppearance'],
    dateRange,
  });
}