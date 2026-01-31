/**
 * 自动生成的 GraphQL 类型和接口
 * Auto-generated GraphQL types and interfaces
 * 
 * 此文件根据 GraphQL Schema 自动生成
 * 包含所有 API 响应的类型定义
 */

/**
 * GraphQL 变量类型
 * 用于存储 GraphQL 查询的变量键值对
 */
export interface GraphQLVariables {
  [key: string]: unknown   // 变量名到变量值的映射
}

/**
 * 获取账户列表响应
 * 对应 GraphQL 查询: GetAccounts
 */
export interface GetAccountsResponse {
  accounts: {
    edges: Array<{
      node: {
        id: string                       // 账户唯一标识符
        displayName: string              // 显示名称
        syncDisabled: boolean            // 是否禁用同步
        deactivatedAt?: string           // 停用时间
        isHidden: boolean                // 是否隐藏
        isAsset: boolean                 // 是否为资产
        includeInNetWorth: boolean       // 是否计入净资产
        currentBalance: number           // 当前余额
        availableBalance?: number        // 可用余额
        dataProvider: string             // 数据提供商
        dataProviderAccountId?: string   // 数据提供商账户ID
        institutionName: string          // 机构名称
        mask?: string                    // 账户尾号
        createdAt: string                // 创建时间
        updatedAt: string                // 更新时间
        importedFromMint: boolean        // 是否从Mint导入
        accountTypeId: number            // 账户类型ID
        accountSubtypeId: number         // 账户子类型ID
        type: {                          // 账户类型详情
          id: number
          name: string
          display: string
        }
        subtype: {                       // 账户子类型详情
          id: number
          name: string
          display: string
        }
        credential?: {                   // 凭证信息
          id: string
          institutionId: string
          institutionName: string
        }
      }
    }>
  }
}

/**
 * 获取交易列表响应
 * 对应 GraphQL 查询: GetTransactions
 */
export interface GetTransactionsResponse {
  transactions: {
    edges: Array<{
      node: {
        id: string                       // 交易唯一标识符
        amount: number                   // 交易金额
        date: string                     // 交易日期
        merchantName: string             // 商户名称
        categoryId?: string              // 分类ID
        category?: {                     // 分类详情
          id: string
          name: string
          icon?: string
          order: number
          group?: {                      // 分类组
            id: string
            name: string
            type: string
          }
        }
        accountId: string                // 账户ID
        account: {                       // 账户详情
          id: string
          displayName: string
          institutionName: string
          mask?: string
        }
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
        tags?: Array<{                   // 标签列表
          id: string
          name: string
          color: string
          order: number
        }>
        isHidden: boolean                // 是否隐藏
        hiddenAt?: string                // 隐藏时间
        isSplit: boolean                 // 是否为拆分交易
        splits?: Array<{                 // 拆分详情
          id: string
          amount: number
          categoryId?: string
          category?: {
            id: string
            name: string
          }
          notes?: string
        }>
        originalDescription?: string     // 原始描述
        isCashIn: boolean                // 是否为现金收入
        isCashOut: boolean               // 是否为现金支出
      }
    }>
    totalCount: number                   // 总交易数量
    pageInfo: {                          // 分页信息
      hasNextPage: boolean               // 是否有下一页
      hasPreviousPage: boolean           // 是否有上一页
      startCursor?: string               // 起始光标
      endCursor?: string                 // 结束光标
    }
  }
}

/**
 * 获取预算列表响应
 * 对应 GraphQL 查询: GetBudgets
 */
export interface GetBudgetsResponse {
  budgets: {
    id: string                          // 预算ID
    startDate: string                   // 开始日期
    endDate: string                     // 结束日期
    categories: Array<{                 // 预算分类列表
      id: string                        // 分类ID
      name: string                      // 分类名称
      budgetAmount: number              // 预算金额
      spentAmount: number               // 已支出金额
      remainingAmount: number           // 剩余金额
      percentSpent: number              // 已花费百分比
      isFlexible: boolean               // 是否为灵活预算
      flexibleAmounts?: Array<{         // 灵活预算月度金额
        month: string
        amount: number
      }>
    }>
  }[]
}

/**
 * 获取持仓列表响应
 * 对应 GraphQL 查询: GetHoldings
 */
export interface GetHoldingsResponse {
  holdings: {
    edges: Array<{
      node: {
        id: string                      // 持仓唯一标识符
        accountId: string               // 账户ID
        securityId: string              // 证券ID
        security: {                     // 证券详情
          id: string
          symbol: string               // 股票代码
          name: string                 // 证券名称
          type: string                 // 证券类型
          price: number                // 当前价格
          priceDate: string            // 价格日期
        }
        quantity: number               // 持有数量
        price: number                  // 当前价格
        value: number                  // 当前价值
        costBasis?: number             // 成本基准
        unrealizedGainLoss?: number    // 未实现损益
        percentOfPortfolio: number     // 投资组合占比
      }
    }>
  }
}

/**
 * 创建交易响应
 * 对应 GraphQL 变更: CreateTransaction
 */
export interface CreateTransactionResponse {
  createTransaction: {
    transaction: {                      // 创建的交易
      id: string
      amount: number
      date: string
      merchantName: string
      categoryId?: string
      accountId: string
      notes?: string
    }
    errors?: Array<{                   // 错误列表
      message: string                  // 错误消息
      field?: string                   // 错误字段
    }>
  }
}

/**
 * 更新交易响应
 * 对应 GraphQL 变更: UpdateTransaction
 */
export interface UpdateTransactionResponse {
  updateTransaction: {
    transaction: {                      // 更新的交易
      id: string
      amount: number
      date: string
      merchantName: string
      categoryId?: string
      accountId: string
      notes?: string
    }
    errors?: Array<{                   // 错误列表
      message: string                  // 错误消息
      field?: string                   // 错误字段
    }>
  }
}

/**
 * 删除交易响应
 * 对应 GraphQL 变更: DeleteTransaction
 */
export interface DeleteTransactionResponse {
  deleteTransaction: {
    success: boolean                   // 是否成功
    errors?: Array<{                   // 错误列表
      message: string                  // 错误消息
    }>
  }
}

/**
 * 登录响应
 * 对应 GraphQL 变更: Login
 */
export interface LoginResponse {
  login: {
    token: string                      // 认证令牌
    user: {                            // 用户信息
      id: string
      email: string
      firstName?: string
      lastName?: string
    }
    errors?: Array<{                   // 错误列表
      message: string                  // 错误消息
      field?: string                   // 错误字段
    }>
  }
}

/**
 * 多因素认证响应
 * 对应 GraphQL 变更: MultiFactorAuth
 */
export interface MfaResponse {
  multiFactorAuth: {
    token: string                      // MFA令牌
    errors?: Array<{                   // 错误列表
      message: string                  // 错误消息
      field?: string                   // 错误字段
    }>
  }
}

// ========== GraphQL 操作类型 - GraphQL Operation Types ==========
/**
 * GraphQL 操作类型联合类型
 * 列出所有可用的 GraphQL 操作名称
 */
export type GraphQLOperation = 
  | 'GetAccounts'           // 获取账户列表
  | 'GetTransactions'       // 获取交易列表
  | 'GetBudgets'            // 获取预算列表
  | 'GetHoldings'           // 获取持仓列表
  | 'CreateTransaction'     // 创建交易
  | 'UpdateTransaction'     // 更新交易
  | 'DeleteTransaction'     // 删除交易
  | 'Login'                 // 登录认证
  | 'MultiFactorAuth'       // 多因素认证
