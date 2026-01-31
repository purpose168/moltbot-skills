// 导入认证模块 - 处理用户登录、MFA 和会话管理
import { AuthenticationService, LoginOptions, MFAOptions } from './auth'
// 导入直接认证服务 - 使用已验证可行的认证方法
import { DirectAuthenticationService, DirectLoginOptions } from './auth/DirectAuthenticationService'
// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from './graphql'
// 导入多级缓存系统 - 支持内存和持久化缓存
import { MultiLevelCache } from '../cache'
// 导入各功能 API 实现模块
import { AccountsAPIImpl } from '../api/accounts'
import { TransactionsAPIImpl } from '../api/transactions'
import { BudgetsAPIImpl } from '../api/budgets'
import { CategoriesAPIImpl } from '../api/categories'
import { CashflowAPIImpl } from '../api/cashflow'
import { RecurringAPIImpl } from '../api/recurring'
import { InstitutionsAPIImpl } from '../api/institutions'
import { InsightsAPIImpl } from '../api/insights'
// 导入工具函数 - 环境变量获取、日志记录和深度合并
import { 
  getEnvironmentVariable,
  logger,
  deepMerge
} from '../utils'
// 导入类型定义 - 配置、会话信息等
import { MonarchConfig, /* CacheConfig, */ SessionInfo } from '../types'

// 默认配置 - 提供合理的初始值
const DEFAULT_CONFIG: Required<MonarchConfig> = {
  email: '',
  password: '',
  sessionToken: '',
  baseURL: 'https://api.monarchmoney.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: {
    memoryTTL: {
      accounts: 300000,     // 5 分钟 - 账户信息缓存时间
      categories: 1800000,  // 30 分钟 - 分类信息缓存时间
      transactions: 120000, // 2 分钟 - 交易记录缓存时间
      budgets: 600000,      // 10 分钟 - 预算信息缓存时间
    },
    persistentTTL: {
      session: 86400000,    // 24 小时 - 会话信息持久化时间
      userProfile: 3600000, // 1 小时 - 用户资料持久化时间
    },
    autoInvalidate: true,   // 自动失效缓存
    maxMemorySize: 100,     // MB - 最大内存缓存大小
  },
  enablePersistentCache: true,  // 启用持久化缓存
  cacheEncryptionKey: '',       // 缓存加密密钥（用于敏感数据保护）
  logLevel: 'info',             // 日志级别
  logger: logger,               // 日志记录器实例
  rateLimit: {
    requestsPerMinute: 60,      // 每分钟请求数限制
    burstLimit: 10,             // 突发请求限制
  },
}

/**
 * MonarchClient 类 - Monarch Money API 的主要客户端
 * 
 * 该类是整个库的入口点，负责：
 * - 管理认证流程（登录、MFA、会话）
 * - 协调 GraphQL 客户端与各功能 API 模块
 * - 处理缓存策略（内存 + 持久化）
 * - 提供统一的接口访问所有 Monarch Money 功能
 * 
 * 使用示例：
 * ```typescript
 * import { MonarchClient } from 'monarch-money'
 * 
 * const client = new MonarchClient({
 *   email: 'user@example.com',
 *   password: 'password'
 * })
 * 
 * await client.login()
 * const accounts = await client.accounts.getAll()
 * ```
 */
export class MonarchClient {
  // 私有配置对象 - 存储当前客户端的所有配置
  private config: Required<MonarchConfig>
  // 认证服务 - 处理标准登录流程
  private auth: AuthenticationService
  // 直接认证服务 - 使用已验证的认证方法
  private directAuth: DirectAuthenticationService
  // GraphQL 客户端 - 负责所有 API 请求
  private graphql: GraphQLClient
  // 多级缓存系统 - 可选（如果未启用持久化缓存则为 undefined）
  private cache?: MultiLevelCache

