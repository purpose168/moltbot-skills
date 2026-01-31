// 错误类型定义模块 - 提供 Monarch Money API 的各种错误类型和处理工具
// Error type definitions module - provides various error types and handling utilities for Monarch Money API

// 导入 MonarchErrorDetails 类型（已注释）
// import { MonarchErrorDetails } from '../types'

/**
 * MonarchError - 基础错误类
 * 
 * 所有 Monarch Money 错误的基类，提供统一的错误接口
 * 
 * 属性说明：
 * - message: 错误消息（继承自 Error）
 * - code: 错误代码，用于程序化处理
 * - details: 附加的错误详细信息
 */
export class MonarchError extends Error {
  // 错误代码 - 用于程序化错误处理和分类
  public code?: string
  // 错误详情 - 可包含任意类型的附加信息
  public details?: unknown

  /**
   * 构造函数
   * @param message - 错误消息
   * @param code - 错误代码（可选）
   * @param details - 附加详情（可选）
   */
  constructor(message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'MonarchError'
    this.code = code
    this.details = details
  }
}

/**
 * MonarchAuthError - 认证错误
 * 
 * 专门处理身份认证相关的错误，如登录失败、凭据无效等
 * 错误代码固定为 'AUTH_ERROR'
 */
export class MonarchAuthError extends MonarchError {
  /**
   * 构造函数
   * @param message - 错误消息
   * @param details - 附加详情（可选）
   */
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', details)
    this.name = 'MonarchAuthError'
  }
}

/**
 * MonarchAPIError - API 错误
 * 
 * 处理 Monarch Money API 返回的错误响应
 * 包含 HTTP 状态码和完整响应体以便调试
 * 
 * 常见场景：请求格式错误、资源不存在、服务器内部错误等
 */
export class MonarchAPIError extends MonarchError {
  // HTTP 状态码 - 用于识别错误类型
  public statusCode?: number
  // 完整的响应数据 - 用于详细调试
  public response?: unknown

  /**
   * 构造函数
   * @param message - 错误消息
   * @param statusCode - HTTP 状态码（可选）
   * @param response - API 响应体（可选）
   */
  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message, 'API_ERROR', { statusCode, response })
    this.name = 'MonarchAPIError'
    this.statusCode = statusCode
    this.response = response
  }
}

/**
 * MonarchRateLimitError - 速率限制错误
 * 
 * 当 API 请求频率超过限制时抛出
 * 包含重试建议（retryAfter），指导客户端何时可以重试
 * 
 * 处理建议：
 * - 检查 retryAfter 值，等待指定时间后重试
 * - 实现指数退避策略
 * - 考虑减少请求频率
 */
export class MonarchRateLimitError extends MonarchError {
  // 建议的重试等待时间（秒）
  public retryAfter?: number

  /**
   * 构造函数
   * @param message - 错误消息
   * @param retryAfter - 重试等待时间（秒）（可选）
   */
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', { retryAfter })
    this.name = 'MonarchRateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * MonarchValidationError - 验证错误
 * 
 * 当输入数据验证失败时抛出
 * 包含具体的验证失败字段名称
 * 
 * 使用场景：
 * - 表单数据验证
 * - API 参数校验
 * - 业务规则验证
 */
export class MonarchValidationError extends MonarchError {
  // 验证失败的字段名称
  public field?: string

  /**
   * 构造函数
   * @param message - 错误消息
   * @param field - 失败的字段名（可选）
   */
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field })
    this.name = 'MonarchValidationError'
    this.field = field
  }
}

/**
 * MonarchNetworkError - 网络错误
 * 
 * 处理网络通信相关的错误
 * 
 * 常见原因：
 * - 网络连接中断
 * - DNS 解析失败
 * - 超时
 * - 防火墙阻止
 */
export class MonarchNetworkError extends MonarchError {
  /**
   * 构造函数
   * @param message - 错误消息
   * @param details - 附加详情（可选）
   */
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details)
    this.name = 'MonarchNetworkError'
  }
}

