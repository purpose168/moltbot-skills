import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { getClient } from '../client';                                                            // 导入获取客户端函数
import { printTable, printJSON, printError, formatCurrency, truncate } from '../utils/output';    // 导入输出工具函数

// 创建账户命令组，别名为acc
export const accountsCommand = new Command('accounts')
  .alias('acc')
  .description('账户管理');                                                                       // 命令组描述

/**
 * 列出所有账户命令
 * 支持按账户类型筛选，包含隐藏账户选项
 */
accountsCommand
  .command('list')
  .description('列出所有账户')
  .option('--type <type>', '按账户类型筛选')                                                     // 类型筛选选项
  .option('--hidden', '包含隐藏账户')                                                            // 隐藏账户选项
  .option('--json', '以JSON格式输出')
  .action(async (options) => {
    const spinner = ora('正在获取账户...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();
      let accounts = await client.accounts.getAll({ includeHidden: options.hidden });
      
      spinner.stop();                                                                             // 停止加载动画

      // 按类型筛选
      if (options.type) {
        const typeLower = options.type.toLowerCase();
        accounts = accounts.filter((a: any) => 
          a.type?.display?.toLowerCase().includes(typeLower) ||
          a.subtype?.display?.toLowerCase().includes(typeLower)
        );
      }

      // JSON输出模式
      if (options.json) {
        printJSON(accounts);
        return;
      }

      // 无结果提示
      if (accounts.length === 0) {
        console.log(chalk.yellow('未找到账户'));
        return;
      }

      // 打印账户数量
      console.log(chalk.bold(`\n共 ${accounts.length} 个账户:\n`));

      // 计算总余额
      const totalBalance = accounts.reduce((sum: number, a: any) => 
        sum + (a.currentBalance || 0), 0
      );

      // 打印账户列表
      printTable(
        ['ID', '名称', '类型', '余额', '机构'],
        accounts.map((a: any) => [
          a.id,
          truncate(a.displayName || '未知', 30),
          a.type?.display || a.subtype?.display || '-',
          formatCurrency(a.currentBalance || 0),
          truncate(a.institution?.name || '-', 20),
        ])
      );

      // 打印总余额
      console.log(chalk.bold(`\n总余额: ${formatCurrency(totalBalance)}`));
    } catch (error) {
      spinner.fail('获取账户失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 获取账户详情命令
 * 通过账户ID获取完整账户信息
 */
accountsCommand
  .command('get <id>')
  .description('获取账户详情')
  .option('--json', '以JSON格式输出')
  .action(async (id, options) => {
    const spinner = ora('正在获取账户详情...').start();                                           // 显示加载动画
    
    try {
      const client = await getClient();
      const account = await client.accounts.getById(id);
      
      spinner.stop();

      // 未找到账户
      if (!account) {
        printError(`未找到账户 ${id}`);
        process.exit(1);
      }

      // JSON输出模式
      if (options.json) {
        printJSON(account);
        return;
      }

      // 打印账户详情
      console.log(chalk.bold('\n账户详情:\n'));
      console.log(`  ${chalk.cyan('ID:')}           ${account.id}`);
      console.log(`  ${chalk.cyan('名称:')}         ${account.displayName}`);
      console.log(`  ${chalk.cyan('类型:')}         ${(account as any).type?.display || '-'}`);
      console.log(`  ${chalk.cyan('子类型:')}      ${(account as any).subtype?.display || '-'}`);
      console.log(`  ${chalk.cyan('余额:')}      ${formatCurrency(account.currentBalance || 0)}`);
      console.log(`  ${chalk.cyan('机构:')} ${(account as any).institution?.name || '-'}`);
      if ((account as any).lastSyncedAt) {
        console.log(`  ${chalk.cyan('最后同步:')} ${new Date((account as any).lastSyncedAt).toLocaleString()}`);
      }
    } catch (error) {
      spinner.fail('获取失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
