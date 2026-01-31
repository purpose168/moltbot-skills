// 交易 API 模块 - 提供交易管理、分类、标签和商家等功能
// Transactions API module - provides transaction management, categories, tags, and merchants functionality

// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from '../../client/graphql'
// 导入类型定义 - 交易、分类、标签等相关类型
import {
  Transaction,
  TransactionDetails,
  TransactionSummary,
  TransactionRule,
  TransactionTag,
  TransactionCategory,
  CategoryGroup,
  Merchant,
  RecurringTransaction,
  BulkUpdateResult,
  PaginatedTransactions
} from '../../types'
// 导入工具函数 - 验证、日志等
import {
  validateTransactionId,
  validateDateRange,
  logger
} from '../../utils'

/**
 * 交易 API 接口
 * 
 * 定义交易管理的所有操作方法
 * 包含以下功能模块：
 * - 核心 CRUD 操作（创建、读取、更新、删除）
 * - 汇总和聚合查询
 * - 交易拆分
 * - 批量操作
 * - 交易规则
 * - 分类管理
 * - 标签管理
 * - 商家管理
 * - 周期性交易
 */
export interface TransactionsAPI {
  // ==================== 核心 CRUD 操作 ====================
  
  /**
   * 获取交易列表
   * 
   * 支持多种过滤条件：日期范围、分类、账户、标签、商家等
   * 返回分页结果，包含总数量和是否有更多数据
   * 
   * @param options - 查询选项（可选）
   * @returns 分页的交易列表
   */
  getTransactions(options?: GetTransactionsOptions): Promise<PaginatedTransactions>
  
  /**
   * 获取交易详情
   * 
   * 获取单个交易的完整信息，包括分类、标签、拆分等
   * 
   * @param transactionId - 交易 ID
   * @returns 交易详情对象
   */
  getTransactionDetails(transactionId: string): Promise<TransactionDetails>
  
  /**
   * 创建交易
   * 
   * 手动创建新交易记录（通常用于添加现金交易等）
   * 
   * @param data - 交易创建数据
   * @returns 创建的交易对象
   */
  createTransaction(data: CreateTransactionInput): Promise<Transaction>
  
  /**
   * 更新交易
   * 
   * 更新交易的任何属性：商家、金额、日期、分类、备注等
   * 
   * @param transactionId - 要更新的交易 ID
   * @param data - 更新数据
   * @returns 更新后的交易对象
   */
  updateTransaction(transactionId: string, data: UpdateTransactionInput): Promise<Transaction>
  
  /**
   * 删除交易
   * 
   * 从账户中删除指定交易
   * 
   * @param transactionId - 要删除的交易 ID
   * @returns 如果删除成功则返回 true
   */
  deleteTransaction(transactionId: string): Promise<boolean>

  // ==================== 汇总和聚合查询 ====================
  
  /**
   * 获取交易汇总
   * 
   * 返回指定时间段内的收入、支出、净额的汇总信息
   * 以及分类汇总和月度趋势数据
   * 
   * @returns 交易汇总对象
   */
  getTransactionsSummary(): Promise<TransactionSummary>
  
  /**
   * 获取交易汇总卡片
   * 
   * 返回用于展示的交易汇总卡片数据
   * 包含总交易数、总金额、平均交易额、热门分类等
   * 
   * @returns 汇总卡片数据
   */
  getTransactionsSummaryCard(): Promise<any>

  // ==================== 交易拆分操作 ====================
  
  /**
   * 获取交易拆分
   * 
   * 获取指定交易的拆分信息
   * 
   * @param transactionId - 交易 ID
   * @returns 拆分数组
   */
  getTransactionSplits(transactionId: string): Promise<any>
  
  /**
   * 更新交易拆分
   * 
   * 将交易拆分为多个子交易，每个子交易可以有不同的分类
   * 
   * @param transactionId - 要拆分的交易 ID
   * @param splits - 拆分配置数组
   * @returns 拆分后的交易对象
   */
  updateTransactionSplits(transactionId: string, splits: TransactionSplit[]): Promise<Transaction>

  // ==================== 批量操作 ====================
  
  /**
   * 批量更新备注
   * 
   * 并行更新多个交易的备注信息
   * 
   * @param updates - 备注更新数组（交易 ID + 备注内容）
   * @returns 批量更新结果（成功数、失败数、错误列表）
   */
  bulkUpdateNotes(updates: NoteUpdate[]): Promise<BulkNoteUpdateResult>

  // ==================== 交易规则 ====================
  
  /**
   * 获取所有交易规则
   * 
   * 返回所有自动分类规则列表
   * 
   * @returns 交易规则数组
   */
  getTransactionRules(): Promise<TransactionRule[]>
  
  /**
   * 创建交易规则
   * 
   * 创建新的自动分类规则
   * 规则由条件（匹配什么）和动作（做什么）组成
   * 
   * @param data - 规则创建数据
   * @returns 创建的规则对象
   */
  createTransactionRule(data: CreateTransactionRuleInput): Promise<TransactionRule>
  
  /**
   * 更新交易规则
   * 
   * 修改现有规则的属性
   * 
   * @param ruleId - 规则 ID
   * @param data - 更新数据
   * @returns 更新后的规则对象
   */
  updateTransactionRule(ruleId: string, data: UpdateTransactionRuleInput): Promise<TransactionRule>
  
  /**
   * 删除交易规则
   * 
   * @param ruleId - 要删除的规则 ID
   * @returns 如果删除成功则返回 true
   */
  deleteTransactionRule(ruleId: string): Promise<boolean>
  
  /**
   * 删除所有交易规则
   * 
   * @returns 如果删除成功则返回 true
   */
  deleteAllTransactionRules(): Promise<boolean>
  
  /**
   * 预览交易规则效果
   * 
   * 在实际应用规则前，预览规则将影响哪些交易
   * 
   * @param conditions - 规则条件
   * @param actions - 规则动作
   * @returns 预览结果（受影响的交易、变更预览）
   */
  previewTransactionRule(conditions: RuleCondition[], actions: RuleAction[]): Promise<any>

  // ==================== 分类管理 ====================
  
  /**
   * 获取所有交易分类
   * 
   * @returns 分类数组
   */
  getTransactionCategories(): Promise<TransactionCategory[]>
  
  /**
   * 创建交易分类
   * 
   * @param data - 分类创建数据
   * @returns 创建的分类对象
   */
  createTransactionCategory(data: CreateTransactionCategoryInput): Promise<TransactionCategory>
  
  /**
   * 更新交易分类
   * 
   * @param categoryId - 分类 ID
   * @param data - 更新数据
   * @returns 更新后的分类对象
   */
  updateTransactionCategory(categoryId: string, data: UpdateTransactionCategoryInput): Promise<TransactionCategory>
  
  /**
   * 删除交易分类
   * 
   * @param categoryId - 要删除的分类 ID
   * @returns 如果删除成功则返回 true
   */
  deleteTransactionCategory(categoryId: string): Promise<boolean>
  
