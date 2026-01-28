/**
 * 设置模块 - GA4 API 的环境配置
 * 
 * 此模块负责从环境变量加载配置
 * 支持从 .env 文件加载配置，并提供验证功能
 */

import { config } from 'dotenv';
import { join } from 'path';

// 从当前工作目录加载 .env 文件
config();

/**
 * GA4 API 配置接口
 */
export interface Settings {
  /** GA4 属性 ID */
  propertyId: string;
  /** 服务账户电子邮件 */
  clientEmail: string;
  /** 服务账户私钥 */
  privateKey: string;
  /** 报告默认日期范围（例如 "30d", "7d"） */
  defaultDateRange: string;
  /** 存储结果的目录路径 */
  resultsDir: string;
  /** Search Console 站点 URL（例如 "https://example.com"） */
  siteUrl: string;
}

/**
 * 验证结果接口
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
 * 从环境变量读取 GA4 配置，如果未设置则使用默认值
 * 私钥中的 \n 会被替换为实际换行符
 */
export function getSettings(): Settings {
  return {
    propertyId: process.env.GA4_PROPERTY_ID || '',
    clientEmail: process.env.GA4_CLIENT_EMAIL || '',
    privateKey: (process.env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    defaultDateRange: process.env.GA4_DEFAULT_DATE_RANGE || '30d',
    resultsDir: join(process.cwd(), 'results'),
    siteUrl: process.env.SEARCH_CONSOLE_SITE_URL || '',
  };
}

/**
 * 验证所有必需设置是否存在
 * 
 * @returns ValidationResult，包含验证结果和任何错误信息
 * 
 * 检查所有必需的环境变量是否已设置
 * 如果缺少必需的设置，会返回详细的错误列表
 */
export function validateSettings(): ValidationResult {
  const settings = getSettings();
  const errors: string[] = [];

  // 验证属性 ID
  if (!settings.propertyId) {
    errors.push('GA4_PROPERTY_ID 是必需的');
  }

  // 验证服务账户电子邮件
  if (!settings.clientEmail) {
    errors.push('GA4_CLIENT_EMAIL 是必需的');
  }

  // 验证私钥
  if (!settings.privateKey) {
    errors.push('GA4_PRIVATE_KEY 是必需的');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}