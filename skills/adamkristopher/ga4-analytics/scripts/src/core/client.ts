/**
 * GA4 API 客户端 - BetaAnalyticsDataClient 的单例包装器
 * 同时包含 Search Console 和 Indexing API 客户端
 * 
 * 此模块提供与 Google Analytics 4、Google Search Console 和 Indexing API 的连接
 * 使用单例模式确保在整个应用程序中共享相同的客户端实例
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { searchconsole } from '@googleapis/searchconsole';
import { indexing } from '@googleapis/indexing';
import { google } from 'googleapis';
import { getSettings, validateSettings } from '../config/settings.js';

// 单例客户端实例
let clientInstance: BetaAnalyticsDataClient | null = null;
let searchConsoleClientInstance: ReturnType<typeof searchconsole> | null = null;
let indexingClientInstance: ReturnType<typeof indexing> | null = null;

/**
 * 获取 GA4 Analytics Data API 客户端（单例模式）
 * 
 * @returns BetaAnalyticsDataClient 实例
 * @throws Error 如果凭据无效
 * 
 * 此函数使用单例模式，确保在整个应用程序中只创建一个客户端实例
 * 如果客户端已存在，直接返回现有实例，避免重复创建
 */
export function getClient(): BetaAnalyticsDataClient {
  // 如果已存在客户端实例，直接返回
  if (clientInstance) {
    return clientInstance;
  }

  // 验证设置是否有效
  const validation = validateSettings();
  if (!validation.valid) {
    throw new Error(`GA4 凭据无效: ${validation.errors.join(', ')}`);
  }

  // 获取配置设置
  const settings = getSettings();

  // 创建新的 GA4 客户端实例
  clientInstance = new BetaAnalyticsDataClient({
    credentials: {
      client_email: settings.clientEmail,
      private_key: settings.privateKey,
    },
  });

  return clientInstance;
}

/**
 * 获取用于 API 调用的 GA4 属性 ID
 * 
 * @returns 带 "properties/" 前缀的属性 ID
 * 
 * GA4 API 需要属性 ID 格式为 "properties/PROPERTY_ID"
 * 此函数从设置中获取属性 ID 并添加所需的前缀
 */
export function getPropertyId(): string {
  const settings = getSettings();
  return `properties/${settings.propertyId}`;
}

/**
 * 重置客户端单例（用于测试）
 * 
 * 此函数将所有客户端实例设为 null，强制下次调用时重新创建
 * 主要用于测试场景，以确保每次测试都使用新的客户端实例
 */
export function resetClient(): void {
  clientInstance = null;
  searchConsoleClientInstance = null;
  indexingClientInstance = null;
}

/**
 * 获取用于 Search Console 和 Indexing APIs 的 Google 认证对象
 * 
 * @returns GoogleAuth 实例
 * 
 * 创建一个 GoogleAuth 实例，用于与 Search Console 和 Indexing API 进行身份验证
 * 该认证对象使用服务账户凭据，并请求相应的 API 权限范围
 */
function getGoogleAuth() {
  const settings = getSettings();
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: settings.clientEmail,
      private_key: settings.privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/indexing',
    ],
  });
}

/**
 * 获取 Search Console API 客户端（单例模式）
 * 
 * @returns Search Console 客户端实例
 * @throws Error 如果凭据无效
 * 
 * 此函数返回 Search Console API 的认证客户端
 * 使用单例模式确保只创建一个实例
 */
export function getSearchConsoleClient(): ReturnType<typeof searchconsole> {
  // 如果已存在客户端实例，直接返回
  if (searchConsoleClientInstance) {
    return searchConsoleClientInstance;
  }

  // 验证设置是否有效
  const validation = validateSettings();
  if (!validation.valid) {
    throw new Error(`凭据无效: ${validation.errors.join(', ')}`);
  }

  // 获取 Google 认证并创建 Search Console 客户端
  const auth = getGoogleAuth();
  searchConsoleClientInstance = searchconsole({ version: 'v1', auth });

  return searchConsoleClientInstance;
}

/**
 * 获取 Indexing API 客户端（单例模式）
 * 
 * @returns Indexing 客户端实例
 * @throws Error 如果凭据无效
 * 
 * 此函数返回 Google Indexing API 的认证客户端
 * Indexing API 用于请求 Google 重新抓取和索引网页
 */
export function getIndexingClient(): ReturnType<typeof indexing> {
  // 如果已存在客户端实例，直接返回
  if (indexingClientInstance) {
    return indexingClientInstance;
  }

  // 验证设置是否有效
  const validation = validateSettings();
  if (!validation.valid) {
    throw new Error(`凭据无效: ${validation.errors.join(', ')}`);
  }

  // 获取 Google 认证并创建 Indexing 客户端
  const auth = getGoogleAuth();
  indexingClientInstance = indexing({ version: 'v3', auth });

  return indexingClientInstance;
}

/**
 * 获取 Search Console 站点 URL
 * 
 * @returns 来自设置的站点 URL
 * 
 * 返回配置的 Search Console 站点 URL，用于 Search Console API 调用
 */
export function getSiteUrl(): string {
  const settings = getSettings();
  return settings.siteUrl;
}