// 认证服务模块 - 处理 Monarch Money 的登录、MFA 和会话管理
// Authentication service module - handles login, MFA, and session management for Monarch Money

// 导入 readline 模块 - 用于交互式命令行输入
import * as readline from 'readline'
// 导入 TOTP 库 - 用于生成时间同步的一次性密码
import * as totp from 'otplib'
// 导入 node-fetch - 用于发起 HTTP 请求
import fetch from 'node-fetch'
// 导入会话存储模块 - 管理会话令牌的持久化
import { SessionStorage } from './SessionStorage'
// 导入验证码处理器 - 处理登录时的验证码挑战
import { CaptchaHandler } from './CaptchaHandler'
// 导入工具函数和错误类型
import { 
  validateLoginCredentials, 
  validateMFACredentials, 
  logger,
  MonarchAuthError,
  MonarchMFARequiredError,
  MonarchCaptchaRequiredError,
  MonarchIPBlockedError,
  MonarchSessionExpiredError,
  handleHTTPResponse,
  retryWithBackoff,
  EncryptionService
} from '../../utils'
// 导入会话信息类型定义
import { SessionInfo } from '../../types'

/**
 * 登录选项接口
 * 
 * 定义登录方法所需的所有可选参数
 */
export interface LoginOptions {
  email?: string                        // 用户邮箱
  password?: string                     // 用户密码
  useSavedSession?: boolean             // 是否使用保存的会话（默认 true）
  saveSession?: boolean                 // 是否保存会话（默认 true）
  mfaSecretKey?: string                 // MFA 密钥（用于自动生成 TOTP 码）
  interactive?: boolean                 // 是否提示用户处理验证码
  maxCaptchaRetries?: number            // 验证码重试最大次数
}

/**
 * MFA 认证选项接口
 * 
 * 定义多因素认证所需的参数
 */
export interface MFAOptions {
  email: string                         // 用户邮箱
  password: string                      // 用户密码
  code: string                          // MFA 验证码
}

/**
 * AuthenticationService 类 - 认证服务核心类
 * 
 * 负责处理 Monarch Money 的所有认证相关操作：
 * - 用户登录和登出
 * - 多因素认证（MFA）
 * - 会话管理和验证
 * - 验证码处理
 * - 请求速率限制
 * 
 * 核心功能：
 * 1. 支持自动 MFA（在首次请求中包含 TOTP 码，与 Python 库行为一致）
 * 2. 自动处理会话持久化
 * 3. 实现请求速率限制，避免触发 API 限制
 * 4. 支持交互式登录（命令行模式）
 */
export class AuthenticationService {
  // 私有属性 - API 基础 URL
  private baseUrl: string
  // 会话存储实例 - 管理会话令牌的持久化
  protected sessionStorage: SessionStorage
  // 上次请求时间 - 用于速率限制
  private lastRequestTime = 0
  // 最小请求间隔（毫秒）- 模拟更人性化的请求间隔
  private readonly minRequestInterval = 300
  // 登录进行中标志 - 防止并发登录
  private loginInProgress = false

  /**
   * 构造函数
   * 
   * @param baseUrl - API 基础 URL（可选，默认使用 Monarch Money 生产环境）
   * @param sessionStorage - 会话存储实例（可选，默认创建新实例）
   */
  constructor(
    baseUrl: string = 'https://api.monarchmoney.com',
    sessionStorage?: SessionStorage
  ) {
    this.baseUrl = baseUrl
    // 如果未提供会话存储，则创建新实例
    this.sessionStorage = sessionStorage || new SessionStorage()
  }

