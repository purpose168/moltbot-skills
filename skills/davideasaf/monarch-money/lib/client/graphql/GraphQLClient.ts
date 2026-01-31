// GraphQL 客户端模块 - 用于与 Monarch Money GraphQL API 通信
// GraphQL client module - for communicating with Monarch Money GraphQL API

// 导入 node-fetch - 用于发起 HTTP 请求
import fetch from 'node-fetch'
// 导入工具函数和错误类型
import { 
  logger, 
  MonarchGraphQLError, 
  MonarchAPIError,
  handleHTTPResponse, 
  retryWithBackoff 
} from '../../utils'
// 导入 GraphQL 响应类型定义
import { GraphQLResponse, GraphQLError } from '../../types'
// 导入认证服务
import { AuthenticationService } from '../auth'
// 导入多级缓存
import { MultiLevelCache } from '../../cache'

/**
 * GraphQL 请求选项接口
 * 
 * 定义 GraphQL 请求的可配置参数
 */
export interface GraphQLRequestOptions {
  cache?: boolean          // 是否启用缓存（默认 true）
  cacheTTL?: number        // 缓存生存时间（毫秒）
  timeout?: number         // 请求超时时间（毫秒）
  retries?: number         // 重试次数
}

/**
 * GraphQLClient 类 - GraphQL API 客户端
 * 
 * 该类负责与 Monarch Money GraphQL API 进行所有通信，
 * 提供查询、变更、缓存管理、请求队列和速率限制等功能。
 * 
 * 核心功能：
 * 1. 执行 GraphQL 查询和变更
 * 2. 多级缓存支持（内存 + 持久化）
 * 3. 请求去重（避免相同请求重复执行）
 * 4. 请求队列和并发控制
 * 5. 速率限制和突发保护
 * 6. 自动重试和错误处理
 * 
 * 设计特点：
 * - 模拟人类行为的请求模式（添加随机延迟）
 * - 缓存智能失效（基于操作类型）
 * - 性能监控和统计
 */
export class GraphQLClient {
  // 私有属性 - API 基础 URL
  private baseUrl: string
  // 认证服务实例
  private auth: AuthenticationService
  // 可选的缓存实例
  private cache?: MultiLevelCache
  // 请求超时时间
  private timeout: number
  // 上次请求时间
  private lastRequestTime = 0
  // 最小请求间隔（毫秒）- 模拟更人性化的请求间隔
  private readonly minRequestInterval = 250
  // 突发限制 - 每分钟最大请求数
  private readonly burstLimit = 5
  // 请求时间戳数组 - 用于突发检测
  private requestTimes: number[] = []
  
  // ==================== 增强性能特性 ====================
  
  // 请求去重映射 - 避免相同请求重复执行
  private requestDeduplication = new Map<string, Promise<unknown>>()
  // 请求队列 - 用于并发控制
  private requestQueue: Array<{ resolve: Function; reject: Function; execute: Function }> = []
  // 是否正在处理队列
  private isProcessingQueue = false
  // 最大并发请求数
  private readonly maxConcurrentRequests = 3
  // 当前活跃请求数
  private activeRequestCount = 0

  /**
   * 构造函数
   * 
   * @param baseUrl - API 基础 URL
   * @param auth - 认证服务实例
   * @param cache - 可选的多级缓存实例
   * @param timeout - 请求超时时间（默认 30000ms）
   */
  constructor(
    baseUrl: string,
    auth: AuthenticationService,
    cache?: MultiLevelCache,
    timeout: number = 30000
  ) {
    this.baseUrl = `${baseUrl}/graphql`
    this.auth = auth
    this.cache = cache
    this.timeout = timeout
  }

