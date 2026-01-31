/**
 * 响应格式化器
 * 
 * 为不同的详细程度级别提供格式化功能
 * 优化 MCP 和其他集成的上下文使用
 */

// 定义详细程度级别类型
export type VerbosityLevel = 'ultra-light' | 'light' | 'standard';

/**
 * 响应格式化器类
 * 
 * 提供静态方法来格式化各种类型的响应数据
 * 支持三个详细程度级别：
 * - ultra-light: 极简格式，仅显示关键汇总信息
 * - light: 轻量格式，显示带格式的列表
 * - standard: 标准格式，返回完整的 JSON 数据
 */
export class ResponseFormatter {
  /**
   * 根据详细程度格式化账户信息
   * 
   * @param accounts - 账户数据数组
   * @param verbosity - 详细程度级别
   * @returns 格式化后的账户信息字符串
   */
  static formatAccounts(accounts: any[], verbosity: VerbosityLevel): string {
    switch (verbosity) {
      case 'ultra-light': {
        // 极简格式：只显示账户数量和总余额
        const total = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        return `💰 ${accounts.length} 个账户，总计: $${total.toLocaleString()}`;
      }

      case 'light':
        // 轻量格式：显示每个账户的余额
        return accounts.map(acc => {
          const balance = acc.currentBalance || 0;
          const hiddenFlag = acc.isHidden ? ' (已隐藏)' : '';
          return `• ${acc.displayName}: $${balance.toLocaleString()}${hiddenFlag}`;
        }).join('\n') +
        `\n\n总计: $${accounts.reduce((s, a) => s + (a.currentBalance || 0), 0).toLocaleString()}`;

      default: // standard - 标准格式：返回原始 JSON 数据
        return JSON.stringify(accounts, null, 2);
    }
  }

  /**
   * 根据详细程度格式化交易信息
   * 
   * @param transactions - 交易数据数组
   * @param verbosity - 详细程度级别
   * @param originalQuery - 原始查询字符串（可选，用于智能查询显示）
   * @returns 格式化后的交易信息字符串
   */
  static formatTransactions(transactions: any[], verbosity: VerbosityLevel, originalQuery?: string): string {
    if (!transactions.length) return '';

    const header = originalQuery ? `🧠 **智能查询**: "${originalQuery}"\n\n` : '';

    switch (verbosity) {
      case 'ultra-light': {
        // 极简格式：只显示交易数量和总金额
        const total = transactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
        return `${header}💳 ${transactions.length} 笔交易，总额: $${total.toLocaleString()}`;
      }

      case 'light':
        // 轻量格式：显示每笔交易的日期、商家、金额和分类
        return header + transactions.map(txn => {
          const date = new Date(txn.date).toLocaleDateString();
          const amount = Math.abs(txn.amount).toLocaleString();
          const merchant = txn.merchant?.name || '未知商家';
          const category = txn.category?.name || '未分类';

          return `• ${date} - ${merchant}\n  ${txn.amount < 0 ? '-' : ''}$${amount} • ${category}`;
        }).join('\n');

      default: // standard - 标准格式：返回原始 JSON 数据
        return JSON.stringify(transactions, null, 2);
    }
  }

  /**
   * 格式化快速财务概览（极简格式）
   * 
   * @param accounts - 账户数据数组
   * @param recentTransactions - 近期交易数据（可选）
   * @returns 极简格式的财务概览字符串
   */
  static formatQuickStats(accounts: any[], recentTransactions?: any[]): string {
    // 计算总余额（只计算包含在净资产中的账户）
    const totalBalance = accounts
      .filter(acc => acc.includeInNetWorth)
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const accountCount = accounts.length;

    // 计算本月变化（简化版）
    const thisMonth = recentTransactions?.filter(t => {
      const txnDate = new Date(t.date);
      const now = new Date();
      return txnDate.getMonth() === now.getMonth() && txnDate.getFullYear() === now.getFullYear();
    }) || [];

    // 计算本月净变化
    const monthlyChange = thisMonth.reduce((sum, t) => sum + t.amount, 0);
    const changeSymbol = monthlyChange >= 0 ? '⬆️' : '⬇️';

    return `💰 $${totalBalance.toLocaleString()} • ${changeSymbol} ${monthlyChange >= 0 ? '+' : ''}$${Math.abs(monthlyChange).toLocaleString()} • 📊 ${accountCount} 个账户`;
  }

  /**
   * 格式化按分类的支出汇总（极简格式）
   * 
   * @param transactions - 交易数据数组
   * @param topN - 显示的分类数量（默认：5）
   * @returns 极简格式的支出汇总字符串
   */
  static formatSpendingSummary(transactions: any[], topN: number = 5): string {
    // 按分类分组并计算金额总和
    const categoryTotals = new Map<string, number>();

    transactions.forEach(txn => {
      if (txn.amount < 0) { // 只计算支出
        const category = txn.category?.name || '未分类';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(txn.amount));
      }
    });

    // 排序并取前 N 个分类
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    if (sortedCategories.length === 0) {
      return '💸 未找到支出记录';
    }

    // 创建极简格式的汇总
    const topCategoriesStr = sortedCategories
      .slice(0, 3)
      .map(([category, amount]) => {
        const icon = this.getCategoryIcon(category);
        return `${icon} $${Math.round(amount).toLocaleString()}`;
      })
      .join(' • ');

    return topCategoriesStr + ` (本月前 ${Math.min(3, sortedCategories.length)} 项)`;
  }

  /**
   * 获取分类对应的表情图标
   * 
   * 私有方法，根据分类名称返回对应的表情图标
   * 
   * @param category - 分类名称
   * @returns 对应的表情图标
   */
  private static getCategoryIcon(category: string): string {
    // 分类到图标的映射表
    const categoryIcons: Record<string, string> = {
      'dining': '🍽️',        // 餐饮
      'restaurants': '🍽️',    // 餐厅
      'food': '🍽️',           // 食物
      'groceries': '🛒',      // 杂货
      'gas': '⛽',            // 汽油
      'fuel': '⛽',           // 燃油
      'transportation': '🚗', // 交通
      'shopping': '🛍️',       // 购物
      'entertainment': '🎬',  // 娱乐
      'utilities': '⚡',      // 公用事业
      'rent': '🏠',           // 租金
      'mortgage': '🏠',       // 房贷
      'insurance': '🛡️',      // 保险
      'healthcare': '🏥',     // 医疗保健
      'medical': '🏥',        // 医疗
      'travel': '✈️',         // 旅行
      'education': '📚',      // 教育
      'fitness': '💪',        // 健身
      'subscriptions': '📱',  // 订阅
      'income': '💰',         // 收入
      'salary': '💰'          // 工资
    };

    const lowerCategory = category.toLowerCase();
    // 查找匹配的分类图标
    for (const [key, icon] of Object.entries(categoryIcons)) {
      if (lowerCategory.includes(key)) {
        return icon;
      }
    }

    return '💸'; // 默认支出图标
  }
}