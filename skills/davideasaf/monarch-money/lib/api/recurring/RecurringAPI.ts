// 周期性交易 API 模块 - 提供周期性交易流和交易项目管理功能
// Recurring Transactions API module - provides recurring transaction stream and item management functionality

// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from '../../client/graphql'

/**
 * 周期性交易流接口
 * 
 * 定义周期性交易的完整信息，包括商家、分类、账户等
 * 用于表示自动识别的周期性交易模式
 */
export interface RecurringTransactionStream {
  id: string                                          // 交易流唯一标识符
  reviewStatus: string                                // 审核状态（如 'pending'、'approved' 等）
  frequency: string                                   // 发生频率（如 'monthly'、'weekly'、'yearly'）
  amount: number                                      // 交易金额（正数表示收入，负数表示支出）
  baseDate?: string                                   // 基准日期
  dayOfTheMonth?: number                              // 每月发生日（用于月度周期性交易）
  isApproximate: boolean                              // 是否为近似金额（金额可能不完全准确）
  name: string                                        // 交易流名称（通常为商家名称）
  logoUrl?: string                                    // 商家 Logo URL
  recurringType: string                               // 周期性类型（如 'income'、'expense'）
  isActive: boolean                                   // 是否激活（已禁用的流不会显示）
  merchant: {                                         // 关联商家信息
    id: string                                        // 商家 ID
    name: string                                      // 商家名称
    logoUrl?: string                                  // 商家 Logo URL
  }
  creditReportLiabilityAccount?: {                    // 信用报告负债账户（可选，仅负债类交易）
    id: string                                        // 账户 ID
    account: {                                        // 关联账户
      id: string                                      // 账户 ID
      displayName: string                             // 账户显示名称
    }
  }
  category: {                                         // 默认分类
    id: string                                        // 分类 ID
    name: string                                      // 分类名称
  }
  account: {                                          // 关联账户
    id: string                                        // 账户 ID
    displayName: string                               // 账户显示名称
  }
}

/**
 * 周期性交易项目接口
 * 
 * 表示具体的周期性交易发生记录
 * 包含交易流信息和具体的交易日期、金额等
 */
export interface RecurringTransactionItem {
  stream: RecurringTransactionStream                  // 关联的交易流
  date: string                                        // 交易发生日期
  isPast: boolean                                     // 是否为历史交易
  transactionId?: string                              // 关联的交易 ID（如果已匹配）
  amount: number                                      // 交易金额
  amountDiff?: number                                 // 与预期金额的差异（正数表示实际金额更高）
  category: {                                         // 分类信息
    id: string                                        // 分类 ID
    name: string                                      // 分类名称
  }
  account: {                                          // 账户信息
    id: string                                        // 账户 ID
    displayName: string                               // 账户显示名称
  }
}

/**
 * 周期性交易过滤器接口
 * 
 * 用于过滤周期性交易结果的条件
 */
export interface RecurringTransactionFilter {
  accounts?: string[]        // 仅包含指定账户 ID
  categories?: string[]      // 仅包含指定分类 ID
  merchants?: string[]       // 仅包含指定商家 ID
}

/**
 * 周期性交易 API 接口
 * 
 * 定义周期性交易管理的所有操作方法
 * 包含以下功能：
 * - 获取所有周期性交易流
 * - 获取即将发生的周期性交易项目
 * - 标记交易流为非周期性（禁用）
 */
export interface RecurringAPI {
  /**
   * 获取所有周期性交易流
   * 
   * 检索系统中识别到的所有周期性交易模式
   * 支持过滤和包含选项
   * 
   * @param options - 查询选项（可选）
   * @param options.includeLiabilities - 是否包含负债账户（默认：true）
   * @param options.includePending - 是否包含待处理的交易流（默认：true）
   * @param options.filters - 过滤条件
   * @returns 周期性交易流数组
   */
  getRecurringStreams(options?: {
    includeLiabilities?: boolean
    includePending?: boolean
    filters?: RecurringTransactionFilter
  }): Promise<{ stream: RecurringTransactionStream }[]>

  /**
   * 获取指定日期范围内的即将发生的周期性交易项目
   * 
   * 检索指定日期范围内预计发生的周期性交易
   * 可以用于预算规划或现金流预测
   * 
   * @param options - 查询选项
   * @param options.startDate - 开始日期（YYYY-MM-DD 格式）
   * @param options.endDate - 结束日期（YYYY-MM-DD 格式）
   * @param options.filters - 过滤条件
   * @returns 周期性交易项目数组
   */
  getUpcomingRecurringItems(options: {
    startDate: string
    endDate: string
    filters?: RecurringTransactionFilter
  }): Promise<RecurringTransactionItem[]>

