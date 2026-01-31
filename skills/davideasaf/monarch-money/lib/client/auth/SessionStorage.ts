// 会话存储模块 - 管理认证会话的持久化
// Session storage module - manages authentication session persistence

// 导入文件系统模块
import * as fs from 'fs'
// 导入路径模块
import * as path from 'path'
// 导入操作系统模块
import * as os from 'os'
// 导入加密服务 - 用于会话数据的加密存储
import { EncryptionService } from '../../utils/encryption'
// 导入日志记录器
import { logger } from '../../utils'
// 导入配置错误类型
import { MonarchConfigError } from '../../utils/errors'
// 导入会话信息类型定义
import { SessionInfo } from '../../types'

/**
 * 会话数据接口
 * 
 * 定义存储在文件系统中的会话数据结构
 */
interface SessionData {
  token: string              // 会话令牌（必需）
  userId?: string            // 用户 ID
  email?: string             // 用户邮箱
  createdAt: number          // 创建时间戳（必需）
  lastValidated?: number     // 最后验证时间戳
  expiresAt?: number         // 过期时间戳
  deviceUuid?: string        // 设备唯一标识
}

/**
 * SessionStorage 类 - 会话存储管理
 * 
 * 负责会话令牌的持久化存储，包括：
 * 1. 创建和管理会话存储目录
 * 2. 会话数据的保存和加载
 * 3. 会话数据的加密（可选）
 * 4. 会话有效期验证
 * 5. 旧版 Python 库会话兼容
 * 
 * 会话文件位置：`~/.mm/session.json`
 * 会话文件权限：`0o600`（仅所有者可读写）
 */
export class SessionStorage {
  // 私有属性 - 会话存储目录路径
  private sessionDir: string
  // 私有属性 - 会话文件路径
  private sessionFile: string
  // 私有属性 - 加密密钥（可选）
  private encryptionKey?: string
  // 私有属性 - 当前会话数据（内存缓存）
  private currentSession?: SessionData

  /**
   * 构造函数
   * 
   * @param encryptionKey - 可选的加密密钥（用于加密会话数据）
   * @param sessionDir - 可选的会话存储目录（默认 `~/.mm`）
   */
  constructor(encryptionKey?: string, sessionDir?: string) {
    this.encryptionKey = encryptionKey
    // 默认使用用户主目录下的 .mm 文件夹
    this.sessionDir = sessionDir || path.join(os.homedir(), '.mm')
    this.sessionFile = path.join(this.sessionDir, 'session.json')
    
    // 确保会话目录存在
    this.ensureSessionDir()
  }