/**
 * MonarchGraphQLError - GraphQL 错误
 * 
 * 处理 GraphQL 查询或变更执行时的错误
 * 包含完整的 GraphQL 错误数组，包括位置信息和扩展数据
 * 
 * 错误对象结构：
 * - message: 错误消息
 * - locations: 错误位置（行号、列号）
 * - path: 错误路径
 * - extensions: 扩展数据（如错误代码）
 */
export class MonarchGraphQLError extends MonarchError {
  // GraphQL 错误数组
  public graphQLErrors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: (string | number)[]
    extensions?: Record<string, unknown>
  }>

  /**
   * 构造函数
   * @param message - 错误消息
   * @param graphQLErrors - GraphQL 错误数组（可选）
   */
  constructor(
    message: string,
    graphQLErrors?: MonarchGraphQLError['graphQLErrors']
  ) {
    super(message, 'GRAPHQL_ERROR', { graphQLErrors })
    this.name = 'MonarchGraphQLError'
    this.graphQLErrors = graphQLErrors
  }
}

/**
 * MonarchSessionExpiredError - 会话过期错误
 * 
 * 当用户会话过期或被吊销时抛出
 * 需要用户重新登录获取新的会话令牌
 * 
 * 默认消息：'Session has expired'（会话已过期）
 */
export class MonarchSessionExpiredError extends MonarchAuthError {
  /**
   * 构造函数
   * @param message - 自定义错误消息（可选，默认使用英文消息）
   */
  constructor(message: string = 'Session has expired') {
    super(message)
    this.name = 'MonarchSessionExpiredError'
    this.code = 'SESSION_EXPIRED'
  }
}

/**
 * MonarchMFARequiredError - 需要多因素认证错误
 * 
 * 当登录需要 MFA 验证但未提供时抛出
 * 
 * 默认消息：'Multi-factor authentication required'（需要多因素认证）
 */
export class MonarchMFARequiredError extends MonarchAuthError {
  /**
   * 构造函数
   * @param message - 自定义错误消息（可选，默认使用英文消息）
   */
  constructor(message: string = 'Multi-factor authentication required') {
    super(message)
    this.name = 'MonarchMFARequiredError'
    this.code = 'MFA_REQUIRED'
  }
}

/**
 * MonarchCaptchaRequiredError - 需要验证码错误
 * 
 * 当登录需要验证码验证时抛出
 * 通常是由于多次失败尝试触发
 * 
 * 默认消息：'CAPTCHA verification required'（需要验证码验证）
 */
export class MonarchCaptchaRequiredError extends MonarchAuthError {
  /**
   * 构造函数
   * @param message - 自定义错误消息（可选，默认使用英文消息）
   */
  constructor(message: string = 'CAPTCHA verification required') {
    super(message)
    this.name = 'MonarchCaptchaRequiredError'
    this.code = 'CAPTCHA_REQUIRED'
  }
}

/**
 * MonarchIPBlockedError - IP 被阻止错误
 * 
 * 当 IP 地址被临时阻止时抛出
 * 可能原因：多次失败尝试、可疑活动、地理限制等
 * 
 * 默认消息：'IP address has been temporarily blocked'（IP 地址已被临时阻止）
 */
export class MonarchIPBlockedError extends MonarchAuthError {
  /**
   * 构造函数
   * @param message - 自定义错误消息（可选，默认使用英文消息）
   */
  constructor(message: string = 'IP address has been temporarily blocked') {
    super(message)
    this.name = 'MonarchIPBlockedError'
    this.code = 'IP_BLOCKED'
  }
}

/**
 * MonarchConfigError - 配置错误
 * 
 * 当库的配置不正确时抛出
 * 
 * 常见原因：
 * - 缺少必需的配置项
 * - 配置值格式错误
 * - 环境变量未设置
 */
export class MonarchConfigError extends MonarchError {
  /**
   * 构造函数
   * @param message - 错误消息
   * @param details - 附加详情（可选）
   */
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details)
    this.name = 'MonarchConfigError'
  }
}

