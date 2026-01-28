/**
 * 实时 API - GA4 实时数据
 * 
 * 此模块提供与 Google Analytics 4 实时报告 API 的交互
 * 用于获取网站上当前的实时活动数据
 */

import { getClient, getPropertyId } from '../core/client.js';
import { saveResult } from '../core/storage.js';

/**
 * 实时报告响应结构
 */
export interface RealtimeResponse {
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
}

/**
 * 获取当前活跃用户数
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含当前活跃用户及其浏览页面的实时响应
 */
export async function getActiveUsers(save = true): Promise<RealtimeResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 运行实时报告，按页面名称分组
  const [response] = await client.runRealtimeReport({
    property,
    dimensions: [{ name: 'unifiedScreenName' }],
    metrics: [{ name: 'activeUsers' }],
  });

  // 保存结果（如果需要）
  if (save) {
    saveResult(response, 'realtime', 'active_users');
  }

  return response as RealtimeResponse;
}

/**
 * 获取当前事件数据
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含当前触发事件的实时响应
 */
export async function getRealtimeEvents(save = true): Promise<RealtimeResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 运行实时报告，按事件名称分组
  const [response] = await client.runRealtimeReport({
    property,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
  });

  // 保存结果（如果需要）
  if (save) {
    saveResult(response, 'realtime', 'events');
  }

  return response as RealtimeResponse;
}

/**
 * 获取当前正在查看的页面
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含当前浏览页面的实时响应
 */
export async function getRealtimePages(save = true): Promise<RealtimeResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 运行实时报告，按页面名称分组
  const [response] = await client.runRealtimeReport({
    property,
    dimensions: [{ name: 'unifiedScreenName' }],
    metrics: [{ name: 'screenPageViews' }],
  });

  // 保存结果（如果需要）
  if (save) {
    saveResult(response, 'realtime', 'pages');
  }

  return response as RealtimeResponse;
}

/**
 * 获取实时流量来源
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含当前流量来源分布的实时响应
 */
export async function getRealtimeSources(save = true): Promise<RealtimeResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 运行实时报告，按来源和媒介分组
  const [response] = await client.runRealtimeReport({
    property,
    dimensions: [{ name: 'firstUserSource' }, { name: 'firstUserMedium' }],
    metrics: [{ name: 'activeUsers' }],
  });

  // 保存结果（如果需要）
  if (save) {
    saveResult(response, 'realtime', 'sources');
  }

  return response as RealtimeResponse;
}