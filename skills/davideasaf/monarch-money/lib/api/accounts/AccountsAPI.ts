import { GraphQLClient } from '../../client/graphql'                                            // 导入GraphQL客户端
import {
  Account,                                                                                    // 账户类型
  AccountBalance,                                                                             // 账户余额类型
  CreateAccountInput,                                                                         // 创建账户输入类型
  UpdateAccountInput                                                                          // 更新账户输入类型
} from '../../types'
import {
  GET_ACCOUNT_DETAILS,                                                                       // 获取账户详情查询
  GET_ACCOUNT_TYPE_OPTIONS,                                                                   // 获取账户类型选项查询
  GET_NET_WORTH_HISTORY                                                                       // 获取净资产历史查询
} from '../../client/graphql/operations'
import { getQueryForVerbosity, VerbosityLevel } from '../../client/graphql/operations'        // 获取详细程度查询
import {
  validateAccountId,                                                                         // 验证账户ID
  // validateDate,
  validateDateRange,                                                                          // 验证日期范围
  logger                                                                                      // 日志工具
} from '../../utils'

/**
 * 账户API接口
 * 
 * 定义账户管理的所有操作方法
 * 包含以下功能：
 * - 获取账户列表和详情
 * - 获取账户余额和历史记录
 * - 获取净资产历史
 * - 创建、更新、删除账户
 * - 账户类型选项查询
 * - 账户刷新请求
 */
export interface AccountsAPI {
  /**
   * 获取所有账户
   * 
   * @param options - 查询选项
   * @param options.includeHidden - 是否包含隐藏账户（默认false）
   * @param options.verbosity - 数据详细程度（默认'standard'）
   * @returns 账户对象数组
   */
  getAll(options?: { includeHidden?: boolean; verbosity?: VerbosityLevel }): Promise<Account[]>
  
  /**
   * 通过ID获取单个账户详情
   * 
   * @param id - 账户ID
   * @returns 账户对象
   */
  getById(id: string): Promise<Account>
  
  /**
   * 获取账户余额历史
   * 
   * @param startDate - 开始日期（可选）
   * @param endDate - 结束日期（可选）
   * @returns 账户余额数组
   */
  getBalances(startDate?: string, endDate?: string): Promise<AccountBalance[]>
  
  /**
   * 获取账户类型和子类型选项
   * 
   * @returns 包含types和subtypes的对象
   */
  getTypeOptions(): Promise<{ types: Array<{ id: number; name: string; display: string }>, subtypes: Array<{ id: number; name: string; display: string; typeId: number }> }>
  
  /**
   * 获取单个账户的历史余额
   * 
   * @param accountId - 账户ID
   * @param startDate - 开始日期（可选）
   * @param endDate - 结束日期（可选）
   * @returns 账户余额历史数组
   */
  getHistory(accountId: string, startDate?: string, endDate?: string): Promise<AccountBalance[]>
  
  /**
   * 获取净资产历史
   * 
   * @param startDate - 开始日期（可选）
   * @param endDate - 结束日期（可选）
   * @returns 净资产历史数据数组
   */
  getNetWorthHistory(startDate?: string, endDate?: string): Promise<Array<{ date: string; netWorth: number; assets: number; liabilities: number }>>
  
  /**
   * 创建手动账户
   * 
   * @param input - 账户创建输入数据
   * @returns 创建的账户对象
   */
  createManualAccount(input: CreateAccountInput): Promise<Account>
  
  /**
   * 更新账户
   * 
   * @param id - 账户ID
   * @param updates - 更新数据
   * @returns 更新后的账户对象
   */
  updateAccount(id: string, updates: UpdateAccountInput): Promise<Account>
  
  /**
   * 删除账户
   * 
   * @param id - 账户ID
   * @returns 如果删除成功返回true
   */
  deleteAccount(id: string): Promise<boolean>
  
  /**
   * 请求账户刷新
   * 
   * @param accountIds - 指定要刷新的账户ID数组（可选，为空则刷新所有账户）
   * @returns 如果请求成功返回true
   */
  requestRefresh(accountIds?: string[]): Promise<boolean>
  
