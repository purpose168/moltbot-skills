// 现金流 API 模块 - 提供收入、支出和储蓄分析功能
// Cashflow API module - provides income, expense, and savings analysis functionality

// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from '../../client/graphql'

/**
 * 现金流汇总接口
 * 
 * 定义指定时间范围内的收入、支出和储蓄汇总信息
 * 用于快速了解整体财务状况
 */
export interface CashflowSummary {
  sumIncome: number        // 总收入金额
  sumExpense: number       // 总支出金额
  savings: number          // 储蓄金额（收入 - 支出）
  savingsRate: number      // 储蓄率（百分比，0-1 之间）
}

/**
 * 分类聚合接口
 * 
 * 按分类分组的交易聚合数据
 * 包含分类信息和该分类的总金额
 */
export interface CategoryAggregate {
  groupBy: {               // 分组依据
    category: {            // 分类信息
      id: string           // 分类 ID
      name: string         // 分类名称
      group: {             // 所属分类组
        id: string         // 分类组 ID
        type: string       // 分类组类型（如 'expense'、'income'）
      }
    }
  }
  summary: {               // 聚合汇总
    sum: number            // 该分类的总金额
  }
}

/**
 * 分类组聚合接口
 * 
 * 按分类组分组的交易聚合数据
 * 包含分类组信息和该分类组的总金额
 */
export interface CategoryGroupAggregate {
  groupBy: {               // 分组依据
    categoryGroup: {       // 分类组信息
      id: string           // 分类组 ID
      name: string         // 分类组名称
      type: string         // 分类组类型（如 'expense'、'income'）
    }
  }
  summary: {               // 聚合汇总
    sum: number            // 该分类组的总金额
  }
}

/**
 * 完整现金流数据接口
 * 
 * 包含所有维度的现金流分析数据
 */
export interface CashflowData {
  byCategory: CategoryAggregate[]           // 按分类分组的聚合数据
  byCategoryGroup: CategoryGroupAggregate[] // 按分类组分组的聚合数据
  summary?: {                               // 现金流汇总（可选）
    summary: CashflowSummary                 // 汇总数据
  }
}

/**
 * 交易过滤器接口
 * 
 * 用于过滤交易数据的条件
 * 支持多种过滤维度
 */
export interface TransactionFilter {
  search?: string       // 搜索关键词
  categories?: string[] // 仅包含指定分类 ID
  accounts?: string[]   // 仅包含指定账户 ID
  tags?: string[]       // 仅包含指定标签 ID
  startDate?: string    // 开始日期（YYYY-MM-DD 格式）
  endDate?: string      // 结束日期（YYYY-MM-DD 格式）
  minAmount?: number    // 最小金额（过滤小额交易）
  maxAmount?: number    // 最大金额（过滤大额交易）
}

/**
 * 现金流 API 接口
 * 
 * 定义现金流分析的所有操作方法
 * 包含以下功能：
 * - 获取完整的现金流分析数据（按分类、分类组等维度）
 * - 获取现金流汇总（收入、支出、储蓄）
 */
export interface CashflowAPI {
  /**
   * 获取按分类和分类组细分的现金流分析
   * 
   * 返回完整的现金流分析数据
   * 包含按分类、分类组、账户、商家、月度等多个维度的聚合
   * 
   * @param options - 查询选项（可选）
   * @param options.startDate - 开始日期（默认：本月第一天）
   * @param options.endDate - 结束日期（默认：本月最后一天）
   * @param options.filters - 过滤条件
   * @returns 完整的现金流分析数据
   */
  getCashflow(options?: {
    startDate?: string
    endDate?: string
    filters?: TransactionFilter
  }): Promise<CashflowData>

  /**
   * 获取包含收入、支出、储蓄的现金流汇总
   * 
   * 返回简化的现金流汇总信息
   * 适合用于显示在仪表板或报告中
   * 
   * @param options - 查询选项（可选）
   * @param options.startDate - 开始日期（默认：本月第一天）
   * @param options.endDate - 结束日期（默认：本月最后一天）
   * @param options.filters - 过滤条件
   * @returns 现金流汇总数据
   */
  getCashflowSummary(options?: {
    startDate?: string
    endDate?: string
    filters?: TransactionFilter
  }): Promise<CashflowSummary>
}

/**
 * 现金流 API 实现类
 * 
 * 实现了 CashflowAPI 接口的所有方法
 * 使用 GraphQL 与 Monarch Money API 进行通信
 */
