import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { getClient } from '../client';                                                            // 导入获取客户端函数
import { 
  printTable, 
  printJSON, 
  printSuccess, 
  printError,
  formatCurrency, 
  formatDate, 
  truncate 
} from '../utils/output';                                                                         // 导入输出工具函数

// 创建交易命令组，别名为tx
export const transactionsCommand = new Command('transactions')
  .alias('tx')
  .description('交易管理');                                                                       // 命令组描述

/**
 * 搜索交易命令
 * 支持按商家、分类、账户、日期范围和金额范围筛选
 */
transactionsCommand
  .command('search')
  .description('搜索交易记录')
  .option('-m, --merchant <name>', '按商家名称筛选')                                             // 商家筛选选项
  .option('-c, --category <name>', '按分类名称筛选')                                             // 分类筛选选项
  .option('-a, --account <name>', '按账户名称筛选')                                              // 账户筛选选项
  .option('--start <date>', '开始日期 (YYYY-MM-DD)')                                             // 开始日期选项
  .option('--end <date>', '结束日期 (YYYY-MM-DD)')                                               // 结束日期选项
  .option('--min <amount>', '最小金额')                                                          // 最小金额选项
  .option('--max <amount>', '最大金额')                                                          // 最大金额选项
  .option('-l, --limit <n>', '限制结果数量', '20')                                               // 结果数量限制
  .option('--json', '以JSON格式输出')                                                            // JSON输出选项
  .action(async (options) => {
    const spinner = ora('正在搜索交易...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();                                                           // 获取已认证的客户端
      
      // 构建搜索选项
      const searchOptions: any = {
        limit: parseInt(options.limit),
      };
      
      // 处理搜索参数
      if (options.merchant) {
        searchOptions.search = options.merchant;
      }
      if (options.start) {
        searchOptions.startDate = options.start;
      }
      if (options.end) {
        searchOptions.endDate = options.end;
      }
      if (options.min) {
        searchOptions.absAmountRange = [parseFloat(options.min), undefined];
      }
      if (options.max) {
        const range = searchOptions.absAmountRange || [undefined, undefined];
        searchOptions.absAmountRange = [range[0], parseFloat(options.max)];
      }

      // 调用API搜索交易
      const result = await client.transactions.getTransactions(searchOptions);

      spinner.stop();                                                                             // 停止加载动画

      // 客户端筛选: 按分类
      let transactions = result.transactions || [];
      
      if (options.category) {
        const categoryLower = options.category.toLowerCase();
        transactions = transactions.filter((t: any) => 
          t.category?.name?.toLowerCase().includes(categoryLower)
        );
      }
      
      // 客户端筛选: 按账户
      if (options.account) {
        const accountLower = options.account.toLowerCase();
        transactions = transactions.filter((t: any) => 
          t.account?.displayName?.toLowerCase().includes(accountLower)
        );
      }

      // 如果要求JSON输出
      if (options.json) {
        printJSON(transactions);
        return;
      }

      // 无结果提示
      if (transactions.length === 0) {
        console.log(chalk.yellow('未找到交易记录'));
        return;
      }

      // 打印交易列表
      console.log(chalk.bold(`\n找到 ${transactions.length} 条交易记录:\n`));
      
      printTable(
        ['ID', '日期', '商家', '金额', '分类', '账户'],
        transactions.map((t: any) => [
          t.id,
          formatDate(t.date),
          truncate(t.merchant?.name || '未知', 25),
          formatCurrency(t.amount),
          truncate(t.category?.name || '未分类', 20),
          truncate(t.account?.displayName || '未知', 15),
        ])
      );
    } catch (error) {
      spinner.fail('搜索失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 获取交易详情命令
 * 通过交易ID获取完整交易信息
 */
transactionsCommand
  .command('get <id>')
  .description('获取交易详情')
  .option('--json', '以JSON格式输出')
  .action(async (id, options) => {
    const spinner = ora('正在获取交易详情...').start();                                           // 显示加载动画
    
    try {
      const client = await getClient();
      let transaction: any = null;

      try {
        // 优先获取完整交易详情
        transaction = await client.transactions.getTransactionDetails(id);
      } catch {
        // 备选方案: 分页搜索最近交易并匹配ID
        const pageSize = 100;
        const maxPages = 10;                                                                      // 最多搜索1000条交易
        for (let page = 0; page < maxPages; page++) {
          const result = await client.transactions.getTransactions({
            limit: pageSize,
            offset: page * pageSize,
          });
          transaction = (result.transactions || []).find((t: any) => t.id === id);
          if (transaction || !result.hasMore) break;
        }
      }

      spinner.stop();

      // 未找到交易
      if (!transaction) {
        printError(`未找到交易 ${id}`);
        process.exit(1);
      }

      // JSON输出模式
      if (options.json) {
        printJSON(transaction);
        return;
      }

      // 打印交易详情
      console.log(chalk.bold('\n交易详情:\n'));
      console.log(`  ${chalk.cyan('ID:')}        ${transaction.id}`);
      console.log(`  ${chalk.cyan('日期:')}      ${formatDate(transaction.date)}`);
      console.log(`  ${chalk.cyan('商家:')}  ${transaction.merchant?.name || '未知'}`);
      console.log(`  ${chalk.cyan('金额:')}    ${formatCurrency(transaction.amount)}`);
      console.log(`  ${chalk.cyan('分类:')} ${transaction.category?.name || '未分类'}`);
      console.log(`  ${chalk.cyan('账户:')}  ${transaction.account?.displayName || '未知'}`);
      if (transaction.notes) {
        console.log(`  ${chalk.cyan('备注:')}    ${transaction.notes}`);
      }
    } catch (error) {
      spinner.fail('获取失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 更新交易命令
 * 修改交易的分类或备注
 */
transactionsCommand
  .command('update <id>')
  .description('更新交易信息')
  .option('-c, --category <id>', '设置分类ID')                                                   // 分类选项
  .option('-n, --notes <text>', '设置备注')                                                      // 备注选项
  .option('--json', '以JSON格式输出')
  .action(async (id, options) => {
    const spinner = ora('正在更新交易...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();
      
      const updates: any = {};
      
      // 构建更新数据
      if (options.category) {
        updates.categoryId = options.category;
      }
      if (options.notes !== undefined) {
        updates.notes = options.notes;
      }

      // 执行更新
      await client.transactions.updateTransaction(id, updates);

      spinner.succeed(`交易 ${id} 已更新`);
      
      if (options.json) {
        printJSON({ success: true, id, updates });
      }
    } catch (error) {
      spinner.fail('更新失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 分类交易命令
 * 快速设置交易的分类
 */
transactionsCommand
  .command('categorize <transactionId> <categoryId>')
  .description('设置交易分类')
  .action(async (transactionId, categoryId) => {
    const spinner = ora('正在设置分类...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();
      await client.transactions.updateTransaction(transactionId, { categoryId });
      spinner.succeed(`交易 ${transactionId} 的分类已设置`);
    } catch (error) {
      spinner.fail('设置分类失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 创建交易命令
 * 手动创建新交易记录
 */
transactionsCommand
  .command('create')
  .description('创建手动交易')
  .requiredOption('-a, --account <id>', '账户ID')                                                // 必填: 账户ID
  .requiredOption('-m, --merchant <name>', '商家名称')                                           // 必填: 商家名称
  .requiredOption('-A, --amount <number>', '金额 (例如: 12.34)')                                 // 必填: 金额
  .requiredOption('-d, --date <YYYY-MM-DD>', '交易日期')                                        // 必填: 交易日期
  .option('-c, --category <id>', '分类ID')                                                      // 可选: 分类ID
  .option('-n, --notes <text>', '备注')                                                         // 可选: 备注
  .option('--json', '以JSON格式输出')
  .action(async (options) => {
    const spinner = ora('正在创建交易...').start();                                               // 显示加载动画

    try {
      const client = await getClient();
      const amount = parseFloat(options.amount);
      
      // 验证金额格式
      if (Number.isNaN(amount)) {
        spinner.fail('金额必须是数字');
        process.exit(1);
      }

      // 创建交易
      const tx = await client.transactions.createTransaction({
        accountId: options.account,
        merchantName: options.merchant,
        amount,
        date: options.date,
        categoryId: options.category,
        notes: options.notes,
      });

      spinner.succeed(`交易已创建 (${tx.id})`);

      if (options.json) {
        printJSON(tx);
      }
    } catch (error) {
      spinner.fail('创建失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 删除交易命令
 * 删除指定ID的交易记录
 */
transactionsCommand
  .command('delete <id>')
  .description('删除交易记录')
  .option('--yes', '确认删除')                                                                   // 删除确认选项
  .option('--json', '以JSON格式输出')
  .action(async (id, options) => {
    // 要求用户确认删除操作
    if (!options.yes) {
      printError('删除操作需要 --yes 参数确认');
      process.exit(1);
    }

    const spinner = ora('正在删除交易...').start();                                               // 显示加载动画

    try {
      const client = await getClient();
      const deleted = await client.transactions.deleteTransaction(id);
      if (deleted) {
        spinner.succeed(`交易已删除 (${id})`);
      } else {
        spinner.fail('删除失败');
        process.exit(1);
      }

      if (options.json) {
        printJSON({ success: true, id });
      }
    } catch (error) {
      spinner.fail('删除失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
