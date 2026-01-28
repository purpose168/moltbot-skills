/**
 * YouTube 分析工具包 - 主入口点
 * 
 * YouTube Data API v3 分析的简单接口。
 * 所有结果都会自动保存到 /results 目录，并带有时间戳。
 * 
 * 使用方法:
 *   import { getChannelStats, searchVideos } from './index.js';
 *   const stats = await getChannelStats('UCxxxxxxxx');
 */

// 重新导出所有 API 函数
export * from './api/channels.js';
export * from './api/videos.js';
export * from './api/search.js';

// 重新导出核心工具函数
export { getClient, getApiKey, resetClient } from './core/client.js';
export { saveResult, loadResult, listResults, getLatestResult } from './core/storage.js';
export { getSettings, validateSettings } from './config/settings.js';

// 导入用于编排函数
import { getChannel, getChannelStats, getMultipleChannels } from './api/channels.js';
import { getVideo, getVideoStats, getMultipleVideos, getChannelVideos } from './api/videos.js';
import { searchVideos } from './api/search.js';
import { saveResult } from './core/storage.js';

// ============================================================================
// 高层编排函数
// ============================================================================

/**
 * 频道分析结果接口
 */
export interface ChannelAnalysis {
  /** 频道详情 */
  channel: Awaited<ReturnType<typeof getChannel>>;
  /** 最近发布的视频 */
  recentVideos: Awaited<ReturnType<typeof getChannelVideos>>;
  /** 统计信息 */
  stats: {
    /** 订阅者数量 */
    subscribers: number;
    /** 总浏览量 */
    totalViews: number;
    /** 视频数量 */
    videoCount: number;
    /** 每视频平均浏览量 */
    avgViewsPerVideo: number;
  };
}

/**
 * 综合频道分析 - 获取频道信息、最近视频和计算统计指标
 * 
 * @param channelId YouTube 频道 ID
 * @returns 频道数据，包含最近视频和计算后的指标
 */
export async function analyzeChannel(channelId: string): Promise<ChannelAnalysis> {
  console.log('\n📺 正在分析频道...');

  console.log('  → 获取频道信息...');
  const channel = await getChannel(channelId, { save: false });

  console.log('  → 获取最近视频...');
  const recentVideos = await getChannelVideos(channelId, { maxResults: 50, save: false });

  // 计算平均浏览量
  const totalVideoViews = recentVideos.reduce(
    (sum, v) => sum + parseInt(v.statistics.viewCount, 10), 
    0
  );
  const avgViewsPerVideo = recentVideos.length > 0 
    ? Math.round(totalVideoViews / recentVideos.length) 
    : 0;

  const result: ChannelAnalysis = {
    channel,
    recentVideos,
    stats: {
      subscribers: parseInt(channel.statistics.subscriberCount, 10),
      totalViews: parseInt(channel.statistics.viewCount, 10),
      videoCount: parseInt(channel.statistics.videoCount, 10),
      avgViewsPerVideo,
    },
  };

  // 使用频道名作为文件名保存
  saveResult(result, 'channels', 'channel_analysis', channel.title);

  console.log('✅ 频道分析完成\n');
  return result;
}

/**
 * 比较多个 YouTube 频道
 * 
 * @param channelIds 要比较的频道 ID 数组
 * @returns 所有频道的比较数据
 */
export async function compareChannels(channelIds: string[]) {
  console.log(`\n📊 正在比较 ${channelIds.length} 个频道...`);

  const channels = await getMultipleChannels(channelIds, { save: false });

  const comparison = channels.map(ch => ({
    id: ch.id,
    title: ch.title,
    subscribers: parseInt(ch.statistics.subscriberCount, 10),
    views: parseInt(ch.statistics.viewCount, 10),
    videoCount: parseInt(ch.statistics.videoCount, 10),
    viewsPerVideo: parseInt(ch.statistics.videoCount, 10) > 0
      ? Math.round(parseInt(ch.statistics.viewCount, 10) / parseInt(ch.statistics.videoCount, 10))
      : 0,
  }));

  // 按订阅者数量降序排序
  comparison.sort((a, b) => b.subscribers - a.subscribers);

  const result = {
    channels: comparison,
    summary: {
      totalChannels: comparison.length,
      totalSubscribers: comparison.reduce((sum, c) => sum + c.subscribers, 0),
      totalViews: comparison.reduce((sum, c) => sum + c.views, 0),
      topBySubscribers: comparison[0]?.title || 'N/A',
    },
  };

  saveResult(result, 'channels', 'channel_comparison');

  console.log('✅ 频道比较完成\n');
  return result;
}

