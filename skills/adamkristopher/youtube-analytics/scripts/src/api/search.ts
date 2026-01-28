/**
 * 搜索 API - YouTube 搜索功能
 */

import { getClient } from '../core/client.js';
import { saveResult } from '../core/storage.js';
import { getSettings } from '../config/settings.js';

/**
 * 搜索选项配置
 */
export interface SearchOptions {
  /** 最大结果数（默认: 50） */
  maxResults?: number;
  /** 发布之后（ISO 日期，例如 "2024-01-01T00:00:00Z"） */
  publishedAfter?: string;
  /** 发布之前（ISO 日期） */
  publishedBefore?: string;
  /** 排序方式 */
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  /** 是否将结果保存到文件（默认: true） */
  save?: boolean;
}

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  /** 资源 ID */
  id: {
    /** 资源类型 */
    kind: string;
    /** 视频 ID（搜索视频时） */
    videoId?: string;
    /** 频道 ID（搜索频道时） */
    channelId?: string;
    /** 播放列表 ID（搜索播放列表时） */
    playlistId?: string;
  };
  /** 资源片段信息 */
  snippet: {
    /** 标题 */
    title: string;
    /** 描述 */
    description: string;
    /** 发布时间（ISO 格式） */
    publishedAt: string;
    /** 频道 ID */
    channelId: string;
    /** 频道标题 */
    channelTitle: string;
    /** 缩略图 */
    thumbnails?: {
      /** 默认尺寸 */
      default?: { url: string };
      /** 中等尺寸 */
      medium?: { url: string };
      /** 高清尺寸 */
      high?: { url: string };
    };
  };
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  /** 搜索结果项列表 */
  items: SearchResultItem[];
  /** 分页信息 */
  pageInfo?: {
    /** 总结果数 */
    totalResults: number;
    /** 每页结果数 */
    resultsPerPage: number;
  };
  /** 下一页令牌 */
  nextPageToken?: string;
  /** 上一页令牌 */
  prevPageToken?: string;
}

/**
 * 搜索视频
 * 
 * @param query 搜索查询字符串
 * @param options 可选设置
 * @returns 搜索结果
 * 
 * 使用示例:
 * ```typescript
 * const results = await searchVideos('python 教程', {
 *   maxResults: 10,
 *   order: 'viewCount'
 * });
 * for (const item of results.items) {
 *   console.log(item.snippet.title);
 * }
 * ```
 */
export async function searchVideos(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const settings = getSettings();
  const {
    maxResults = settings.defaultMaxResults,
    publishedAfter,
    publishedBefore,
    order = 'relevance',
    save = true,
  } = options;

  const client = getClient();

  const response = await client.search.list({
    q: query,
    type: ['video'],
    part: ['snippet'],
    maxResults,
    order,
    ...(publishedAfter && { publishedAfter }),
    ...(publishedBefore && { publishedBefore }),
  });

  const result: SearchResponse = {
    items: (response.data.items || []).map(item => ({
      id: {
        kind: item.id?.kind || '',
        videoId: item.id?.videoId,
        channelId: item.id?.channelId,
        playlistId: item.id?.playlistId,
      },
      snippet: {
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || '',
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        thumbnails: item.snippet?.thumbnails as SearchResultItem['snippet']['thumbnails'],
      },
    })),
    pageInfo: response.data.pageInfo as SearchResponse['pageInfo'],
    nextPageToken: response.data.nextPageToken || undefined,
    prevPageToken: response.data.prevPageToken || undefined,
  };

  if (save) {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    saveResult(result, 'search', 'videos', sanitizedQuery);
  }

  return result;
}

/**
 * 搜索频道
 * 
 * @param query 搜索查询字符串
 * @param options 可选设置
 * @returns 搜索结果
 * 
 * 使用示例:
 * ```typescript
 * const results = await searchChannels('编程教学');
 * for (const item of results.items) {
 *   console.log(item.snippet.title);
 * }
 * ```
 */
export async function searchChannels(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const settings = getSettings();
  const {
    maxResults = settings.defaultMaxResults,
    order = 'relevance',
    save = true,
  } = options;

  const client = getClient();

  const response = await client.search.list({
    q: query,
    type: ['channel'],
    part: ['snippet'],
    maxResults,
    order,
  });

  const result: SearchResponse = {
    items: (response.data.items || []).map(item => ({
      id: {
        kind: item.id?.kind || '',
        videoId: item.id?.videoId,
        channelId: item.id?.channelId,
        playlistId: item.id?.playlistId,
      },
      snippet: {
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || '',
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        thumbnails: item.snippet?.thumbnails as SearchResultItem['snippet']['thumbnails'],
      },
    })),
    pageInfo: response.data.pageInfo as SearchResponse['pageInfo'],
    nextPageToken: response.data.nextPageToken || undefined,
    prevPageToken: response.data.prevPageToken || undefined,
  };

  if (save) {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    saveResult(result, 'search', 'channels', sanitizedQuery);
  }

  return result;
}