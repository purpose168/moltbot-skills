// 预算API模块导出
// 导出预算API的实现类和所有类型

export { BudgetsAPIImpl, type BudgetsAPI } from './BudgetsAPI'
export type {
  BudgetOptions,                               // 预算查询选项
  BudgetData,                                  // 预算数据
  BudgetCategory,                              // 预算分类
  BudgetCategoryGroup,                         // 预算分类组
  BudgetAmountParams,                          // 预算金额参数
  CreateGoalParams,                            // 创建目标参数
  CreateGoalResponse,                          // 创建目标响应
  UpdateGoalParams,                            // 更新目标参数
  UpdateGoalResponse,                          // 更新目标响应
  CashFlowOptions,                             // 现金流选项
  CashFlowSummaryOptions,                      // 现金流汇总选项
  BillsOptions                                 // 账单选项
} from './BudgetsAPI'