  /**
   * 执行 GraphQL 查询
   * 
   * 该方法执行查询并支持：
   * 1. 缓存查询结果
   * 2. 请求去重
   * 3. 自动重试
   * 4. 并发控制
   * 
   * 处理流程：
   * 1. 生成缓存键，检查缓存
   * 2. 检查是否有相同请求正在进行（去重）
   * 3. 执行请求（带队列管理和重试）
   * 4. 缓存结果（如果启用）
   * 5. 清理去重记录
   * 
   * @param query - GraphQL 查询字符串
   * @param variables - 查询变量（可选）
   * @param options - 请求选项（可选）
   * @returns 查询结果的泛型类型
   */
  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL,
      timeout = this.timeout,
      retries = 3
    } = options

    // 生成缓存键
    const cacheKey = cache && this.cache ? 
      this.generateCacheKey('query', query, variables) : null

    // 首先尝试从缓存获取
    if (cacheKey && this.cache) {
      const cached = this.cache.get<T>(cacheKey)
      if (cached !== undefined) {
        logger.debug(`GraphQL 缓存命中: ${cacheKey}`)
        return cached
      }
    }

    // 请求去重 - 检查相同请求是否正在进行
    const deduplicationKey = this.generateCacheKey('query', query, variables)
    if (this.requestDeduplication.has(deduplicationKey)) {
      logger.debug(`请求去重命中: ${deduplicationKey}`)
      return this.requestDeduplication.get(deduplicationKey) as Promise<T>
    }

    // 创建并存储去重 Promise
    const requestPromise = this.executeWithQueue<T>(async () => {
      return retryWithBackoff(async () => {
        return this.executeQuery<T>(query, variables, timeout)
      }, retries)
    })

    this.requestDeduplication.set(deduplicationKey, requestPromise)

    try {
      const result = await requestPromise

      // 缓存结果
      if (cacheKey && this.cache && result) {
        this.cache.set(cacheKey, result, cacheTTL)
        logger.debug(`GraphQL 缓存设置: ${cacheKey}`)
      }

      return result
    } finally {
      // 清理去重记录
      this.requestDeduplication.delete(deduplicationKey)
    }
  }

  /**
   * 执行 GraphQL 变更（Mutation）
   * 
   * 变更操作不会缓存，但会智能失效相关缓存。
   * 包含队列管理和自动重试。
   * 
   * @param mutation - GraphQL 变更字符串
   * @param variables - 变更变量（可选）
   * @param options - 请求选项（可选）
   * @returns 变更结果的泛型类型
   */
  async mutation<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    const { timeout = this.timeout, retries = 3 } = options

    // 执行变更（带队列管理）
    const result = await this.executeWithQueue<T>(async () => {
      return retryWithBackoff(async () => {
        return this.executeQuery<T>(mutation, variables, timeout)
      }, retries)
    })

    // 使变更相关的缓存失效
    if (this.cache) {
      this.invalidateMutationCache(mutation, variables)
    }

    return result
  }

  /**
   * 速率限制方法
   * 
   * 实现双重速率限制：
   * 1. 突发限制 - 防止短时间内发送过多请求
   * 2. 标准限制 - 确保请求间隔合理
   * 
   * 特性：
   * - 自动清理过期的请求时间戳
   * - 添加随机抖动（±50ms）使请求更自然
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    
    // 清理过期的请求时间戳（超过 1 分钟）
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000)
    
    // 检查突发限制 - 如果最近请求过多，等待更长时间
    if (this.requestTimes.length >= this.burstLimit) {
      const oldestRecentRequest = Math.min(...this.requestTimes)
      const waitTime = 60000 - (now - oldestRecentRequest) + 100  // 等待突发窗口重置
      if (waitTime > 0) {
        logger.debug(`速率限制突发保护：等待 ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    // 标准速率限制
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      const sleepTime = this.minRequestInterval - timeSinceLastRequest
      logger.debug(`速率限制：等待 ${sleepTime}ms`)
      await new Promise(resolve => setTimeout(resolve, sleepTime))
    }
    
    // 添加随机抖动使请求更自然（±50ms）
    const jitter = Math.random() * 100 - 50
    if (jitter > 0) {
      await new Promise(resolve => setTimeout(resolve, jitter))
    }
    
    this.lastRequestTime = Date.now()
    this.requestTimes.push(this.lastRequestTime)
  }

  /**
   * 执行查询的核心方法
   * 
   * 实际发起 HTTP 请求的内部方法
   * 
   * @param query - GraphQL 查询字符串
   * @param variables - 查询变量（可选）
   * @param _timeout - 超时时间（可选）
   * @returns 查询结果
   */
  private async executeQuery<T>(
    query: string,
    variables?: Record<string, unknown>,
    _timeout?: number
  ): Promise<T> {
    // 在请求前添加速率限制（与 Python 库行为一致）
    await this.rateLimit()
    
    // 确保有有效会话
    await this.auth.ensureValidSession()
    
    const token = this.auth.getToken()
    const deviceUuid = this.auth.getDeviceUuid()
    
    if (!token) {
      throw new MonarchAPIError('没有可用的认证令牌')
    }

    const requestBody = {
      query: query.trim(),
      variables: variables || {},
      operationName: null  // Web UI 在未指定操作名时发送 null
    }

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Client-Platform': 'web',  // 修正：与 Python 大小写完全一致
      'Origin': 'https://app.monarchmoney.com',
      'device-uuid': deviceUuid || this.auth.getDeviceUuid() || 'unknown',
      'x-cio-client-platform': 'web',
      'x-cio-site-id': '2598be4aa410159198b2',
      'x-gist-user-anonymous': 'false'
    }

    // 调试：记录 GraphQL 请求详情
    const safeHeaders = { ...requestHeaders }
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = 'Token ***'
    }
    logger.debug('GraphQL 请求详情:', {
      url: this.baseUrl,
      headers: safeHeaders,
      body: requestBody
    })

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    })

    // 调试：记录响应详情
    logger.debug(`GraphQL 响应: ${response.status} ${response.statusText}`)

    // 先获取响应文本以便记录，然后处理错误
    const responseText = await response.text()
    logger.debug('GraphQL 响应体:', responseText)

    if (response.status >= 400) {
      handleHTTPResponse(response)
    }

    let data: GraphQLResponse<T>
    try {
      data = JSON.parse(responseText) as GraphQLResponse<T>
    } catch (parseError) {
      logger.error('无法解析 GraphQL 响应为 JSON:', parseError)
      throw new MonarchAPIError(`无效的 JSON 响应: ${responseText}`)
    }

    if (data.errors && data.errors.length > 0) {
      this.handleGraphQLErrors(data.errors)
    }

    if (!data.data) {
      throw new MonarchGraphQLError('GraphQL 查询未返回数据')
    }

    return data.data
  }

  /**
   * 处理 GraphQL 错误
   * 
   * 解析错误响应，识别认证错误并清除会话
   * 
   * @param errors - GraphQL 错误数组
   * @throws 始终抛出错误
   */
  private handleGraphQLErrors(errors: GraphQLError[]): never {
    const firstError = errors[0]
    const message = firstError.message || 'GraphQL 错误发生'

    // 检查认证错误
    if (message.toLowerCase().includes('unauthorized') || 
        message.toLowerCase().includes('authentication') ||
        message.toLowerCase().includes('token')) {
      // 清除会话并抛出认证错误
      this.auth.deleteSession()
      throw new MonarchAPIError('认证失败 - 会话已过期', 401)
    }

    // 记录所有错误用于调试
    logger.error('GraphQL 错误:', errors)

    throw new MonarchGraphQLError(message, errors)
  }

  /**
   * 生成缓存键
   * 
   * 根据操作类型、操作字符串和变量生成唯一缓存键
   * 
   * @param type - 操作类型（'query' 或 'mutation'）
   * @param operation - 操作字符串
   * @param variables - 变量对象（可选）
   * @returns 缓存键字符串
   */
  private generateCacheKey(
    type: 'query' | 'mutation',
    operation: string,
    variables?: Record<string, unknown>
  ): string {
    const operationName = this.extractOperationName(operation) || type
    
    // 如果没有变量，返回操作名
    if (!variables || Object.keys(variables).length === 0) {
      return operationName
    }

    // 对变量进行排序以确保缓存一致性
    const sortedVars = Object.keys(variables)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = variables[key]
        return sorted
      }, {} as Record<string, unknown>)

    return `${operationName}:${JSON.stringify(sortedVars)}`
  }

  /**
   * 提取操作名称
   * 
   * 从 GraphQL 查询或变更字符串中提取操作名称
   * 
   * @param operation - GraphQL 操作字符串
   * @returns 操作名称，如果没有找到则返回 null
   */
  private extractOperationName(operation: string): string | null {
    // 从 GraphQL 查询/变更中提取操作名称
    const match = operation.match(/(?:query|mutation)\s+(\w+)/)
    return match ? match[1] : null
  }

  /**
   * 使变更相关的缓存失效
   * 
   * 根据变更类型智能失效相关缓存条目
   * 
   * @param mutation - GraphQL 变更字符串
   * @param variables - 变更变量（可选）
   */
  private invalidateMutationCache(mutation: string, variables?: Record<string, unknown>): void {
    if (!this.cache) return

    const operationName = this.extractOperationName(mutation)
    if (!operationName) return

    // 基于变更类型构建失效模式
    const invalidationPatterns: string[] = []

    // 交易相关变更
    if (operationName.toLowerCase().includes('transaction')) {
      invalidationPatterns.push(
        '^GetTransactions',
        '^GetTransactionsSummary',
        '^GetCashflow'
      )

      // 如果是特定账户的变更，使账户相关缓存失效
      if (variables?.accountId) {
        invalidationPatterns.push(`GetAccount.*${variables.accountId}`)
      }
    }

    // 账户相关变更
    if (operationName.toLowerCase().includes('account')) {
      invalidationPatterns.push(
        '^GetAccounts',
        '^GetNetWorth',
        '^GetAccountHistory'
      )
    }

    // 预算相关变更
    if (operationName.toLowerCase().includes('budget')) {
      invalidationPatterns.push(
        '^GetBudgets',
        '^GetCashflow'
      )
    }

    // 分类相关变更
    if (operationName.toLowerCase().includes('category')) {
      invalidationPatterns.push(
        '^GetTransactionCategories',
        '^GetCategoryGroups'
      )
    }

    // 执行失效操作
    for (const pattern of invalidationPatterns) {
      const invalidated = this.cache.invalidatePattern(new RegExp(pattern))
      if (invalidated > 0) {
        logger.debug(`使 ${invalidated} 个匹配 ${pattern} 的缓存条目失效`)
      }
    }
  }

  /**
   * 批量查询
   * 
   * 并行执行多个查询
   * 
   * @param queries - 查询数组
   * @param options - 请求选项
   * @returns 结果数组（失败的结果为 undefined）
   */
  async batchQuery<T = unknown>(
    queries: Array<{
      query: string
      variables?: Record<string, unknown>
      operationName?: string
    }>,
    options: GraphQLRequestOptions = {}
  ): Promise<T[]> {
    const { timeout: _timeout = this.timeout, retries: _retries = 3 } = options

    // 并行执行查询
    const promises = queries.map(({ query, variables, operationName: _operationName }) => 
      this.query<T>(query, variables, { ...options, cache: false })
    )

    const results = await Promise.allSettled(promises)

    // 检查失败情况
    const failures = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')

    if (failures.length > 0) {
      logger.warn(`${failures.length} / ${queries.length} 个批量查询失败`)
      
      // 如果超过一半失败，抛出第一个错误
      if (failures.length > queries.length / 2) {
        const firstFailure = failures[0]
        if (firstFailure.result.status === 'rejected') {
          throw (firstFailure.result as PromiseRejectedResult).reason
        }
      }
    }

    // 返回成功结果（失败的结果为 undefined）
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : undefined
    ) as T[]
  }

  /**
   * 原始 GraphQL 执行
   * 
   * 执行未经处理的 GraphQL 请求
   * 
   * @param query - GraphQL 查询字符串
   * @param variables - 查询变量（可选）
   * @returns 完整的 GraphQL 响应
   */
  async raw<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    // 在请求前添加速率限制（与 Python 库行为一致）
    await this.rateLimit()
    
    await this.auth.ensureValidSession()
    
    const token = this.auth.getToken()
    const deviceUuid = this.auth.getDeviceUuid()
    
    if (!token) {
      throw new MonarchAPIError('没有可用的认证令牌')
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Client-Platform': 'web',  // 修正：与 Python 大小写完全一致
        'Origin': 'https://app.monarchmoney.com',
        'device-uuid': deviceUuid || this.auth.getDeviceUuid() || 'unknown',
        'x-cio-client-platform': 'web',
        'x-cio-site-id': '2598be4aa410159198b2',
        'x-gist-user-anonymous': 'false'
      },
      body: JSON.stringify({
        query: query.trim(),
        variables: variables || {}
      })
    })

    handleHTTPResponse(response)

    return await response.json() as GraphQLResponse<T>
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache?.clear()
    logger.debug('GraphQL 缓存已清除')
  }

  /**
   * 执行带队列管理的请求
   * 
   * 实现并发控制，当活跃请求数达到上限时将请求加入队列
   * 
   * @param execute - 执行函数
   * @returns 结果 Promise
   */
  private async executeWithQueue<T>(execute: () => Promise<T>): Promise<T> {
    // 如果未达到并发限制，立即执行
    if (this.activeRequestCount < this.maxConcurrentRequests) {
      this.activeRequestCount++
      try {
        const result = await execute()
        return result
      } finally {
        this.activeRequestCount--
        // 处理队列中的请求
        this.processQueue()
      }
    }

    // 否则将请求加入队列
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        execute: async () => {
          try {
            const result = await execute()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  }

  /**
   * 处理请求队列
   * 
   * 当有空闲并发槽位时，处理队列中的请求
   */
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    // 当有空闲并发槽位时处理请求
    while (this.requestQueue.length > 0 && this.activeRequestCount < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift()
      if (request) {
        this.activeRequestCount++
        
        // 异步执行请求
        request.execute().finally(() => {
          this.activeRequestCount--
          // 继续处理队列
          setImmediate(() => this.processQueue())
        })
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * 获取性能统计
   * 
   * 返回缓存和请求的性能统计信息
   * 
   * @returns 性能统计对象
   */
  getPerformanceStats(): {
    cacheStats: ReturnType<MultiLevelCache['getStats']> | null
    requestStats: {
      activeRequests: number
      queuedRequests: number
      deduplicatedRequests: number
      averageRequestInterval: number
      burstProtectionEngagements: number
    }
  } {
    // 计算最近请求的平均间隔
    const recentRequests = this.requestTimes.slice(-10)
    let averageInterval = 0
    if (recentRequests.length > 1) {
      const intervals = []
      for (let i = 1; i < recentRequests.length; i++) {
        intervals.push(recentRequests[i] - recentRequests[i - 1])
      }
      averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    }

    return {
      cacheStats: this.cache?.getStats() || null,
      requestStats: {
        activeRequests: this.activeRequestCount,
        queuedRequests: this.requestQueue.length,
        deduplicatedRequests: this.requestDeduplication.size,
        averageRequestInterval: Math.round(averageInterval),
        burstProtectionEngagements: 0  // 可以为此添加计数器
      }
    }
  }

  /**
   * 获取缓存统计（向后兼容）
   * 
   * @returns 缓存统计信息
   */
  getCacheStats(): ReturnType<MultiLevelCache['getStats']> | null {
    return this.cache?.getStats() || null
  }

  /**
   * 预加载常用查询
   * 
   * 预加载常用查询以提高性能
   */
  async preloadCommonQueries(): Promise<void> {
    const commonQueries = [
      { query: 'query GetMe { me { id email displayName } }' },
      { query: 'query GetCategories { categories { id name icon } }' },
      { query: 'query GetAccounts { accounts { id displayName displayType } }' }
    ]

    logger.debug('预加载常用查询以提高性能...')
    
    const preloadPromises = commonQueries.map(({ query }) => 
      this.query(query, {}, { cache: true, cacheTTL: 300000 })  // 5 分钟缓存
        .catch(error => {
          logger.debug(`查询预加载失败: ${error.message}`)
          return null
        })
    )

    await Promise.allSettled(preloadPromises)
    logger.debug('常用查询已预加载')
  }
}
