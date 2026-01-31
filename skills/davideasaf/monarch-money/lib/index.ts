// 主导出 - 暴露库的核心组件和功能
// Main exports - expose core components and functionality of the library
export { MonarchClient } from './client/MonarchClient'

// 类型导出 - 导出所有类型定义供外部使用
// Types - export all type definitions for external use
export * from './types'

// 认证模块导出 - 包含登录、会话管理和 MFA 支持
// Authentication module exports - includes login, session management, and MFA support
export { AuthenticationService, SessionStorage } from './client/auth'
export type { LoginOptions, MFAOptions } from './client/auth'

// GraphQL 客户端导出 - 用于与 Monarch Money GraphQL API 通信
// GraphQL client exports - for communicating with Monarch Money GraphQL API
export { GraphQLClient } from './client/graphql'
export type { GraphQLRequestOptions } from './client/graphql'

// 优化工具导出 - 专为 MCP 和其他集成优化
// Optimization utilities exports - optimized for MCP and other integrations
export { ResponseFormatter, type VerbosityLevel } from './client/ResponseFormatter'
export { getQueryForVerbosity } from './client/graphql/operations'

// 缓存模块导出 - 支持内存缓存和持久化缓存
// Cache module exports - supports in-memory cache and persistent cache
export { MemoryCache, PersistentCache, MultiLevelCache } from './cache'

// API 模块类型导出 - 声明各功能模块的类型接口
// API module type exports - declare type interfaces for each functional module
export type { AccountsAPI } from './api/accounts'
export type { TransactionsAPI } from './api/transactions'
export type { BudgetsAPI } from './api/budgets'

// 错误处理工具导出 - 包含各种错误类型和处理函数
// Error handling utilities exports - includes various error types and handling functions
export {
  MonarchError,
  MonarchAuthError,
  MonarchAPIError,
  MonarchRateLimitError,
  MonarchValidationError,
  MonarchNetworkError,
  MonarchGraphQLError,
  MonarchSessionExpiredError,
  MonarchMFARequiredError,
  MonarchConfigError,
  handleHTTPResponse,
  handleGraphQLErrors,
  isRetryableError,
  retryWithBackoff
} from './utils/errors'
export { logger, createLogger } from './utils/logger'
export { EncryptionService } from './utils/encryption'

// 默认导出 - 方便直接导入 MonarchClient
// Default export - convenient for directly importing MonarchClient
import { MonarchClient as Client } from './client/MonarchClient'
export default Client