  /**
   * 获取分类分组
   * 
   * @returns 分类分组数组
   */
  getTransactionCategoryGroups(): Promise<CategoryGroup[]>
  
  /**
   * 获取分类详情
   * 
   * @param categoryId - 分类 ID
   * @returns 分类详情
   */
  getCategoryDetails(categoryId: string): Promise<any>

  // ==================== 标签管理 ====================
  
  /**
   * 获取所有交易标签
   * 
   * @returns 标签数组
   */
  getTransactionTags(): Promise<TransactionTag[]>
  
  /**
   * 创建交易标签
   * 
   * @param data - 标签创建数据
   * @returns 创建的标签对象
   */
  createTransactionTag(data: CreateTransactionTagInput): Promise<TransactionTag>
  
  /**
   * 设置交易标签
   * 
   * 替换交易的标签（与追加标签不同）
   * 
   * @param transactionId - 交易 ID
   * @param tagIds - 标签 ID 数组
   * @returns 更新后的交易对象
   */
  setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction>

  // ==================== 商家管理 ====================
  
  /**
   * 获取商家列表
   * 
   * 支持搜索和数量限制
   * 
   * @param options - 查询选项（可选）
   * @returns 商家数组
   */
  getMerchants(options?: GetMerchantsOptions): Promise<Merchant[]>
  
  /**
   * 获取商家详情
   * 
   * @param merchantId - 商家 ID
   * @returns 商家详情
   */
  getMerchantDetails(merchantId: string): Promise<any>
  
  /**
   * 获取可编辑的商家信息
   * 
   * @param merchantId - 商家 ID
   * @returns 可编辑的商家信息
   */
  getEditMerchant(merchantId: string): Promise<any>

  // ==================== 周期性交易 ====================
  
  /**
   * 获取周期性交易
   * 
   * @param options - 查询选项（可选）
   * @returns 周期性交易数组
   */
  getRecurringTransactions(options?: GetRecurringTransactionsOptions): Promise<RecurringTransaction[]>
  
  /**
   * 获取周期性交易流
   * 
   * @param options - 查询选项
   * @returns 交易流数组
   */
  getRecurringStreams(options?: GetRecurringStreamsOptions): Promise<any[]>
  
  /**
   * 获取聚合的周期性项目
   * 
   * @param options - 查询选项
   * @returns 聚合的周期性项目数据
   */
  getAggregatedRecurringItems(options: GetAggregatedRecurringItemsOptions): Promise<any>
  
  /**
   * 获取所有周期性交易项目
   * 
   * @param options - 查询选项（可选）
   * @returns 周期性交易项目数组
   */
  getAllRecurringTransactionItems(options?: GetAllRecurringTransactionItemsOptions): Promise<any[]>
  
  /**
   * 审核周期性交易流
   * 
   * @param streamId - 交易流 ID
   * @param reviewStatus - 审核状态
   * @returns 审核结果
   */
  reviewRecurringStream(streamId: string, reviewStatus: string): Promise<any>
  
  /**
   * 标记交易流为非周期性
   * 
   * @param streamId - 交易流 ID
   * @returns 如果标记成功则返回 true
   */
  markStreamAsNotRecurring(streamId: string): Promise<boolean>
  
  /**
   * 获取周期性商家搜索状态
   * 
   * @returns 搜索状态信息
   */
  getRecurringMerchantSearchStatus(): Promise<any>

  // ==================== 批量交易操作 ====================
  
  /**
   * 批量更新交易
   * 
   * 根据条件批量更新多个交易的属性
   * 
   * @param data - 批量更新输入
   * @returns 批量更新结果
   */
  bulkUpdateTransactions(data: BulkUpdateTransactionsInput): Promise<BulkUpdateResult>
  
  /**
   * 批量隐藏交易
   * 
   * @param transactionIds - 交易 ID 数组
   * @param filters - 额外过滤条件
   * @returns 批量更新结果
   */
  bulkHideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>
  
  /**
   * 批量取消隐藏交易
   * 
   * @param transactionIds - 交易 ID 数组
   * @param filters - 额外过滤条件
   * @returns 批量更新结果
   */
  bulkUnhideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult>
  
  /**
   * 获取隐藏的交易
   * 
   * @param options - 查询选项（可选）
   * @returns 隐藏的交易分页列表
   */
  getHiddenTransactions(options?: GetHiddenTransactionsOptions): Promise<PaginatedTransactions>
}

// ==================== 输入/选项接口 ====================

/**
 * 获取交易的查询选项
 */
export interface GetTransactionsOptions {
  limit?: number            // 限制返回数量（默认 100）
  offset?: number           // 偏移量，用于分页
  startDate?: string        // 开始日期（ISO 格式）
  endDate?: string          // 结束日期（ISO 格式）
  categoryIds?: string[]    // 分类 ID 数组
  accountIds?: string[]     // 账户 ID 数组
  tagIds?: string[]         // 标签 ID 数组
  merchantIds?: string[]    // 商家 ID 数组
  search?: string           // 搜索关键词
  isCredit?: boolean        // 是否为收入（true）或支出（false）
  absAmountRange?: [number?, number?]  // 金额绝对值范围
}

/**
 * 创建交易的输入数据
 */
export interface CreateTransactionInput {
  accountId: string         // 账户 ID（必需）
  /** 首选字段名（与 Monarch API 一致） */
  merchantName?: string     // 商家名称
  /** 已废弃：请使用 merchantName */
  merchant?: string         // 商家名称（旧字段）
  amount: number            // 金额（必需，正数为收入，负数为支出）
  date: string              // 日期（ISO 格式，必需）
  categoryId?: string       // 分类 ID
  notes?: string            // 备注
  /** 映射到 API 的 shouldUpdateBalance（默认 true） */
  updateBalance?: boolean   // 是否更新余额
  /** 可选的所有者用户 ID（null = 默认所有者） */
  ownerUserId?: string | null  // 所有者用户 ID
}

/**
 * 更新交易的输入数据
 */
export interface UpdateTransactionInput {
  /** 首选字段名（与 Monarch API 一致） */
  merchantName?: string     // 商家名称
  /** 已废弃：请使用 merchantName */
  merchant?: string         // 商家名称（旧字段）
  amount?: number           // 金额
  date?: string             // 日期
  categoryId?: string       // 分类 ID
  notes?: string            // 备注
  hideFromReports?: boolean // 是否在报告中隐藏
  isHidden?: boolean        // 是否隐藏
  tagIds?: string[]         // 标签 ID 数组
}

/**
 * 交易拆分配置
 * 
 * 用于将交易拆分为多个子交易
 */
export interface TransactionSplit {
  merchantName: string      // 商家名称
  amount: number            // 子交易金额
  categoryId: string        // 分类 ID
  notes?: string            // 备注
  hideFromReports?: boolean // 是否在报告中隐藏
}

/**
 * 备注更新（用于批量操作）
 */
export interface NoteUpdate {
  transactionId: string     // 交易 ID
  notes: string             // 新备注内容
}

/**
 * 批量备注更新结果
 */
