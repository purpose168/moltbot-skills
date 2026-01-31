/**
 * MonarchMoney 核心 TypeScript 类型定义
 * Core MonarchMoney TypeScript Types and Interfaces
 * 
 * 此模块定义了 MonarchMoney API 的所有核心类型接口
 * 包含配置、账户、交易、预算、投资、现金流等业务实体的类型定义
 */

export interface MonarchConfig {
  // ========== 认证配置 - Authentication ==========
  email?: string              // 用户邮箱地址
  password?: string           // 用户密码
  sessionToken?: string       // 会话令牌（可替代邮箱密码认证）
  
  // ========== API 设置 - API Settings ==========
  baseURL?: string            // API 基础URL（默认为生产环境）
  timeout?: number            // 请求超时时间（毫秒）
  retries?: number            // 请求失败重试次数
  retryDelay?: number         // 重试间隔时间（毫秒）
  
  // ========== 缓存配置 - Caching ==========
  cache?: CacheConfig         // 缓存配置对象
  enablePersistentCache?: boolean   // 是否启用持久化缓存
  cacheEncryptionKey?: string       // 缓存加密密钥（用于持久化缓存加密存储）
  
  // ========== 日志配置 - Logging ==========
  logLevel?: 'debug' | 'info' | 'warn' | 'error'   // 日志级别
  logger?: Logger           // 自定义日志记录器实例
  
  // ========== 速率限制配置 - Rate Limiting ==========
  rateLimit?: {
    requestsPerMinute: number   // 每分钟允许的请求数
    burstLimit: number          // 突发请求上限
  }
}

/**
 * 缓存配置接口
 * 定义内存缓存和持久化缓存的时间策略
 */
export interface CacheConfig {
  // ========== 内存缓存设置 - In-memory cache settings ==========
  memoryTTL: {
    accounts: number      // 账户缓存存活时间（5分钟，账户数据相对稳定）
    categories: number    // 分类缓存存活时间（30分钟，分类数据基本不变）
    transactions: number  // 交易缓存存活时间（2分钟，交易数据频繁更新）
    budgets: number       // 预算缓存存活时间（10分钟）
  }
  
  // ========== 持久化缓存设置 - Persistent cache settings ==========
  persistentTTL: {
    session: number       // 会话数据存活时间（24小时）
    userProfile: number   // 用户资料存活时间（1小时）
  }
  
  // ========== 缓存失效策略 - Cache invalidation ==========
  autoInvalidate: boolean   // 是否在写入操作时自动失效缓存
  maxMemorySize: number     // 最大内存缓存大小（MB）
}

/**
 * 日志记录器接口
 * 定义日志输出方法的签名
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void   // 调试日志
  info(message: string, ...args: unknown[]): void    // 信息日志
  warn(message: string, ...args: unknown[]): void    // 警告日志
  error(message: string, ...args: unknown[]): void   // 错误日志
}

// ========== 账户类型 - Account Types ==========
export interface Account {
  id: string                       // 唯一标识符
  displayName: string              // 显示名称
  syncDisabled: boolean            // 是否禁用同步
  deactivatedAt?: string           // 停用时间（ISO日期字符串）
  isHidden: boolean                // 是否隐藏
  isAsset: boolean                 // 是否为资产账户
  includeInNetWorth: boolean       // 是否计入净资产
  currentBalance: number           // 当前余额
  availableBalance?: number        // 可用余额
  dataProvider: string             // 数据提供商标识
  dataProviderAccountId?: string   // 数据提供商账户ID
  institutionName: string          // 机构名称
  mask?: string                    // 账户尾号（脱敏处理）
  createdAt: string                // 创建时间（ISO日期字符串）
  updatedAt: string                // 更新时间（ISO日期字符串）
  importedFromMint: boolean        // 是否从Mint导入
  accountTypeId: number            // 账户类型ID
  accountSubtypeId: number         // 账户子类型ID
  type: {                          // 账户类型信息
    id: number
    name: string
    display: string
  }
  subtype: {                       // 账户子类型信息
    id: number
    name: string
    display: string
  }
  credential?: {                   // 凭证信息（用于账户连接）
    id: string
    institutionId: string
    institutionName: string
  }
}

/**
 * 账户余额记录
 * 用于跟踪账户在不同时间点的余额
 */