  /**
   * 检查刷新是否完成
   * 
   * @param refreshId - 刷新ID（可选，使用上次的刷新）
   * @returns 如果刷新完成返回true
   */
  isRefreshComplete(refreshId?: string): Promise<boolean>
}

/**
 * 账户API实现类
 * 
 * 实现AccountsAPI接口的所有方法
 * 负责与Monarch Money GraphQL API进行交互
 */
export class AccountsAPIImpl implements AccountsAPI {
  /**
   * 构造函数
   * 
   * @param graphql - GraphQL客户端实例
   */
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取所有账户
   * 
   * 根据选项过滤和返回账户列表
   * 缓存5分钟以提高性能
   */
  async getAll(options: { includeHidden?: boolean; verbosity?: VerbosityLevel } = {}): Promise<Account[]> {
    const { includeHidden = false, verbosity = 'standard' } = options;
    logger.debug('正在获取所有账户', options)

    try {
      // 根据详细程度选择查询
      const query = getQueryForVerbosity('accounts', verbosity);

      const response = await this.graphql.query<{
        accounts: Account[]
      }>(query, {}, { cache: true, cacheTTL: 300000 }) // 缓存5分钟

      let accounts = response.accounts;

      // 如果不需要隐藏账户，则过滤掉
      if (!includeHidden) {
        accounts = accounts.filter((account: Account) => !account.isHidden);
      }

      return accounts;
    } catch (error) {
      logger.error('获取账户列表失败', error)
      throw error
    }
  }

  /**
   * 通过ID获取账户详情
   * 
   * 缓存5分钟
   */
  async getById(id: string): Promise<Account> {
    validateAccountId(id)
    logger.debug(`正在获取账户: ${id}`)

    try {
      const response = await this.graphql.query<{
        account: Account
      }>(GET_ACCOUNT_DETAILS, { id }, { cache: true, cacheTTL: 300000 })

      return response.account
    } catch (error) {
      logger.error(`获取账户 ${id} 失败`, error)
      throw error
    }
  }

  /**
   * 获取账户余额
   * 
   * 目前返回当前余额，未来可扩展为历史余额
   */
  async getBalances(startDate?: string, endDate?: string): Promise<AccountBalance[]> {
    validateDateRange(startDate, endDate)
    logger.debug('正在获取账户余额', { startDate, endDate })

    try {
      const accounts = await this.getAll({ includeHidden: true, verbosity: 'standard' }) as Account[]

      // 目前返回当前余额
      // TODO: 实现实际的余额历史查询
      return accounts.map((account: Account) => ({
        accountId: account.id,
        date: new Date().toISOString().split('T')[0],
        balance: account.currentBalance
      }))
    } catch (error) {
      logger.error('获取账户余额失败', error)
      throw error
    }
  }

  /**
   * 获取账户类型选项
   * 
   * 缓存30分钟
   */
  async getTypeOptions(): Promise<{
    types: Array<{ id: number; name: string; display: string }>
    subtypes: Array<{ id: number; name: string; display: string; typeId: number }>
  }> {
    logger.debug('正在获取账户类型选项')

    try {
      const response = await this.graphql.query<{
        accountTypeOptions: {
          types: Array<{ id: number; name: string; display: string }>
         <{ id: number subtypes: Array; name: string; display: string; typeId: number }>
        }
      }>(GET_ACCOUNT_TYPE_OPTIONS, {}, { cache: true, cacheTTL: 1800000 }) // 缓存30分钟

      return response.accountTypeOptions
    } catch (error) {
      logger.error('获取账户类型选项失败', error)
      throw error
    }
  }