  // 公开 API 模块 - 提供对各功能模块的访问
  public accounts: AccountsAPIImpl      // 账户管理模块
  public transactions: TransactionsAPIImpl  // 交易管理模块
  public budgets: BudgetsAPIImpl         // 预算管理模块
  public categories: CategoriesAPIImpl   // 分类管理模块
  public cashflow: CashflowAPIImpl       // 现金流分析模块
  public recurring: RecurringAPIImpl     // 周期性交易模块
  public institutions: InstitutionsAPIImpl  // 金融机构模块
  public insights: InsightsAPIImpl       // 洞察报告模块

  /**
   * 构造函数 - 初始化 MonarchClient 实例
   * @param config - 可选的用户配置对象，将与默认配置合并
   */
  constructor(config: MonarchConfig = {}) {
    // 构建配置：合并默认配置、环境变量和用户配置
    this.config = this.buildConfig(config)
    
    // 如果启用持久化缓存，则初始化缓存系统
    if (this.config.enablePersistentCache) {
      this.cache = new MultiLevelCache(this.config.cache, this.config.cacheEncryptionKey)
    }

    // 初始化认证服务
    this.auth = new AuthenticationService(
      this.config.baseURL,
      undefined
    )

    // 初始化直接认证服务，共享会话存储
    // 需要访问认证服务的私有 sessionStorage 属性
    this.directAuth = new DirectAuthenticationService(
      this.config.baseURL,
      (this.auth as any).sessionStorage  // 访问私有属性以实现共享存储
    )

    // 初始化 GraphQL 客户端，传入基础 URL、认证服务和缓存
    this.graphql = new GraphQLClient(
      this.config.baseURL,
      this.auth,
      this.cache,
      this.config.timeout
    )

    // 初始化各功能 API 模块
    this.accounts = new AccountsAPIImpl(this.graphql)
    this.transactions = new TransactionsAPIImpl(this.graphql)
    this.budgets = new BudgetsAPIImpl(this.graphql)
    this.categories = new CategoriesAPIImpl(this.graphql)
    this.cashflow = new CashflowAPIImpl(this.graphql)
    this.recurring = new RecurringAPIImpl(this.graphql)
    this.institutions = new InstitutionsAPIImpl(this.graphql)
    this.insights = new InsightsAPIImpl(this.graphql)

    // 记录初始化信息
    logger.info('MonarchClient 初始化完成', {
      baseURL: this.config.baseURL,
      cacheEnabled: !!this.cache,
      timeout: this.config.timeout
    })
  }

  /**
   * 构建配置 - 合并默认配置、环境变量和用户配置
   * 优先级：默认配置 < 环境变量 < 用户配置
   * 
   * @param userConfig - 用户提供的配置
   * @returns 完整的 Required<MonarchConfig> 配置对象
   */
  private buildConfig(userConfig: MonarchConfig): Required<MonarchConfig> {
    // 从默认配置开始
    let config = { ...DEFAULT_CONFIG }

    // 从环境变量构建配置
    const envConfig: MonarchConfig = {
      email: getEnvironmentVariable('MONARCH_EMAIL'),
      password: getEnvironmentVariable('MONARCH_PASSWORD'),
      sessionToken: getEnvironmentVariable('MONARCH_SESSION_TOKEN'),
      baseURL: getEnvironmentVariable('MONARCH_BASE_URL'),
      cacheEncryptionKey: getEnvironmentVariable('MONARCH_CACHE_ENCRYPTION_KEY'),
      logLevel: getEnvironmentVariable('MONARCH_LOG_LEVEL') as 'debug' | 'info' | 'warn' | 'error',
    }

    // 过滤掉未定义的环境变量值
    const cleanedEnvConfig = Object.fromEntries(
      Object.entries(envConfig).filter(([_, value]) => value !== undefined)
    )

    // 合并配置：默认配置 -> 环境变量 -> 用户配置
    config = deepMerge(config, cleanedEnvConfig)
    config = deepMerge(config, userConfig)

    return config as Required<MonarchConfig>
  }