export interface AccountBalance {
  accountId: string     // 账户ID
  date: string          // 日期（ISO日期字符串）
  balance: number       // 余额
}

// ========== 交易类型 - Transaction Types ==========
export interface Transaction {
  id: string                       // 唯一标识符
  amount: number                   // 交易金额（正数为收入，负数为支出）
  date: string                     // 交易日期（ISO日期字符串）
  merchantName: string             // 商户名称
  categoryId?: string              // 分类ID
  category?: TransactionCategory   // 分类详情
  accountId: string                // 关联账户ID
  account: Account                 // 账户详情
  notes?: string                   // 备注
  isRecurring: boolean             // 是否为周期性交易
  needsReview: boolean             // 是否需要审核
  reviewedAt?: string              // 审核时间
  createdAt: string                // 创建时间
  updatedAt: string                // 更新时间
  importedFromMint: boolean        // 是否从Mint导入
  plaidTransactionId?: string      // Plaid交易ID
  dataProvider: string             // 数据提供商
  dataProviderTransactionId?: string  // 数据提供商交易ID
  hasTags: boolean                 // 是否有标签
  tags?: TransactionTag[]          // 标签列表
  isHidden: boolean                // 是否隐藏
  hiddenAt?: string                // 隐藏时间
  isSplit: boolean                 // 是否为拆分交易
  splits?: TransactionSplit[]      // 拆分详情
  originalDescription?: string     // 原始描述
  isCashIn: boolean                // 是否为现金收入
  isCashOut: boolean               // 是否为现金支出
}

/**
 * 交易分类
 * 用于对交易进行分类管理的结构
 */
export interface TransactionCategory {
  id: string                       // 唯一标识符
  name: string                     // 名称（英文标识）
  displayName?: string             // 显示名称
  shortName?: string               // 短名称
  icon?: string                    // 图标标识
  color?: string                   // 颜色（十六进制颜色码）
  order: number                    // 排序顺序
  isDefault?: boolean              // 是否为默认分类
  isDisabled?: boolean             // 是否已禁用
  isSystemCategory?: boolean       // 是否为系统分类
  groupId?: string                 // 分类组ID
  group?: CategoryGroup            // 分类组详情
  parentCategoryId?: string        // 父分类ID
  parentCategory?: TransactionCategory   // 父分类详情
  childCategories?: TransactionCategory[]  // 子分类列表
  createdAt?: string               // 创建时间
  updatedAt?: string               // 更新时间
}

/**
 * 交易分类组
 * 对分类进行逻辑分组的结构
 */
export interface TransactionCategoryGroup {
  id: string     // 唯一标识符
  name: string   // 名称
  type: string   // 类型（如：expense、income）
}

/**
 * 交易标签
 * 用于标记和分组交易的标签
 */
export interface TransactionTag {
  id: string         // 唯一标识符
  name: string       // 标签名称
  color?: string     // 标签颜色
  order?: number     // 排序顺序
  isDefault?: boolean   // 是否为默认标签
  createdAt?: string    // 创建时间
  updatedAt?: string    // 更新时间
}

/**
 * 交易拆分
 * 将一笔交易拆分为多个分类记录
 */
export interface TransactionSplit {
  id: string                 // 唯一标识符
  amount: number             // 拆分金额
  categoryId?: string        // 分类ID
  category?: TransactionCategory   // 分类详情
  notes?: string             // 备注
}

/**
 * 交易规则
 * 定义自动分类和处理的规则
 */
export interface TransactionRule {
  id: string                           // 唯一标识符
  conditions: TransactionRuleCondition[]   // 条件列表
  actions: TransactionRuleAction[]         // 动作列表
  applyToExistingTransactions: boolean     // 是否应用于现有交易
  createdAt: string                      // 创建时间
  updatedAt: string                      // 更新时间
}

/**
 * 交易规则条件
 * 定义规则匹配的条件
 */
