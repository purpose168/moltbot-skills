// 洞察 API 模块 - 提供财务洞察、信用评分和通知管理功能
// Insights API module - provides financial insights, credit score monitoring, and notification management functionality

// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from '../../client/graphql'

/**
 * 财务洞察接口
 * 
 * 表示系统生成的财务分析和建议
 * 包含洞察类型、优先级、是否需要操作等信息
 */
export interface Insight {
  id: string                     // 洞察唯一标识符
  type: string                   // 洞察类型（如 'spending_alert'、'savings_opportunity'）
  title: string                  // 洞察标题
  description: string            // 洞察详细描述
  category: string               // 洞察分类（如 'budget'、'savings'、'debt'）
  priority: number               // 优先级（数字越大优先级越高）
  actionRequired: boolean        // 是否需要用户操作
  createdAt: string              // 洞察创建时间
  dismissedAt?: string           // 洞察关闭时间（如果用户已忽略）
  metadata?: Record<string, any> // 额外元数据
}

/**
 * 净资产历史记录点接口
 * 
 * 表示某个时间点的净资产数据
 * 包含总资产、总负债和净资产金额
 */
export interface NetWorthHistoryPoint {
  date: string      // 记录日期（YYYY-MM-DD 格式）
  netWorth: number  // 净资产金额（资产 - 负债）
  assets: number    // 总资产
  liabilities: number // 总负债
}

/**
 * 信用评分接口
 * 
 * 表示用户的信用评分监控数据
 * 包含当前评分、提供商、历史记录和影响因素
 */
export interface CreditScore {
  score?: number                                             // 当前信用评分
  provider?: string                                          // 信用评分提供商（如 'transunion'、'equifax'）
  lastUpdated?: string                                       // 最后更新时间
  history?: Array<{                                          // 评分历史记录
    date: string                                             // 记录日期
    score: number                                            // 信用评分
  }>
  factors?: Array<{                                          // 影响信用评分的因素
    category: string                                         // 因素类别
    impact: string                                           // 影响方向（如 'positive'、'negative'）
    description: string                                      // 因素描述
  }>
}

/**
 * 通知接口
 * 
 * 表示用户账户的通知和警报
 * 包含通知类型、标题、消息和阅读状态
 */
export interface Notification {
  id: string          // 通知唯一标识符
  type: string        // 通知类型（如 'transaction_alert'、'budget_warning'）
  title: string       // 通知标题
  message: string     // 通知消息内容
  priority: string    // 优先级（如 'low'、'medium'、'high'）
  isRead: boolean     // 是否已读
  createdAt: string   // 通知创建时间
  actionUrl?: string  // 操作链接 URL（可选）
}

/**
 * 订阅详情接口
 * 
 * 表示用户的订阅计划和计费信息
 * 包含计划类型、状态、功能列表等
 */
export interface SubscriptionDetails {
  planType: string      // 计划类型（如 'free'、'premium'、'family'）
  status: string        // 订阅状态（如 'active'、'canceled'、'past_due'）
  billingCycle: string  // 计费周期（如 'monthly'、'yearly'）
  nextBillingDate?: string // 下次账单日期
  price: number         // 订阅价格
  features: string[]    // 包含的功能列表
}

/**
 * 洞察 API 接口
 * 
 * 定义财务洞察和监控的所有操作方法
 * 包含以下功能：
 * - 获取财务洞察和建议
 * - 获取净资产历史记录
 * - 获取信用评分监控数据
 * - 获取账户通知和警报
 * - 获取订阅详情和计划信息
 * - 关闭/消除洞察
 */
export interface InsightsAPI {
  /**
   * 获取财务洞察和建议
   * 
   * 返回系统生成的财务分析洞察
   * 支持按日期范围和类型过滤
   * 
   * @param options - 查询选项（可选）
   * @param options.startDate - 开始日期
   * @param options.endDate - 结束日期
   * @param options.insightTypes - 洞察类型过滤
   * @returns 财务洞察数组
   */
  getInsights(options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]>

  /**
   * 获取净资产历史记录
   * 
   * 返回指定时间范围内的净资产变化历史
   * 默认返回过去 12 个月的数据
   * 
   * @param options - 查询选项（可选）
   * @param options.startDate - 开始日期
   * @param options.endDate - 结束日期
   * @returns 净资产历史记录数组
   */
  getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]>

  /**
   * 获取信用评分监控数据
   * 
   * 返回用户的信用评分信息
   * 支持包含历史记录和影响因素
   * 
   * @param options - 查询选项（可选）
   * @param options.includeHistory - 是否包含历史记录（默认：true）
   * @returns 信用评分数据
   */
  getCreditScore(options?: {
    includeHistory?: boolean
  }): Promise<CreditScore>

  /**
   * 获取账户通知和警报
   * 
   * 返回用户的所有未读通知
   * 包含交易提醒、预算警告等
   * 
   * @returns 通知数组
   */
  getNotifications(): Promise<Notification[]>

  /**
   * 获取订阅详情和计划信息
   * 
   * 返回当前用户的订阅信息
   * 包含计划类型、计费信息和可用功能
   * 
   * @returns 订阅详情对象
   */
  getSubscriptionDetails(): Promise<SubscriptionDetails>

  /**
   * 关闭/消除洞察
   * 
   * 将指定洞察标记为已处理
   * 关闭后该洞察将不再显示
   * 
   * @param insightId - 要关闭的洞察 ID
   * @returns 如果操作成功则返回 true
   */
  dismissInsight(insightId: string): Promise<boolean>
}

