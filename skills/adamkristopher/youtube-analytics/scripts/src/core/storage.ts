/**
 * 存储模块 - 自动将结果保存为带元数据的 JSON 文件
 * 
 * 此模块提供将分析结果持久化存储到文件系统的功能
 * 所有结果都会自动保存到 results 目录下，并带有时间戳和操作名称
 * 便于后续查询、分析和比较
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getSettings } from '../config/settings.js';

/**
 * 已保存结果的元数据包装器
 * 
 * 用于记录每次保存操作的元信息，包括保存时间、分类、操作名称等
 */
export interface ResultMetadata {
  /** 保存时间（ISO 格式） */
  savedAt: string;
  /** 结果分类目录名称 */
  category: string;
  /** 操作名称 */
  operation: string;
  /** 可选的名称（频道名、视频标题等） */
  name?: string;
}

/**
 * 带元数据的保存结果
 * 
 * 将数据与其元数据一起包装，便于后续检索和分析
 */
export interface SavedResult<T = unknown> {
  /** 元数据 */
  metadata: ResultMetadata;
  /** 实际数据 */
  data: T;
}

/**
 * 生成用于文件名的 时间戳字符串: YYYYMMDD_HHMMSS
 * 
 * @returns 格式化的时间戳字符串
 * 
 * 使用此格式可以确保文件名按时间排序，新文件排在前面
 */
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * 清理字符串用于文件名
 * 
 * @param str 原始字符串
 * @returns 清理后的字符串，只包含字母、数字、下划线和连字符
 * 
 * 将特殊字符替换为下划线，确保文件名合法
 */
function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * 将结果数据保存到 JSON 文件（带元数据包装器）
 * 
 * @param data 要保存的数据
 * @param category 分类目录名称（例如 'channels', 'videos', 'search'）
 * @param operation 操作名称（例如 'channel_analysis', 'video_stats'）
 * @param name 文件名可选名称（例如频道名、视频标题）
 * @returns 保存文件的完整路径
 * 
 * 此函数自动创建必要的目录结构，并以 JSON 格式保存结果
 */
export function saveResult<T>(
  data: T,
  category: string,
  operation: string,
  name?: string
): string {
  const settings = getSettings();
  const categoryDir = join(settings.resultsDir, category);

  // 确保分类目录存在
  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true });
  }

  // 构建文件名 - 如果提供了名称则使用名称，否则使用操作名+时间戳
  let filename: string;
  if (name) {
    const sanitizedName = sanitizeFilename(name).substring(0, 50);
    filename = `${sanitizedName}.json`;
  } else {
    const timestamp = getTimestamp();
    const sanitizedOperation = sanitizeFilename(operation);
    filename = `${timestamp}__${sanitizedOperation}.json`;
  }
  const filepath = join(categoryDir, filename);

  // 构建包装后的结果
  const result: SavedResult<T> = {
    metadata: {
      savedAt: new Date().toISOString(),
      category,
      operation,
      ...(name && { name }),
    },
    data,
  };

  // 写入文件
  writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');

  return filepath;
}

/**
 * 从 JSON 文件加载保存的结果
 * 
 * @param filepath JSON 文件路径
 * @returns 解析后的结果，如果文件不存在则返回 null
 * 
 * 读取并解析之前保存的 JSON 文件，返回包含数据和元数据的对象
 */
export function loadResult<T = unknown>(filepath: string): SavedResult<T> | null {
  // 检查文件是否存在
  if (!existsSync(filepath)) {
    return null;
  }

  try {
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as SavedResult<T>;
  } catch {
    return null;
  }
}

/**
 * 列出某个分类的保存结果文件
 * 
 * @param category 要列出的分类
 * @param limit 最大返回结果数量
 * @returns 文件路径数组，按日期降序排序（最新在前）
 * 
 * 列出指定分类目录下的所有 JSON 文件，按文件名（时间戳）排序
 */
export function listResults(category: string, limit?: number): string[] {
  const settings = getSettings();
  const categoryDir = join(settings.resultsDir, category);

  // 如果目录不存在，返回空数组
  if (!existsSync(categoryDir)) {
    return [];
  }

  // 读取目录并过滤 JSON 文件
  const files = readdirSync(categoryDir)
    .filter(f => f.endsWith('.json'))
    .map(f => join(categoryDir, f))
    .sort((a, b) => {
      // 按文件名（以时间戳开头）降序排序
      const nameA = a.split('/').pop() || '';
      const nameB = b.split('/').pop() || '';
      return nameB.localeCompare(nameA);
    });

  // 如果指定了限制，返回前 N 个文件
  if (limit !== undefined) {
    return files.slice(0, limit);
  }

  return files;
}

/**
 * 获取某个分类/操作的最新结果
 * 
 * @param category 要搜索的分类
 * @param operation 可选的操作名称过滤
 * @returns 最新的结果，如果不存在则返回 null
 * 
 * 查找指定分类下最新的结果文件，可选择按操作名称过滤
 */
export function getLatestResult<T = unknown>(
  category: string,
  operation?: string
): SavedResult<T> | null {
  let files = listResults(category);

  // 如果指定了操作名称，进行过滤
  if (operation) {
    const sanitized = sanitizeFilename(operation);
    files = files.filter(f => f.includes(`__${sanitized}`));
  }

  // 如果没有找到文件，返回 null
  if (files.length === 0) {
    return null;
  }

  // 加载最新的文件
  return loadResult<T>(files[0]);
}