export interface TransactionRuleCondition {
  field: string                    // 匹配字段
  operation: string                // 操作符（如：equals、contains、regex）
  value: string | number | string[]   // 匹配值
}

/**
 * 交易规则动作
 * 定义匹配后执行的动作
 */
export interface TransactionRuleAction {
  field: string                    // 目标字段
  value: string | number | string[]   // 设置值
}

// ========== 预算类型 - Budget Types ==========
export interface Budget {
  id: string              // 唯一标识符
  startDate: string       // 预算开始日期
  endDate: string         // 预算结束日期
  categories: BudgetCategory[]   // 预算分类列表
}

/**
 * 预算分类
 * 定义每个分类的预算额度
 */
export interface BudgetCategory {
  id: string                     // 唯一标识符
  name: string                   // 分类名称
  budgetAmount: number           // 预算金额
  spentAmount: number            // 已支出金额
  remainingAmount: number        // 剩余金额
  percentSpent: number           // 已花费百分比
  isFlexible: boolean            // 是否为灵活预算
  flexibleAmounts?: BudgetFlexMonthlyAmounts[]   // 灵活预算月度金额
}

/**
 * 灵活预算月度金额
 * 定义灵活预算在各月的具体金额
 */
export interface BudgetFlexMonthlyAmounts {
  month: string   // 月份（YYYY-MM格式）
  amount: number  // 金额
}

// ========== 目标类型 - Goal Types ==========
export interface Goal {
  id: string              // 唯一标识符
  name: string            // 目标名称
  targetAmount: number    // 目标金额
  currentAmount: number   // 当前金额
  targetDate?: string     // 目标日期
  createdAt: string       // 创建时间
  updatedAt: string       // 更新时间
  completedAt?: string    // 完成时间
}

// ========== 投资类型 - Investment Types ==========
export interface Holding {
  id: string                    // 唯一标识符
  accountId: string             // 账户ID
  securityId: string            // 证券ID
  security: Security            // 证券详情
  quantity: number              // 持有数量
  price: number                 // 当前价格
  value: number                 // 当前价值
  costBasis?: number            // 成本基准
  unrealizedGainLoss?: number   // 未实现损益
  percentOfPortfolio: number    // 投资组合占比
}

/**
 * 证券信息
 * 定义股票、债券等证券的基本信息
 */
export interface Security {
  id: string         // 唯一标识符
  symbol: string     // 交易代码
  name: string       // 证券名称
  type: string       // 证券类型
  price: number      // 当前价格
  priceDate: string  // 价格日期
}

// ========== 现金流类型 - Cashflow Types ==========
export interface CashflowSummary {
  income: number                  // 收入总额
  expenses: number                // 支出总额
  netCashflow: number             // 净现金流（收入-支出）
  period: string                  // 期间
  categories: CategoryCashflow[]  // 分类现金流详情
}

/**
 * 分类现金流
 * 定义每个分类的现金流情况
 */
export interface CategoryCashflow {
  categoryId: string        // 分类ID
  categoryName: string      // 分类名称
  amount: number            // 金额
  transactionCount: number  // 交易数量
}

/**
 * 月度现金流
 * 定义每月的现金流汇总
 */
export interface MonthlyCashflow {
  month: string      // 月份（YYYY-MM格式）
  income: number     // 收入
  expenses: number   // 支出
  netCashflow: number   // 净现金流
}

// ========== 周期性交易类型 - Recurring Transaction Types ==========
export interface RecurringTransaction {
  id: string                    // 唯一标识符
  merchantName: string          // 商户名称
  amount: number                // 金额
  categoryId?: string           // 分类ID
  category?: TransactionCategory   // 分类详情
  frequency: string             // 频率（如：weekly、monthly、yearly）
  nextDate: string              // 下次发生日期
  isActive: boolean             // 是否活跃
}

// ========== 用户资料类型 - User Profile Types ==========
export interface UserProfile {
  id: string              // 唯一标识符
  email: string           // 邮箱地址
  firstName?: string      // 名
  lastName?: string       // 姓
  timezone: string        // 时区
  subscriptionType: string   // 订阅类型
  isMfaEnabled: boolean   // 是否启用双因素认证
  createdAt: string       // 创建时间
}

