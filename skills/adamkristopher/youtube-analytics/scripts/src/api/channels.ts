/**
 * 频道 API - YouTube 频道数据检索
 */

import { getClient } from '../core/client.js';
import { saveResult } from '../core/storage.js';

/**
 * 频道选项配置
 */
export interface ChannelOptions {
  /** 是否将结果保存到文件（默认: true） */
  save?: boolean;
}

/**
 * 标准化后的频道响应数据
 */
export interface ChannelResponse {
  /** 频道 ID */
  id: string;
  /** 频道标题 */
  title: string;
  /** 频道描述 */
  description: string;
  /** 自定义 URL */
  customUrl?: string;
  /** 创建时间（ISO 格式） */
  publishedAt: string;
  /** 国家/地区 */
  country?: string;
  /** 缩略图 */
  thumbnails?: {
    /** 默认尺寸 */
    default?: { url: string };
    /** 中等尺寸 */
    medium?: { url: string };
    /** 高清尺寸 */
    high?: { url: string };
  };
  /** 统计数据 */
  statistics: {
    /** 总浏览量 */
    viewCount: string;
    /** 订阅者数量 */
    subscriberCount: string;
    /** 视频数量 */
    videoCount: string;
  };
  /** 上传播放列表 ID */
  uploadsPlaylistId?: string;
}

/**
 * 简化后的频道统计数据
 */
export interface ChannelStats {
  /** 订阅者数量 */
  subscribers: number;
  /** 总浏览量 */
  views: number;
  /** 视频数量 */
  videoCount: number;
}

/**
 * 通过 ID 获取频道详情
 * 
 * @param channelId YouTube 频道 ID（以 UC 开头）
 * @param options 可选设置
 * @returns 频道数据
 * 
 * 使用示例:
 * ```typescript
 * const channel = await getChannel('UC_x5XG1OV2P6uZZ5FSM9Ttw');
 * console.log(channel.title); // 频道名称
 * console.log(channel.statistics.subscriberCount); // 订阅者数量
 * ```
 */
export async function getChannel(channelId: string, options: ChannelOptions = {}): Promise<ChannelResponse> {
  const { save = true } = options;

  const client = getClient();

  const response = await client.channels.list({
    id: [channelId],
    part: ['snippet', 'statistics', 'contentDetails'],
  });

  const item = response.data.items?.[0];
  if (!item) {
    throw new Error(`未找到频道: ${channelId}`);
  }

  const result: ChannelResponse = {
    id: item.id || channelId,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    customUrl: item.snippet?.customUrl,
    publishedAt: item.snippet?.publishedAt || '',
    country: item.snippet?.country,
    thumbnails: item.snippet?.thumbnails as ChannelResponse['thumbnails'],
    statistics: {
      viewCount: item.statistics?.viewCount || '0',
      subscriberCount: item.statistics?.subscriberCount || '0',
      videoCount: item.statistics?.videoCount || '0',
    },
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  };

  if (save) {
    saveResult(result, 'channels', 'channel', channelId);
  }

  return result;
}

/**
 * 获取简化后的频道统计
 * 
 * @param channelId YouTube 频道 ID
 * @returns 数字形式的简化统计数据
 * 
 * 使用示例:
 * ```typescript
 * const stats = await getChannelStats('UC_x5XG1OV2P6uZZ5FSM9Ttw');
 * console.log(stats.subscribers); // 订阅者数量（数字）
 * console.log(stats.views); // 总浏览量（数字）
 * ```
 */
export async function getChannelStats(channelId: string): Promise<ChannelStats> {
  const channel = await getChannel(channelId, { save: false });

  return {
    subscribers: parseInt(channel.statistics.subscriberCount, 10),
    views: parseInt(channel.statistics.viewCount, 10),
    videoCount: parseInt(channel.statistics.videoCount, 10),
  };
}

/**
 * 在单个 API 调用中获取多个频道
 * 
 * @param channelIds 频道 ID 数组
 * @param options 可选设置
 * @returns 频道数据数组
 * 
 * 使用示例:
 * ```typescript
 * const channels = await getMultipleChannels([
 *   'UC_x5XG1OV2P6uZZ5FSM9Ttw',
 *   'UC_x5XG1OV2P6uZZ5FSM9Ttw'
 * ]);
 * ```
 */
export async function getMultipleChannels(channelIds: string[], options: ChannelOptions = {}): Promise<ChannelResponse[]> {
  const { save = true } = options;

  const client = getClient();

  const response = await client.channels.list({
    id: channelIds,
    part: ['snippet', 'statistics', 'contentDetails'],
  });

  const results: ChannelResponse[] = (response.data.items || []).map(item => ({
    id: item.id || '',
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    customUrl: item.snippet?.customUrl,
    publishedAt: item.snippet?.publishedAt || '',
    country: item.snippet?.country,
    thumbnails: item.snippet?.thumbnails as ChannelResponse['thumbnails'],
    statistics: {
      viewCount: item.statistics?.viewCount || '0',
      subscriberCount: item.statistics?.subscriberCount || '0',
      videoCount: item.statistics?.videoCount || '0',
    },
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  }));

  if (save) {
    saveResult(results, 'channels', 'multiple_channels');
  }

  return results;
}