  /**
   * 登录方法 - 核心认证入口
   * 
   * 该方法执行完整的登录流程：
   * 1. 首先尝试使用保存的会话
   * 2. 如果没有有效会话，则进行完整登录
   * 3. 自动处理 MFA（如果提供了 MFA 密钥）
   * 4. 处理验证码挑战（如果需要）
   * 5. 自动保存会话（如果启用）
   * 
   * 特性：
   * - 防止并发登录
   * - 支持自动 MFA
   * - 支持验证码重试
   * - 实现指数退避重试策略
   * 
   * @param options - 登录选项（可选）
   * @throws MonarchAuthError - 认证失败时抛出
   * @throws MonarchMFARequiredError - 需要 MFA 时抛出
   * @throws MonarchCaptchaRequiredError - 需要验证码时抛出
   * @throws MonarchIPBlockedError - IP 被阻止时抛出
   */
  async login(options: LoginOptions = {}): Promise<void> {
    // 防止并发登录尝试
    if (this.loginInProgress) {
      logger.debug('登录正在进行中，等待...')
      // 等待任何现有登录完成
      while (this.loginInProgress) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return
    }

    // 解构登录选项，设置默认值
    const {
      email,
      password,
      useSavedSession = true,
      saveSession = true,
      mfaSecretKey,
      interactive = true,
      maxCaptchaRetries = 3
    } = options

    // 首先尝试使用保存的会话
    if (useSavedSession && this.sessionStorage.hasValidSession()) {
      logger.info('使用保存的会话')
      return
    }

    // 验证凭据
    if (!email || !password) {
      throw new MonarchAuthError('登录需要提供邮箱和密码')
    }

    validateLoginCredentials(email, password)
    
    // 标记登录正在进行
    this.loginInProgress = true

    try {
      // 尝试登录，包含验证码处理
      let captchaRetryCount = 0
      let lastError: Error | null = null

      // 验证码重试循环
      while (captchaRetryCount <= maxCaptchaRetries) {
        try {
          // 尝试登录，立即处理 MFA（类似 Python 库的实现）
          const result = await retryWithBackoff(async () => {
            return this.performLoginWithMFA(email, password, mfaSecretKey)
          })

          if (result.token) {
            // 登录成功，保存会话
            if (saveSession) {
              this.sessionStorage.saveSession(result.token, {
                email,
                userId: result.userId,
                expiresAt: result.expiresAt,
                deviceUuid: result.deviceUuid
              })
            }
            logger.info('登录成功')
            return
          } else {
            throw new MonarchMFARequiredError('需要多因素认证，但未提供 MFA 密钥')
          }

        } catch (error) {
          // 处理验证码错误
          if (error instanceof MonarchCaptchaRequiredError) {
            captchaRetryCount++
            lastError = error
            
            if (captchaRetryCount > maxCaptchaRetries) {
              logger.error(`验证码重试次数已用尽（${maxCaptchaRetries}次）`)
              throw error
            }

            logger.warn(`需要验证码（尝试 ${captchaRetryCount}/${maxCaptchaRetries}）`)
            
            try {
              // 等待用户处理验证码
              await CaptchaHandler.handleCaptchaRequired(interactive)
              
              // 重试前等待
              const delay = CaptchaHandler.getCaptchaRetryDelay(captchaRetryCount)
              logger.info(`等待 ${delay}ms 后重试...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              
              // 继续下一次尝试
              continue
              
            } catch (captchaError) {
              // 用户拒绝处理验证码或处于非交互模式
              throw captchaError
            }
          } else {
            // 非验证码错误，立即抛出
            logger.error('登录失败', error)
            throw error
          }
        }
      }

      // 如果到达这里，所有重试都失败了
      throw lastError || new MonarchAuthError('登录重试后失败')

    } catch (error) {
      if (!(error instanceof MonarchCaptchaRequiredError)) {
        logger.error('登录失败', error)
      }
      throw error
    } finally {
      // 始终清除登录进行中标志
      this.loginInProgress = false
    }
  }

  /**
   * 交互式登录方法 - 从命令行读取凭据
   * 
   * 适用于命令行环境，提示用户输入邮箱、密码和 MFA 验证码
   * 
   * 功能：
   * 1. 首先检查是否有保存的会话
   * 2. 提示用户输入邮箱和密码
   * 3. 如果需要 MFA，提示输入验证码
   * 4. 自动保存会话（如果启用）
   * 
   * @param options - 登录选项（排除邮箱和密码）
   * @throws 登录过程中的任何错误
   */
  async interactiveLogin(options: Omit<LoginOptions, 'email' | 'password'> = {}): Promise<void> {
    const {
      useSavedSession = true,
      saveSession = true,
      mfaSecretKey
    } = options

    // 首先尝试保存的会话
    if (useSavedSession && this.sessionStorage.hasValidSession()) {
      logger.info('使用保存的会话')
      return
    }

    // 创建命令行接口
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    try {
      // 提示输入邮箱
      const email = await this.prompt(rl, '邮箱: ')
      // 提示输入密码（隐藏输入）
      const password = await this.promptPassword(rl, '密码: ')

      try {
        // 执行登录
        await this.login({ email, password, useSavedSession: false, saveSession, mfaSecretKey })
      } catch (error) {
        // 如果需要 MFA，提示输入验证码
        if (error instanceof MonarchMFARequiredError) {
          const mfaCode = await this.prompt(rl, 'MFA 验证码: ')
          await this.multiFactorAuthenticate({ email, password, code: mfaCode })
          
          if (saveSession) {
            // 会话应该已经由 multiFactorAuthenticate 保存
            logger.info('交互式 MFA 登录成功')
          }
        } else {
          throw error
        }
      }
    } finally {
      // 关闭命令行接口
      rl.close()
    }
  }

  /**
   * 多因素认证方法
   * 
   * 当首次登录未提供 MFA 验证码时，使用此方法完成 MFA 验证
   * 
   * 处理流程：
   * 1. 验证 MFA 凭据
   * 2. 执行 MFA 认证请求
   * 3. 保存会话信息
   * 
   * @param options - MFA 认证选项
   * @throws 认证失败时抛出错误
   */
  async multiFactorAuthenticate(options: MFAOptions): Promise<void> {
    const { email, password, code } = options

    validateMFACredentials(email, password, code)

    try {
      // 执行 MFA 认证
      const result = await retryWithBackoff(async () => {
        return this.performMFAAuth(email, password, code)
      })

      if (result.token) {
        // 保存会话
        this.sessionStorage.saveSession(result.token, {
          email,
          userId: result.userId,
          expiresAt: result.expiresAt,
          deviceUuid: result.deviceUuid
        })
        logger.info('MFA 认证成功')
      }
    } catch (error) {
      logger.error('MFA 认证失败', error)
      throw error
    }
  }

  /**
   * 验证会话方法 - 检查当前会话是否有效
   * 
   * 通过发起轻量级 API 请求来验证会话的有效性
   * 
   * 验证步骤：
   * 1. 检查本地是否有会话令牌
   * 2. 应用速率限制
   * 3. 发起 GraphQL 请求获取当前用户信息
   * 4. 根据响应状态判断会话有效性
   * 
   * @returns 如果会话有效则返回 true，否则返回 false
   */
  async validateSession(): Promise<boolean> {
    const token = this.sessionStorage.getToken()
    if (!token) {
      logger.debug('未找到会话令牌')
      return false
    }

    try {
      // 请求前应用速率限制
      await this.rateLimit()
      
      // 发起轻量级 API 调用来验证会话
      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
          'User-Agent': this.getUserAgent(),
          'Origin': 'https://app.monarchmoney.com'
        },
        body: JSON.stringify({
          query: 'query { me { id email } }'
        })
      })

      // 401 或 403 表示会话无效
      if (response.status === 401 || response.status === 403) {
        logger.debug('会话验证失败 - 未授权')
        this.sessionStorage.deleteSession()
        return false
      }

      handleHTTPResponse(response)
      
      const data = await response.json() as any
      
      // 检查 GraphQL 错误
      if (data.errors) {
        logger.debug('会话验证失败 - GraphQL 错误')
        return false
      }

      // 更新最后验证时间戳
      this.sessionStorage.updateLastValidated()
      logger.debug('会话验证成功')
      return true

    } catch (error) {
      logger.warn('会话验证失败', error)
      return false
    }
  }

  /**
   * 检查会话是否过期
   * 
   * @returns 如果会话已过期则返回 true
   */
  isSessionStale(): boolean {
    const sessionInfo = this.sessionStorage.getSessionInfo()
    return sessionInfo.isStale
  }

  /**
   * 确保会话有效 - 如果无效则抛出错误
   * 
   * 此方法首先检查本地会话是否有效，
   * 如果已过期则尝试验证会话
   * 
   * @throws 如果没有有效会话或会话验证失败则抛出
   */
  async ensureValidSession(): Promise<void> {
    if (!this.sessionStorage.hasValidSession()) {
      throw new MonarchSessionExpiredError('没有可用的有效会话')
    }

    if (this.isSessionStale()) {
      const isValid = await this.validateSession()
      if (!isValid) {
        throw new MonarchSessionExpiredError('会话验证失败')
      }
    }
  }

  /**
   * 获取会话信息
   * 
   * @returns 会话信息对象
   */
  getSessionInfo(): SessionInfo {
    return this.sessionStorage.getSessionInfo()
  }

  /**
   * 获取会话令牌
   * 
   * @returns 会话令牌，如果没有则返回 null
   */
  getToken(): string | null {
    return this.sessionStorage.getToken()
  }

  /**
   * 获取设备 UUID
   * 
   * @returns 设备 UUID，如果没有则返回 null
   */
  getDeviceUuid(): string | null {
    return this.sessionStorage.getDeviceUuid()
  }

  /**
   * 保存会话 - 实际上会话已在登录时自动保存
   * 
   * @throws 如果没有活动会话则抛出错误
   */
  saveSession(): void {
    const token = this.sessionStorage.getToken()
    if (!token) {
      throw new MonarchAuthError('没有活动会话需要保存')
    }
    logger.info('会话已保存')
  }

  /**
   * 加载会话 - 检查是否有保存的有效会话
   * 
   * @returns 如果有有效会话则返回 true
   */
  loadSession(): boolean {
    return this.sessionStorage.hasValidSession()
  }

  /**
   * 删除会话 - 清除所有会话信息
   */
  deleteSession(): void {
    this.sessionStorage.deleteSession()
    logger.info('会话已删除')
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 速率限制辅助方法
   * 
   * 确保请求之间有足够的间隔，模拟更人性化的请求模式，
   * 避免触发 API 的速率限制
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const sleepTime = this.minRequestInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, sleepTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * 执行登录方法（包含 MFA）- 核心认证实现
   * 
   * 此方法类似于 Python 库的实现，在首次请求中直接包含 MFA 验证码。
   * 这是 Monarch Money 推荐的最佳实践，可以减少认证所需的请求次数。
   * 
   * 关键特性：
   * 1. 每次请求生成新的设备 UUID
   * 2. 如果提供了 MFA 密钥，在首次请求中包含 TOTP 验证码
   * 3. 设置各种必要的请求头
   * 4. 处理特定的错误响应（验证码、IP 阻止等）
   * 
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @param mfaSecretKey - MFA 密钥（可选）
   * @returns 登录结果对象，包含令牌、用户 ID、过期时间等
   */
  private async performLoginWithMFA(email: string, password: string, mfaSecretKey?: string): Promise<{
    token?: string
    userId?: string
    expiresAt?: number
    deviceUuid?: string
  }> {
    // 为每个请求生成新的设备 UUID（类似 Python 库）
    const deviceUuid = EncryptionService.generateDeviceUUID()

    // 准备登录数据
    const loginData: Record<string, any> = {
      username: email,
      password,
      trusted_device: true,
      supports_mfa: true,
      supports_email_otp: true,
      supports_recaptcha: true
    }

    // 关键：在首次请求中添加 MFA 验证码（类似 Python 库）
    if (mfaSecretKey) {
      const code = totp.authenticator.generate(mfaSecretKey)
      logger.debug('在初始登录请求中添加 MFA 验证码（与 Python 库行为一致）')

      // 使用 totp 字段传递 TOTP 验证码（与 DirectAuthenticationService 一致）
      loginData.totp = code
    }

    // 请求前应用速率限制
    await this.rateLimit()

    // 发送包含 MFA 验证码的单个请求（类似 Python 库）
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-Platform': 'web',
        'Content-Type': 'application/json',
        'User-Agent': this.getUserAgent(),
        'device-uuid': deviceUuid,
        'Origin': 'https://app.monarchmoney.com',
        'x-cio-client-platform': 'web',
        'x-cio-site-id': '2598be4aa410159198b2',
        'x-gist-user-anonymous': 'false'
      },
      body: JSON.stringify(loginData)
    })

    // 调试：记录完整的请求详情
    logger.debug('请求详情:', {
      url: `${this.baseUrl}/auth/login/`,
      headers: Object.fromEntries(Object.entries({
        'Accept': 'application/json',
        'Client-Platform': 'web',
        'Content-Type': 'application/json',
        'User-Agent': this.getUserAgent(),
        'device-uuid': deviceUuid,
        'Origin': 'https://app.monarchmoney.com',
        'x-cio-client-platform': 'web',
        'x-cio-site-id': '2598be4aa410159198b2',
        'x-gist-user-anonymous': 'false'
      })),
      body: loginData
    })
    logger.debug(`认证响应状态: ${response.status} ${response.statusText}`)
    
    // 只获取一次响应文本，避免多次消耗流
    const responseText = await response.text()
    let data: any
    
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // 如果无法解析为 JSON，作为通用 HTTP 错误处理
      logger.error('无法解析登录响应为 JSON:', responseText)
      handleHTTPResponse(response)
      return { token: undefined }
    }

    // 首先检查特定的错误响应
    if (response.status >= 400) {
      // 处理验证码要求
      if (data.error_code === 'CAPTCHA_REQUIRED' || data.detail?.includes('CAPTCHA')) {
        throw new MonarchCaptchaRequiredError(
          '需要验证码验证。请先通过 Web 界面登录以清除此要求。'
        )
      }

      // 处理 "Shall Not Pass" IP 阻止
      if (data.You === 'Shall Not Pass' || data.detail?.includes('Shall Not Pass') || 
          response.headers.get('you') === 'Shall Not Pass') {
        throw new MonarchIPBlockedError(
          '您的 IP 地址已被临时阻止。请等待一段时间后再重试，或尝试使用其他网络/IP 地址。'
        )
      }

      // 处理 403 MFA 要求（仅在未提供 MFA 密钥时）
      if (response.status === 403 && !mfaSecretKey) {
        throw new MonarchMFARequiredError('需要多因素认证')
      }

      // 回退到通用 HTTP 错误处理
      handleHTTPResponse(response)
    }
    
    // 成功案例 - 解析登录响应数据
    const loginResponse = data as {
      token?: string
      id?: string
      user?: { id: string }
      expires_at?: string
    }

    if (!loginResponse.token) {
      throw new MonarchAuthError('登录失败 - 未收到令牌')
    }

    return {
      token: loginResponse.token,
      userId: loginResponse.id || loginResponse.user?.id,
      expiresAt: loginResponse.expires_at ? new Date(loginResponse.expires_at).getTime() : undefined,
      deviceUuid
    }
  }

  /**
   * 执行 MFA 认证方法
   * 
   * 当首次登录需要 MFA 验证码时（未提供 MFA 密钥），
   * 使用此方法完成后续的 MFA 验证流程
   * 
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @param code - MFA 验证码
   * @returns 认证结果对象
   */
  private async performMFAAuth(email: string, password: string, code: string): Promise<{
    token: string
    userId?: string
    expiresAt?: number
    deviceUuid?: string
  }> {
    // 获取或生成设备 UUID
    const deviceUuid = this.sessionStorage.getDeviceUuid() || EncryptionService.generateDeviceUUID()
    
    // 请求前应用速率限制
    await this.rateLimit()

    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-Platform': 'web', // 修正：与 Python 大小写完全一致
        'Content-Type': 'application/json',
        'User-Agent': this.getUserAgent(),
        'device-uuid': deviceUuid,
        'Origin': 'https://app.monarchmoney.com',
        'x-cio-client-platform': 'web',
        'x-cio-site-id': '2598be4aa410159198b2',
        'x-gist-user-anonymous': 'false'
      },
      body: JSON.stringify({
        username: email,
        password,
        trusted_device: true,
        supports_mfa: true,
        supports_email_otp: true,
        supports_recaptcha: true,
        totp: code
      })
    })

    // 只获取一次响应文本
    const responseText = await response.text()
    let data: any
    
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // 无法解析为 JSON，作为通用 HTTP 错误处理
      logger.error('无法解析 MFA 响应为 JSON:', responseText)
      handleHTTPResponse(response)
      throw new MonarchAuthError('MFA 认证失败')
    }

    // 首先检查特定的错误响应
    if (response.status >= 400) {
      // 处理验证码要求
      if (data.error_code === 'CAPTCHA_REQUIRED' || data.detail?.includes('CAPTCHA')) {
        throw new MonarchCaptchaRequiredError(
          '需要验证码验证。请先通过 Web 界面登录以清除此要求。'
        )
      }

      // 处理 "Shall Not Pass" IP 阻止
      if (data.You === 'Shall Not Pass' || data.detail?.includes('Shall Not Pass') || 
          response.headers.get('you') === 'Shall Not Pass') {
        throw new MonarchIPBlockedError(
          '您的 IP 地址已被临时阻止。请等待一段时间后再重试，或尝试使用其他网络/IP 地址。'
        )
      }

      // 处理 403 MFA 要求
      if (response.status === 403) {
        throw new MonarchMFARequiredError('需要多因素认证或 MFA 验证码无效')
      }

      // 回退到通用 HTTP 错误处理
      handleHTTPResponse(response)
    }
    
    // 成功案例 - 解析 MFA 响应数据
    const mfaResponse = data as {
      token?: string
      id?: string
      user?: { id: string }
      expires_at?: string
    }

    if (!mfaResponse.token) {
      throw new MonarchAuthError('MFA 认证失败 - 未收到令牌')
    }

    return {
      token: mfaResponse.token,
      userId: mfaResponse.id || mfaResponse.user?.id,
      expiresAt: mfaResponse.expires_at ? new Date(mfaResponse.expires_at).getTime() : undefined,
      deviceUuid
    }
  }

  /**
   * 获取 User-Agent 字符串
   * 
   * 返回模拟浏览器的 User-Agent，用于通过 API 的浏览器检测
   * 
   * @returns User-Agent 字符串
   */
  private getUserAgent(): string {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
  }

  /**
   * 提示输入方法
   * 
   * 使用 readline 接口提示用户输入
   * 
   * @param rl - readline 接口实例
   * @param question - 提示问题
   * @returns 用户输入的值
   */
  private prompt(rl: readline.Interface, question: string): Promise<string> {
    return new Promise(resolve => {
      rl.question(question, resolve)
    })
  }

  /**
   * 提示输入密码方法
   * 
   * 提示用户输入密码，输入时隐藏字符
   * 
   * 功能：
   * - 隐藏输入字符（显示 *）
   - 处理退格键
   - 处理 Ctrl+C 中断
   - 处理 Ctrl+D 退出
   * 
   * @param _rl - readline 接口实例（未使用）
   * @param question - 提示问题
   * @returns 用户输入的密码
   */
  private promptPassword(_rl: readline.Interface, question: string): Promise<string> {
    return new Promise(resolve => {
      process.stdout.write(question)
      
      // 隐藏输入
      const stdin = process.stdin
      stdin.setRawMode(true)
      stdin.resume()
      stdin.setEncoding('utf8')
      
      let password = ''
      
      const onData = (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          // 回车或 Ctrl+D
          stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', onData)
          console.log()
          resolve(password)
        } else if (char === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false)
          stdin.pause()
          process.exit(1)
        } else if (char === '\u007f' || char === '\b') {
          // 退格键
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
        } else {
          password += char
          process.stdout.write('*')
        }
      }
      
      stdin.on('data', onData)
    })
  }
}