// ========== 账单类型 - Bill Types ==========
export interface Bill {
  id: string                    // 唯一标识符
  merchantName: string          // 商户名称
  amount?: number               // 金额
  dueDate: string               // 到期日期
  categoryId?: string           // 分类ID
  category?: TransactionCategory   // 分类详情
  isPaid: boolean               // 是否已支付
}

// ========== 机构类型 - Institution Types ==========
export interface Institution {
  id: string       // 唯一标识符
  name: string     // 机构名称
  logo?: string    // 机构Logo URL
  url?: string     // 机构网站
}

// ========== 商户类型 - Merchant Types ==========
export interface Merchant {
  id: string               // 唯一标识符
  name: string             // 商户名称
  transactionCount: number // 交易数量
  logoUrl?: string         // Logo URL
}

// ========== 会话类型 - Session Types ==========
export interface SessionInfo {
  isValid: boolean           // 会话是否有效
  createdAt?: string         // 创建时间
  lastValidated?: string     // 最后验证时间
  isStale: boolean           // 会话是否过期
  expiresAt?: string         // 过期时间
  token?: string             // 会话令牌
  userId?: string            // 用户ID
  email?: string             // 用户邮箱
  deviceUuid?: string        // 设备UUID
}

// ========== API 方法参数类型 - API Method Parameter Types ==========
export interface TransactionListOptions {
  limit?: number                // 返回结果数量限制
  offset?: number               // 偏移量（分页）
  startDate?: string            // 开始日期
  endDate?: string              // 结束日期
  search?: string               // 搜索关键词
  categoryIds?: string[]        // 分类ID列表
  accountIds?: string[]         // 账户ID列表
  tagIds?: string[]             // 标签ID列表
  hasAttachments?: boolean      // 是否有附件
  hasNotes?: boolean            // 是否有备注
  hiddenFromReports?: boolean   // 是否从报告中隐藏
  isSplit?: boolean             // 是否为拆分交易
  isRecurring?: boolean         // 是否为周期性交易
  importedFromMint?: boolean    // 是否从Mint导入
  syncedFromInstitution?: boolean   // 是否从机构同步
  isCredit?: boolean            // 是否为信用交易
  absAmountRange?: [number, number]   // 金额绝对值范围
}

/**
 * 创建交易输入参数
 */
export interface CreateTransactionInput {
  date: string              // 交易日期
  accountId: string         // 账户ID
  amount: number            // 金额
  /** 首选字段名（与 Monarch API 保持一致） */
  merchantName?: string
  /** 已废弃：请使用 merchantName */
  merchant?: string
  categoryId?: string       // 分类ID
  notes?: string            // 备注
  /** 对应 API 中的 shouldUpdateBalance（默认为 true） */
  updateBalance?: boolean
  /** 可选的所有者用户ID（null = 默认所有者） */
  ownerUserId?: string | null
}

/**
 * 更新交易输入参数
 */
export interface UpdateTransactionInput {
  amount?: number          // 金额
  date?: string            // 日期
  /** 首选字段名（与 Monarch API 保持一致） */
  merchantName?: string
  /** 已废弃：请使用 merchantName */
  merchant?: string
  categoryId?: string      // 分类ID
  notes?: string           // 备注
  hideFromReports?: boolean   // 是否从报告中隐藏
  isHidden?: boolean       // 是否隐藏
  tagIds?: string[]        // 标签ID列表
}

/**
 * 创建账户输入参数
 */
export interface CreateAccountInput {
  name: string             // 账户名称
  typeName: string         // 类型名称
  subtypeName: string      // 子类型名称
  balance: number          // 余额
  includeInNetWorth?: boolean   // 是否计入净资产
  isAsset?: boolean        // 是否为资产
}

/**
 * 更新账户输入参数
 */
export interface UpdateAccountInput {
  displayName?: string     // 显示名称
  isHidden?: boolean       // 是否隐藏
  includeInNetWorth?: boolean   // 是否计入净资产
  currentBalance?: number  // 当前余额
}