  /**
   * 将周期性交易流标记为非周期性（禁用）
   * 
   * 取消识别某个交易为周期性交易
   * 禁用后该交易流将不再显示在周期性交易列表中
   * 
   * @param streamId - 要禁用的交易流 ID
   * @returns 如果操作成功则返回 true
   */
  markStreamAsNotRecurring(streamId: string): Promise<boolean>
}

/**
 * 周期性交易 API 实现类
 * 
 * 实现了 RecurringAPI 接口的所有方法
 * 使用 GraphQL 与 Monarch Money API 进行通信
 */
export class RecurringAPIImpl implements RecurringAPI {
  // 构造函数 - 注入 GraphQL 客户端
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取所有周期性交易流
   * 
   * @param options - 查询选项（可选）
   * @returns 周期性交易流数组
   */
  async getRecurringStreams(options?: {
    includeLiabilities?: boolean
    includePending?: boolean
    filters?: RecurringTransactionFilter
  }): Promise<{ stream: RecurringTransactionStream }[]> {
    // 构建查询变量
    const variables = {
      includeLiabilities: options?.includeLiabilities ?? true  // 默认包含负债账户
    }

    // 使用从 MonarchMoney web 应用提取的精确查询
    const query = `
      query Common_GetRecurringStreams($includeLiabilities: Boolean) {
        recurringTransactionStreams(
          includePending: true
          includeLiabilities: $includeLiabilities
        ) {
          stream {
            id
            reviewStatus
            frequency
            amount
            baseDate
            dayOfTheMonth
            isApproximate
            name
            logoUrl
            recurringType
            merchant {
              id
              __typename
            }
            creditReportLiabilityAccount {
              id
              account {
                id
                __typename
              }
              lastStatement {
                id
                dueDate
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{
      recurringTransactionStreams: { stream: RecurringTransactionStream }[]
    }>(query, variables)

    // 返回交易流数组
    return result.recurringTransactionStreams
  }

  /**
   * 获取指定日期范围内的即将发生的周期性交易项目
   * 
   * @param options - 查询选项
   * @returns 周期性交易项目数组
   */
  async getUpcomingRecurringItems(options: {
    startDate: string
    endDate: string
    filters?: RecurringTransactionFilter
  }): Promise<RecurringTransactionItem[]> {
    // 构建查询变量
    const variables = {
      startDate: options.startDate,
      endDate: options.endDate,
      filters: options.filters || {}  // 如果未提供过滤器，则使用空对象
    }

    const query = `
      query Web_GetUpcomingRecurringTransactionItems(
        $startDate: Date!, 
        $endDate: Date!, 
        $filters: RecurringTransactionFilter
      ) {
        recurringTransactionItems(
          startDate: $startDate
          endDate: $endDate
          filters: $filters
        ) {
          stream {
            id
            frequency
            amount
            isApproximate
            merchant {
              id
              name
              logoUrl
              __typename
            }
            __typename
          }
          date
          isPast
          transactionId
          amount
          amountDiff
          category {
            id
            name
            __typename
          }
          account {
            id
            displayName
            __typename
          }
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{
      recurringTransactionItems: RecurringTransactionItem[]
    }>(query, variables)

    // 返回交易项目数组
    return result.recurringTransactionItems
  }

  /**
   * 将周期性交易流标记为非周期性（禁用）
   * 
   * @param streamId - 要禁用的交易流 ID
   * @returns 如果操作成功则返回 true
   */
  async markStreamAsNotRecurring(streamId: string): Promise<boolean> {
    // 构建变更变量
    const variables = { streamId }

    // 构建 GraphQL 变更
    const mutation = `
      mutation Common_MarkAsNotRecurring($streamId: ID!) {
        markStreamAsNotRecurring(streamId: $streamId) {
          success
          errors {
            message
            field
            __typename
          }
          __typename
        }
      }
    `

    try {
      // 执行 GraphQL 变更
      const result = await this.graphql.mutation<{
        markStreamAsNotRecurring: {
          success: boolean
          errors?: Array<{ message: string; field?: string }>
        }
      }>(mutation, variables)

      // 返回操作结果
      return result.markStreamAsNotRecurring.success
    } catch (error) {
      // 记录错误并返回失败
      console.error('无法将交易流标记为非周期性:', error)
      return false
    }
  }
}