/**
 * 视频分析结果接口
 */
export interface VideoAnalysis {
  /** 视频详情 */
  video: Awaited<ReturnType<typeof getVideo>>;
  /** 参与度指标 */
  engagement: {
    /** 浏览量 */
    views: number;
    /** 点赞数 */
    likes: number;
    /** 评论数 */
    comments: number;
    /** 点赞率 (百分比) */
    likeRate: number;
    /** 评论率 (百分比) */
    commentRate: number;
  };
}

/**
 * 分析单个视频的表现
 * 
 * @param videoId YouTube 视频 ID
 * @returns 视频数据和参与度指标
 */
export async function analyzeVideo(videoId: string): Promise<VideoAnalysis> {
  console.log('\n🎬 正在分析视频...');

  const video = await getVideo(videoId, { save: false });

  const views = parseInt(video.statistics.viewCount, 10);
  const likes = parseInt(video.statistics.likeCount, 10);
  const comments = parseInt(video.statistics.commentCount, 10);

  const result: VideoAnalysis = {
    video,
    engagement: {
      views,
      likes,
      comments,
      likeRate: views > 0 ? parseFloat(((likes / views) * 100).toFixed(2)) : 0,
      commentRate: views > 0 ? parseFloat(((comments / views) * 100).toFixed(4)) : 0,
    },
  };

  // 使用视频标题作为文件名保存
  saveResult(result, 'videos', 'video_analysis', video.title);

  console.log('✅ 视频分析完成\n');
  return result;
}

/**
 * 搜索并分析关键词的热门视频
 * 
 * @param query 搜索查询
 * @param maxResults 结果数量（默认: 10）
 * @returns 搜索结果和视频统计信息
 */
export async function searchAndAnalyze(query: string, maxResults = 10) {
  console.log(`\n🔍 正在搜索 "${query}"...`);

  console.log('  → 搜索视频...');
  const searchResults = await searchVideos(query, { maxResults, save: false });

  const videoIds = searchResults.items
    .filter(item => item.id.videoId)
    .map(item => item.id.videoId as string);

  if (videoIds.length === 0) {
    return { query, videos: [] };
  }

  console.log(`  → 获取 ${videoIds.length} 个视频的统计信息...`);
  const videos = await getMultipleVideos(videoIds, { save: false });

  const result = {
    query,
    videos: videos.map(v => ({
      id: v.id,
      title: v.title,
      channelTitle: v.channelTitle,
      views: parseInt(v.statistics.viewCount, 10),
      likes: parseInt(v.statistics.likeCount, 10),
      comments: parseInt(v.statistics.commentCount, 10),
      publishedAt: v.publishedAt,
    })),
  };

  const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  saveResult(result, 'search', 'search_analysis', sanitizedQuery);

  console.log('✅ 搜索分析完成\n');
  return result;
}

// 直接运行时打印帮助信息
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(`
YouTube 分析工具包
=========================

频道函数:
  - getChannel(channelId)              获取频道详情
  - getChannelStats(channelId)         获取简化统计（订阅者、浏览量、视频数）
  - getMultipleChannels(channelIds)    一次性获取多个频道
  - analyzeChannel(channelId)          完整频道分析（含最近视频）
  - compareChannels(channelIds)        比较多个频道

视频函数:
  - getVideo(videoId)                  获取视频详情
  - getVideoStats(videoId)             获取简化统计（浏览量、点赞、评论）
  - getMultipleVideos(videoIds)        一次性获取多个视频
  - getChannelVideos(channelId)        获取频道的视频列表
  - analyzeVideo(videoId)              完整视频分析（含参与度指标）

搜索函数:
  - searchVideos(query, options?)      搜索视频
  - searchChannels(query, options?)    搜索频道
  - searchAndAnalyze(query)            搜索并获取完整统计

所有结果都会自动保存到 /results 目录。
`);
}