import { GraphQLClient } from '../../client/graphql'                                              // 导入GraphQL客户端
import { 
  BudgetItem,                                                                                  // 预算项目类型
  Goal,                                                                                        // 目标类型
  CashFlowData,                                                                                // 现金流数据类型
  CashFlowSummary,                                                                             // 现金流汇总类型
  BillsData                                                                                    // 账单数据类型
} from '../../types'
import {
  validateDate,                                                                                // 验证日期
  validateDateRange,                                                                           // 验证日期范围
  logger                                                                                       // 日志工具
} from '../../utils'

/**
 * 预算API接口
 * 
 * 定义预算、目标、现金流和账单管理的所有操作方法
 */
export interface BudgetsAPI {
  /**
   * 预算管理
   * 
   * 获取预算数据列表
   */
  getBudgets(options?: BudgetOptions): Promise<BudgetData>
  
  /**
   * 设置预算金额
   * 
   * @param params - 预算金额参数
   * @returns 更新后的预算项目
   */
  setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem>

  /**
   * 目标管理
   * 
   * 获取所有储蓄目标列表
   */
  getGoals(): Promise<Goal[]>
  
  /**
   * 创建储蓄目标
   * 
   * @param params - 创建目标参数
   * @returns 创建结果（包含目标对象和错误信息）
   */
  createGoal(params: CreateGoalParams): Promise<CreateGoalResponse>
  
  /**
   * 更新储蓄目标
   * 
   * @param goalId - 目标ID
   * @param updates - 更新参数
   * @returns 更新结果
   */
  updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse>
  
  /**
   * 删除储蓄目标
   * 
   * @param goalId - 目标ID
   * @returns 如果删除成功返回true
   */
  deleteGoal(goalId: string): Promise<boolean>

  /**
   * 现金流分析
   * 
   * 获取详细现金流数据
   */
  getCashFlow(options?: CashFlowOptions): Promise<CashFlowData>
  
  /**
   * 获取现金流汇总
   * 
   * 获取指定期间的现金流汇总统计
   */
  getCashFlowSummary(options?: CashFlowSummaryOptions): Promise<CashFlowSummary>

  /**
   * 账单跟踪
   * 
   * 获取账单列表和状态
   */
  getBills(options?: BillsOptions): Promise<BillsData>
}

/**
 * 预算查询选项
 */
export interface BudgetOptions {
  startDate?: string         // 开始日期（可选）
  endDate?: string           // 结束日期（可选）
  categoryIds?: string[]     // 分类ID数组（可选）
}

/**
 * 预算数据
 * 
 * 包含完整的预算系统信息、分类预算、汇总数据等
 */
