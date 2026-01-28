/**
 * 视频 API - YouTube 视频数据检索
 */

import { getClient } from '../core/client.js';
import { saveResult } from '../core/storage.js';
import { getChannel } from './channels.js';

/**
 * 视频选项配置
 */
export interface VideoOptions {
  /** 是否将结果保存到文件（默认: true） */
  save?: boolean;
}

/**
 * 频道视频选项配置
 */
export interface ChannelVideosOptions {
  /** 最大返回结果数（默认: 50） */
  maxResults?: number;
  /** 是否将结果保存到文件（默认: true） */
  save?: boolean;
}

/**
 * 标准化后的视频响应数据
 */
export interface VideoResponse {
  /** 视频 ID */
  id: string;
  /** 视频标题 */
  title: string;
  /** 视频描述 */
  description: string;
  /** 发布时间（ISO 格式） */
  publishedAt: string;
  /** 频道 ID */
  channelId: string;
  /** 频道标题 */
  channelTitle: string;
  /** 视频标签 */
  tags?: string[];
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
    /** 浏览量 */
    viewCount: string;
    /** 点赞数 */
    likeCount: string;
    /** 评论数 */
    commentCount: string;
  };
  /** 视频时长（ISO 8601 格式） */
  duration?: string;
}

/**
 * 简化后的视频统计数据
 */
export interface VideoStats {
  /** 浏览量 */
  views: number;
  /** 点赞数 */
  likes: number;
  /** 评论数 */
  comments: number;
}

/**
 * 通过 ID 获取视频详情
 * 
 * @param videoId YouTube 视频 ID
 * @param options 可选设置
 * @returns 视频数据
 * 
 * 使用示例:
 * ```typescript
 * const video = await getVideo('dQw4w9WgXcQ');
 * console.log(video.title); // 视频标题
 * console.log(video.statistics.viewCount); // 浏览量
 * ```
 */
export async function getVideo(videoId: string, options: VideoOptions = {}): Promise<VideoResponse> {
  const { save = true } = options;

  const client = getClient();

  const response = await client.videos.list({
    id: [videoId],
    part: ['snippet', 'statistics', 'contentDetails'],
  });

  const item = response.data.items?.[0];
  if (!item) {
    throw new Error(`未找到视频: ${videoId}`);
  }

  const result: VideoResponse = {
    id: item.id || videoId,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    publishedAt: item.snippet?.publishedAt || '',
    channelId: item.snippet?.channelId || '',
    channelTitle: item.snippet?.channelTitle || '',
    tags: item.snippet?.tags,
    thumbnails: item.snippet?.thumbnails as VideoResponse['thumbnails'],
    statistics: {
      viewCount: item.statistics?.viewCount || '0',
      likeCount: item.statistics?.likeCount || '0',
      commentCount: item.statistics?.commentCount || '0',
    },
    duration: item.contentDetails?.duration,
  };

  if (save) {
    saveResult(result, 'videos', 'video', videoId);
  }

  return result;
}

/**
 * 获取简化后的视频统计
 * 
 * @param videoId YouTube 视频 ID
 * @returns 数字形式的简化统计数据
 * 
 * 使用示例:
 * ```typescript
 * const stats = await getVideoStats('dQw4w9WgXcQ');
 * console.log(stats.views); // 浏览量（数字）
 * console.log(stats.likes); // 点赞数（数字）
 * ```
 */
export async function getVideoStats(videoId: string): Promise<VideoStats> {
  const video = await getVideo(videoId, { save: false });

  return {
    views: parseInt(video.statistics.viewCount, 10),
    likes: parseInt(video.statistics.likeCount, 10),
    comments: parseInt(video.statistics.commentCount, 10),
  };
}

/**
 * 在单个 API 调用中获取多个视频
 * 
 * @param videoIds 视频 ID 数组
 * @param options 可选设置
 * @returns 视频数据数组
 * 
 * 使用示例:
 * ```typescript
 * const videos = await getMultipleVideos([
 *   'dQw4w9WgXcQ',
 *   'another_video_id'
 * ]);
 * ```
 */
export async function getMultipleVideos(videoIds: string[], options: VideoOptions = {}): Promise<VideoResponse[]> {
  const { save = true } = options;

  const client = getClient();

  const response = await client.videos.list({
    id: videoIds,
    part: ['snippet', 'statistics', 'contentDetails'],
  });

  const results: VideoResponse[] = (response.data.items || []).map(item => ({
    id: item.id || '',
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    publishedAt: item.snippet?.publishedAt || '',
    channelId: item.snippet?.channelId || '',
    channelTitle: item.snippet?.channelTitle || '',
    tags: item.snippet?.tags,
    thumbnails: item.snippet?.thumbnails as VideoResponse['thumbnails'],
    statistics: {
      viewCount: item.statistics?.viewCount || '0',
      likeCount: item.statistics?.likeCount || '0',
      commentCount: item.statistics?.commentCount || '0',
    },
    duration: item.contentDetails?.duration,
  }));

  if (save) {
    saveResult(results, 'videos', 'multiple_videos');
  }

  return results;
}

/**
 * 从频道的上传播放列表获取视频
 * 
 * @param channelId YouTube 频道 ID
 * @param options 可选设置，包括 maxResults
 * @returns 视频数据数组
 * 
 * 使用示例:
 * ```typescript
 * const videos = await getChannelVideos('UC_x5XG1OV2P6uZZ5FSM9Ttw', {
 *   maxResults: 10
 * });
 * ```
 */
export async function getChannelVideos(channelId: string, options: ChannelVideosOptions = {}): Promise<VideoResponse[]> {
  const { maxResults = 50, save = true } = options;

  const client = getClient();

  // 首先，获取频道的上传播放列表 ID
  const channel = await getChannel(channelId, { save: false });
  const uploadsPlaylistId = channel.uploadsPlaylistId;

  if (!uploadsPlaylistId) {
    throw new Error(`无法找到频道的上传播放列表: ${channelId}`);
  }

  // 获取播放列表项
  const playlistResponse = await client.playlistItems.list({
    playlistId: uploadsPlaylistId,
    part: ['snippet'],
    maxResults,
  });

  // 提取视频 ID
  const videoIds = (playlistResponse.data.items || [])
    .map(item => item.snippet?.resourceId?.videoId)
    .filter((id): id is string => !!id);

  if (videoIds.length === 0) {
    return [];
  }

  // 获取完整的视频详情
  const videos = await getMultipleVideos(videoIds, { save: false });

  if (save) {
    saveResult(videos, 'videos', 'channel_videos', channelId);
  }

  return videos;
}