/**
 * 洞察 API 实现类
 * 
 * 实现了 InsightsAPI 接口的所有方法
 * 使用 GraphQL 与 Monarch Money API 进行通信
 */
export class InsightsAPIImpl implements InsightsAPI {
  // 构造函数 - 注入 GraphQL 客户端
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取财务洞察和建议
   * 
   * @param options - 查询选项（可选）
   * @returns 财务洞察数组
   */
  async getInsights(options?: {
    startDate?: string
    endDate?: string
    insightTypes?: string[]
  }): Promise<Insight[]> {
    // 构建查询变量
    const variables: Record<string, any> = {}
    
    if (options?.startDate) variables.startDate = options.startDate
    if (options?.endDate) variables.endDate = options.endDate
    if (options?.insightTypes) variables.insightTypes = options.insightTypes

    // 构建 GraphQL 查询
    const query = `
      query GetInsights(
        $startDate: String,
        $endDate: String,
        $insightTypes: [String]
      ) {
        insights(
          startDate: $startDate,
          endDate: $endDate,
          insightTypes: $insightTypes
        ) {
          id
          type
          title
          description
          priority
          category
          actionRequired
          createdAt
          dismissedAt
          metadata
          __typename
        }
      }
    `

    // 执行 GraphQL 查询并返回结果
    const result = await this.graphql.query<{ insights: Insight[] }>(query, variables)
    return result.insights
  }

  /**
   * 获取净资产历史记录
   * 
   * @param options - 查询选项（可选）
   * @returns 净资产历史记录数组
   */
  async getNetWorthHistory(options?: {
    startDate?: string
    endDate?: string
  }): Promise<NetWorthHistoryPoint[]> {
    // 如果未提供日期，默认使用过去 12 个月
    const endDate = options?.endDate || new Date().toISOString().split('T')[0]
    const startDate = options?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 构建查询变量
    const variables = { startDate, endDate }

    // 构建 GraphQL 查询
    const query = `
      query GetNetWorthHistory($startDate: Date!, $endDate: Date!) {
        netWorthHistory(startDate: $startDate, endDate: $endDate) {
          date
          netWorth
          assets
          liabilities
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{
      netWorthHistory: NetWorthHistoryPoint[]
    }>(query, variables)

    // 返回净资产历史记录
    return result.netWorthHistory
  }

  /**
   * 获取信用评分监控数据
   * 
   * @param options - 查询选项（可选）
   * @returns 信用评分数据
   */
  async getCreditScore(options?: {
    includeHistory?: boolean
  }): Promise<CreditScore> {
    // 构建查询变量
    const variables = {
      includeHistory: options?.includeHistory ?? true  // 默认包含历史记录
    }

    // 构建 GraphQL 查询
    const query = `
      query Common_GetSpinwheelCreditScoreSnapshots($includeHistory: Boolean!) {
        spinwheelCreditScoreSnapshots(includeHistory: $includeHistory) {
          score
          provider
          lastUpdated
          history {
            date
            score
            __typename
          }
          factors {
            category
            impact
            description
            __typename
          }
          __typename
        }
      }
    `

    try {
      // 执行 GraphQL 查询
      const result = await this.graphql.query<{
        spinwheelCreditScoreSnapshots: CreditScore
      }>(query, variables)

      // 返回信用评分数据
      return result.spinwheelCreditScoreSnapshots
    } catch (error) {
      // 如果服务不可用，返回空的信用评分数据
      return {
        score: undefined,
        provider: undefined,
        lastUpdated: undefined,
        history: [],
        factors: []
      }
    }
  }

  /**
   * 获取账户通知和警报
   * 
   * @returns 通知数组
   */
  async getNotifications(): Promise<Notification[]> {
    // 构建 GraphQL 查询
    const query = `
      query GetNotifications {
        notifications {
          id
          type
          title
          message
          priority
          isRead
          createdAt
          actionUrl
          __typename
        }
      }
    `

    // 执行 GraphQL 查询并返回结果
    const result = await this.graphql.query<{ notifications: Notification[] }>(query)
    return result.notifications
  }

  /**
   * 获取订阅详情和计划信息
   * 
   * @returns 订阅详情对象
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails> {
    // 构建 GraphQL 查询
    const query = `
      query Common_GetSubscriptionDetails {
        subscriptionDetails {
          planType
          status
          billingCycle
          nextBillingDate
          price
          features
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{
      subscriptionDetails: SubscriptionDetails
    }>(query)

    // 返回订阅详情
    return result.subscriptionDetails
  }

  /**
   * 关闭/消除洞察
   * 
   * @param insightId - 要关闭的洞察 ID
   * @returns 如果操作成功则返回 true
   */
  async dismissInsight(insightId: string): Promise<boolean> {
    // 构建变更变量
    const variables = { insightId }

    // 构建 GraphQL 变更
    const mutation = `
      mutation DismissInsight($insightId: ID!) {
        dismissInsight(insightId: $insightId) {
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
        dismissInsight: {
          success: boolean
          errors?: Array<{ message: string; field?: string }>
        }
      }>(mutation, variables)

      // 返回操作结果
      return result.dismissInsight.success
    } catch (error) {
      // 记录错误并返回失败
      console.error('无法关闭洞察:', error)
      return false
    }
  }
}