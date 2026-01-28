/**
 * 元数据 API - 可用的维度和指标
 * 
 * 此模块提供获取 GA4 属性支持的维度和指标列表的功能
 * 用于探索可用的分析字段
 */

import { getClient, getPropertyId } from '../core/client.js';
import { saveResult } from '../core/storage.js';

/**
 * 维度元数据
 */
export interface DimensionMetadata {
  /** API 名称 */
  apiName: string;
  /** UI 显示名称 */
  uiName: string;
  /** 描述 */
  description: string;
}

/**
 * 指标元数据
 */
export interface MetricMetadata {
  /** API 名称 */
  apiName: string;
  /** UI 显示名称 */
  uiName: string;
  /** 描述 */
  description: string;
}

/**
 * 完整属性元数据响应
 */
export interface MetadataResponse {
  /** 资源名称 */
  name?: string;
  /** 维度列表 */
  dimensions?: DimensionMetadata[];
  /** 指标列表 */
  metrics?: MetricMetadata[];
}

/**
 * 获取属性的所有可用维度
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含维度列表的元数据响应
 */
export async function getAvailableDimensions(save = true): Promise<MetadataResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 获取元数据
  const [response] = await client.getMetadata({
    name: `${property}/metadata`,
  });

  // 构建结果
  const result = {
    dimensions: response.dimensions || [],
  };

  // 保存结果（如果需要）
  if (save) {
    saveResult(result, 'metadata', 'dimensions');
  }

  return result as MetadataResponse;
}

/**
 * 获取属性的所有可用指标
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含指标列表的元数据响应
 */
export async function getAvailableMetrics(save = true): Promise<MetadataResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 获取元数据
  const [response] = await client.getMetadata({
    name: `${property}/metadata`,
  });

  // 构建结果
  const result = {
    metrics: response.metrics || [],
  };

  // 保存结果（如果需要）
  if (save) {
    saveResult(result, 'metadata', 'metrics');
  }

  return result as MetadataResponse;
}

/**
 * 获取完整属性元数据（维度和指标）
 * 
 * @param save 是否保存结果到文件（默认: true）
 * @returns 包含完整元数据的响应
 */
export async function getPropertyMetadata(save = true): Promise<MetadataResponse> {
  const client = getClient();
  const property = getPropertyId();

  // 获取完整元数据
  const [response] = await client.getMetadata({
    name: `${property}/metadata`,
  });

  // 保存结果（如果需要）
  if (save) {
    saveResult(response, 'metadata', 'full');
  }

  return response as MetadataResponse;
}