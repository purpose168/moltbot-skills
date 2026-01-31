// 直接认证服务模块 - 使用已验证可行的认证方法
// Direct authentication service module - uses verified working authentication methods

// 导入 TOTP 库 - 用于生成时间同步的一次性密码
import * as totp from 'otplib'
// 导入 node-fetch - 用于发起 HTTP 请求
import fetch from 'node-fetch'
// 导入会话存储模块
import { SessionStorage } from './SessionStorage'
// 导入日志记录器和错误类型
import { logger, MonarchAuthError, EncryptionService } from '../../utils'
// 导入会话信息类型定义
import { SessionInfo } from '../../types'

/**
 * 直接登录选项接口
 * 
 * 定义直接登录方法所需的参数
 */
export interface DirectLoginOptions {
  email: string              // 用户邮箱（必需）
  password: string           // 用户密码（必需）
  mfaSecretKey: string       // MFA 密钥（必需，用于生成 TOTP 验证码）
  saveSession?: boolean      // 是否保存会话（默认 true）
}

/**
 * DirectAuthenticationService 类 - 直接认证服务
 * 
 * 该类使用已验证可行的认证方法，
 * 绕过复杂的重试/错误处理逻辑，确保认证可靠工作。
 * 
 * 设计特点：
 * 1. 每次登录生成新的设备 UUID
 * 2. 在登录请求中直接包含 TOTP 验证码（与 Python 库行为一致）
 * 3. 使用精确的请求头和请求体格式
 * 4. 简洁的错误处理
 * 
 * 与标准认证服务的区别：
 * - 不实现重试逻辑
 * - 不处理验证码挑战
 * - 直接使用 TOTP 验证码
 * - 更接近 Monarch Money Python 库的实现
 */
export class DirectAuthenticationService {
  // 私有属性 - API 基础 URL
  private baseUrl: string
  // 会话存储实例
  private sessionStorage: SessionStorage

  /**
   * 构造函数
   * 
   * @param baseUrl - API 基础 URL（默认 'https://api.monarchmoney.com'）
   * @param sessionStorage - 会话存储实例（可选，默认创建新实例）
   */
  constructor(
    baseUrl: string = 'https://api.monarchmoney.com',
    sessionStorage?: SessionStorage
  ) {
    this.baseUrl = baseUrl
    this.sessionStorage = sessionStorage || new SessionStorage()
  }

  /**
   * 直接登录方法
   * 
   * 该方法执行直接登录，与成功的测试用例完全一致。
   * 特点：
   * 1. 生成新的设备 UUID
   * 2. 生成 TOTP 验证码
   * 3. 构建精确的登录请求
   * 4. 处理认证响应
   * 
   * @param options - 直接登录选项
   * @throws MonarchAuthError - 认证失败时抛出
   */
  async login(options: DirectLoginOptions): Promise<void> {
    const { email, password, mfaSecretKey, saveSession = true } = options

    // 生成设备 UUID（每次登录新生成）
    const deviceUuid = EncryptionService.generateDeviceUUID()
    
    // 生成 TOTP 验证码
    const mfaCode = totp.authenticator.generate(mfaSecretKey)
    logger.debug('为直接登录生成 TOTP 验证码')

    // 构建登录数据（与成功的测试用例完全一致）
    const loginData = {
      username: email,
      password,
      trusted_device: true,
      supports_mfa: true,
      supports_email_otp: true,
      supports_recaptcha: true,
      totp: mfaCode  // 关键：在登录请求中直接包含 TOTP 验证码
    }

    // 构建请求头（与成功的测试用例完全一致）
    const headers = {
      'Accept': 'application/json',
      'Client-Platform': 'web',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'device-uuid': deviceUuid,
      'Origin': 'https://app.monarchmoney.com',
      'x-cio-client-platform': 'web',
      'x-cio-site-id': '2598be4aa410159198b2',
      'x-gist-user-anonymous': 'false'
    }

    logger.debug('发起直接认证请求...')

    try {
      // 发送认证请求
      const response = await fetch(`${this.baseUrl}/auth/login/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginData)
      })

      logger.debug(`直接认证响应: ${response.status} ${response.statusText}`)

      // 处理成功响应
      if (response.status === 200) {
        const data = await response.json() as any
        logger.debug('直接认证成功')

        if (!data.token) {
          throw new MonarchAuthError('登录成功但未收到令牌')
        }

        // 保存会话
        if (saveSession) {
          this.sessionStorage.saveSession(data.token, {
            email,
            userId: data.id,
            expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
            deviceUuid
          })
        }

        logger.info('直接登录成功')
        return

      } else {
        // 处理错误响应
        const errorText = await response.text()
        logger.error(`直接认证失败: ${response.status} ${response.statusText}`)
        logger.error('错误响应:', errorText)

        let errorData: any
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          throw new MonarchAuthError(`认证失败: ${response.status} ${response.statusText}`)
        }

        // 处理特定错误
        if (errorData.You === 'Shall Not Pass') {
          throw new MonarchAuthError('IP 地址被临时阻止。请等待或尝试从其他网络登录。')
        }

        if (errorData.error_code === 'CAPTCHA_REQUIRED') {
          throw new MonarchAuthError('需要验证码。请先通过网页浏览器登录。')
        }

        throw new MonarchAuthError(`认证失败: ${errorData.detail || response.statusText}`)
      }

    } catch (error) {
      // 重新抛出认证错误
      if (error instanceof MonarchAuthError) {
        throw error
      }
      logger.error('直接认证网络错误:', error)
      throw new MonarchAuthError(`认证期间网络错误: ${(error as Error).message}`)
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
   * 检查是否有有效会话
   * 
   * @returns 如果有未过期的会话则返回 true
   */
  hasValidSession(): boolean {
    return this.sessionStorage.hasValidSession()
  }

  /**
   * 删除会话
   */
  deleteSession(): void {
    this.sessionStorage.deleteSession()
  }
}