  /**
   * 获取账户历史余额
   * 
   * 使用最近的余额查询模式
   */
  async getHistory(accountId: string, startDate?: string, endDate?: string): Promise<AccountBalance[]> {
    validateAccountId(accountId)
    validateDateRange(startDate, endDate)
    logger.debug(`正在获取账户历史: ${accountId}`, { startDate, endDate })

    try {
      // 使用从HAR文件提取的最近余额查询模式
      const ACCOUNT_RECENT_BALANCES = `
        query Web_GetAccountsPageRecentBalance($startDate: Date) {
          accounts {
            id
            recentBalances(startDate: $startDate)
            __typename
          }
        }
      `

      const response = await this.graphql.query<{
        accounts: Array<{
          id: string
          recentBalances: number[]
        }>
      }>(ACCOUNT_RECENT_BALANCES, { startDate }, { cache: true, cacheTTL: 300000 })

      // 找到指定账户并格式化响应
      const accountData = response.accounts.find(acc => acc.id === accountId)
      if (!accountData) {
        throw new Error(`未找到账户 ${accountId}`)
      }

      // 目前返回当前余额，因为recentBalances格式不明确
      // TODO: 当我们了解格式后正确解析recentBalances数组
      const account = await this.getById(accountId)

      return [{
        accountId: account.id,
        date: new Date().toISOString().split('T')[0],
        balance: account.currentBalance
      }]
    } catch (error) {
      logger.error(`获取账户 ${accountId} 的历史记录失败`, error)
      throw error
    }
  }

  /**
   * 获取净资产历史
   * 
   * 返回资产、负债和净资产的历史数据
   * 缓存10分钟
   */
  async getNetWorthHistory(startDate?: string, endDate?: string): Promise<Array<{
    date: string
    netWorth: number
    assets: number
    liabilities: number
  }>> {
    validateDateRange(startDate, endDate)
    logger.debug('正在获取净资产历史', { startDate, endDate })

    try {
      // 根据HAR模式构建过滤器对象
      const filters: Record<string, any> = {}
      if (startDate !== undefined) filters.startDate = startDate
      if (endDate !== undefined) filters.endDate = endDate
      filters.useAdaptiveGranularity = true

      const response = await this.graphql.query<{
        aggregateSnapshots: Array<{
          date: string
          balance: number
          assetsBalance: number
          liabilitiesBalance: number
        }>
      }>(GET_NET_WORTH_HISTORY, { filters }, { cache: true, cacheTTL: 600000 }) // 缓存10分钟

      // 映射响应到期望的格式
      return response.aggregateSnapshots.map(item => ({
        date: item.date,
        netWorth: item.balance,
        assets: item.assetsBalance,
        liabilities: item.liabilitiesBalance
      }))
    } catch (error) {
      logger.error('获取净资产历史失败', error)
      throw error
    }
  }

  /**
   * 创建手动账户
   * 
   * 用于添加非连接型账户（如现金、手动添加的投资等）
   */
  async createManualAccount(input: CreateAccountInput): Promise<Account> {
    logger.debug('正在创建手动账户', input)

    try {
      const CREATE_MANUAL_ACCOUNT = `
        mutation CreateManualAccount(
          $name: String!,
          $typeName: String!,
          $subtypeName: String!,
          $balance: Float!,
          $includeInNetWorth: Boolean,
          $isAsset: Boolean
        ) {
          createManualAccount(
            name: $name,
            typeName: $typeName,
            subtypeName: $subtypeName,
            balance: $balance,
            includeInNetWorth: $includeInNetWorth,
            isAsset: $isAsset
          ) {
            account {
              id
              displayName
              currentBalance
              includeInNetWorth
              isAsset
              type {
                id
                name
                display
              }
              subtype {
                id
                name
                display
              }
            }
            errors {
              message
              field
            }
          }
        }
      `

      const response = await this.graphql.mutation<{
        createManualAccount: {
          account: Account
          errors?: Array<{ message: string; field?: string }>
        }
      }>(CREATE_MANUAL_ACCOUNT, {
        name: input.name,
        typeName: input.typeName,
        subtypeName: input.subtypeName,
        balance: input.balance,
        includeInNetWorth: input.includeInNetWorth ?? true,
        isAsset: input.isAsset ?? true
      })

      if (response.createManualAccount.errors && response.createManualAccount.errors.length > 0) {
        const error = response.createManualAccount.errors[0]
        throw new Error(`创建账户失败: ${error.message}`)
      }

      return response.createManualAccount.account
    } catch (error) {
      logger.error('创建手动账户失败', error)
      throw error
    }
  }

