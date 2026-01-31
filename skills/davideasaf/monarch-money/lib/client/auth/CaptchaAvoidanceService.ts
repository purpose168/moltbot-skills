/**
 * 验证码规避服务
 * 
 * 实现激进的速率限制和会话管理，以防止触发验证码（CAPTCHA）
 */

export class CaptchaAvoidanceService {
  private static instance: CaptchaAvoidanceService | null = null  // 单例实例
  private lastAuthTime: number = 0                                // 上次认证时间
  private authAttempts: number = 0                                // 认证尝试次数
  private backoffMultiplier: number = 1                           // 退避乘数（用于动态调整请求间隔）
  // private readonly sessionCacheTime: number = 30 * 60 * 1000 // 30分钟
  private maxAuthAttemptsPerHour: number = 3                      // 每小时最大认证尝试次数
  private authTimeWindow: number = 60 * 60 * 1000                 // 认证时间窗口（1小时）

  // 跟踪最近1小时内的认证尝试
  private recentAuthAttempts: number[] = []

  // 私有构造函数（单例模式）
  private constructor() {}

  /**
   * 获取单例实例
   * 
   * @returns CaptchaAvoidanceService 单例实例
   */
  static getInstance(): CaptchaAvoidanceService {
    if (!CaptchaAvoidanceService.instance) {
      CaptchaAvoidanceService.instance = new CaptchaAvoidanceService()
    }
    return CaptchaAvoidanceService.instance
  }

  /**
   * 检查是否允许进行认证尝试
   * 
   * 检查认证频率限制和每小时尝试次数限制
   * 如果超过限制，会抛出错误提示用户等待
   * 
   * @returns 如果允许认证则返回 true
   * @throws {Error} 如果超过限制则抛出错误
   */
  canAuthenticate(): boolean {
    const now = Date.now()
    
    // 清理过旧的尝试记录（超过1小时的）
    this.recentAuthAttempts = this.recentAuthAttempts.filter(
      time => now - time < this.authTimeWindow
    )

    // 检查是否超过每小时最大尝试次数
    if (this.recentAuthAttempts.length >= this.maxAuthAttemptsPerHour) {
      const oldestAttempt = Math.min(...this.recentAuthAttempts)
      const timeUntilAllowed = this.authTimeWindow - (now - oldestAttempt)
      throw new Error(
        `认证尝试次数过多。请等待 ${Math.ceil(timeUntilAllowed / 1000 / 60)} 分钟后再试。`
      )
    }

    // 检查距离上次认证的最小时间间隔
    const minTimeBetweenAuth = this.getMinTimeBetweenAuth()
    const timeSinceLastAuth = now - this.lastAuthTime
    
    if (timeSinceLastAuth < minTimeBetweenAuth) {
      const waitTime = minTimeBetweenAuth - timeSinceLastAuth
      throw new Error(
        `速率限制保护：请等待 ${Math.ceil(waitTime / 1000)} 秒后再进行认证。`
      )
    }

    return true
  }

  /**
   * 记录一次认证尝试
   * 
   * 更新认证时间戳和尝试次数统计
   */
  recordAuthAttempt(): void {
    const now = Date.now()
    this.lastAuthTime = now
    this.recentAuthAttempts.push(now)
    this.authAttempts++
  }

  /**
   * 记录遇到验证码（CAPTCHA）- 显著增加退避时间
   * 
   * 当遇到验证码时，大幅增加请求间隔乘数
   * 最大退避倍数为 10 倍
   */
  recordCaptchaEncounter(): void {
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 3, 10) // 最大退避倍数 10x
    console.warn(`🚫 遇到验证码（CAPTCHA）。将速率限制退避倍数增加至 ${this.backoffMultiplier}x`)
  }

  /**
   * 记录认证成功 - 减少退避
   * 
   * 认证成功后，缓慢减少退避乘数
   * 乘数最小为 1（正常速率）
   */
  recordSuccessfulAuth(): void {
    this.backoffMultiplier = Math.max(this.backoffMultiplier * 0.8, 1) // 缓慢减少退避
    console.log(`✅ 认证成功。退避乘数现在为 ${this.backoffMultiplier.toFixed(1)}x`)
  }

  /**
   * 获取认证尝试之间的最小时间（包含退避）
   * 
   * 私有方法，根据当前退避乘数计算最小等待时间
   * 基础延迟为 5 分钟，乘以退避倍数
   * 
   * @returns 最小等待时间（毫秒）
   */
  private getMinTimeBetweenAuth(): number {
    const baseDelay = 5 * 60 * 1000 // 基础延迟：5分钟
    return baseDelay * this.backoffMultiplier
  }

  /**
   * 获取当前状态（用于调试）
   * 
   * 返回当前验证码规避服务的完整状态信息
   * 
   * @returns 状态对象
   */
  getStatus(): {
    lastAuthTime: number
    timeSinceLastAuth: number
    minTimeBetweenAuth: number
    recentAttempts: number
    backoffMultiplier: number
    canAuthenticate: boolean
  } {
    const now = Date.now()
    const timeSinceLastAuth = now - this.lastAuthTime
    const minTimeBetweenAuth = this.getMinTimeBetweenAuth()
    
    return {
      lastAuthTime: this.lastAuthTime,                                              // 上次认证时间
      timeSinceLastAuth,                                                             // 距离上次认证的时间
      minTimeBetweenAuth,                                                            // 最小认证间隔
      recentAttempts: this.recentAuthAttempts.length,                                // 最近尝试次数
      backoffMultiplier: this.backoffMultiplier,                                     // 当前退避乘数
      canAuthenticate: timeSinceLastAuth >= minTimeBetweenAuth && this.recentAuthAttempts.length < this.maxAuthAttemptsPerHour  // 是否允许认证
    }
  }

  /**
   * 重置服务（用于测试）
   * 
   * 清空所有状态数据，恢复到初始状态
   */
  reset(): void {
    this.lastAuthTime = 0
    this.authAttempts = 0
    this.backoffMultiplier = 1
    this.recentAuthAttempts = []
  }
}