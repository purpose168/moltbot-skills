// 持久化缓存模块 - 提供基于文件的加密缓存功能
// Persistent Cache module - provides file-based encrypted cache functionality

// 导入路径处理模块
import * as path from 'path'
// 导入文件系统模块
import * as fs from 'fs'
// 导入操作系统模块
import * as os from 'os'
// 导入加密服务
import { EncryptionService } from '../utils/encryption'
// 导入日志记录器
import { logger } from '../utils'
// 导入配置错误类型
import { MonarchConfigError } from '../utils/errors'

/**
 * 缓存记录接口
 * 
 * 定义持久化缓存中存储的单个条目结构
 * 包含加密后的值和元数据信息
 */
interface CacheRecord {
  key: string            // 缓存键
  value: string          // 缓存值（已加密的 JSON 字符串）
  expires_at: number     // 过期时间戳（毫秒）
  created_at: number     // 创建时间戳（毫秒）
}

/**
 * 缓存索引接口
 * 
 * 定义缓存索引的数据结构
 * 键值对映射所有缓存记录
 */
interface CacheIndex {
  [key: string]: CacheRecord  // 键到缓存记录的映射
}

/**
 * 持久化缓存类
 * 
 * 基于文件系统的加密持久化缓存
 * 支持以下特性：
 * - 数据加密存储
 * - 自动密钥管理
 * - TTL 过期机制
 * - 延迟保存（防抖动）
 * 
 * 缓存文件位置：
 * - 默认缓存目录：~/.mm/
 * - 缓存数据文件：cache.json
 * - 加密密钥文件：cache.key
 */
export class PersistentCache {
  private cacheIndex: CacheIndex = {}        // 缓存索引（内存中的快速查找结构）
  private encryptionKey: string              // 加密密钥
  private cacheDir: string                   // 缓存目录路径
  private cacheFile: string                  // 缓存文件路径
  private saveScheduled = false              // 是否已安排保存操作（防抖动标志）

  /**
   * 构造函数
   * 
   * @param encryptionKey - 可选的加密密钥，如果不提供则自动生成或读取
   * @param cacheDir - 可选的缓存目录路径，默认使用用户主目录下的 .mm 文件夹
   */
  constructor(encryptionKey?: string, cacheDir?: string) {
    this.encryptionKey = encryptionKey || this.generateOrGetKey()  // 获取加密密钥
    this.cacheDir = cacheDir || path.join(os.homedir(), '.mm')    // 设置缓存目录
    this.cacheFile = path.join(this.cacheDir, 'cache.json')       // 设置缓存文件路径
    this.initializeCache()                                         // 初始化缓存
  }

  /**
   * 生成或获取加密密钥
   * 
   * 私有方法，用于管理加密密钥的生命周期
   * 如果密钥文件存在则读取，否则生成新密钥
   * 
   * @returns 加密密钥字符串
   */
  private generateOrGetKey(): string {
    const keyFile = path.join(os.homedir(), '.mm', 'cache.key')  // 密钥文件路径
    
    try {
      // 尝试读取现有密钥
      if (fs.existsSync(keyFile)) {
        return fs.readFileSync(keyFile, 'utf8').trim()
      }
    } catch (error) {
      logger.warn('读取现有缓存密钥失败，正在生成新密钥')
    }

    // 生成新密钥
    const newKey = EncryptionService.generateKey()
    
    try {
      // 确保目录存在
      fs.mkdirSync(path.dirname(keyFile), { recursive: true })
      // 保存密钥文件（设置权限为仅所有者可读写）
      fs.writeFileSync(keyFile, newKey, { mode: 0o600 })
      logger.info('已生成新的缓存加密密钥')
    } catch (error) {
      logger.warn('无法保存缓存密钥到文件')
    }

    return newKey
  }

