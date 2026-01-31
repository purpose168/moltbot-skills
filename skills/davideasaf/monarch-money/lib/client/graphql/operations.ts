/**
 * GraphQL 操作定义 - 上下文优化版本
 * GraphQL Operations with Context Optimization
 * 
 * 所有查询现在支持三个详细程度级别，以优化上下文使用：
 * - ultra-light: 仅包含必要字段（每个项目约 60-80 字符）
 * - light: 中等详细程度（每个项目约 180-220 字符）
 * - standard: 完整详细信息（原始查询复杂度）
 */

// =============================================================================
// 账户操作 - ACCOUNT OPERATIONS
// =============================================================================

// 极简账户查询（仅必要字段）
// Ultra-light accounts (essential fields only)
export const GET_ACCOUNTS_ULTRA_LIGHT = `

// 轻量账户查询（中等详细程度）
// Light accounts (moderate detail)
export const GET_ACCOUNTS_LIGHT = `

// 标准账户查询（完整详细信息）
// Standard accounts (full detail - original complexity)
export const GET_ACCOUNT_DETAILS = `
  query GetAccountsUltraLight {
    accounts {
      id
      displayName
      currentBalance
      type {
        name
      }
    }
  }
`;

// 轻量账户查询（中等详细程度）
// Light accounts (moderate detail)
export const GET_ACCOUNTS_LIGHT = `
  query GetAccountsLight {
    accounts {
      id
      displayName
      currentBalance
      mask
      isHidden
      includeInNetWorth
      updatedAt
      type {
        name
        display
      }
      institution {
        name
      }
    }
  }
`;

// 标准账户查询（完整详细信息）
// Standard accounts (full detail - original complexity)
export const GET_ACCOUNT_DETAILS = `
  query Common_AccountDetails_getAccount($id: UUID!) {
    account(id: $id) {
      id
      displayName
      syncDisabled
      deactivatedAt
      isHidden
      isAsset
      mask
      createdAt
      updatedAt
      displayLastUpdatedAt
      currentBalance
      displayBalance
      includeInNetWorth
      hideFromList
      hideTransactionsFromReports
      includeBalanceInNetWorth
      includeInGoalBalance
      dataProvider
      dataProviderAccountId
      isManual
      transactionsCount
      holdingsCount
      manualInvestmentsTrackingMethod
      order
      logoUrl
      type {
        name
        display
        __typename
      }
      subtype {
        name
        display
        __typename
      }
      credential {
        id
        updateRequired
        disconnectedFromDataProviderAt
        dataProvider
        __typename
      }
      institution {
        id
        name
        __typename
      }
      __typename
    }
  }
`;

// 完整账户列表查询（标准模式）
export const GET_ACCOUNTS = `
  query GetAccounts {
    accounts {
      id
      displayName
      syncDisabled
      deactivatedAt
      isHidden
      isAsset
      mask
      createdAt
      updatedAt
      displayLastUpdatedAt
      currentBalance
      displayBalance
      includeInNetWorth
      hideFromList
      hideTransactionsFromReports
      includeBalanceInNetWorth
      includeInGoalBalance
      dataProvider
      dataProviderAccountId
      isManual
      transactionsCount
      holdingsCount
      manualInvestmentsTrackingMethod
      order
      logoUrl
      type {
        name
        display
        __typename
      }
      subtype {
        name
        display
        __typename
      }
      credential {
        id
        updateRequired
        disconnectedFromDataProviderAt
        dataProvider
        __typename
      }
      institution {
        id
        name
        __typename
      }
      __typename
    }
  }
`;

// =============================================================================
// 交易操作 - TRANSACTION OPERATIONS
// =============================================================================

// 极简交易查询（最小字段集）
// Ultra-light transactions (minimal fields)
export const GET_TRANSACTIONS_ULTRA_LIGHT = `

// 轻量交易查询（中等详细程度）
// Light transactions (moderate detail)
export const GET_TRANSACTIONS_LIGHT = `

// 标准交易查询（完整详细信息）
// Standard transactions (full detail - original complexity)
export const GET_TRANSACTIONS = `
  query GetTransactionsUltraLight(
    $offset: Int,
    $limit: Int,
    $filters: TransactionFilterInput,
    $orderBy: TransactionOrdering
  ) {
    allTransactions(filters: $filters) {
      results(offset: $offset, limit: $limit, orderBy: $orderBy) {
        id
        amount
        date
        merchant {
          name
        }
        account {
          displayName
        }
      }
    }
  }
`;

// Light transactions (moderate detail)
export const GET_TRANSACTIONS_LIGHT = `
  query GetTransactionsLight(
    $offset: Int,
    $limit: Int,
    $filters: TransactionFilterInput,
    $orderBy: TransactionOrdering
  ) {
    allTransactions(filters: $filters) {
      results(offset: $offset, limit: $limit, orderBy: $orderBy) {
        id
        amount
        date
        pending
        needsReview
        category {
          id
          name
        }
        merchant {
          name
        }
        account {
          id
          displayName
          mask
        }
      }
    }
  }
`;