export interface BulkNoteUpdateResult {
  successful: number        // 成功更新的数量
  failed: number            // 失败的数量
  errors: Array<{ transactionId: string; error: string }>  // 错误详情
}

/**
 * 创建交易规则的输入数据
 */
export interface CreateTransactionRuleInput {
  name: string              // 规则名称
  conditions: RuleCondition[]  // 条件数组
  actions: RuleAction[]     // 动作数组
  priority?: number         // 优先级
}

/**
 * 更新交易规则的输入数据
 */
export interface UpdateTransactionRuleInput {
  name?: string             // 规则名称
  conditions?: RuleCondition[]  // 条件数组
  actions?: RuleAction[]    // 动作数组
  priority?: number         // 优先级
  isEnabled?: boolean       // 是否启用
}

/**
 * 规则条件
 */
export interface RuleCondition {
  field: string             // 匹配字段（如 "merchantName"）
  operator: string          // 操作符（如 "equals", "contains"）
  value: any                // 匹配值
}

/**
 * 规则动作
 */
export interface RuleAction {
  type: string              // 动作类型（如 "setCategory"）
  value: any                // 动作值（如分类 ID）
}

/**
 * 创建交易分类的输入数据
 */
export interface CreateTransactionCategoryInput {
  name: string              // 分类名称
  groupId: string           // 分组 ID
  icon?: string             // 图标
  color?: string            // 颜色
}

/**
 * 更新交易分类的输入数据
 */
export interface UpdateTransactionCategoryInput {
  name?: string             // 分类名称
  icon?: string             // 图标
  color?: string            // 颜色
}

/**
 * 创建交易标签的输入数据
 */
export interface CreateTransactionTagInput {
  name: string              // 标签名称
  color: string             // 标签颜色
}

/**
 * 获取商家的查询选项
 */
export interface GetMerchantsOptions {
  search?: string           // 搜索关键词
  limit?: number            // 限制返回数量
}

/**
 * 获取周期性交易的查询选项
 */
export interface GetRecurringTransactionsOptions {
  startDate?: string        // 开始日期
  endDate?: string          // 结束日期
}

/**
 * 获取周期性交易流的查询选项
 */
export interface GetRecurringStreamsOptions {
  includeLiabilities?: boolean  // 包含负债
  includePending?: boolean      // 包含待处理
  filters?: any                 // 额外过滤条件
}

/**
 * 获取聚合周期性项目的查询选项
 */
export interface GetAggregatedRecurringItemsOptions {
  startDate: string         // 开始日期（必需）
  endDate: string           // 结束日期（必需）
  groupBy?: string          // 分组字段
  filters?: any             // 额外过滤条件
}

/**
 * 获取所有周期性交易项目的查询选项
 */
export interface GetAllRecurringTransactionItemsOptions {
  filters?: any             // 过滤条件
  includeLiabilities?: boolean  // 包含负债
}

/**
 * 批量更新交易的输入数据
 */
export interface BulkUpdateTransactionsInput {
  transactionIds: string[]          // 要更新的交易 ID 数组
  updates: Record<string, any>      // 更新内容
  excludedTransactionIds?: string[] // 排除的交易 ID
  allSelected?: boolean             // 是否全选
  filters?: any                     // 过滤条件
}

/**
 * 获取隐藏交易的查询选项
 */
export interface GetHiddenTransactionsOptions {
  limit?: number            // 限制数量
  offset?: number           // 偏移量
  orderBy?: string          // 排序字段
}

/**
 * 交易 API 实现类
 * 
 * 实现所有交易相关的 API 操作
 */
export class TransactionsAPIImpl implements TransactionsAPI {
  /**
   * 构造函数
   * @param graphql - GraphQL 客户端实例
   */
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取交易列表
   * 
   * 支持多种过滤条件和分页
   * 使用 Web 应用兼容的查询模式
   */
  async getTransactions(options: GetTransactionsOptions = {}): Promise<PaginatedTransactions> {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      categoryIds,
      accountIds,
      tagIds,
      merchantIds,
      search,
      isCredit,
      absAmountRange
    } = options