  /**
   * 确保会话目录存在
   * 
   * 创建会话存储目录（如果不存在）
   * 设置目录权限为 0o700（仅所有者可访问）
   */
  private ensureSessionDir(): void {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true, mode: 0o700 })
      }
    } catch (error) {
      logger.warn('创建会话目录失败', error)
    }
  }

  /**
   * 保存会话
   * 
   * 将会话数据保存到文件系统
   * 如果提供了加密密钥，则对会话数据进行加密
   * 
   * @param token - 会话令牌
   * @param options - 可选的会话数据（用户 ID、邮箱、过期时间、设备 UUID）
   */
  saveSession(
    token: string,
    options: {
      userId?: string
      email?: string
      expiresAt?: number
      deviceUuid?: string
    } = {}
  ): void {
    // 构建会话数据对象
    const sessionData: SessionData = {
      token,
      userId: options.userId,
      email: options.email,
      createdAt: Date.now(),
      expiresAt: options.expiresAt,
      // 如果未提供设备 UUID，则生成一个新的
      deviceUuid: options.deviceUuid || EncryptionService.generateDeviceUUID()
    }

    try {
      let data: string

      // 如果提供了加密密钥，则加密会话数据
      if (this.encryptionKey) {
        // 加密会话数据
        data = EncryptionService.encrypt(JSON.stringify(sessionData), this.encryptionKey)
      } else {
        data = JSON.stringify(sessionData)
      }

      // 写入会话文件（权限 0o600 - 仅所有者可读写）
      fs.writeFileSync(this.sessionFile, data, { mode: 0o600 })
      // 更新内存中的会话数据
      this.currentSession = sessionData
      
      logger.debug('会话保存成功')
    } catch (error) {
      logger.error('保存会话失败', error)
      throw new MonarchConfigError(
        `保存会话失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  /**
   * 加载会话
   * 
   * 从文件系统加载会话数据
   * 验证会话结构有效性和有效期
   * 
   * @returns 会话数据对象，如果无效则返回 null
   */
  loadSession(): SessionData | null {
    // 如果内存中有会话且未过期，直接返回
    if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
      return this.currentSession
    }

    try {
      // 检查会话文件是否存在
      if (!fs.existsSync(this.sessionFile)) {
        logger.debug('未找到会话文件')
        return null
      }

      // 读取会话文件内容
      const data = fs.readFileSync(this.sessionFile, 'utf8')
      let sessionData: SessionData

      // 如果提供了加密密钥，则解密会话数据
      if (this.encryptionKey) {
        // 解密会话数据
        const decryptedData = EncryptionService.decrypt(data, this.encryptionKey)
        sessionData = JSON.parse(decryptedData)
      } else {
        sessionData = JSON.parse(data)
      }

      // 验证会话数据结构
      if (!sessionData.token || !sessionData.createdAt) {
        logger.warn('无效的会话数据结构')
        this.deleteSession()
        return null
      }

      // 检查会话是否已过期
      if (this.isSessionExpired(sessionData)) {
        logger.debug('会话已过期，正在删除')
        this.deleteSession()
        return null
      }

      // 更新内存中的会话数据
      this.currentSession = sessionData
      logger.debug('会话加载成功')
      return sessionData

    } catch (error) {
      logger.error('加载会话失败', error)
      // 删除损坏的会话文件
      this.deleteSession()
      return null
    }
  }

  /**
   * 删除会话
   * 
   * 清除会话文件并重置内存中的会话数据
   */
  deleteSession(): void {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile)
      }
      this.currentSession = undefined
      logger.debug('会话已删除')
    } catch (error) {
      logger.error('删除会话文件失败', error)
    }
  }

  /**
   * 检查是否有有效会话
   * 
   * @returns 如果有未过期的会话则返回 true
   */
  hasValidSession(): boolean {
    const session = this.loadSession()
    return session !== null && !this.isSessionExpired(session)
  }

  /**
   * 获取会话信息
   * 
   * 返回完整的会话信息对象，包括有效期状态
   * 
   * @returns 会话信息对象
   */
  getSessionInfo(): SessionInfo {
    const session = this.loadSession()
    
    // 如果没有会话，返回无效状态
    if (!session) {
      return {
        isValid: false,
        isStale: true
      }
    }

    const isExpired = this.isSessionExpired(session)
    const isStale = this.isSessionStale(session)

    return {
      isValid: !isExpired,
      createdAt: new Date(session.createdAt).toISOString(),
      lastValidated: session.lastValidated ? new Date(session.lastValidated).toISOString() : undefined,
      isStale,
      expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : undefined,
      token: session.token,
      userId: session.userId,
      email: session.email,
      deviceUuid: session.deviceUuid
    }
  }

  /**
   * 更新最后验证时间
   * 
   * 更新会话的最后验证时间戳
   */
  updateLastValidated(): void {
    if (this.currentSession) {
      this.currentSession.lastValidated = Date.now()
      this.saveSession(this.currentSession.token, {
        userId: this.currentSession.userId,
        email: this.currentSession.email,
        expiresAt: this.currentSession.expiresAt,
        deviceUuid: this.currentSession.deviceUuid
      })
    }
  }

  /**
   * 获取会话令牌
   * 
   * @returns 会话令牌，如果没有则返回 null
   */
  getToken(): string | null {
    const session = this.loadSession()
    return session?.token || null
  }

  /**
   * 获取设备 UUID
   * 
   * @returns 设备 UUID，如果没有则返回 null
   */
  getDeviceUuid(): string | null {
    const session = this.loadSession()
    return session?.deviceUuid || null
  }

  /**
   * 获取用户 ID
   * 
   * @returns 用户 ID，如果没有则返回 null
   */
  getUserId(): string | null {
    const session = this.loadSession()
    return session?.userId || null
  }

  /**
   * 获取用户邮箱
   * 
   * @returns 用户邮箱，如果没有则返回 null
   */
  getEmail(): string | null {
    const session = this.loadSession()
    return session?.email || null
  }

  /**
   * 检查会话是否过期
   * 
   * 如果会话没有过期时间，则默认 7 天后过期
   * 
   * @param session - 会话数据对象
   * @returns 如果会话已过期则返回 true
   */
  private isSessionExpired(session: SessionData): boolean {
    if (!session.expiresAt) {
      // 如果没有过期时间，认为会话 7 天内有效
      const maxAge = 7 * 24 * 60 * 60 * 1000  // 7 天
      return Date.now() - session.createdAt > maxAge
    }
    
    return Date.now() > session.expiresAt
  }

  /**
   * 检查会话是否陈旧
   * 
   * 如果会话在最近 1 小时内未验证，则认为已陈旧
   * 
   * @param session - 会话数据对象
   * @returns 如果会话已陈旧则返回 true
   */
  private isSessionStale(session: SessionData): boolean {
    // 如果最近 1 小时未验证，则认为已陈旧
    const staleThreshold = 60 * 60 * 1000  // 1 小时
    const lastCheck = session.lastValidated || session.createdAt
    return Date.now() - lastCheck > staleThreshold
  }

  /**
   * 加载旧版会话（来自 Python 库的 pickle 格式）
   * 
   * 用于兼容旧版 Python 库的会话存储格式
   * 
   * @returns 旧版会话数据，如果不存在或无法读取则返回 null
   */
  loadLegacySession(): SessionData | null {
    const legacyFile = path.join(this.sessionDir, 'mm_session.pickle')
    
    try {
      if (!fs.existsSync(legacyFile)) {
        return null
      }

      // 目前无法直接读取 pickle 文件
      // 这需要 Python 互操作或手动转换
      logger.warn('找到旧版 pickle 会话，但无法直接读取')
      return null
    } catch (error) {
      logger.error('加载旧版会话失败', error)
      return null
    }
  }

  /**
   * 从旧版迁移
   * 
   * 用于从 Python 库的 pickle 格式迁移到新格式
   * 
   * @returns 如果未执行迁移则返回 false
   */
  migrateFromLegacy(): boolean {
    // 这将用于从 Python 库的 pickle 格式迁移
    // 目前仅返回 false 表示未执行迁移
    return false
  }
}