  // ==================== 认证方法 ====================

  /**
   * 登录方法 - 使用凭据登录 Monarch Money 账户
   * 
   * 该方法会：
   * 1. 首先尝试使用保存的会话（如果可用）
   * 2. 如果没有有效会话，则进行完整登录流程
   * 3. 支持 MFA（多因素认证）
   * 
   * @param options - 可选的登录参数，包括邮箱、密码、MFA 密钥等
   */
  async login(options?: LoginOptions): Promise<void> {
    const loginOptions: LoginOptions = {
      email: options?.email || this.config.email,
      password: options?.password || this.config.password,
      useSavedSession: options?.useSavedSession ?? true,  // 默认使用保存的会话
      saveSession: options?.saveSession ?? true,          // 默认保存会话
      mfaSecretKey: options?.mfaSecretKey,
    }

    await this.auth.login(loginOptions)
  }

  /**
   * 交互式登录 - 从标准输入读取凭据
   * 适用于命令行环境
   * 
   * @param options - 登录选项（排除邮箱和密码）
   */
  async interactiveLogin(options?: Omit<LoginOptions, 'email' | 'password'>): Promise<void> {
    await this.auth.interactiveLogin(options)
  }

  /**
   * 多因素认证 - 完成 MFA 验证流程
   * 
   * @param options - MFA 选项，包括 MFA 验证码
   */
  async multiFactorAuthenticate(options: MFAOptions): Promise<void> {
    await this.auth.multiFactorAuthenticate(options)
  }

  /**
   * 直接登录 - 使用已验证可行的认证方法
   * 
   * 该方法绕过复杂的重试逻辑，直接使用原始认证请求，
   * 适用于标准登录方法失败时的备选方案
   * 
   * @param options - 直接登录选项
   */
  async directLogin(options: DirectLoginOptions): Promise<void> {
    await this.directAuth.login(options)
  }

  // ==================== 会话管理方法 ====================

  /**
   * 验证会话 - 检查当前会话是否有效
   * 
   * @returns 如果会话有效则返回 true，否则返回 false
   */
  async validateSession(): Promise<boolean> {
    return await this.auth.validateSession()
  }

  /**
   * 检查会话是否过期 - 判断会话是否需要刷新
   * 
   * @returns 如果会话已过期则返回 true
   */
  isSessionStale(): boolean {
    return this.auth.isSessionStale()
  }

  /**
   * 确保会话有效 - 如果会话无效则尝试刷新
   * 
   * 该方法首先检查直接认证是否有有效会话，
   * 如果没有则回退到标准认证的会话刷新逻辑
   * 
   * @throws 如果会话无法刷新则抛出异常
   */
  async ensureValidSession(): Promise<void> {
    // 首先检查直接认证是否有有效会话
    const directSession = this.directAuth.getSessionInfo()
    if (directSession.isValid) {
      return // 直接认证会话有效，无需操作
    }
    
    // 回退到标准认证的会话刷新
    return await this.auth.ensureValidSession()
  }

  /**
   * 获取会话信息 - 返回当前会话的详细信息
   * 
   * 优先使用直接认证的会话信息，如果没有则使用标准认证的会话
   * 
   * @returns SessionInfo 对象，包含会话有效期、用户信息等
   */
  getSessionInfo(): SessionInfo {
    // 优先尝试直接认证的会话
    const directSession = this.directAuth.getSessionInfo()
    if (directSession.isValid) {
      return directSession
    }
    // 回退到主认证服务
    return this.auth.getSessionInfo()
  }

  /**
   * 保存会话 - 将当前会话信息持久化到存储
   */
  saveSession(): void {
    this.auth.saveSession()
  }

  /**
   * 加载会话 - 从存储加载保存的会话信息
   * 
   * @returns 如果成功加载会话则返回 true
   */
  loadSession(): boolean {
    return this.auth.loadSession()
  }

