// 交易API模块导出
// 导出交易API的实现类和所有类型

export { TransactionsAPIImpl, type TransactionsAPI } from './TransactionsAPI'
export type {
  GetTransactionsOptions,                      // 获取交易的查询选项
  CreateTransactionInput,                      // 创建交易的输入数据
  UpdateTransactionInput,                      // 更新交易的输入数据
  TransactionSplit,                            // 交易拆分配置
  NoteUpdate,                                  // 备注更新（用于批量操作）
  BulkNoteUpdateResult,                        // 批量备注更新结果
  CreateTransactionRuleInput,                  // 创建交易规则的输入数据
  UpdateTransactionRuleInput,                  // 更新交易规则的输入数据
  RuleCondition,                               // 规则条件
  RuleAction,                                  // 规则动作
  CreateTransactionCategoryInput,              // 创建交易分类的输入数据
  UpdateTransactionCategoryInput,              // 更新交易分类的输入数据
  CreateTransactionTagInput,                   // 创建交易标签的输入数据
  GetMerchantsOptions,                         // 获取商家的查询选项
  GetRecurringTransactionsOptions,             // 获取周期性交易的查询选项
  GetRecurringStreamsOptions,                  // 获取周期性交易流的查询选项
  GetAggregatedRecurringItemsOptions,          // 获取聚合周期性项目的查询选项
  GetAllRecurringTransactionItemsOptions,      // 获取所有周期性交易项目的查询选项
  BulkUpdateTransactionsInput,                 // 批量更新交易的输入数据
  GetHiddenTransactionsOptions                 // 获取隐藏交易的查询选项
} from './TransactionsAPI'  
