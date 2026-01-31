// 验证码处理器模块 - 处理登录时的验证码挑战
// CAPTCHA handler module - handles CAPTCHA challenges during login

// 导入 readline 模块 - 用于命令行交互
import * as readline from 'readline'

/**
 * CaptchaHandler 类 - 验证码处理器
 * 
 * 负责处理登录时的验证码（CAPTCHA）挑战。
 * 当 Monarch Money 检测到可疑活动时会要求验证码验证。
 * 
 * 处理流程：
 * 1. 检测到验证码要求
 * 2. 显示验证码解决说明
 * 3. 引导用户通过网页浏览器完成验证
 * 4. 等待用户确认验证完成
 * 5. 提供重试延迟（指数退避）
 * 
 * 使用场景：
 * - IP 地址被临时阻止
 * - 多次登录失败
 - 检测到异常行为
 */
export class CaptchaHandler {
  /**
   * 处理验证码要求
   * 
   * 当检测到验证码要求时，显示解决指南并引导用户完成验证。
   * 在交互模式下，会等待用户确认验证完成。
   * 
   * @param isInteractive - 是否为交互模式（默认 true）
   * @throws 非交互模式下抛出错误
   */
  static async handleCaptchaRequired(isInteractive: boolean = true): Promise<void> {
    const message = `
🚫 需要验证码验证才能继续。

Monarch Money 临时阻止了 API 访问，需要通过网页浏览器进行验证。

解决方法：
1. 打开网页浏览器
2. 访问：https://app.monarchmoney.com/login
3. 使用您的凭据登录
4. 完成显示的任何验证码挑战
5. 成功登录后，您可以返回继续使用此库

此安全措施将在成功网页登录后自动清除。
`

    console.log(message)

    if (isInteractive) {
      // 等待用户确认
      return this.waitForUserConfirmation()
    } else {
      // 非交互模式，抛出错误
      throw new Error('需要验证码验证 - 请先通过网页浏览器登录')
    }
  }

  /**
   * 等待用户确认完成网页登录
   * 
   * 在交互模式下，循环提示用户直到确认完成验证。
   * 支持三种响应：
   * - y/yes: 确认完成，尝试继续
   * - n/no: 未完成，继续等待
   * - skip/s: 跳过，可能导致后续失败
   */
  private static async waitForUserConfirmation(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      const ask = () => {
        rl.question('\n您已完成网页登录了吗？(y/n/skip): ', (answer) => {
          const response = answer.toLowerCase().trim()
          
          if (response === 'y' || response === 'yes') {
            console.log('✅ 很好！尝试继续 API 登录...')
            rl.close()
            resolve()
          } else if (response === 'skip' || response === 's') {
            console.log('⏭️ 跳过验证码解决 - 这可能会失败')
            rl.close()
            resolve()
          } else if (response === 'n' || response === 'no') {
            console.log('⏳ 等待网页登录完成...')
            setTimeout(ask, 2000)
          } else {
            console.log('请回答 y/yes、n/no 或 skip')
            ask()
          }
        })
      }
      ask()
    })
  }

  /**
   * 检查验证码后是否应重试
   * 
   * @param retryCount - 当前重试次数
   * @param maxRetries - 最大重试次数（默认 3）
   * @returns 如果可以重试则返回 true
   */
  static shouldRetryAfterCaptcha(retryCount: number, maxRetries: number = 3): boolean {
    return retryCount < maxRetries
  }

  /**
   * 获取验证码后的重试延迟（指数退避）
   * 
   * 使用指数退避策略，每次重试延迟翻倍，
   * 最大延迟限制为 10 秒。
   * 
   * @param retryCount - 重试次数
   * @returns 延迟时间（毫秒）
   */
  static getCaptchaRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 10000)  // 最大 10 秒
  }
}