export interface BudgetData {
  budgetSystem: string                                                                              // 预算系统标识
  budgetData: {                                                                                     // 预算数据对象
    monthlyAmountsByCategory: Array<{                                                                // 按分类的月度预算
      category: { id: string }                                                                       // 分类信息
      monthlyAmounts: Array<{                                                                        // 月度金额数组
        month: string                                                                                // 月份
        plannedCashFlowAmount: number                                                                // 计划现金流金额
        plannedSetAsideAmount: number                                                               // 计划预留金额
        actualAmount: number                                                                        // 实际金额
        remainingAmount: number                                                                     // 剩余金额
        previousMonthRolloverAmount: number                                                         // 上月结转金额
        rolloverType: string                                                                        // 结转类型
        cumulativeActualAmount: number                                                              // 累计实际金额
        rolloverTargetAmount: number                                                                // 结转目标金额
      }>
    }>
    monthlyAmountsByCategoryGroup: Array<{                                                          // 按分类组的月度预算
      categoryGroup: { id: string }                                                                 // 分类组信息
      monthlyAmounts: Array<{                                                                        // 月度金额数组（同上结构）
        month: string
        plannedCashFlowAmount: number
        plannedSetAsideAmount: number
        actualAmount: number
        remainingAmount: number
        previousMonthRolloverAmount: number
        rolloverType: string
        cumulativeActualAmount: number
        rolloverTargetAmount: number
      }>
    }>
    monthlyAmountsForFlexExpense: {                                                                 // 弹性支出月度预算
      budgetVariability: string                                                                     // 预算变动性
      monthlyAmounts: Array<{                                                                        // 月度金额数组（同上结构）
        month: string
        plannedCashFlowAmount: number
        plannedSetAsideAmount: number
        actualAmount: number
        remainingAmount: number
        previousMonthRolloverAmount: number
        rolloverType: string
        cumulativeActualAmount: number
        rolloverTargetAmount: number
      }>
    }
    totalsByMonth: Array<{                                                                          // 按月份的汇总数据
      month: string                                                                                  // 月份
      totalIncome: {                                                                                 // 总收入
        actualAmount: number                                                                        // 实际金额
        plannedAmount: number                                                                       // 计划金额
        previousMonthRolloverAmount: number                                                         // 上月结转金额
        remainingAmount: number                                                                     // 剩余金额
      }
      totalExpenses: {                                                                              // 总支出
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalFixedExpenses: {                                                                         // 固定支出
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalNonMonthlyExpenses: {                                                                   // 非月度支出
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
      totalFlexibleExpenses: {                                                                     // 弹性支出
        actualAmount: number
        plannedAmount: number
        previousMonthRolloverAmount: number
        remainingAmount: number
      }
    }>
  }
  categoryGroups: Array<{                                                                         // 分类组列表
    id: string                                                                                      // 分类组ID
    name: string                                                                                    // 分类组名称
    order: number                                                                                   // 排序顺序
    type: string                                                                                    // 类型
    budgetVariability: string                                                                       // 预算变动性
    updatedAt: string                                                                               // 更新时间
    groupLevelBudgetingEnabled: boolean                                                             // 是否启用组级预算
    categories: Array<{                                                                            // 该组下的分类列表
      id: string                                                                                    // 分类ID
      name: string                                                                                  // 分类名称
      icon: string                                                                                  // 图标
      order: number                                                                                 // 排序顺序
      budgetVariability: string                                                                     // 预算变动性
      excludeFromBudget: boolean                                                                    // 是否排除
      isSystemCategory: boolean                                                                     // 是否为系统在预算外分类
      updatedAt: string                                                                             // 更新时间
      group: {                                                                                      // 所属分类组
        id: string
        type: string
        budgetVariability: string
        groupLevelBudgetingEnabled: boolean
      }
    }>
  }>
  goalsV2: Array<{                                                                                 // 储蓄目标列表
    id: string                                                                                      // 目标ID
    name: string                                                                                    // 目标名称
    archivedAt?: string                                                                             // 归档时间
    completedAt?: string                                                                            // 完成时间
    priority: string                                                                                // 优先级
    imageStorageProvider?: string                                                                   // 图片存储提供商
    imageStorageProviderId?: string                                                                 // 图片存储提供商ID
    plannedContributions: Array<{                                                                  // 计划贡献
      id: string                                                                                    // 贡献ID
      month: string                                                                                 // 月份
      amount: number                                                                                // 金额
    }>
    monthlyContributionSummaries: Array<{                                                          // 月度贡献汇总
      month: string                                                                                 // 月份
      sum: number                                                                                   // 总和
    }>
  }>
}

/**
 * 预算分类
 */
export interface BudgetCategory {
  categoryId: string                                                                                // 分类ID
  categoryName: string                                                                              // 分类名称
  plannedAmount: number                                                                             // 计划金额
  actualAmount: number                                                                              // 实际金额
  remainingAmount: number                                                                           // 剩余金额
  percentSpent: number                                                                              // 已花费百分比
}

/**
 * 预算分类组
 */
export interface BudgetCategoryGroup {
  id: string                                                                                        // 分类组ID
  name: string                                                                                      // 分类组名称
  categories: BudgetCategory[]                                                                      // 分类列表
}

/**
 * 设置预算金额的参数
 */
export interface BudgetAmountParams {
  amount: number                                                                                    // 金额
  categoryId?: string                                                                               // 分类ID（与categoryGroupId二选一）
  categoryGroupId?: string                                                                          // 分类组ID（与categoryId二选一）
  timeframe?: string                                                                                // 时间范围（默认'month'）
  startDate?: string                                                                                // 开始日期
  applyToFuture?: boolean                                                                            // 是否应用到未来（默认false）
}

/**
 * 创建目标的参数
 */
export interface CreateGoalParams {
  name: string                                                                                      // 目标名称
  targetAmount: number                                                                              // 目标金额
  targetDate?: string                                                                               // 目标日期
  description?: string                                                                              // 描述
  categoryId?: string                                                                               // 关联分类ID
  accountIds?: string[]                                                                             // 关联账户ID数组
}

/**
 * 创建目标的响应
 */
export interface CreateGoalResponse {
  goal: Goal                                                                                        // 创建的目标对象
  errors?: any[]                                                                                    // 错误信息数组
}

/**
 * 更新目标的参数
 */
export interface UpdateGoalParams {
  name?: string                                                                                     // 目标名称
  targetAmount?: number                                                                             // 目标金额
  targetDate?: string                                                                               // 目标日期
  description?: string                                                                              // 描述
  isCompleted?: boolean                                                                             // 是否已完成
}

/**
 * 更新目标的响应
 */
export interface UpdateGoalResponse {
  goal: Goal                                                                                        // 更新的目标对象
  errors?: any[]                                                                                    // 错误信息数组
}

/**
 * 现金流查询选项
 */
export interface CashFlowOptions {
  startDate?: string                                                                                // 开始日期
  endDate?: string                                                                                  // 结束日期
  groupBy?: string                                                                                  // 分组方式（默认'month'）
  limit?: number                                                                                    // 限制数量（默认100）
}

/**
 * 现金流汇总选项
 */
export interface CashFlowSummaryOptions {
  startDate?: string                                                                                // 开始日期
  endDate?: string                                                                                  // 结束日期
}

/**
 * 账单查询选项
 */
export interface BillsOptions {
  startDate?: string                                                                                // 开始日期
  endDate?: string                                                                                  // 结束日期
  includeCompleted?: boolean                                                                         // 是否包含已完成的账单（默认false）
  limit?: number                                                                                    // 限制数量（默认100）
}

/**
 * 预算API实现类
 * 
 * 实现BudgetsAPI接口的所有方法
 * 负责与Monarch Money GraphQL API进行交互
 */
export class BudgetsAPIImpl implements BudgetsAPI {
  /**
   * 构造函数
   * @param graphql - GraphQL客户端实例
   */
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取预算数据
   * 
   * 使用Python库兼容的查询模式获取完整的预算系统数据
   */
  async getBudgets(options: BudgetOptions = {}): Promise<BudgetData> {
    const { startDate, endDate } = options

    // 如果没有提供日期，使用当前月份
    const now = new Date()
    const defaultStartDate = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const defaultEndDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
    }

    // 使用Python库兼容的查询结构
    const query = `
      query Common_GetJointPlanningData($startDate: Date!, $endDate: Date!) {
        budgetSystem
        budgetData(startMonth: $startDate, endMonth: $endDate) {
          monthlyAmountsByCategory {
            category {
              id
              __typename
            }
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          monthlyAmountsByCategoryGroup {
            categoryGroup {
              id
              __typename
            }
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          monthlyAmountsForFlexExpense {
            budgetVariability
            monthlyAmounts {
              month
              plannedCashFlowAmount
              plannedSetAsideAmount
              actualAmount
              remainingAmount
              previousMonthRolloverAmount
              rolloverType
              cumulativeActualAmount
              rolloverTargetAmount
              __typename
            }
            __typename
          }
          totalsByMonth {
            month
            totalIncome {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalFixedExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalNonMonthlyExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            totalFlexibleExpenses {
              actualAmount
              plannedAmount
              previousMonthRolloverAmount
              remainingAmount
              __typename
            }
            __typename
          }
          __typename
        }
        categoryGroups {
          id
          name
          order
          type
          budgetVariability
          updatedAt
          groupLevelBudgetingEnabled
          categories {
            id
            name
            icon
            order
            budgetVariability
            excludeFromBudget
            isSystemCategory
            updatedAt
            group {
              id
              type
              budgetVariability
              groupLevelBudgetingEnabled
              __typename
            }
            __typename
          }
          __typename
        }
        goalsV2 {
          id
          name
          archivedAt
          completedAt
          priority
          imageStorageProvider
          imageStorageProviderId
          plannedContributions(startMonth: $startDate, endMonth: $endDate) {
            id
            month
            amount
            __typename
          }
          monthlyContributionSummaries(startMonth: $startDate, endMonth: $endDate) {
            month
            sum
            __typename
          }
          __typename
        }
      }
    `

    const data = await this.graphql.query<BudgetData>(query, { 
      startDate: defaultStartDate, 
      endDate: defaultEndDate 
    })

    logger.debug('使用Python库模式获取预算数据')
    return data
  }

  /**
   * 设置预算金额
   * 
   * 更新指定分类或分类组的预算金额
   */
  async setBudgetAmount(params: BudgetAmountParams): Promise<BudgetItem> {
    const {
      amount,
      categoryId,
      categoryGroupId,
      timeframe = 'month',
      startDate,
      applyToFuture = false
    } = params

    // 验证参数：不能同时指定categoryId和categoryGroupId
    if (categoryId && categoryGroupId) {
      throw new Error('不能同时指定categoryId和categoryGroupId')
    }

    // 必须指定categoryId或categoryGroupId之一
    if (!categoryId && !categoryGroupId) {
      throw new Error('必须指定categoryId或categoryGroupId')
    }

    // 验证日期格式
    if (startDate) {
      validateDate(startDate)
    }

    const mutation = `
      mutation UpdateBudgetItem(
        $amount: Float!
        $categoryId: String
        $categoryGroupId: String
        $timeframe: String!
        $startDate: String
        $applyToFuture: Boolean!
      ) {
        updateBudgetItem(
          amount: $amount
          categoryId: $categoryId
          categoryGroupId: $categoryGroupId
          timeframe: $timeframe
          startDate: $startDate
          applyToFuture: $applyToFuture
        ) {
          budgetItem {
            id
            amount
            categoryId
            categoryGroupId
            timeframe
            startDate
            endDate
          }
          errors {
            field
            messages
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateBudgetItem: {
        budgetItem: BudgetItem
        errors: any[]
      }
    }>(mutation, { amount, categoryId, categoryGroupId, timeframe, startDate, applyToFuture })

    if (result.updateBudgetItem.errors?.length > 0) {
      throw new Error(`预算更新失败: ${result.updateBudgetItem.errors[0].messages.join(', ')}`)
    }

    logger.info('预算金额更新成功')
    return result.updateBudgetItem.budgetItem
  }

  /**
   * 获取储蓄目标列表
   * 
   * 返回所有未删除的储蓄目标
   */
  async getGoals(): Promise<Goal[]> {
    const query = `
      query GetGoals {
        goals {
          id
          name
          description
          targetAmount
          currentAmount
          targetDate
          createdAt
          updatedAt
          completedAt
          progress
          category {
            id
            name
          }
          accounts {
            id
            displayName
          }
        }
      }
    `

    const data = await this.graphql.query<{
      goals: Goal[]
    }>(query)

    return data.goals
  }

  /**
   * 创建储蓄目标
   * 
   * 创建一个新的储蓄目标，可选择关联分类和账户
   */
  async createGoal(params: CreateGoalParams): Promise<CreateGoalResponse> {
    const { name, targetAmount, targetDate, description, categoryId, accountIds } = params

    // 验证目标名称长度
    if (name.length < 1 || name.length > 100) {
      throw new Error('目标名称必须在1到100个字符之间')
    }

    // 验证描述长度
    if (description && description.length > 500) {
      throw new Error('目标描述不能超过500个字符')
    }

    // 验证目标日期格式
    if (targetDate) {
      validateDate(targetDate)
    }

    const mutation = `
      mutation CreateGoal(
        $name: String!
        $targetAmount: Float!
        $targetDate: String
        $description: String
        $categoryId: String
        $accountIds: [String!]
      ) {
        createGoal(
          name: $name
          targetAmount: $targetAmount
          targetDate: $targetDate
          description: $description
          categoryId: $categoryId
          accountIds: $accountIds
        ) {
          goal {
            id
            name
            description
            targetAmount
            currentAmount
            targetDate
            progress
            createdAt
            category {
              id
              name
            }
            accounts {
              id
              displayName
            }
          }
          errors {
            field
            messages
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createGoal: CreateGoalResponse
    }>(mutation, { name, targetAmount, targetDate, description, categoryId, accountIds })

    if (result.createGoal.errors && result.createGoal.errors.length > 0) {
      throw new Error(`目标创建失败: ${result.createGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('目标创建成功:', result.createGoal.goal.id)
    return result.createGoal
  }

  /**
   * 更新储蓄目标
   * 
   * 更新目标的名称、目标金额、目标日期等信息
   */
  async updateGoal(goalId: string, updates: UpdateGoalParams): Promise<UpdateGoalResponse> {
    // 验证目标名称长度
    if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
      throw new Error('目标名称必须在1到100个字符之间')
    }

    // 验证描述长度
    if (updates.description && updates.description.length > 500) {
      throw new Error('目标描述不能超过500个字符')
    }

    // 验证目标日期格式
    if (updates.targetDate) {
      validateDate(updates.targetDate)
    }

    const mutation = `
      mutation UpdateGoal(
        $goalId: String!
        $name: String
        $targetAmount: Float
        $targetDate: String
        $description: String
        $isCompleted: Boolean
      ) {
        updateGoal(
          goalId: $goalId
          name: $name
          targetAmount: $targetAmount
          targetDate: $targetDate
          description: $description
          isCompleted: $isCompleted
        ) {
          goal {
            id
            name
            description
            targetAmount
            currentAmount
            targetDate
            progress
            completedAt
            updatedAt
          }
          errors {
            field
            messages
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateGoal: UpdateGoalResponse
    }>(mutation, { goalId, ...updates })

    if (result.updateGoal.errors && result.updateGoal.errors.length > 0) {
      throw new Error(`目标更新失败: ${result.updateGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('目标更新成功:', goalId)
    return result.updateGoal
  }

  /**
   * 删除储蓄目标
   * 
   * 永久删除指定的储蓄目标
   */
  async deleteGoal(goalId: string): Promise<boolean> {
    const mutation = `
      mutation DeleteGoal($goalId: String!) {
        deleteGoal(goalId: $goalId) {
          deleted
          errors {
            field
            messages
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteGoal: {
        deleted: boolean
        errors: any[]
      }
    }>(mutation, { goalId })

    if (result.deleteGoal.errors?.length > 0) {
      throw new Error(`目标删除失败: ${result.deleteGoal.errors[0].messages.join(', ')}`)
    }

    logger.info('目标删除成功:', goalId)
    return result.deleteGoal.deleted
  }

  /**
   * 获取现金流数据
   * 
   * 返回指定期间的详细现金流分析数据
   */
  async getCashFlow(options: CashFlowOptions = {}): Promise<CashFlowData> {
    const { startDate, endDate, groupBy = 'month', limit = 100 } = options

    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
    }

    const query = `
      query GetCashFlow(
        $startDate: String
        $endDate: String
        $groupBy: String!
        $limit: Int
      ) {
        cashFlow(
          startDate: $startDate
          endDate: $endDate
          groupBy: $groupBy
          limit: $limit
        ) {
          totalIncome
          totalExpenses
          netCashFlow
          periods {
            period
            income
            expenses
            netCashFlow
          }
          categories {
            categoryId
            categoryName
            totalAmount
            transactionCount
          }
        }
      }
    `

    const data = await this.graphql.query<{
      cashFlow: CashFlowData
    }>(query, { startDate, endDate, groupBy, limit })

    logger.debug('获取现金流数据')
    return data.cashFlow
  }

  /**
   * 获取现金流汇总
   * 
   * 返回指定期间的现金流汇总统计数据
   */
  async getCashFlowSummary(options: CashFlowSummaryOptions = {}): Promise<CashFlowSummary> {
    const { startDate, endDate } = options

    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
    }

    const query = `
      query GetCashFlowSummary($startDate: String, $endDate: String) {
        cashFlowSummary(startDate: $startDate, endDate: $endDate) {
          totalIncome
          totalExpenses
          netCashFlow
          averageMonthlyIncome
          averageMonthlyExpenses
          averageMonthlyNetCashFlow
          periodCount
        }
      }
    `

    const data = await this.graphql.query<{
      cashFlowSummary: CashFlowSummary
    }>(query, { startDate, endDate })

    return data.cashFlowSummary
  }

  /**
   * 获取账单数据
   * 
   * 返回指定期间的账单列表和统计信息
   */
  async getBills(options: BillsOptions = {}): Promise<BillsData> {
    const { startDate, endDate, includeCompleted = false, limit = 100 } = options

    if (startDate && endDate) {
      validateDateRange(startDate, endDate)
    }

    const query = `
      query GetBills(
        $startDate: String
        $endDate: String
        $includeCompleted: Boolean!
        $limit: Int
      ) {
        bills(
          startDate: $startDate
          endDate: $endDate
          includeCompleted: $includeCompleted
          limit: $limit
        ) {
          totalAmount
          totalCount
          overdueBills
          upcomingBills
          bills {
            id
            merchant {
              name
            }
            amount
            dueDate
            isPaid
            isOverdue
            category {
              id
              name
            }
            account {
              id
              displayName
            }
            recurringRule {
              frequency
              nextDate
            }
          }
        }
      }
    `

    const data = await this.graphql.query<{
      bills: BillsData
    }>(query, { startDate, endDate, includeCompleted, limit })

    logger.debug('获取账单数据')
    return data.bills
  }
}
