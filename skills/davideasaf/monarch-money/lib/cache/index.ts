// 缓存模块 - 提供多级缓存功能
// Cache module - provides multi-level cache functionality

// 导入内存缓存实现
import { MemoryCache } from './MemoryCache'
// 导入持久化缓存实现
import { PersistentCache } from './PersistentCache'
// 导入缓存配置类型
import { CacheConfig } from '../types'
// 导入日志记录器
import { logger } from '../utils'

// 导出内存缓存类
export { MemoryCache } from './MemoryCache'
// 导出持久化缓存类
export { PersistentCache } from './PersistentCache'

/**
 * 缓存接口
 * 
 * 定义缓存的基本操作方法。
 * 支持同步和异步实现。
 * 
 * 泛型参数：
 * - T: 缓存值的类型
 */
export interface CacheInterface<T = unknown> {
  // 设置缓存条目
  set(key: string, value: T, ttlMs?: number): void | Promise<void>
  // 获取缓存条目
  get<U extends T>(key: string): U | undefined | Promise<U | undefined>
  // 检查键是否存在
  has(key: string): boolean | Promise<boolean>
  // 删除缓存条目
  delete(key: string): boolean | Promise<boolean>
  // 清空所有缓存
  clear(): void | Promise<void>
  // 获取缓存大小
  size(): number | Promise<number>
  // 获取所有键
  keys(): string[] | Promise<string[]>
  // 清理过期条目
  cleanup(): number | Promise<number>
  // 使匹配模式的缓存失效
  invalidatePattern(pattern: string | RegExp): number | Promise<number>
  // 获取或设置（如果不存在则调用工厂函数）
  getOrSet<U extends T>(
    key: string,
    factory: () => Promise<U>,
    ttlMs?: number
  ): Promise<U>
}

/**
 * MultiLevelCache 类 - 多级缓存实现
 * 
 * 结合内存缓存和持久化缓存的优势：
 * - 内存缓存：快速访问，适合频繁访问的数据
 * - 持久化缓存：持久存储，适合需要跨会话保留的数据
 * 
 * 特性：
 * 1. 两级缓存查找（内存 -> 持久化）
 * 2. 自动升级（持久化 -> 内存）
 * 3. 智能 TTL 管理
 * 4. 定时清理过期条目
 * 5. 按模式失效缓存
 * 6. 缓存预热支持
 * 
 * 配置项：
 * - memoryTTL: 内存缓存的 TTL 配置
 * - persistentTTL: 持久化缓存的 TTL 配置
 * - autoInvalidate: 是否自动失效
 * - maxMemorySize: 最大内存缓存大小
 */
export class MultiLevelCache implements CacheInterface {
  // 私有属性 - 内存缓存实例
  private memoryCache: MemoryCache
  // 私有属性 - 持久化缓存实例（可选）
  private persistentCache?: PersistentCache
  // 私有属性 - 缓存配置
  private config: CacheConfig

  /**
   * 构造函数
   * 
   * @param config - 缓存配置对象
   * @param encryptionKey - 可选的加密密钥（用于持久化缓存加密）
   */
  constructor(config: CacheConfig, encryptionKey?: string) {
    this.config = config
    
    // 初始化内存缓存
    // 使用最大大小的 70% 作为条目数估计
    this.memoryCache = new MemoryCache(
      Math.floor(config.maxMemorySize * 0.7),  // 使用 70% 的最大大小作为条目数估计
      Math.min(...Object.values(config.memoryTTL))  // 使用最短 TTL 作为默认值
    )

    // 如果启用了自动失效，初始化持久化缓存
    if (config.autoInvalidate) {
      this.persistentCache = new PersistentCache(encryptionKey)
    }

    // 启动清理定时器
    this.startCleanupInterval()
  }

  /**
   * 启动清理定时器
   * 
   * 按照配置的时间间隔自动清理过期缓存条目
   */
  private startCleanupInterval(): void {
    // 清理间隔为最短 TTL 的一半
    const interval = Math.min(...Object.values(this.config.memoryTTL)) / 2
    
    setInterval(() => {
      this.memoryCache.cleanup()
      this.persistentCache?.cleanup()
    }, interval)
  }