  /**
   * 删除会话 - 清除所有保存的会话信息
   * 
   * 调用后用户需要重新登录才能继续使用 API
   */
  deleteSession(): void {
    this.auth.deleteSession()
    this.directAuth.deleteSession()
  }

  // ==================== GraphQL 查询方法 ====================

  /**
   * 执行 GraphQL 查询
   * 
   * @param _operation - 操作名称（仅用于日志记录）
   * @param query - GraphQL 查询字符串
   * @param variables - 可选的查询变量
   * @returns 查询结果的泛型类型
   */
  async gqlCall<T = unknown>(
    _operation: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return await this.graphql.query<T>(query, variables)
  }

  /**
   * 执行 GraphQL 变更（Mutation）
   * 
   * @param _operation - 操作名称（仅用于日志记录）
   * @param mutation - GraphQL 变更字符串
   * @param variables - 可选的变更变量
   * @returns 变更结果的泛型类型
   */
  async gqlMutation<T = unknown>(
    _operation: string,
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return await this.graphql.mutation<T>(mutation, variables)
  }

  /**
   * 获取 GraphQL 客户端 - 高级用法，如模式发现
   * 
   * @returns GraphQLClient 实例
   */
  getGraphQLClient(): GraphQLClient {
    return this.graphql
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 清除缓存 - 清空所有缓存数据
   * 
   * 包括内存缓存和持久化缓存
   */
  clearCache(): void {
    this.cache?.clear()
    this.graphql.clearCache()
  }

  /**
   * 获取缓存统计信息 - 返回缓存使用情况
   * 
   * @returns 缓存统计对象，如果缓存未启用则返回 null
CacheStats(): Return   */
  getType<MultiLevelCache['getStats']> | null {
    return this.cache?.getStats() || null
  }

  /**
   * 预加载缓存 - 提前加载指定数据到缓存
   * 
   * 用于在用户请求前预先填充缓存，提高响应速度
   * 
   * @param operations - 预加载操作数组，每个操作包含查询参数和工厂函数
   */
  async preloadCache(operations: Array<{
    operation: string
    params?: Record<string, unknown>
    factory: () => Promise<unknown>
  }>): Promise<void> {
    if (this.cache) {
      await this.cache.preloadCache(operations)
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 获取版本信息 - 返回当前库版本和会话信息
   * 
   * @returns 包含版本号和会话信息的对象
   */
  getVersion(): { version: string; sessionInfo: SessionInfo } {
    return {
      version: '1.0.0',
      sessionInfo: this.getSessionInfo()
    }
  }

  /**
   * 设置超时时间 - 调整 API 请求超时时间
   * 
   * 注意：要应用新的超时时间，需要重新创建 GraphQL 客户端
   * 
   * @param timeoutMs - 超时时间（毫秒）
   */
  setTimeout(timeoutMs: number): void {
    this.config.timeout = timeoutMs
    // 注意：需要重新创建 GraphQL 客户端才能应用新的超时时间
    logger.info(`超时时间已更新为 ${timeoutMs}ms`)
  }

  /**
   * 设置令牌 - 更新会话令牌
   * 
   * 注意：需要将此令牌传递给认证服务才能生效
   * 
   * @param token - 新的会话令牌
   */
  setToken(token: string): void {
    this.config.sessionToken = token
    // 注意：需要将此令牌传递给认证服务
    logger.info('令牌已更新')
  }

  // ==================== 清理方法 ====================

  /**
   * 关闭客户端 - 释放资源，关闭缓存连接
   * 
   * 在完成所有操作后调用，以确保正确清理资源
   */
  async close(): Promise<void> {
    this.cache?.close()
    logger.info('MonarchClient 已关闭')
  }

  // ==================== 兼容性方法（别名） ====================

  /**
   * 获取账户（兼容性方法）
   * 
   * 为向后兼容提供的别名方法
   * 
   * @param includeHidden - 是否包含隐藏账户
   * @returns 账户列表
   */
  async get_accounts(includeHidden?: boolean): Promise<ReturnType<AccountsAPIImpl['getAll']>> {
    return this.accounts.getAll({ includeHidden })
  }

  /**
   * 获取当前用户信息
   * 
   * 返回当前登录用户的详细资料信息
   * 
   * @returns 用户资料对象
   */
  async get_me(): Promise<unknown> {
    // 获取用户信息的 GraphQL 查询
    const GET_ME_QUERY = `
      query Common_GetMe {
        me {
          id
          birthday
          email
          isSuperuser
          name
          timezone
          hasPassword
          hasMfaOn
          externalAuthProviderNames
          pendingEmailUpdateVerification {
            email
            __typename
          }
          profilePicture {
            id
            cloudinaryPublicId
            thumbnailUrl
            __typename
          }
          profilePictureUrl
          activeSupportAccountAccessGrant {
            id
            createdAt
            expiresAt
            __typename
          }
          profile {
            id
            hasSeenCategoriesManagementTour
            dismissedTransactionsListUpdatesTourAt
            viewedMarkAsReviewedUpdatesCalloutAt
            hasDismissedWhatsNewAt
            __typename
          }
          __typename
        }
      }
    `

    return await this.graphql.query<{
      me: {
        id: string
        birthday?: string
        email: string
        isSuperuser?: boolean
        name?: string
        timezone: string
        hasPassword?: boolean
        hasMfaOn?: boolean
        externalAuthProviderNames?: string[]
        pendingEmailUpdateVerification?: {
          email: string
          __typename: string
        }
        profilePicture?: {
          id: string
          cloudinaryPublicId: string
          thumbnailUrl: string
          __typename: string
        }
        profilePictureUrl?: string
        activeSupportAccountAccessGrant?: {
          id: string
          createdAt: string
          expiresAt: string
          __typename: string
        }
        profile?: {
          id: string
          hasSeenCategoriesManagementTour?: boolean
          dismissedTransactionsListUpdatesTourAt?: string
          viewedMarkAsReviewedUpdatesCalloutAt?: string
          hasDismissedWhatsNewAt?: string
          __typename: string
        }
        __typename: string
      }
    }>(GET_ME_QUERY).then(response => response.me)
  }

  // ==================== 环境检测方法 ====================

  /**
   * 检测是否在 Node.js 环境中运行
   * 
   * @returns 如果在 Node.js 中运行则返回 true
   */
  static isNode(): boolean {
    return typeof process !== 'undefined' && process.versions?.node !== undefined
  }

  /**
   * 检测是否在浏览器环境中运行
   * 
   * @returns 如果在浏览器中运行则返回 true
   */
  static isBrowser(): boolean {
    return typeof globalThis !== 'undefined' && 
           typeof (globalThis as any).window !== 'undefined' && 
           typeof (globalThis as any).window.document !== 'undefined'
  }

  // ==================== 静态工厂方法 ====================

  /**
   * 创建客户端实例 - 静态工厂方法
   * 
   * @param config - 可选的配置对象
   * @returns 新的 MonarchClient 实例
   */
  static create(config?: MonarchConfig): MonarchClient {
    return new MonarchClient(config)
  }

  /**
   * 创建并登录 - 静态工厂方法，一次性创建客户端并登录
   * 
   * 便捷方法，适用于需要立即开始使用的场景
   * 
   * @param config - 包含 email 和 password 的配置对象
   * @returns 已登录的 MonarchClient 实例
   */
  static async createAndLogin(config: MonarchConfig & { 
    email: string
    password: string 
  }): Promise<MonarchClient> {
    const client = new MonarchClient(config)
    await client.login({
      email: config.email,
      password: config.password
    })
    return client
  }
}