    // 验证日期范围
    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
    }

    // 构建过滤对象（兼容 Web 应用）
    const filters: any = {
      transactionVisibility: 'non_hidden_transactions_only'
    }

    // 添加各种过滤条件
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate
    if (categoryIds && categoryIds.length > 0) filters.categoryIds = categoryIds
    if (accountIds && accountIds.length > 0) filters.accountIds = accountIds
    if (tagIds && tagIds.length > 0) filters.tagIds = tagIds
    if (merchantIds && merchantIds.length > 0) filters.merchantIds = merchantIds
    if (search) filters.search = search
    if (isCredit !== undefined) filters.isCredit = isCredit
    if (absAmountRange) {
      if (absAmountRange[0] !== undefined) filters.minAmount = absAmountRange[0]
      if (absAmountRange[1] !== undefined) filters.maxAmount = absAmountRange[1]
    }

    const variables = {
      limit,
      offset,
      filters,
      orderBy: 'date'
    }

    logger.debug('获取交易列表，选项:', variables)

    // 压缩的查询字符串，减少负载大小
    const query = `query Web_GetTransactionsList($offset:Int,$limit:Int,$filters:TransactionFilterInput,$orderBy:TransactionOrdering){allTransactions(filters:$filters){totalCount totalSelectableCount results(offset:$offset,limit:$limit,orderBy:$orderBy){id amount pending date hideFromReports hiddenByAccount plaidName notes isRecurring reviewStatus needsReview isSplitTransaction dataProviderDescription attachments{id}goal{id name}category{id name icon group{id type}}merchant{name id transactionsCount logoUrl recurringTransactionStream{frequency isActive}}tags{id name color order}account{id displayName icon logoUrl}}}transactionRules{id}}`

    const data = await this.graphql.query<{
      allTransactions: {
        totalCount: number
        totalSelectableCount: number
        results: Transaction[]
      }
      transactionRules: Array<{ id: string }>
    }>(query, variables)

    logger.debug(`使用 Web 应用模式获取了 ${data.allTransactions.results.length} 笔交易`)

    return {
      transactions: data.allTransactions.results,
      totalCount: data.allTransactions.totalCount,
      hasMore: offset + limit < data.allTransactions.totalCount,
      limit,
      offset
    }
  }

  /**
   * 获取交易详情
   * 
   * 获取单个交易的完整信息，包括分类、标签、拆分等
   */
  async getTransactionDetails(transactionId: string): Promise<TransactionDetails> {
    validateTransactionId(transactionId)

    const query = `
      query GetTransactionDrawer($transactionId: String!) {
        getTransaction(id: $transactionId) {
          id
          amount
          date
          merchant {
            name
          }
          category {
            id
            name
            icon
            color
          }
          account {
            id
            displayName
            type {
              name
            }
            institution {
              name
              plaidInstitutionId
            }
          }
          tags {
            id
            name
            color
          }
          splits {
            id
            amount
            category {
              id
              name
            }
          }
          isRecurring
          reviewStatus
          notes
          originalDescription
          needsReview
          dataProvider
          dataProviderDescription
          isHide
          importIdentifier
          plaidTransactionId
        }
      }
    `

    const data = await this.graphql.query<{
      getTransaction: TransactionDetails
    }>(query, { transactionId })

    return data.getTransaction
  }

  /**
   * 创建交易
   * 
   * 手动创建新交易记录（通常用于添加现金交易等）
   */
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const {
      accountId,
      merchantName,
      merchant,
      amount,
      date,
      categoryId,
      notes,
      updateBalance,
      ownerUserId
    } = data

    const resolvedMerchant = merchantName ?? merchant
    if (!resolvedMerchant) {
      throw new Error('创建交易需要提供商家名称')
    }

    const mutation = `
      mutation Common_CreateTransactionMutation($input: CreateTransactionMutationInput!) {
        createTransaction(input: $input) {
          transaction {
            id
            amount
            date
            notes
            merchant {
              id
              name
            }
            category {
              id
              name
              icon
              color
            }
            account {
              id
              displayName
            }
          }
          errors {
            message
            code
            fieldErrors {
              field
              messages
            }
          }
        }
      }
    `

    const input: Record<string, any> = {
      date,
      shouldUpdateBalance: updateBalance ?? true,
      amount,
      merchantName: resolvedMerchant,
      accountId,
      ownerUserId: ownerUserId ?? null,
    }

    if (categoryId) input.categoryId = categoryId
    if (notes !== undefined) input.notes = notes

    const result = await this.graphql.mutation<{
      createTransaction: {
        transaction: Transaction
        errors?: any
      }
    }>(mutation, { input })

    const errors = result.createTransaction?.errors
    if (errors) {
      const errorList = Array.isArray(errors) ? errors : [errors]
      if (errorList.length > 0) {
        const first = errorList[0]
        const message = first?.message || first?.fieldErrors?.[0]?.messages?.join(', ')
        throw new Error(`创建交易失败: ${message || '未知错误'}`)
      }
    }

    logger.info('交易创建成功:', result.createTransaction.transaction.id)
    return result.createTransaction.transaction
  }

  /**
   * 更新交易
   * 
   * 更新交易的任何属性：商家、金额、日期、分类、备注等
   */
  async updateTransaction(transactionId: string, data: UpdateTransactionInput): Promise<Transaction> {
    validateTransactionId(transactionId)

    const updates: Record<string, any> = {}
    const resolvedMerchant = data.merchantName ?? data.merchant

    if (resolvedMerchant) updates.merchantName = resolvedMerchant
    if (data.amount !== undefined) updates.amount = data.amount
    if (data.date) updates.date = data.date
    if (data.categoryId) updates.categoryId = data.categoryId
    if (data.notes !== undefined) updates.notes = data.notes

    const hide = data.hideFromReports ?? data.isHidden
    if (hide !== undefined) updates.hide = hide

    if (data.tagIds && data.tagIds.length > 0) updates.tagIds = data.tagIds

    if (Object.keys(updates).length === 0) {
      // 没有要更新的内容，返回当前详情
      return (await this.getTransactionDetails(transactionId)) as unknown as Transaction
    }

    const mutation = `mutation Common_BulkUpdateTransactionsMutation($selectedTransactionIds:[ID!]$excludedTransactionIds:[ID!]$allSelected:Boolean!$expectedAffectedTransactionCount:Int!$updates:TransactionUpdateParams!$filters:TransactionFilterInput){bulkUpdateTransactions(selectedTransactionIds:$selectedTransactionIds excludedTransactionIds:$excludedTransactionIds updates:$updates allSelected:$allSelected expectedAffectedTransactionCount:$expectedAffectedTransactionCount filters:$filters){success affectedCount errors{message}}}`

    const result = await this.graphql.mutation<{
      bulkUpdateTransactions: {
        success: boolean
        affectedCount: number
        errors?: Array<{ message: string }>
      }
    }>(mutation, {
      selectedTransactionIds: [transactionId],
      excludedTransactionIds: [],
      allSelected: false,
      expectedAffectedTransactionCount: 1,
      updates,
      filters: { transactionVisibility: 'non_hidden_transactions_only' },
    })

    if (!result.bulkUpdateTransactions?.success) {
      const message = result.bulkUpdateTransactions?.errors?.[0]?.message || '未知错误'
      throw new Error(`更新交易失败: ${message}`)
    }

    logger.info('交易更新成功:', transactionId)
    return (await this.getTransactionDetails(transactionId)) as unknown as Transaction
  }

  /**
   * 删除交易
   * 
   * 从账户中删除指定交易
   */
  async deleteTransaction(transactionId: string): Promise<boolean> {
    validateTransactionId(transactionId)

    const mutation = `mutation Common_BulkDeleteTransactionsMutation($selectedTransactionIds:[ID!]$excludedTransactionIds:[ID!]$allSelected:Boolean!$expectedAffectedTransactionCount:Int!$filters:TransactionFilterInput){bulkDeleteTransactions(input:{selectedTransactionIds:$selectedTransactionIds excludedTransactionIds:$excludedTransactionIds isAllSelected:$allSelected expectedAffectedTransactionCount:$expectedAffectedTransactionCount filters:$filters}){success affectedCount errors{message}}}`

    const result = await this.graphql.mutation<{
      bulkDeleteTransactions: {
        success: boolean
        affectedCount: number
        errors?: Array<{ message: string }>
      }
    }>(mutation, {
      selectedTransactionIds: [transactionId],
      excludedTransactionIds: [],
      allSelected: false,
      expectedAffectedTransactionCount: 1,
      filters: { transactionVisibility: 'non_hidden_transactions_only' },
    })

    if (!result.bulkDeleteTransactions?.success) {
      const message = result.bulkDeleteTransactions?.errors?.[0]?.message || '未知错误'
      logger.warn(`删除交易失败: ${message}`)
      return false
    }

    logger.info('交易删除成功:', transactionId)
    return true
  }

  /**
   * 获取交易汇总
   * 
   * 返回指定时间段内的收入、支出、净额的汇总信息
   * 以及分类汇总和月度趋势数据
   */
  async getTransactionsSummary(): Promise<TransactionSummary> {
    const query = `
      query GetTransactionsPage {
        transactionsSummary {
          totalIncome
          totalExpenses
          netTotal
          transactionCount
          categorySummary {
            categoryId
            categoryName
            totalAmount
            transactionCount
          }
          monthlyTrend {
            month
            income
            expenses
            net
          }
        }
      }
    `

    const data = await this.graphql.query<{
      transactionsSummary: TransactionSummary
    }>(query)

    return data.transactionsSummary
  }

  /**
   * 获取交易汇总卡片
   * 
   * 返回用于展示的交易汇总卡片数据
   * 包含总交易数、总金额、平均交易额、热门分类等
   */
  async getTransactionsSummaryCard(): Promise<any> {
    const query = `
      query GetTransactionsSummaryCard {
        transactionsSummaryCard {
          totalTransactions
          totalAmount
          averageTransaction
          topCategories {
            categoryId
            categoryName
            amount
            count
          }
          recentTransactions {
            id
            merchant {
              name
            }
            amount
            date
          }
        }
      }
    `

    const data = await this.graphql.query<{
      transactionsSummaryCard: any
    }>(query)

    return data.transactionsSummaryCard
  }

  /**
   * 获取交易拆分
   * 
   * 获取指定交易的拆分信息
   */
  async getTransactionSplits(transactionId: string): Promise<any> {
    validateTransactionId(transactionId)

    const query = `
      query TransactionSplitQuery($transactionId: String!) {
        getTransaction(id: $transactionId) {
          splits {
            id
            amount
            category {
              id
              name
              icon
              color
            }
          }
        }
      }
    `

    const data = await this.graphql.query<{
      getTransaction: {
        splits: any[]
      }
    }>(query, { transactionId })

    return data.getTransaction.splits
  }

  /**
   * 更新交易拆分
   * 
   * 将交易拆分为多个子交易，每个子交易可以有不同的分类
   * 支持并行更新有备注的子交易
   */
  async updateTransactionSplits(transactionId: string, splits: TransactionSplit[]): Promise<Transaction> {
    validateTransactionId(transactionId)

    // 使用浏览器端变异进行拆分
    const splitMutation = `mutation Common_SplitTransactionMutation($input:UpdateTransactionSplitMutationInput!){updateTransactionSplit(input:$input){errors{message code}transaction{id amount hasSplitTransactions splitTransactions{id amount notes merchant{name}category{id name}}}}}`

    const splitData = splits.map(split => ({
      merchantName: split.merchantName,
      hideFromReports: split.hideFromReports || false,
      amount: split.amount,
      categoryId: split.categoryId,
      ownerUserId: null,
    }))

    const splitResult = await this.graphql.mutation<{
      updateTransactionSplit: {
        errors?: Array<{ message: string; code: string }>
        transaction: Transaction & {
          splitTransactions: Array<{
            id: string
            amount: number
            notes?: string
            merchant: { name: string }
            category: { id: string; name: string }
          }>
        }
      }
    }>(splitMutation, {
      input: { transactionId, splitData },
    })

    if (splitResult.updateTransactionSplit.errors) {
      throw new Error(
        `拆分失败: ${JSON.stringify(splitResult.updateTransactionSplit.errors)}`
      )
    }

    const transaction = splitResult.updateTransactionSplit.transaction

    // 并行更新有备注的子交易
    if (transaction.splitTransactions && splits.some(s => s.notes)) {
      const bulkUpdateMutation = `mutation Common_BulkUpdateTransactionsMutation($selectedTransactionIds:[ID!]$excludedTransactionIds:[ID!]$allSelected:Boolean!$expectedAffectedTransactionCount:Int!$updates:TransactionUpdateParams!$filters:TransactionFilterInput){bulkUpdateTransactions(selectedTransactionIds:$selectedTransactionIds excludedTransactionIds:$excludedTransactionIds updates:$updates allSelected:$allSelected expectedAffectedTransactionCount:$expectedAffectedTransactionCount filters:$filters){success affectedCount errors{message}}}`

      // 构建备注更新 Promise 数组
      const noteUpdatePromises = splits
        .map((split, i) => {
          if (!split.notes || !transaction.splitTransactions[i]) {
            return null
          }

          const splitId = transaction.splitTransactions[i].id

          // 返回 Promise 以并行执行
          return this.graphql.mutation<{
            bulkUpdateTransactions: {
              success: boolean
              affectedCount: number
              errors?: Array<{ message: string }>
            }
          }>(bulkUpdateMutation, {
            selectedTransactionIds: [splitId],
            excludedTransactionIds: [],
            allSelected: false,
            expectedAffectedTransactionCount: 1,
            updates: { notes: split.notes },
            filters: { transactionVisibility: 'non_hidden_transactions_only' },
          }).then(result => {
            if (!result.bulkUpdateTransactions.success) {
              logger.warn(`无法为拆分 ${i + 1} 添加备注`)
            }
            return result
          })
        })
        .filter(Boolean) // 移除 null 值

      // 并行执行所有备注更新
      await Promise.all(noteUpdatePromises)

      logger.info(
        `交易拆分完成，包含 ${noteUpdatePromises.length} 个备注更新（并行）`
      )
    }

    return transaction
  }

  /**
   * 批量更新备注（并行）
   * 
   * 同时更新多个交易的备注信息
   * 
   * @param updates - 交易 ID + 备注内容 数组
   * @returns 成功/失败计数结果
   */
  async bulkUpdateNotes(updates: NoteUpdate[]): Promise<BulkNoteUpdateResult> {
    const bulkUpdateMutation = `mutation Common_BulkUpdateTransactionsMutation($selectedTransactionIds:[ID!]$excludedTransactionIds:[ID!]$allSelected:Boolean!$expectedAffectedTransactionCount:Int!$updates:TransactionUpdateParams!$filters:TransactionFilterInput){bulkUpdateTransactions(selectedTransactionIds:$selectedTransactionIds excludedTransactionIds:$excludedTransactionIds updates:$updates allSelected:$allSelected expectedAffectedTransactionCount:$expectedAffectedTransactionCount filters:$filters){success affectedCount errors{message}}}`

    const promises = updates.map(({ transactionId, notes }) =>
      this.graphql.mutation<{
        bulkUpdateTransactions: {
          success: boolean
          affectedCount: number
          errors?: Array<{ message: string }>
        }
      }>(bulkUpdateMutation, {
        selectedTransactionIds: [transactionId],
        excludedTransactionIds: [],
        allSelected: false,
        expectedAffectedTransactionCount: 1,
        updates: { notes },
        filters: { transactionVisibility: 'non_hidden_transactions_only' },
      }).then(result => ({
        transactionId,
        success: result.bulkUpdateTransactions.success,
        error: result.bulkUpdateTransactions.errors?.[0]?.message
      }))
    )

    const results = await Promise.all(promises)

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const errors = results.filter(r => !r.success).map(r => ({
      transactionId: r.transactionId,
      error: r.error || '未知错误'
    }))

    logger.info(`批量备注更新完成: ${successful} 成功, ${failed} 失败`)

    return { successful, failed, errors }
  }

  /**
   * 获取交易规则
   * 
   * 返回所有自动分类规则列表
   */
  async getTransactionRules(): Promise<TransactionRule[]> {
    const query = `
      query GetTransactionRules {
        transactionRules {
          id
          name
          priority
          isEnabled
          conditions {
            field
            operator
            value
          }
          actions {
            type
            value
          }
          matchCount
          lastAppliedAt
          createdAt
          updatedAt
        }
      }
    `

    const data = await this.graphql.query<{
      transactionRules: TransactionRule[]
    }>(query)

    return data.transactionRules || []
  }

  /**
   * 创建交易规则
   * 
   * 创建新的自动分类规则
   * 规则由条件（匹配什么）和动作（做什么）组成
   */
  async createTransactionRule(data: CreateTransactionRuleInput): Promise<TransactionRule> {
    const { name, conditions, actions, priority } = data

    const mutation = `
      mutation CreateTransactionRule($input: CreateTransactionRuleInput!) {
        createTransactionRule(input: $input) {
          rule {
            id
            name
            priority
            isEnabled
            conditions {
              field
              operator
              value
            }
            actions {
              type
              value
            }
            matchCount
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createTransactionRule: {
        rule: TransactionRule
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, {
      input: { name, conditions, actions, priority }
    })

    if (result.createTransactionRule.errors?.length > 0) {
      const errorMessages = result.createTransactionRule.errors.map(e => e.message).join(', ')
      throw new Error(`创建规则失败: ${errorMessages}`)
    }

    logger.info('交易规则创建成功:', result.createTransactionRule.rule.id)
    return result.createTransactionRule.rule
  }

  /**
   * 更新交易规则
   * 
   * 修改现有规则的属性
   */
  async updateTransactionRule(ruleId: string, data: UpdateTransactionRuleInput): Promise<TransactionRule> {
    const mutation = `
      mutation UpdateTransactionRule($ruleId: ID!, $input: UpdateTransactionRuleInput!) {
        updateTransactionRule(id: $ruleId, input: $input) {
          rule {
            id
            name
            priority
            isEnabled
            conditions {
              field
              operator
              value
            }
            actions {
              type
              value
            }
            matchCount
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateTransactionRule: {
        rule: TransactionRule
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { ruleId, input: data })

    if (result.updateTransactionRule.errors?.length > 0) {
      const errorMessages = result.updateTransactionRule.errors.map(e => e.message).join(', ')
      throw new Error(`更新规则失败: ${errorMessages}`)
    }

    logger.info('交易规则更新成功:', ruleId)
    return result.updateTransactionRule.rule
  }

  /**
   * 删除交易规则
   * 
   * 删除指定的自动分类规则
   */
  async deleteTransactionRule(ruleId: string): Promise<boolean> {
    const mutation = `
      mutation DeleteTransactionRule($ruleId: ID!) {
        deleteTransactionRule(id: $ruleId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteTransactionRule: {
        success: boolean
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { ruleId })

    if (result.deleteTransactionRule.errors?.length > 0) {
      const errorMessages = result.deleteTransactionRule.errors.map(e => e.message).join(', ')
      throw new Error(`删除规则失败: ${errorMessages}`)
    }

    return result.deleteTransactionRule.success
  }

  /**
   * 删除所有交易规则
   * 
   * 清空所有自动分类规则
   */
  async deleteAllTransactionRules(): Promise<boolean> {
    const mutation = `
      mutation DeleteAllTransactionRules {
        deleteAllTransactionRules {
          success
          deletedCount
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteAllTransactionRules: {
        success: boolean
        deletedCount: number
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation)

    if (result.deleteAllTransactionRules.errors?.length > 0) {
      const errorMessages = result.deleteAllTransactionRules.errors.map(e => e.message).join(', ')
      throw new Error(`删除所有规则失败: ${errorMessages}`)
    }

    logger.info(`已删除 ${result.deleteAllTransactionRules.deletedCount} 条规则`)
    return result.deleteAllTransactionRules.success
  }

  /**
   * 预览交易规则效果
   * 
   * 在实际应用规则前，预览规则将影响哪些交易
   */
  async previewTransactionRule(conditions: RuleCondition[], actions: RuleAction[]): Promise<any> {
    const query = `
      query PreviewTransactionRule($conditions: [RuleConditionInput!]!, $actions: [RuleActionInput!]!) {
        previewTransactionRule(conditions: $conditions, actions: $actions) {
          matchingTransactions {
            id
            amount
            date
            merchant {
              name
            }
            category {
              name
            }
          }
          summary {
            totalMatches
            categoryChanges
            totalAmountImpact
          }
        }
      }
    `

    const data = await this.graphql.query<{
      previewTransactionRule: any
    }>(query, { conditions, actions })

    return data.previewTransactionRule
  }

  /**
   * 获取交易分类
   * 
   * 返回所有可用的交易分类
   */
  async getTransactionCategories(): Promise<TransactionCategory[]> {
    const query = `
      query GetTransactionCategories {
        transactionCategories {
          id
          name
          displayName
          shortName
          color
          icon
          order
          isDefault
          isDisabled
          isSystemCategory
          groupId
          group {
            id
            name
            displayName
          }
          parentCategoryId
          parentCategory {
            id
            name
          }
          createdAt
          updatedAt
        }
      }
    `

    const data = await this.graphql.query<{
      transactionCategories: TransactionCategory[]
    }>(query)

    return data.transactionCategories || []
  }

  /**
   * 创建交易分类
   * 
   * 创建新的交易分类
   */
  async createTransactionCategory(data: CreateTransactionCategoryInput): Promise<TransactionCategory> {
    const mutation = `
      mutation CreateTransactionCategory($input: CreateTransactionCategoryInput!) {
        createTransactionCategory(input: $input) {
          category {
            id
            name
            displayName
            color
            icon
            order
            groupId
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createTransactionCategory: {
        category: TransactionCategory
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { input: data })

    if (result.createTransactionCategory.errors?.length > 0) {
      const errorMessages = result.createTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`创建分类失败: ${errorMessages}`)
    }

    logger.info('交易分类创建成功:', result.createTransactionCategory.category.id)
    return result.createTransactionCategory.category
  }

  /**
   * 更新交易分类
   * 
   * 更新指定分类的属性
   */
  async updateTransactionCategory(categoryId: string, data: UpdateTransactionCategoryInput): Promise<TransactionCategory> {
    const mutation = `
      mutation UpdateTransactionCategory($categoryId: ID!, $input: UpdateTransactionCategoryInput!) {
        updateTransactionCategory(id: $categoryId, input: $input) {
          category {
            id
            name
            displayName
            color
            icon
            order
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateTransactionCategory: {
        category: TransactionCategory
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { categoryId, input: data })

    if (result.updateTransactionCategory.errors?.length > 0) {
      const errorMessages = result.updateTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`更新分类失败: ${errorMessages}`)
    }

    logger.info('交易分类更新成功:', categoryId)
    return result.updateTransactionCategory.category
  }

  /**
   * 删除交易分类
   * 
   * 删除指定的交易分类
   */
  async deleteTransactionCategory(categoryId: string): Promise<boolean> {
    const mutation = `
      mutation DeleteTransactionCategory($categoryId: ID!) {
        deleteTransactionCategory(id: $categoryId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteTransactionCategory: {
        success: boolean
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { categoryId })

    if (result.deleteTransactionCategory.errors?.length > 0) {
      const errorMessages = result.deleteTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`删除分类失败: ${errorMessages}`)
    }

    return result.deleteTransactionCategory.success
  }

  /**
   * 获取分类分组
   * 
   * 返回所有分类分组
   */
  async getTransactionCategoryGroups(): Promise<CategoryGroup[]> {
    const query = `
      query GetTransactionCategoryGroups {
        transactionCategoryGroups {
          id
          name
          displayName
          color
          icon
          order
          isDefault
          categories {
            id
            name
            displayName
            color
            icon
          }
          createdAt
          updatedAt
        }
      }
    `

    const data = await this.graphql.query<{
      transactionCategoryGroups: CategoryGroup[]
    }>(query)

    return data.transactionCategoryGroups || []
  }

  /**
   * 获取分类详情
   * 
   * 返回指定分类的详细信息
   */
  async getCategoryDetails(categoryId: string): Promise<any> {
    const query = `
      query GetCategoryDetails($categoryId: ID!) {
        categoryDetails(id: $categoryId) {
          id
          name
          displayName
          color
          icon
          budgetedAmount
          actualAmount
          remainingAmount
          transactionCount
          recentTransactions {
            id
            amount
            date
            merchant {
              name
            }
          }
        }
      }
    `

    const data = await this.graphql.query<{
      categoryDetails: any
    }>(query, { categoryId })

    return data.categoryDetails
  }

  /**
   * 获取交易标签
   * 
   * 返回所有可用的交易标签
   */
  async getTransactionTags(): Promise<TransactionTag[]> {
    const query = `
      query GetTransactionTags {
        transactionTags {
          id
          name
          color
          order
          isDefault
          createdAt
          updatedAt
        }
      }
    `

    const data = await this.graphql.query<{
      transactionTags: TransactionTag[]
    }>(query)

    return data.transactionTags || []
  }

  /**
   * 创建交易标签
   * 
   * 创建新的交易标签
   */
  async createTransactionTag(data: CreateTransactionTagInput): Promise<TransactionTag> {
    const mutation = `
      mutation CreateTransactionTag($input: CreateTransactionTagInput!) {
        createTransactionTag(input: $input) {
          tag {
            id
            name
            color
            order
            isDefault
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createTransactionTag: {
        tag: TransactionTag
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { input: data })

    if (result.createTransactionTag.errors?.length > 0) {
      const errorMessages = result.createTransactionTag.errors.map(e => e.message).join(', ')
      throw new Error(`创建标签失败: ${errorMessages}`)
    }

    logger.info('交易标签创建成功:', result.createTransactionTag.tag.id)
    return result.createTransactionTag.tag
  }

  /**
   * 设置交易标签
   * 
   * 替换交易的标签（与追加标签不同）
   */
  async setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction> {
    const mutation = `
      mutation SetTransactionTags($transactionId: ID!, $tagIds: [ID!]!) {
        setTransactionTags(transactionId: $transactionId, tagIds: $tagIds) {
          transaction {
            id
            tags {
              id
              name
              color
            }
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      setTransactionTags: {
        transaction: Transaction
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { transactionId, tagIds })

    if (result.setTransactionTags.errors?.length > 0) {
      const errorMessages = result.setTransactionTags.errors.map(e => e.message).join(', ')
      throw new Error(`设置标签失败: ${errorMessages}`)
    }

    return result.setTransactionTags.transaction
  }

  /**
   * 获取商家列表
   * 
   * 支持搜索和数量限制
   */
  async getMerchants(options: GetMerchantsOptions = {}): Promise<Merchant[]> {
    const { search, limit = 100 } = options

    const query = `
      query GetMerchants($search: String, $limit: Int) {
        merchants(search: $search, limit: $limit) {
          id
          name
          transactionsCount
          logoUrl
          recentAmount
          firstSeen
          lastSeen
        }
      }
    `

    const data = await this.graphql.query<{
      merchants: Merchant[]
    }>(query, { search, limit })

    return data.merchants || []
  }

  /**
   * 获取商家详情
   * 
   * 返回指定商家的详细信息
   */
  async getMerchantDetails(merchantId: string): Promise<any> {
    const query = `
      query GetMerchantDetails($merchantId: ID!) {
        merchant(id: $merchantId) {
          id
          name
          logoUrl
          transactionsCount
          totalAmount
          averageAmount
          firstSeen
          lastSeen
          categories {
            id
            name
            count
            totalAmount
          }
          accounts {
            id
            displayName
            institution {
              name
            }
          }
        }
      }
    `

    const data = await this.graphql.query<{
      merchant: any
    }>(query, { merchantId })

    return data.merchant
  }

  /**
   * 获取可编辑的商家信息
   * 
   * 返回商家信息用于编辑界面
   */
  async getEditMerchant(merchantId: string): Promise<any> {
    const query = `
      query GetEditMerchant($merchantId: ID!) {
        editMerchant(id: $merchantId) {
          id
          name
          logoUrl
          suggestedCategories {
            id
            name
            matchCount
          }
          automaticRules {
            id
            name
            isActive
          }
        }
      }
    `

    const data = await this.graphql.query<{
      editMerchant: any
    }>(query, { merchantId })

    return data.editMerchant
  }

  /**
   * 获取周期性交易
   * 
   * 返回周期性交易列表
   */
  async getRecurringTransactions(options: GetRecurringTransactionsOptions = {}): Promise<RecurringTransaction[]> {
    const { startDate, endDate } = options

    const query = `
      query GetRecurringTransactions($startDate: String, $endDate: String) {
        recurringTransactions(startDate: $startDate, endDate: $endDate) {
          id
          merchant {
            name
          }
          category {
            id
            name
            icon
          }
          averageAmount
          frequency
          nextDate
          lastDate
          status
          transactionCount
        }
      }
    `

    const data = await this.graphql.query<{
      recurringTransactions: RecurringTransaction[]
    }>(query, { startDate, endDate })

    return data.recurringTransactions || []
  }

  /**
   * 获取周期性交易流
   * 
   * 返回交易流列表
   */
  async getRecurringStreams(options: GetRecurringStreamsOptions = {}): Promise<any[]> {
    const { includeLiabilities = false, includePending = false, filters } = options

    const query = `
      query GetRecurringStreams($includeLiabilities: Boolean!, $includePending: Boolean!, $filters: RecurringStreamFilterInput) {
        recurringStreams(includeLiabilities: $includeLiabilities, includePending: $includePending, filters: $filters) {
          id
          merchant {
            id
            name
          }
          category {
            id
            name
          }
          frequency
          amount
          nextExpectedDate
          status
          confidence
          transactionCount
          lastTransactionDate
        }
      }
    `

    const data = await this.graphql.query<{
      recurringStreams: any[]
    }>(query, { includeLiabilities, includePending, filters })

    return data.recurringStreams || []
  }

  /**
   * 获取聚合的周期性项目
   * 
   * 返回按类别聚合的周期性项目
   */
  async getAggregatedRecurringItems(options: GetAggregatedRecurringItemsOptions): Promise<any> {
    const { startDate, endDate, groupBy = 'category', filters } = options

    const query = `
      query GetAggregatedRecurringItems($startDate: String!, $endDate: String!, $groupBy: String!, $filters: RecurringItemFilterInput) {
        aggregatedRecurringItems(startDate: $startDate, endDate: $endDate, groupBy: $groupBy, filters: $filters) {
          groups {
            id
            name
            items {
              id
              merchant {
                name
              }
              amount
              frequency
              nextDate
            }
            totalAmount
            itemCount
          }
          totals {
            income
            expenses
            net
          }
        }
      }
    `

    const data = await this.graphql.query<{
      aggregatedRecurringItems: any
    }>(query, { startDate, endDate, groupBy, filters })

    return data.aggregatedRecurringItems
  }

  /**
   * 获取所有周期性交易项目
   * 
   * 返回所有周期性交易项目的详细列表
   */
  async getAllRecurringTransactionItems(options: GetAllRecurringTransactionItemsOptions = {}): Promise<any[]> {
    const { filters, includeLiabilities = false } = options

    const query = `
      query GetAllRecurringTransactionItems($filters: RecurringTransactionItemFilterInput, $includeLiabilities: Boolean!) {
        allRecurringTransactionItems(filters: $filters, includeLiabilities: $includeLiabilities) {
          id
          merchant {
            id
            name
          }
          category {
            id
            name
          }
          account {
            id
            displayName
          }
          amount
          frequency
          status
          lastTransactionDate
          nextExpectedDate
          reviewStatus
        }
      }
    `

    const data = await this.graphql.query<{
      allRecurringTransactionItems: any[]
    }>(query, { filters, includeLiabilities })

    return data.allRecurringTransactionItems || []
  }

  /**
   * 审核周期性交易流
   * 
   * 审核并确认或拒绝周期性交易流
   */
  async reviewRecurringStream(streamId: string, reviewStatus: string): Promise<any> {
    const mutation = `
      mutation ReviewRecurringStream($streamId: ID!, $reviewStatus: String!) {
        reviewRecurringStream(streamId: $streamId, reviewStatus: $reviewStatus) {
          stream {
            id
            reviewStatus
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      reviewRecurringStream: {
        stream: any
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { streamId, reviewStatus })

    if (result.reviewRecurringStream.errors?.length > 0) {
      const errorMessages = result.reviewRecurringStream.errors.map(e => e.message).join(', ')
      throw new Error(`审核失败: ${errorMessages}`)
    }

    logger.info('周期性交易流审核成功:', streamId)
    return result.reviewRecurringStream.stream
  }

  /**
   * 标记交易流为非周期性
   * 
   * 将指定的交易流标记为非周期性交易
   */
  async markStreamAsNotRecurring(streamId: string): Promise<boolean> {
    const mutation = `
      mutation MarkStreamAsNotRecurring($streamId: ID!) {
        markStreamAsNotRecurring(streamId: $streamId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      markStreamAsNotRecurring: {
        success: boolean
        errors?: Array<{ field: string; message: string }>
      }
    }>(mutation, { streamId })

    if (result.markStreamAsNotRecurring.errors?.length > 0) {
      const errorMessages = result.markStreamAsNotRecurring.errors.map(e => e.message).join(', ')
      throw new Error(`标记失败: ${errorMessages}`)
    }

    return result.markStreamAsNotRecurring.success
  }

  /**
   * 获取周期性商家搜索状态
   * 
   * 返回周期性商家搜索的当前状态
   */
  async getRecurringMerchantSearchStatus(): Promise<any> {
    const query = `
      query GetRecurringMerchantSearchStatus {
        recurringMerchantSearchStatus {
          isSearching
          progress
          totalMerchants
          processedMerchants
          estimatedTimeRemaining
        }
      }
    `

    const data = await this.graphql.query<{
      recurringMerchantSearchStatus: any
    }>(query)

    return data.recurringMerchantSearchStatus
  }

  /**
   * 批量更新交易
   * 
   * 根据条件批量更新多个交易的属性
   */
  async bulkUpdateTransactions(data: BulkUpdateTransactionsInput): Promise<BulkUpdateResult> {
    const {
      transactionIds,
      updates,
      excludedTransactionIds = [],
      allSelected = false,
      filters
    } = data

    const mutation = `mutation Common_BulkUpdateTransactionsMutation($selectedTransactionIds:[ID!]$excludedTransactionIds:[ID!]$allSelected:Boolean!$expectedAffectedTransactionCount:Int!$updates:TransactionUpdateParams!$filters:TransactionFilterInput){bulkUpdateTransactions(selectedTransactionIds:$selectedTransactionIds excludedTransactionIds:$excludedTransactionIds updates:$updates allSelected:$allSelected expectedAffectedTransactionCount:$expectedAffectedTransactionCount filters:$filters){success affectedCount errors{message}}}`

    const result = await this.graphql.mutation<{
      bulkUpdateTransactions: {
        success: boolean
        affectedCount: number
        errors?: Array<{ message: string }>
      }
    }>(mutation, {
      selectedTransactionIds: transactionIds,
      excludedTransactionIds,
      allSelected,
      expectedAffectedTransactionCount: transactionIds.length,
      updates,
      filters: filters || { transactionVisibility: 'non_hidden_transactions_only' },
    })

    if (!result.bulkUpdateTransactions?.success) {
      const message = result.bulkUpdateTransactions?.errors?.[0]?.message || '未知错误'
      throw new Error(`批量更新失败: ${message}`)
    }

    logger.info(`批量更新完成: ${result.bulkUpdateTransactions.affectedCount} 条交易已更新`)
    return {
      success: result.bulkUpdateTransactions.success,
      affectedCount: result.bulkUpdateTransactions.affectedCount
    }
  }

  /**
   * 批量隐藏交易
   * 
   * 将指定的交易标记为隐藏
   */
  async bulkHideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult> {
    return this.bulkUpdateTransactions({
      transactionIds,
      updates: { hide: true },
      filters
    })
  }

  /**
   * 批量取消隐藏交易
   * 
   * 将指定的交易取消隐藏
   */
  async bulkUnhideTransactions(transactionIds: string[], filters?: any): Promise<BulkUpdateResult> {
    return this.bulkUpdateTransactions({
      transactionIds,
      updates: { hide: false },
      filters
    })
  }

  /**
   * 获取隐藏的交易
   * 
   * 返回隐藏的交易列表
   */
  async getHiddenTransactions(options: GetHiddenTransactionsOptions = {}): Promise<PaginatedTransactions> {
    const { limit = 100, offset = 0, orderBy = 'date' } = options

    const query = `
      query GetHiddenTransactions($limit: Int, $offset: Int, $orderBy: String!) {
        hiddenTransactions(limit: $limit, offset: $offset, orderBy: $orderBy) {
          totalCount
          results {
            id
            amount
            date
            merchant {
              name
            }
            category {
              name
            }
            account {
              displayName
            }
            hiddenReason
            hiddenAt
          }
        }
      }
    `

    const data = await this.graphql.query<{
      hiddenTransactions: {
        totalCount: number
        results: Transaction[]
      }
    }>(query, { limit, offset, orderBy })

    return {
      transactions: data.hiddenTransactions.results,
      totalCount: data.hiddenTransactions.totalCount,
      hasMore: offset + limit < data.hiddenTransactions.totalCount,
      limit,
      offset
    }
  }
}
