/**
 * YouTube API 客户端 - YouTube Data API v3 的单例包装器
 * 
 * 此模块提供与 YouTube Data API v3 的连接
 * 使用单例模式确保在整个应用程序中共享相同的客户端实例
 */

import { google, youtube_v3 } from 'googleapis';
import { getSettings, validateSettings } from '../config/settings.js';

// 单例客户端实例
let clientInstance: youtube_v3.Youtube | null = null;

/**
 * 获取 YouTube Data API v3 客户端（单例模式）
 * 
 * @returns YouTube 客户端实例
 * @throws Error 如果凭据无效
 * 
 * 此函数使用单例模式，确保在整个应用程序中只创建一个客户端实例
 * 如果客户端已存在，直接返回现有实例，避免重复创建
 */
export function getClient(): youtube_v3.Youtube {
  // 如果已存在客户端实例，直接返回
  if (clientInstance) {
    return clientInstance;
  }

  // 验证设置是否有效
  const validation = validateSettings();
  if (!validation.valid) {
    throw new Error(`无效的 YouTube 凭据: ${validation.errors.join(', ')}`);
  }

  // 获取配置设置
  const settings = getSettings();

  // 创建新的 YouTube 客户端实例
  clientInstance = google.youtube({
    version: 'v3',
    auth: settings.apiKey,
  });

  return clientInstance;
}

/**
 * 从设置中获取 YouTube API 密钥
 * 
 * @returns API 密钥字符串
 */
export function getApiKey(): string {
  const settings = getSettings();
  return settings.apiKey;
}

/**
 * 重置客户端单例（用于测试）
 * 
 * 此函数将客户端实例设为 null，强制下次调用时重新创建
 * 主要用于测试场景，以确保每次测试都使用新的客户端实例
 */
export function resetClient(): void {
  clientInstance = null;
}