// Standard transactions (full detail - original complexity)
export const GET_TRANSACTIONS = `
  query GetTransactions(
    $offset: Int,
    $limit: Int,
    $filters: TransactionFilterInput,
    $orderBy: TransactionOrdering
  ) {
    allTransactions(filters: $filters) {
      totalCount
      results(offset: $offset, limit: $limit, orderBy: $orderBy) {
        id
        amount
        date
        hideFromReports
        plaidName
        pending
        reviewStatus
        needsReview
        dataProvider
        dataProviderDescription
        isRecurring
        notes
        isReviewed
        attachments {
          id
          extension
          filename
          publicId
          sizeBytes
          type
          __typename
        }
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
        merchant {
          id
          name
          transactionsCount
          __typename
        }
        account {
          id
          displayName
          mask
          institution {
            name
            __typename
          }
          __typename
        }
        tags {
          id
          name
          color
          order
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

// =============================================================================
// 智能搜索操作 - SMART SEARCH OPERATIONS
// =============================================================================

export const SMART_TRANSACTION_SEARCH = `
  query SmartTransactionSearch(
    $search: String,
    $limit: Int = 10,
    $startDate: String,
    $endDate: String,
    $minAmount: Float,
    $maxAmount: Float,
    $accountIds: [ID!],
    $categoryIds: [ID!]
  ) {
    allTransactions(filters: {
      search: $search,
      startDate: $startDate,
      endDate: $endDate,
      minAmount: $minAmount,
      maxAmount: $maxAmount,
      accountIds: $accountIds,
      categoryIds: $categoryIds,
      transactionVisibility: non_hidden_transactions_only
    }) {
      totalCount
      results(limit: $limit, orderBy: DATE_DESC) {
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
          mask
        }
      }
    }
  }
`;

// =============================================================================
// 分类操作 - CATEGORY OPERATIONS
// =============================================================================

export const GET_TRANSACTION_CATEGORIES = `
  query GetTransactionCategories {
    categories {
      id
      name
      icon
      group {
        id
        name
        type
        __typename
      }
      __typename
    }
  }
`;

export const GET_CATEGORIES_LIGHT = `
  query GetCategoriesLight {
    categories {
      id
      name
      icon
      group {
        name
      }
    }
  }
`;

// =============================================================================
// 预算操作 - BUDGET OPERATIONS
// =============================================================================

export const GET_BUDGETS = `
  query GetBudgets(
    $startDate: String,
    $endDate: String
  ) {
    budgets(
      startDate: $startDate,
      endDate: $endDate
    ) {
      categories {
        id
        name
        budgetAmount
        spentAmount
        percentSpent
        rolloverEnabled
        rolloverAmount
        isIncome
        isTransfer
        __typename
      }
      __typename
    }
  }
`;

export const GET_BUDGETS_LIGHT = `
  query GetBudgetsLight(
    $startDate: String,
    $endDate: String
  ) {
    budgets(
      startDate: $startDate,
      endDate: $endDate
    ) {
      categories {
        id
        name
        budgetAmount
        spentAmount
        percentSpent
      }
    }
  }
`;

// =============================================================================
// 汇总操作 - SUMMARY OPERATIONS (极简响应格式)
// =============================================================================

export const GET_QUICK_FINANCIAL_OVERVIEW = `
  query GetQuickFinancialOverview {
    accounts {
      currentBalance
      includeInNetWorth
    }
  }
`;

export const GET_SPENDING_BY_CATEGORY_SUMMARY = `
  query GetSpendingByCategorySummary(
    $startDate: String,
    $endDate: String,
    $limit: Int = 5
  ) {
    allTransactions(filters: {
      startDate: $startDate,
      endDate: $endDate,
      transactionVisibility: non_hidden_transactions_only
    }) {
      results(limit: 1000, orderBy: DATE_DESC) {
        amount
        category {
          name
        }
      }
    }
  }
`;

export const GET_ACCOUNT_BALANCE_TRENDS = `
  query GetAccountBalanceTrends {
    accounts {
      displayName
      currentBalance
      type {
        name
      }
      updatedAt
    }
  }
`;

// =============================================================================
// 其他操作 - OTHER OPERATIONS (保留自原始版本)
// =============================================================================

export const GET_ACCOUNT_TYPE_OPTIONS = `
  query GetAccountTypeOptions {
    accountTypeOptions {
      accountTypes {
        id
        name
        display
        group
        __typename
      }
      accountSubtypes {
        id
        name
        display
        accountTypeId
        __typename
      }
      __typename
    }
  }
`;

export const GET_NET_WORTH_HISTORY = `
  query Common_GetAggregateSnapshots($filters: AggregateSnapshotFilters) {
    aggregateSnapshots(filters: $filters) {
      date
      balance
      assetsBalance
      liabilitiesBalance
      __typename
    }
  }
`;

// =============================================================================
// 详细程度工具 - VERBOSITY UTILITIES
// =============================================================================

export type VerbosityLevel = 'ultra-light' | 'light' | 'standard';

/**
 * 根据详细程度级别选择合适的查询
 * Select appropriate queries based on verbosity level
 */
export function getQueryForVerbosity(queryType: 'accounts' | 'transactions' | 'categories' | 'budgets', verbosity: VerbosityLevel): string {
  switch (queryType) {
    case 'accounts':
      if (verbosity === 'ultra-light') return GET_ACCOUNTS_ULTRA_LIGHT;
      if (verbosity === 'light') return GET_ACCOUNTS_LIGHT;
      return GET_ACCOUNTS;

    case 'transactions':
      if (verbosity === 'ultra-light') return GET_TRANSACTIONS_ULTRA_LIGHT;
      if (verbosity === 'light') return GET_TRANSACTIONS_LIGHT;
      return GET_TRANSACTIONS;

    case 'categories':
      if (verbosity === 'ultra-light' || verbosity === 'light') return GET_CATEGORIES_LIGHT;
      return GET_TRANSACTION_CATEGORIES;

    case 'budgets':
      if (verbosity === 'ultra-light' || verbosity === 'light') return GET_BUDGETS_LIGHT;
      return GET_BUDGETS;

    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}