  /**
   * 更新账户
   * 
   * 可更新显示名称、隐藏状态、是否计入净资产、当前余额等
   */
  async updateAccount(id: string, updates: UpdateAccountInput): Promise<Account> {
    validateAccountId(id)
    logger.debug(`正在更新账户: ${id}`, updates)

    try {
      const UPDATE_ACCOUNT = `
        mutation UpdateAccount(
          $id: ID!,
          $displayName: String,
          $isHidden: Boolean,
          $includeInNetWorth: Boolean,
          $currentBalance: Float
        ) {
          updateAccount(
            id: $id,
            displayName: $displayName,
            isHidden: $isHidden,
            includeInNetWorth: $includeInNetWorth,
            currentBalance: $currentBalance
          ) {
            account {
              id
              displayName
              currentBalance
              includeInNetWorth
              isHidden
              updatedAt
            }
            errors {
              message
              field
            }
          }
        }
      `

      const response = await this.graphql.mutation<{
        updateAccount: {
          account: Account
          errors?: Array<{ message: string; field?: string }>
        }
      }>(UPDATE_ACCOUNT, {
        id,
        displayName: updates.displayName,
        isHidden: updates.isHidden,
        includeInNetWorth: updates.includeInNetWorth,
        currentBalance: updates.currentBalance
      })

      if (response.updateAccount.errors && response.updateAccount.errors.length > 0) {
        const error = response.updateAccount.errors[0]
        throw new Error(`更新账户失败: ${error.message}`)
      }

      return response.updateAccount.account
    } catch (error) {
      logger.error(`更新账户 ${id} 失败`, error)
      throw error
    }
  }

  /**
   * 删除账户
   * 
   * 永久删除账户及其所有数据
   */
  async deleteAccount(id: string): Promise<boolean> {
    validateAccountId(id)
    logger.debug(`正在删除账户: ${id}`)

    try {
      const DELETE_ACCOUNT = `
        mutation DeleteAccount($id: ID!) {
          deleteAccount(id: $id) {
            success
            errors {
              message
            }
          }
        }
      `

      const response = await this.graphql.mutation<{
        deleteAccount: {
          success: boolean
          errors?: Array<{ message: string }>
        }
      }>(DELETE_ACCOUNT, { id })

      if (response.deleteAccount.errors && response.deleteAccount.errors.length > 0) {
        const error = response.deleteAccount.errors[0]
        throw new Error(`删除账户失败: ${error.message}`)
      }

      return response.deleteAccount.success
    } catch (error) {
      logger.error(`删除账户 ${id} 失败`, error)
      throw error
    }
  }

  /**
   * 请求账户数据刷新
   * 
   * 触发与金融机构的数据同步
   */
  async requestRefresh(accountIds?: string[]): Promise<boolean> {
    logger.debug('正在请求账户刷新', { accountIds })

    try {
      const REQUEST_REFRESH = `
        mutation RequestAccountsRefresh($accountIds: [ID!]) {
          requestAccountsRefresh(accountIds: $accountIds) {
            success
            refreshId
            errors {
              message
            }
          }
        }
      `

      const response = await this.graphql.mutation<{
        requestAccountsRefresh: {
          success: boolean
          refreshId?: string
          errors?: Array<{ message: string }>
        }
      }>(REQUEST_REFRESH, { accountIds })

      if (response.requestAccountsRefresh.errors && response.requestAccountsRefresh.errors.length > 0) {
        const error = response.requestAccountsRefresh.errors[0]
        throw new Error(`请求刷新失败: ${error.message}`)
      }

      return response.requestAccountsRefresh.success
    } catch (error) {
      logger.error('请求账户刷新失败', error)
      throw error
    }
  }

  /**
   * 检查刷新状态
   * 
   * @param refreshId - 刷新ID，为空则使用最后请求的刷新
   * @returns 刷新是否完成
   */
  async isRefreshComplete(refreshId?: string): Promise<boolean> {
    logger.debug('正在检查刷新状态', { refreshId })

    try {
      const CHECK_REFRESH = `
        query CheckAccountsRefresh($refreshId: String) {
          accountsRefreshStatus(refreshId: $refreshId) {
            isComplete
            progress
            errors {
              message
            }
          }
        }
      `

      const response = await this.graphql.query<{
        accountsRefreshStatus: {
          isComplete: boolean
          progress?: number
          errors?: Array<{ message: string }>
        }
      }>(CHECK_REFRESH, { refreshId }, { cache: false })

      return response.accountsRefreshStatus.isComplete
    } catch (error) {
      logger.error('检查刷新状态失败', error)
      return false
    }
  }
}