/**
 * 创建分类输入参数
 */
export interface CreateCategoryInput {
  name: string             // 名称
  displayName?: string     // 显示名称
  shortName?: string       // 短名称
  icon?: string            // 图标
  color?: string           // 颜色
  groupId?: string         // 分组ID
  parentCategoryId?: string   // 父分类ID
  order?: number           // 排序
}

/**
 * 更新分类输入参数
 */
export interface UpdateCategoryInput {
  name?: string            // 名称
  displayName?: string     // 显示名称
  shortName?: string       // 短名称
  icon?: string            // 图标
  color?: string           // 颜色
  groupId?: string         // 分组ID
  parentCategoryId?: string   // 父分类ID
  order?: number           // 排序
  isDisabled?: boolean     // 是否禁用
}

/**
 * 创建标签输入参数
 */
export interface CreateTagInput {
  name: string             // 标签名称
  color?: string           // 标签颜色
  order?: number           // 排序
}

/**
 * 批量删除结果
 */
export interface BulkDeleteResult {
  deletedCount: number     // 删除成功数量
  failedCount: number      // 删除失败数量
  errors?: Array<{         // 错误详情列表
    id: string
    message: string
  }>
}

/**
 * 创建目标输入参数
 */
export interface CreateGoalInput {
  name: string             // 目标名称
  targetAmount: number     // 目标金额
  targetDate?: string      // 目标日期
}

/**
 * 更新目标输入参数
 */
export interface UpdateGoalInput {
  name?: string            // 目标名称
  targetAmount?: number    // 目标金额
  targetDate?: string      // 目标日期
  currentAmount?: number   // 当前金额
}

/**
 * 创建持仓输入参数
 */
export interface CreateHoldingInput {
  accountId: string        // 账户ID
  securityId?: string      // 证券ID
  ticker?: string          // 股票代码
  quantity: number         // 数量
}

/**
 * 更新持仓输入参数
 */
export interface UpdateHoldingInput {
  quantity: number         // 数量
}

// ========== MCP 类型 - MCP Types ==========
export interface MCPTool {
  name: string                     // 工具名称
  description: string              // 工具描述
  inputSchema: Record<string, unknown>   // 输入模式定义
}

export interface MCPResource {
  uri: string              // 资源URI
  name: string             // 资源名称
  description?: string     // 资源描述
  mimeType?: string        // MIME类型
}

export interface MCPResourceSchema {
  name: string             // 模式名称
  description: string      // 模式描述
  uriTemplate: string      // URI模板
}

// ========== 错误类型 - Error Types ==========
export interface MonarchErrorDetails {
  code?: string            // 错误代码
  statusCode?: number      // HTTP状态码
  response?: unknown       // 原始响应数据
  retryAfter?: number      // 建议重试等待时间（秒）
}

// ========== GraphQL 类型 - GraphQL Types ==========
/**
 * GraphQL 响应包装类型
 * 封装所有 GraphQL API 响应的通用结构
 */
export interface GraphQLResponse<T = unknown> {
  data?: T                // 响应数据
  errors?: Array<{        // 错误列表
    message: string       // 错误消息
    locations?: Array<{   // 错误位置
      line: number
      column: number
    }>
    path?: string[]       // 错误路径
  }>
}

/**
 * GraphQL 分页信息
 * 用于分页查询的页码信息
 */
export interface GraphQLPageInfo {
  hasNextPage: boolean          // 是否有下一页
  hasPreviousPage: boolean      // 是否有上一页
  startCursor?: string          // 起始光标
  endCursor?: string            // 结束光标
}

/**
 * GraphQL 边类型
 * 用于 GraphQL 连接模式的边结构
 */
export interface GraphQLEdge<T> {
  node: T                       // 节点数据
  cursor: string               // 光标
}

/**
 * GraphQL 连接类型
 * 用于 GraphQL 连接模式的标准结构
 */
export interface GraphQLConnection<T> {
  edges: GraphQLEdge<T>[]       // 边列表
  pageInfo: GraphQLPageInfo     // 分页信息
  totalCount: number            // 总数量
}