// ==================== 错误处理工具函数 ====================

/**
 * handleHTTPResponse - HTTP 响应处理函数
 * 
 * 检查 HTTP 响应状态码，根据不同状态抛出相应的错误
 * 
 * 处理的状态码：
 * - 401: 未授权 - 凭据无效
 * - 403: 禁止访问 - 权限不足
 * - 429: 速率限制 - 包含重试建议
 * - 400-499: 客户端错误
 * - 500-599: 服务器错误
 * 
 * @param response - Fetch API 的响应对象
 * @throws 根据状态码抛出相应的 Monarch 错误
 */
export function handleHTTPResponse(response: any): void {
  // 401 未授权 - 检查凭据
  if (response.status === 401) {
    throw new MonarchAuthError('Unauthorized - check your credentials')
  }
  
  // 403 禁止访问 - 权限问题
  if (response.status === 403) {
    throw new MonarchAuthError('Forbidden - access denied')
  }
  
  // 429 速率限制 - 检查 Retry-After 头
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    throw new MonarchRateLimitError(
      'Rate limit exceeded',
      retryAfter ? parseInt(retryAfter, 10) : undefined
    )
  }
  
  // 400-499 客户端错误
  if (response.status >= 400 && response.status < 500) {
    throw new MonarchAPIError(
      `Client error: ${response.status} ${response.statusText}`,
      response.status
    )
  }
  
  // 500-599 服务器错误
  if (response.status >= 500) {
    throw new MonarchAPIError(
      `Server error: ${response.status} ${response.statusText}`,
      response.status
    )
  }
}

/**
 * handleGraphQLErrors - GraphQL 错误处理函数
 * 
 * 解析 GraphQL 错误数组，识别特定类型的错误并抛出对应的专门错误类
 * 
 * 特殊处理：
 * - 认证错误（unauthorized, authentication）
 * - MFA 相关错误（mfa, multi-factor）
 - 通用 GraphQL 错误
 * 
 * @param errors - GraphQL 错误数组或单个错误
 * @returns never - 此函数始终抛出错误
 * @throws MonarchAuthError, MonarchMFARequiredError, 或 MonarchGraphQLError
 */
export function handleGraphQLErrors(errors: unknown): never {
  // 检查是否为非空错误数组
  if (Array.isArray(errors) && errors.length > 0) {
    const firstError = errors[0]
    // 提取错误消息
    const message = typeof firstError === 'object' && firstError !== null && 
      'message' in firstError ? String(firstError.message) : 'GraphQL error occurred'
    
    // 检查认证相关错误
    if (message.toLowerCase().includes('unauthorized') || 
        message.toLowerCase().includes('authentication')) {
      throw new MonarchAuthError(message)
    }
    
    // 检查 MFA 相关错误
    if (message.toLowerCase().includes('mfa') || 
        message.toLowerCase().includes('multi-factor')) {
      throw new MonarchMFARequiredError(message)
    }
    
    // 抛出通用 GraphQL 错误
    throw new MonarchGraphQLError(message, errors)
  }
  
  // 未知 GraphQL 错误
  throw new MonarchGraphQLError('Unknown GraphQL error occurred')
}

/**
 * isRetryableError - 判断错误是否可重试
 * 
 * 根据错误类型和状态码判断是否应该重试请求
 * 
 * 可重试的错误：
 * - 速率限制错误（MonarchRateLimitError）
 * - 网络错误（MonarchNetworkError）
 * - 服务器错误（5xx 状态码）
 * 
 * 不可重试的错误：
 * - 认证错误
 - 验证错误
 * - 配置错误
 * - 客户端错误（4xx 状态码，不包括429）
 * 
 * @param error - 要判断的错误对象
 * @returns 如果错误可重试则返回 true
 */
