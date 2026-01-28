/**
 * 设置模块 - YouTube Data API v3 的环境配置
 * 
 * 此模块负责从环境变量加载配置
 * 支持从 .env 文件加载配置，并提供验证功能
 */

import { config } from 'dotenv';
import { join } from 'path';

// 从当前工作目录加载 .env 文件
config();

/**
 * YouTube API 配置接口
 */
export interface Settings {
  /** YouTube Data API v3 密钥 */
  apiKey: string;
  /** 列表查询的默认最大结果数 */
  defaultMaxResults: number;
  /** 存储结果的目录路径 */
  resultsDir: string;
}

/**
 * validateSettings() 的验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
}

/**
 * 从环境变量获取当前设置
 * 
 * @returns Settings 对象，包含所有配置项
 * 
 * 从环境变量读取 YouTube API 配置
 */
export function getSettings(): Settings {
  return {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    defaultMaxResults: parseInt(process.env.YOUTUBE_DEFAULT_MAX_RESULTS || '50', 10),
    resultsDir: join(process.cwd(), 'results'),
  };
}

/**
 * 验证所有必需设置是否存在
 * 
 * @returns ValidationResult，包含验证结果和任何错误信息
 * 
 * 检查必需的环境变量是否已设置
 * 如果缺少必需的设置，会返回详细的错误列表
 */
export function validateSettings(): ValidationResult {
  const settings = getSettings();
  const errors: string[] = [];

  // 验证 API 密钥
  if (!settings.apiKey) {
    errors.push('YOUTUBE_API_KEY 是必需的');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}