export class CashflowAPIImpl implements CashflowAPI {
  // 构造函数 - 注入 GraphQL 客户端
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取当前月份的日期范围
   * 
   * 如果未指定日期范围，则使用当前月份的第一天到最后一天
   * 
   * @returns 包含 startDate 和 endDate 的对象
   */
  private getCurrentMonthDates(): { startDate: string; endDate: string } {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`  // 月初
    const lastDay = new Date(year, month, 0).getDate()                // 月末天数
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { startDate, endDate }
  }

  /**
   * 获取按分类和分类组细分的现金流分析
   * 
   * @param options - 查询选项（可选）
   * @returns 完整的现金流分析数据
   */
  async getCashflow(options?: {
    startDate?: string
    endDate?: string
    filters?: TransactionFilter
  }): Promise<CashflowData> {
    // 确定日期范围：使用提供的日期或当前月份
    const { startDate, endDate } = options?.startDate && options?.endDate 
      ? { startDate: options.startDate, endDate: options.endDate }
      : this.getCurrentMonthDates()

    // 构建过滤器：合并默认空值和用户提供的过滤器
    const filters = {
      search: "",              // 搜索关键词
      categories: [],          // 分类过滤
      accounts: [],            // 账户过滤
      tags: [],                // 标签过滤
      startDate,               // 开始日期
      endDate,                 // 结束日期
      ...options?.filters      // 用户提供的过滤器
    }

    // 构建 GraphQL 查询
    const query = `
      query Web_GetCashFlowPage($filters: TransactionFilterInput) {
        byCategory: aggregates(filters: $filters, groupBy: ["category"]) {
          groupBy {
            category {
              id
              name
              group {
                id
                type
                __typename
              }
              __typename
            }
            __typename
          }
          summary {
            sum
            __typename
          }
          __typename
        }
        byCategoryGroup: aggregates(filters: $filters, groupBy: ["categoryGroup"]) {
          groupBy {
            categoryGroup {
              id
              name
              type
              __typename
            }
            __typename
          }
          summary {
            sum
            __typename
          }
          __typename
        }
        byAccount: aggregates(filters: $filters, groupBy: ["account"]) {
          groupBy {
            account {
              id
              displayName
              __typename
            }
            __typename
          }
          summary {
            sum
            __typename
          }
          __typename
        }
        byMerchant: aggregates(filters: $filters, groupBy: ["merchant"], limit: 50) {
          groupBy {
            merchant {
              id
              name
              __typename
            }
            __typename
          }
          summary {
            sum
            __typename
          }
          __typename
        }
        byMonth: aggregates(filters: $filters, groupBy: ["month"]) {
          groupBy {
            month {
              date
              __typename
            }
            __typename
          }
          summary {
            sum
            count
            __typename
          }
          __typename
        }
      }
    `

    // 执行 GraphQL 查询并返回结果
    return await this.graphql.query<CashflowData>(query, { filters })
  }

  /**
   * 获取包含收入、支出、储蓄的现金流汇总
   * 
   * @param options - 查询选项（可选）
   * @returns 现金流汇总数据
   */
  async getCashflowSummary(options?: {
    startDate?: string
    endDate?: string
    filters?: TransactionFilter
  }): Promise<CashflowSummary> {
    // 确定日期范围：使用提供的日期或当前月份
    const { startDate, endDate } = options?.startDate && options?.endDate 
      ? { startDate: options.startDate, endDate: options.endDate }
      : this.getCurrentMonthDates()

    // 构建过滤器：合并默认空值和用户提供的过滤器
    const filters = {
      search: "",              // 搜索关键词
      categories: [],          // 分类过滤
      accounts: [],            // 账户过滤
      tags: [],                // 标签过滤
      startDate,               // 开始日期
      endDate,                 // 结束日期
      ...options?.filters      // 用户提供的过滤器
    }

    // 构建 GraphQL 查询
    const query = `
      query Web_GetCashFlowPage($filters: TransactionFilterInput) {
        summary: aggregates(filters: $filters, fillEmptyValues: true) {
          summary {
            sumIncome
            sumExpense
            savings
            savingsRate
            __typename
          }
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{
      summary: Array<{
        summary: CashflowSummary
      }>
    }>(query, { filters })

    // FIXED: 处理实际 API 返回的数组响应结构
    return result.summary[0].summary
  }
}