export function isRetryableError(error: Error): boolean {
  // 速率限制错误 - 可重试
  if (error instanceof MonarchRateLimitError) {
    return true
  }
  
  // 网络错误 - 可重试
  if (error instanceof MonarchNetworkError) {
    return true
  }
  
  // API 错误 - 仅服务器错误可重试
  if (error instanceof MonarchAPIError) {
    // 500 及以上状态码可重试
    return (error.statusCode && error.statusCode >= 500) || false
  }
  
  // 认证、验证、配置错误 - 不可重试
  if (error instanceof MonarchAuthError || 
      error instanceof MonarchValidationError || 
      error instanceof MonarchConfigError) {
    return false
  }
  
  return false
}

/**
 * retryWithBackoff - 带退避的重试函数
 * 
 * 实现指数退避重试策略，包含随机抖动以避免雷击效应
 * 
 * 重试策略：
 * - 首次重试：基础延迟 * 2^0 = 基础延迟
 * - 第二次重试：基础延迟 * 2^1
 * - 第三次重试：基础延迟 * 2^2
 * - 依此类推...
 * 
 * 特殊处理：
 * - 速率限制错误：优先使用 Retry-After 头指定的延迟
 * - 添加 0-1000ms 随机抖动
 * - 最大延迟限制为 maxDelay
 * 
 * 使用示例：
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => client.transactions.getTransactions({ limit: 10 }),
 *   3,      // 最多重试 3 次
 *   1000,   // 基础延迟 1 秒
 *   30000   // 最大延迟 30 秒
 * )
 * ```
 * 
 * @param fn - 要重试的异步函数
 * @param maxRetries - 最大重试次数（默认 3）
 * @param baseDelay - 基础延迟时间（毫秒）（默认 1000）
 * @param maxDelay - 最大延迟时间（毫秒）（默认 60000）
 * @returns 成功执行的函数结果
 * @throws 所有重试尝试都失败后抛出原始错误或 MonarchError
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): Promise<T> {
  // 遍历重试次数
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 尝试执行函数
      return await fn()
    } catch (error) {
      // 如果已达到最大重试次数，或错误不可重试，则抛出错误
      if (attempt === maxRetries || !isRetryableError(error as Error)) {
        throw error
      }
      
      // 计算延迟时间：指数增长
      let delay = baseDelay * Math.pow(2, attempt)
      
      // 速率限制错误：使用 Retry-After 头指定的延迟
      if (error instanceof MonarchRateLimitError && error.retryAfter) {
        delay = error.retryAfter * 1000
      }
      
      // 添加随机抖动并限制最大延迟
      delay = Math.min(delay + Math.random() * 1000, maxDelay)
      
      // 等待后继续重试
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // 所有重试尝试都已用尽
  throw new MonarchError('Retry attempts exhausted')
}

// ==================== 向后兼容的错误别名 ====================
// 这些别名用于保持与旧版本代码的兼容性
// Deprecated: 建议使用新的错误类名

export const AuthenticationError = MonarchAuthError           // 认证错误
export const ClientError = MonarchAPIError                    // 客户端错误
export const ConfigurationError = MonarchConfigError          // 配置错误
export const DataError = MonarchError                         // 数据错误
export const GraphQLError = MonarchGraphQLError               // GraphQL 错误
export const InvalidMFAError = MonarchMFARequiredError        // 无效 MFA 错误
export const LoginFailedException = MonarchAuthError          // 登录失败异常
export const MFARequiredError = MonarchMFARequiredError       // 需要 MFA 错误
export const MonarchMoneyError = MonarchError                 // Monarch Money 错误
export const NetworkError = MonarchNetworkError               // 网络错误
export const RateLimitError = MonarchRateLimitError           // 速率限制错误
export const RequestFailedException = MonarchAPIError         // 请求失败异常
export const RequireMFAException = MonarchMFARequiredError    // 需要 MFA 异常
export const ServerError = MonarchAPIError                    // 服务器错误
export const SessionExpiredError = MonarchSessionExpiredError // 会话过期错误
export const ValidationError = MonarchValidationError         // 验证错误

// 蛇形命名别名（保持与旧代码兼容）
export const handle_graphql_errors = handleGraphQLErrors
export const handle_http_response = handleHTTPResponse
