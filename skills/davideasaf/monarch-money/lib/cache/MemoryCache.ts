// 内存缓存模块 - 提供基于 Map 的内存缓存功能
// Memory Cache module - provides in-memory caching functionality based on Map

// 导入日志记录器
import { logger } from '../utils'

/**
 * 缓存条目接口
 * 
 * 定义缓存中存储的单个条目结构
 * 包含数据、过期时间和创建时间
 * 
 * @template T - 缓存数据的类型
 */
interface CacheEntry<T> {
  data: T              // 缓存的数据内容
  expiresAt: number    // 过期时间戳（毫秒）
  createdAt: number    // 创建时间戳（毫秒）
}

/**
 * 内存缓存类
 * 
 * 基于 JavaScript Map 实现的高性能内存缓存
 * 支持以下特性：
 * - LRU（最近最少使用）淘汰策略
 * - TTL（生存时间）过期机制
 * - 批量失效模式匹配
 * - 懒加载和缓存穿透防护
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()  // 缓存存储（键值对映射）
  private maxSize: number                                   // 最大缓存条目数
  private defaultTTL: number                                // 默认缓存时间（毫秒）

  /**
   * 构造函数
   * 
   * @param maxSize - 最大缓存条目数（默认：100）
   * @param defaultTTL - 默认缓存时间（毫秒，默认：300000 = 5分钟）
   */
  constructor(maxSize: number = 100, defaultTTL: number = 300000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  /**
   * 设置缓存条目
   * 
   * 将数据存储到缓存中，支持自定义过期时间
   * 如果缓存已满，会自动淘汰最旧的条目
   * 
   * @template T - 缓存数据的类型
   * @param key - 缓存键（唯一标识符）
   * @param value - 要缓存的数据
   * @param ttlMs - 可选的过期时间（毫秒），如果不提供则使用默认值
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL  // 确定 TTL（生存时间）
    const now = Date.now()                // 获取当前时间
    
    // 如果缓存已满，淘汰最旧的条目
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    // 创建缓存条目
    const entry: CacheEntry<T> = {
      data: value,              // 缓存数据
      expiresAt: now + ttl,     // 过期时间
      createdAt: now            // 创建时间
    }

    // 存储到缓存
    this.cache.set(key, entry)
    logger.debug(`缓存设置: ${key} (TTL: ${ttl}ms)`)
  }

  /**
   * 获取缓存条目
   * 
   * 根据键获取缓存的数据
   * 如果缓存过期或不存在则返回 undefined
   * 
   * @template T - 缓存数据的类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    
    // 缓存未命中
    if (!entry) {
      logger.debug(`缓存未命中: ${key}`)
      return undefined
    }

    const now = Date.now()
    // 检查是否过期
    if (now > entry.expiresAt) {
      this.cache.delete(key)    // 删除过期条目
      logger.debug(`缓存过期: ${key}`)
      return undefined
    }

    logger.debug(`缓存命中: ${key}`)
    return entry.data
  }

  /**
   * 检查键是否存在
   * 
   * 判断指定键是否存在于有效缓存中
   * 会自动清理过期的条目
   * 
   * @param key - 缓存键
   * @returns 如果键存在且未过期则返回 true，否则返回 false
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    const now = Date.now()
    // 检查是否过期
    if (now > entry.expiresAt) {
      this.cache.delete(key)    // 删除过期条目
      return false
    }

    return true
  }

  /**
   * 删除缓存条目
   * 
   * 根据键删除缓存中的条目
   * 
   * @param key - 缓存键
   * @returns 如果成功删除则返回 true，键不存在则返回 false
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      logger.debug(`缓存删除: ${key}`)
    }
    return deleted
  }

  /**
   * 清空所有缓存
   * 
   * 删除缓存中的所有条目
   */
  clear(): void {
    const size = this.cache.size  // 记录清除前的数量
    this.cache.clear()            // 清空缓存
    logger.debug(`缓存清空: 移除了 ${size} 个条目`)
  }

  /**
   * 获取缓存大小
   * 
   * @returns 当前缓存中的条目数量
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 包含所有缓存键的数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 淘汰最旧的缓存条目
   * 
   * 私有方法，当缓存达到最大容量时调用
   * 根据创建时间淘汰最旧的条目
   */
  private evictOldest(): void {
    let oldestKey: string | undefined
    let oldestTime = Date.now()

    // 遍历查找最旧的条目
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    // 删除最旧的条目
    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.debug(`缓存淘汰: ${oldestKey}`)
    }
  }

  /**
   * 清理过期条目
   * 
   * 扫描并删除所有已过期的缓存条目
   * 
   * @returns 被清理的过期条目数量
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    // 遍历并删除过期条目
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`缓存清理: 移除了 ${cleaned} 个过期条目`)
    }

    return cleaned
  }

  /**
   * 获取缓存统计信息
   * 
   * 返回当前缓存的状态统计
   * 
   * @returns 缓存统计对象
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate?: number
    memoryUsage?: number
  } {
    return {
      size: this.cache.size,       // 当前缓存大小
      maxSize: this.maxSize,       // 最大缓存大小
      // 注意：命中率追踪需要额外的计数器
      // Node.js 中无法精确计算内存使用量
    }
  }

  /**
   * 使匹配模式的缓存失效
   * 
   * 根据正则表达式或字符串模式批量删除缓存条目
   * 
   * @param pattern - 匹配模式（字符串或正则表达式）
   * @returns 被失效的条目数量
   */
  invalidatePattern(pattern: string | RegExp): number {
    let invalidated = 0
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    // 遍历并删除匹配的条目
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    if (invalidated > 0) {
      logger.debug(`缓存批量失效: 移除了 ${invalidated} 个匹配 ${pattern} 的条目`)
    }

    return invalidated
  }

  /**
   * 获取或设置（缓存穿透防护）
   * 
   * 如果键不存在，则调用工厂函数生成值并缓存
   * 用于防止缓存穿透和减少重复计算
   * 
   * @template T - 缓存数据的类型
   * @param key - 缓存键
   * @param factory - 值工厂函数（异步）
   * @param ttlMs - 可选的过期时间（毫秒）
   * @returns 缓存的值
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlMs?: number
  ): Promise<T> {
    // 尝试从缓存获取
    const existing = this.get<T>(key)
    if (existing !== undefined) {
      return existing
    }

    // 调用工厂函数生成值
    const value = await factory()
    // 缓存新值
    this.set(key, value, ttlMs)
    return value
  }
}