  /**
   * 生成缓存键
   * 
   * 根据操作名称和参数生成唯一缓存键
   * 对参数进行排序以确保缓存一致性
   * 
   * @param operation - 操作名称
   * @param params - 参数对象（可选）
   * @returns 缓存键字符串
   */
  private getCacheKey(operation: string, params?: Record<string, unknown>): string {
    if (!params) return operation
    
    // 对参数进行排序
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = params[key]
        return sorted
      }, {} as Record<string, unknown>)
    
    return `${operation}:${JSON.stringify(sortedParams)}`
  }

  /**
   * 获取 TTL（生存时间）
   * 
   * 根据操作类型映射到对应的 TTL 配置
   * 
   * @param operation - 操作名称
   * @returns TTL 时间（毫秒）
   */
  private getTTL(operation: string): number {
    // 根据操作类型映射 TTL 配置
    if (operation.includes('account')) {
      return this.config.memoryTTL.accounts
    }
    if (operation.includes('category')) {
      return this.config.memoryTTL.categories
    }
    if (operation.includes('transaction')) {
      return this.config.memoryTTL.transactions
    }
    if (operation.includes('budget')) {
      return this.config.memoryTTL.budgets
    }
    
    // 默认使用最短 TTL
    return this.config.memoryTTL.transactions
  }

  /**
   * 设置缓存
   * 
   * 同时写入内存缓存和持久化缓存
   * 持久化缓存使用更长的 TTL
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttlMs - 可选的 TTL（毫秒）
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.getTTL(key)
    
    // 存储到内存缓存
    this.memoryCache.set(key, value, ttl)
    
    // 存储到持久化缓存（使用更长的 TTL）
    if (this.persistentCache) {
      const persistentTTL = ttl * 2  // 持久化缓存存活更久
      this.persistentCache.set(key, value, persistentTTL)
    }
  }

  /**
   * 获取缓存
   * 
   * 优先从内存缓存获取，如果未命中则尝试持久化缓存
   * 如果从持久化缓存获取，会自动升级到内存缓存
   * 
   * @param key - 缓存键
   * @returns 缓存值，如果不存在则返回 undefined
   */
  get<T>(key: string): T | undefined {
    // 首先尝试从内存缓存获取
    let value = this.memoryCache.get<T>(key)
    if (value !== undefined) {
      logger.debug(`多级缓存命中（内存）: ${key}`)
      return value
    }

    // 尝试从持久化缓存获取
    if (this.persistentCache) {
      value = this.persistentCache.get<T>(key)
      if (value !== undefined) {
        // 升级到内存缓存
        const ttl = this.getTTL(key)
        this.memoryCache.set(key, value, ttl)
        logger.debug(`多级缓存命中（持久化）: ${key}`)
        return value
      }
    }

    logger.debug(`多级缓存未命中: ${key}`)
    return undefined
  }

  /**
   * 检查键是否存在
   * 
   * @param key - 缓存键
   * @returns 如果存在则返回 true
   */
  has(key: string): boolean {
    return this.memoryCache.has(key) || (this.persistentCache?.has(key) ?? false)
  }

  /**
   * 删除缓存
   * 
   * @param key - 缓存键
   * @returns 如果删除成功则返回 true
   */
  delete(key: string): boolean {
    const memoryDeleted = this.memoryCache.delete(key)
    const persistentDeleted = this.persistentCache?.delete(key) ?? false
    
    return memoryDeleted || persistentDeleted
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear()
    this.persistentCache?.clear()
  }

  /**
   * 获取缓存大小
   * 
   * @returns 总缓存条目数
   */
  size(): number {
    return this.memoryCache.size() + (this.persistentCache?.size() ?? 0)
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 缓存键数组（去重）
   */
  keys(): string[] {
    const memoryKeys = this.memoryCache.keys()
    const persistentKeys = this.persistentCache?.keys() ?? []
    
    // 返回去重后的键
    return [...new Set([...memoryKeys, ...persistentKeys])]
  }

  /**
   * 清理过期缓存
   * 
   * @returns 清理的过期条目数量
   */
  cleanup(): number {
    const memoryCleaned = this.memoryCache.cleanup()
    const persistentCleaned = this.persistentCache?.cleanup() ?? 0
    
    return memoryCleaned + persistentCleaned
  }

  /**
   * 使匹配模式的缓存失效
   * 
   * @param pattern - 正则表达式或字符串模式
   * @returns 失效的条目数量
   */
  invalidatePattern(pattern: string | RegExp): number {
    const memoryInvalidated = this.memoryCache.invalidatePattern(pattern)
    const persistentInvalidated = this.persistentCache?.invalidatePattern(pattern) ?? 0
    
    return memoryInvalidated + persistentInvalidated
  }

  /**
   * 获取或设置
   * 
   * 如果缓存中不存在，则调用工厂函数获取值并缓存
   * 
   * @param key - 缓存键
   * @param factory - 值工厂函数
   * @param ttlMs - 可选的 TTL（毫秒）
   * @returns 缓存值
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // 首先检查内存缓存
    const existing = this.get<T>(key)
    if (existing !== undefined) {
      return existing
    }

    // 调用工厂函数并缓存结果
    const value = await factory()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * 缓存操作
   * 
   * 根据操作类型自动设置 TTL 并缓存结果
   * 
   * @param operation - 操作名称
   * @param params - 参数对象
   * @param factory - 值工厂函数
   * @returns 操作结果
   */
  cacheOperation<T>(
    operation: string,
    params: Record<string, unknown> | undefined,
    factory: () => Promise<T>
  ): Promise<T> {
    const key = this.getCacheKey(operation, params)
    const ttl = this.getTTL(operation)
    
    return this.getOrSet(key, factory, ttl)
  }

  /**
   * 使特定操作的缓存失效
   * 
   * @param operation - 操作名称
   * @param params - 可选的参数对象
   */
  invalidateOperation(operation: string, params?: Record<string, unknown>): void {
    if (params) {
      const key = this.getCacheKey(operation, params)
      this.delete(key)
    } else {
      // 使所有以操作名开头的键失效
      this.invalidatePattern(`^${operation}`)
    }
  }

  /**
   * 使相关数据的缓存失效
   * 
   * 根据数据变更智能失效相关缓存
   * 
   * @param operation - 操作类型
   * @param data - 可选的数据对象
   */
  invalidateRelated(operation: string, data?: Record<string, unknown>): void {
    const patterns: string[] = []
    
    // 交易操作与账户相关
    if (operation.includes('transaction') && data?.accountId) {
      patterns.push(`get_transactions.*accountIds.*${data.accountId}`)
      patterns.push(`get_account_.*${data.accountId}`)
      patterns.push('get_cashflow')
    }
    
    // 账户操作
    if (operation.includes('account')) {
      patterns.push('get_accounts')
      patterns.push('get_net_worth')
    }
    
    // 预算操作
    if (operation.includes('budget')) {
      patterns.push('get_budgets')
      patterns.push('get_cashflow')
    }

    for (const pattern of patterns) {
      this.invalidatePattern(pattern)
    }
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 包含内存、持久化和总统计信息的对象
   */
  getStats(): {
    memory: ReturnType<MemoryCache['getStats']>
    persistent?: ReturnType<PersistentCache['getStats']>
    total: {
      size: number
      hitRate?: number
    }
  } {
    const memoryStats = this.memoryCache.getStats()
    const persistentStats = this.persistentCache?.getStats()
    
    return {
      memory: memoryStats,
      persistent: persistentStats,
      total: {
        size: memoryStats.size + (persistentStats?.size ?? 0),
      }
    }
  }

  /**
   * 预加载缓存
   * 
   * 并行预加载常用数据到缓存
   * 
   * @param operations - 预加载操作数组
   */
  async preloadCache(operations: Array<{ operation: string; params?: Record<string, unknown>; factory: () => Promise<unknown> }>): Promise<void> {
    logger.info(`正在预加载 ${operations.length} 个操作到缓存`)
    
    const promises = operations.map(async ({ operation, params, factory }) => {
      try {
        await this.cacheOperation(operation, params, factory)
      } catch (error) {
        logger.warn(`预加载缓存失败: ${operation}`, error)
      }
    })
    
    await Promise.allSettled(promises)
    logger.info('缓存预加载完成')
  }

  /**
   * 关闭缓存
   * 
   * 关闭持久化缓存连接
   */
  close(): void {
    this.persistentCache?.close()
  }
}
