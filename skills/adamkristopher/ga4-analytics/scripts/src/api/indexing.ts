/**
 * Indexing API - 请求重新索引和 URL 检查
 * 
 * 此模块提供与 Google Indexing API 的交互
 * 用于请求 Google 重新抓取网页和检查 URL 的索引状态
 */

import { getIndexingClient, getSearchConsoleClient, getSiteUrl } from '../core/client.js';
import { saveResult } from '../core/storage.js';

/**
 * 索引请求选项
 */
export interface IndexingOptions {
  /** 是否保存结果到文件（默认: true） */
  save?: boolean;
}

/**
 * URL 通知结果
 */
export interface UrlNotificationResult {
  /** URL */
  url: string;
  /** 通知类型（URL_UPDATED 或 URL_DELETED） */
  type: 'URL_UPDATED' | 'URL_DELETED';
  /** 通知时间 */
  notifyTime: string;
}

/**
 * URL 检查结果
 */
export interface UrlInspectionResult {
  /** 检查结果链接 */
  inspectionResultLink?: string;
  /** 索引状态详情 */
  indexStatus: {
    /** 审核结果（'PASS' | 'FAIL' | 'NEUTRAL'） */
    verdict: 'PASS' | 'FAIL' | 'NEUTRAL';
    /** 覆盖状态 */
    coverageState: string;
    /** robots.txt 状态 */
    robotsTxtState?: string;
    /** 索引状态 */
    indexingState?: string;
    /** 最后抓取时间 */
    lastCrawlTime?: string;
    /** 页面获取状态 */
    pageFetchState?: string;
    /** Google 规范 URL */
    googleCanonical?: string;
    /** 用户规范 URL */
    userCanonical?: string;
    /** 抓取方式 */
    crawledAs?: string;
  };
  /** 移动端可用性 */
  mobileUsability?: {
    /** 审核结果 */
    verdict: string;
    /** 问题列表 */
    issues?: unknown[];
  };
  /** 富结果 */
  richResults?: {
    /** 审核结果 */
    verdict: string;
    /** 检测到的项目 */
    detectedItems?: unknown[];
  };
}

/**
 * 请求对单个 URL 进行索引（通知 Google 重新抓取）
 * 
 * @param url 要请求索引的 URL
 * @param 可选设置（是否保存到文件等）
 * @returns 带时间戳的通知结果
 */
export async function requestIndexing(url: string, options: IndexingOptions = {}): Promise<UrlNotificationResult> {
  const { save = true } = options;

  const client = getIndexingClient();

  // 发布 URL 更新通知
  const response = await client.urlNotifications.publish({
    requestBody: {
      url,
      type: 'URL_UPDATED',
    },
  });

  // 构建结果对象
  const result: UrlNotificationResult = {
    url: response.data.urlNotificationMetadata?.url || url,
    type: 'URL_UPDATED',
    notifyTime: response.data.urlNotificationMetadata?.latestUpdate?.notifyTime || new Date().toISOString(),
  };

  // 保存结果（如果需要）
  if (save) {
    saveResult(result, 'indexing', 'request_indexing');
  }

  return result;
}

/**
 * 请求对多个 URL 进行索引
 * 
 * @param urls 要请求索引的 URL 数组
 * @param 可选设置
 * @returns 通知结果数组
 * 
 * 按顺序处理 URL 以避免速率限制
 */
export async function requestIndexingBatch(urls: string[], options: IndexingOptions = {}): Promise<UrlNotificationResult[]> {
  const { save = true } = options;

  const results: UrlNotificationResult[] = [];

  // 按顺序处理每个 URL 以避免速率限制
  for (const url of urls) {
    const result = await requestIndexing(url, { save: false });
    results.push(result);
  }

  // 保存结果（如果需要）
  if (save) {
    saveResult(results, 'indexing', 'batch_indexing');
  }

  return results;
}

/**
 * 请求从索引中移除 URL
 * 
 * @param url 要请求移除的 URL
 * @param 可选设置
 * @returns 通知结果
 */
export async function removeFromIndex(url: string, options: IndexingOptions = {}): Promise<UrlNotificationResult> {
  const { save = true } = options;

  const client = getIndexingClient();

  // 发布 URL 删除通知
  const response = await client.urlNotifications.publish({
    requestBody: {
      url,
      type: 'URL_DELETED',
    },
  });

  // 构建结果对象
  const result: UrlNotificationResult = {
    url: response.data.urlNotificationMetadata?.url || url,
    type: 'URL_DELETED',
    notifyTime: response.data.urlNotificationMetadata?.latestRemove?.notifyTime || new Date().toISOString(),
  };

  // 保存结果（如果需要）
  if (save) {
    saveResult(result, 'indexing', 'remove_from_index');
  }

  return result;
}

/**
 * 检查 URL 的索引状态
 * 
 * @param url 要检查的 URL
 * @param 可选设置
 * @returns 包含索引状态的 URL 检查结果
 */
export async function inspectUrl(url: string, options: IndexingOptions = {}): Promise<UrlInspectionResult> {
  const { save = true } = options;

  const client = getSearchConsoleClient();
  const siteUrl = getSiteUrl();

  // 执行 URL 检查
  const response = await client.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: url,
      siteUrl,
    },
  });

  const inspectionResult = response.data.inspectionResult;

  // 构建结果对象
  const result: UrlInspectionResult = {
    inspectionResultLink: inspectionResult?.inspectionResultLink || undefined,
    indexStatus: {
      verdict: (inspectionResult?.indexStatusResult?.verdict as 'PASS' | 'FAIL' | 'NEUTRAL') || 'NEUTRAL',
      coverageState: inspectionResult?.indexStatusResult?.coverageState || 'Unknown',
      robotsTxtState: inspectionResult?.indexStatusResult?.robotsTxtState || undefined,
      indexingState: inspectionResult?.indexStatusResult?.indexingState || undefined,
      lastCrawlTime: inspectionResult?.indexStatusResult?.lastCrawlTime || undefined,
      pageFetchState: inspectionResult?.indexStatusResult?.pageFetchState || undefined,
      googleCanonical: inspectionResult?.indexStatusResult?.googleCanonical || undefined,
      userCanonical: inspectionResult?.indexStatusResult?.userCanonical || undefined,
      crawledAs: inspectionResult?.indexStatusResult?.crawledAs || undefined,
    },
    mobileUsability: inspectionResult?.mobileUsabilityResult
      ? {
          verdict: inspectionResult.mobileUsabilityResult.verdict || 'NEUTRAL',
          issues: inspectionResult.mobileUsabilityResult.issues || [],
        }
      : undefined,
    richResults: inspectionResult?.richResultsResult
      ? {
          verdict: inspectionResult.richResultsResult.verdict || 'NEUTRAL',
          detectedItems: inspectionResult.richResultsResult.detectedItems || [],
        }
      : undefined,
  };

  // 保存结果（如果需要）
  if (save) {
    saveResult(result, 'indexing', 'url_inspection');
  }

  return result;
}