  /**
   * 初始化缓存
   * 
   * 私有方法，在构造函数中调用
   * 负责加载现有缓存数据或创建新的缓存结构
   * 
   * @throws {MonarchConfigError} 如果初始化失败则抛出配置错误
   */
  private initializeCache(): void {
    try {
      // 确保缓存目录存在
      fs.mkdirSync(this.cacheDir, { recursive: true })

      // 如果缓存文件存在，尝试加载和解密
      if (fs.existsSync(this.cacheFile)) {
        try {
          // 读取加密数据
          const data = fs.readFileSync(this.cacheFile, 'utf8')
          // 解密并解析为缓存索引
          const decryptedData = EncryptionService.decrypt(data, this.encryptionKey)
          this.cacheIndex = JSON.parse(decryptedData)
        } catch (error) {
          logger.warn('加载现有缓存失败，正在使用新的缓存')
          this.cacheIndex = {}
        }
      }

      logger.debug('持久化缓存已初始化')
    } catch (error) {
      // 抛出配置错误
      throw new MonarchConfigError(
        `无法初始化持久化缓存: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  /**
   * 安排保存操作
   * 
   * 私有方法，实现防抖动（debounce）机制
   * 避免频繁的磁盘写入操作
   */
  private scheduleSave(): void {
    if (this.saveScheduled) return  // 如果已安排，则跳过
    
    this.saveScheduled = true  // 设置标志
    
    // 延迟 1 秒后保存
    setTimeout(() => {
      try {
        // 将索引序列化为 JSON
        const data = JSON.stringify(this.cacheIndex)
        // 加密数据
        const encryptedData = EncryptionService.encrypt(data, this.encryptionKey)
        // 写入文件（设置权限为仅所有者可读写）
        fs.writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 })
      } catch (error) {
        logger.error('无法保存缓存到文件', error)
      }
      this.saveScheduled = false  // 重置标志
    }, 1000)  // 防抖动延迟：1 秒
  }

  /**
   * 设置缓存条目
   * 
   * 将数据存储到持久化缓存中
   * 数据会被加密后写入文件
   * 
   * @template T - 缓存数据的类型
   * @param key - 缓存键（唯一标识符）
   * @param value - 要缓存的数据
   * @param ttlMs - 过期时间（毫秒），默认：3600000（1小时）
   */
  set<T>(key: string, value: T, ttlMs: number = 3600000): void {
    const now = Date.now()
    // 创建缓存记录
    const record: CacheRecord = {
      key,
      // 加密存储的值：将数据序列化为 JSON 后加密
      value: EncryptionService.encrypt(JSON.stringify(value), this.encryptionKey),
      expires_at: now + ttlMs,  // 过期时间
      created_at: now           // 创建时间
    }

    // 更新索引
    this.cacheIndex[key] = record
    // 安排异步保存
    this.scheduleSave()
    logger.debug(`持久化缓存设置: ${key}`)
  }

  /**
   * 获取缓存条目
   * 
   * 根据键获取缓存的数据
   * 自动解密并反序列化返回
   * 
   * @template T - 缓存数据的类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 undefined
   */
  get<T>(key: string): T | undefined {
    const record = this.cacheIndex[key]
    if (!record) {
      return undefined
    }

    const now = Date.now()
    // 检查是否过期
    if (now > record.expires_at) {
      delete this.cacheIndex[key]  // 删除过期记录
      this.scheduleSave()          // 安排保存
      return undefined
    }

    try {
      // 解密并反序列化数据
      const decryptedValue = EncryptionService.decrypt(record.value, this.encryptionKey)
      return JSON.parse(decryptedValue) as T
    } catch (error) {
      logger.error(`无法解密缓存条目: ${key}`, error)
      delete this.cacheIndex[key]  // 删除损坏的条目
      this.scheduleSave()          // 安排保存
      return undefined
    }
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
    const record = this.cacheIndex[key]
    if (!record) return false

    const now = Date.now()
    // 检查是否过期
    if (now > record.expires_at) {
      delete this.cacheIndex[key]  // 删除过期记录
      this.scheduleSave()          // 安排保存
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
    const existed = key in this.cacheIndex  // 检查是否存在
    delete this.cacheIndex[key]             // 删除记录
    
    if (existed) {
      this.scheduleSave()                   // 安排保存
      logger.debug(`持久化缓存删除: ${key}`)
    }
    
    return existed
  }

  /**
   * 清空所有缓存
   * 
   * 删除缓存中的所有条目
   */
  clear(): void {
    const count = Object.keys(this.cacheIndex).length  // 记录清除前的数量
    this.cacheIndex = {}                                // 重置索引
    this.scheduleSave()                                 // 安排保存
    logger.debug(`持久化缓存清空: 移除了 ${count} 个条目`)
  }

  /**
   * 获取缓存大小
   * 
   * 返回有效（非过期）缓存条目的数量
   * 
   * @returns 当前缓存中的有效条目数量
   */
  size(): number {
    const now = Date.now()
    let validCount = 0

    // 遍历并清理过期条目
    for (const [key, record] of Object.entries(this.cacheIndex)) {
      if (now > record.expires_at) {
        delete this.cacheIndex[key]  // 删除过期记录
      } else {
        validCount++                  // 计数有效记录
      }
    }

    // 如果有条目被清理，安排保存
    if (Object.keys(this.cacheIndex).length !== validCount) {
      this.scheduleSave()
    }

    return validCount
  }

  /**
   * 获取所有缓存键
   * 
   * 返回所有有效（非过期）缓存键的数组
   * 
   * @returns 包含所有有效缓存键的数组
   */
  keys(): string[] {
    const now = Date.now()
    const validKeys: string[] = []

    // 遍历并清理过期条目
    for (const [key, record] of Object.entries(this.cacheIndex)) {
      if (now > record.expires_at) {
        delete this.cacheIndex[key]  // 删除过期记录
      } else {
        validKeys.push(key)          // 添加有效键
      }
    }

    return validKeys
  }

  /**
   * 清理过期条目
   * 
   * 删除缓存中所有已过期的条目
   * 
   * @returns 被清理的过期条目数量
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    // 遍历并清理过期条目
    for (const [key, record] of Object.entries(this.cacheIndex)) {
      if (now > record.expires_at) {
        delete this.cacheIndex[key]  // 删除过期记录
        cleaned++                    // 计数清理的条目
      }
    }

    if (cleaned > 0) {
      this.scheduleSave()           // 安排保存
      logger.debug(`持久化缓存清理: 移除了 ${cleaned} 个过期条目`)
    }

    return cleaned
  }

  /**
   * 获取缓存统计信息
   * 
   * 返回缓存的统计信息
   * 
   * @returns 包含大小、总条目数和过期条目数的统计对象
   */
  getStats(): {
    size: number
    totalEntries: number
    expiredEntries: number
  } {
    const now = Date.now()
    let validCount = 0
    let expiredCount = 0

    // 遍历并统计条目
    for (const record of Object.values(this.cacheIndex)) {
      if (now > record.expires_at) {
        expiredCount++
      } else {
        validCount++
      }
    }

    return {
      size: validCount,
      totalEntries: validCount + expiredCount,
      expiredEntries: expiredCount
    }
  }

  /**
   * 按模式使缓存条目失效
   * 
   * 根据正则表达式模式删除匹配的缓存条目
   * 
   * @param pattern - 要匹配的模式（字符串或正则表达式）
   * @returns 被失效的条目数量
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    let invalidated = 0

    // 遍历并删除匹配的条目
    for (const key of Object.keys(this.cacheIndex)) {
      if (regex.test(key)) {
        delete this.cacheIndex[key]
        invalidated++
      }
    }

    if (invalidated > 0) {
      this.scheduleSave()           // 安排保存
      logger.debug(`持久化缓存失效模式: 移除了 ${invalidated} 个条目`)
    }

    return invalidated
  }

  /**
   * 获取或设置缓存条目
   * 
   * 原子操作：如果缓存中存在该键则返回，否则调用工厂函数生成值并缓存
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
    // 尝试获取现有值
    const existing = this.get<T>(key)
    if (existing !== undefined) {
      return existing
    }

    // 调用工厂函数生成新值
    const value = await factory()
    // 缓存新值
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * 关闭缓存
   * 
 * 关闭缓存并强制保存所有待处理的更改
   * 通常在应用程序退出时调用
 */
  close(): void {
    // 强制保存所有待处理的更改
    if (this.saveScheduled) {
      try {
        // 序列化并加密缓存索引
        const data = JSON.stringify(this.cacheIndex)
        const encryptedData = EncryptionService.encrypt(data, this.encryptionKey)
        // 写入文件
        fs.writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 })
      } catch (error) {
        logger.error('关闭时保存缓存失败', error)
      }
    }
    logger.debug('持久化缓存已关闭')
  }
}