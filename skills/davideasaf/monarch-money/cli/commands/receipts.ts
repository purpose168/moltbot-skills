import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { readFileSync, existsSync } from 'fs';                                                    // 导入文件系统操作函数
import { getClient } from '../client';                                                            // 导入获取客户端函数
import { 
  printTable, 
  printJSON, 
  printSuccess, 
  printError, 
  printWarning,
  formatCurrency 
} from '../utils/output';                                                                         // 导入输出工具函数

// 拆分项目接口
interface SplitItem {
  description: string;       // 项目描述
  amount: number;            // 金额
  category: string;          // 分类名称或ID
  notes?: string;            // 可选备注
}

// 创建收据命令组
export const receiptsCommand = new Command('receipts')
  .description('收据拆分和管理');                                                                // 命令组描述

/**
 * 拆分交易命令
 * 将一笔交易按收据项目拆分为多笔
 */
receiptsCommand
  .command('split <transactionId>')
  .description('按收据项目拆分交易')
  .option('-f, --file <path>', '包含拆分项目的JSON文件')                                         // 文件选项
  .option('-i, --items <json>', '内联JSON数组形式的拆分项目')                                    // 内联选项
  .option('--dry-run', '预览而不实际修改')                                                       // 预览选项
  .option('--json', '以JSON格式输出')
  .action(async (transactionId, options) => {
    try {
      // 解析拆分项目
      let items: SplitItem[];
      
      // 从文件读取
      if (options.file) {
        if (!existsSync(options.file)) {
          printError(`文件不存在: ${options.file}`);
          process.exit(1);
        }
        items = JSON.parse(readFileSync(options.file, 'utf-8'));
      } else if (options.items) {
        // 从命令行参数读取
        items = JSON.parse(options.items);
      } else {
        printError('请使用 --file 或 --items 提供拆分数据');
        console.log('\n示例JSON格式:');
        console.log(JSON.stringify([
          { description: '杂货', amount: 25.99, category: '杂货店' },
          { description: '清洁用品', amount: 12.50, category: '家居' },
        ], null, 2));
        process.exit(1);
      }

      // 验证项目数组
      if (!Array.isArray(items) || items.length === 0) {
        printError('项目必须是非空数组');
        process.exit(1);
      }

      // 计算拆分总金额
      const totalSplit = items.reduce((sum, item) => sum + item.amount, 0);

      // 打印拆分预览
      console.log(chalk.bold('\n拆分预览:\n'));
      printTable(
        ['项目', '金额', '分类', '备注'],
        items.map(item => [
          item.description,
          formatCurrency(-item.amount),
          item.category,
          item.notes || '-',
        ])
      );
      console.log(chalk.bold(`\n总计: ${formatCurrency(-totalSplit)}`));

      // 预览模式 - 不实际执行
      if (options.dryRun) {
        printWarning('预览模式 - 未进行任何修改');
        return;
      }

      const spinner = ora('正在应用拆分...').start();                                             // 显示加载动画

      const client = await getClient();

      // 获取原始交易
      const originalTx = await client.transactions.getTransactionDetails(transactionId);

      if (!originalTx) {
        spinner.fail('未找到交易');
        process.exit(1);
      }

      // 验证金额是否匹配 (允许0.02的舍入误差)
      const originalAmount = Math.abs(originalTx.amount);
      if (Math.abs(totalSplit - originalAmount) > 0.02) {
        spinner.warn(
          `拆分总额 (${formatCurrency(-totalSplit)}) 与原始金额 (${formatCurrency(originalTx.amount)}) 不一致`
        );
      }

      // 获取分类列表以将名称解析为ID
      const categories = await client.categories.getCategories();
      
      // 构建分类映射 (名称->ID 和 ID->ID)
      const categoryMap = new Map<string, string>();
      categories.forEach((c: any) => {
        categoryMap.set(c.name.toLowerCase(), c.id);
        categoryMap.set(c.id, c.id);
      });

      // 构建API所需的拆分数组
      const splits = items.map(item => {
        const categoryId = categoryMap.get(item.category.toLowerCase()) || 
                          categoryMap.get(item.category);
        
        if (!categoryId) {
          throw new Error(`未找到分类 "${item.category}"`);
        }

        return {
          merchantName: item.description,
          amount: item.amount,
          categoryId,
          notes: item.notes,
          hideFromReports: false,
        };
      });

      // 使用交易拆分API
      await client.transactions.updateTransactionSplits(transactionId, splits);

      spinner.stop();

      if (options.json) {
        printJSON({ success: true, transactionId, splits: items });
        return;
      }

      printSuccess(`交易 ${transactionId} 已拆分为 ${items.length} 个部分`);
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 模板命令
 * 打印拆分项目的模板JSON
 */
receiptsCommand
  .command('template')
  .description('打印拆分项目模板')
  .action(() => {
    const template = [
      {
        description: '项目1描述',
        amount: 10.99,
        category: '杂货店',
        notes: '可选备注',
      },
      {
        description: '项目2描述',
        amount: 5.50,
        category: '家居',
      },
    ];
    
    console.log(chalk.bold('\n拆分项目模板:\n'));
    console.log(JSON.stringify(template, null, 2));
    console.log(chalk.dim('\n保存为JSON文件并使用: monarch receipts split <交易ID> -f items.json'));
  });
