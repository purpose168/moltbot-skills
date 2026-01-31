import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { getClient } from '../client';                                                            // 导入获取客户端函数
import { printTable, printJSON, printError } from '../utils/output';                              // 导入输出工具函数

// 创建分类命令组，别名为cat
export const categoriesCommand = new Command('categories')
  .alias('cat')
  .description('分类管理');                                                                       // 命令组描述

/**
 * 列出所有分类命令
 * 支持按分类组名称筛选
 */
categoriesCommand
  .command('list')
  .description('列出所有分类')
  .option('-g, --group <name>', '按分类组名称筛选')                                              // 分组筛选选项
  .option('--json', '以JSON格式输出')
  .action(async (options) => {
    const spinner = ora('正在获取分类...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();
      let categories = await client.categories.getCategories();
      
      spinner.stop();                                                                             // 停止加载动画

      // 按分组筛选
      if (options.group) {
        const groupLower = options.group.toLowerCase();
        categories = categories.filter((c: any) => 
          c.group?.name?.toLowerCase().includes(groupLower)
        );
      }

      // JSON输出模式
      if (options.json) {
        printJSON(categories);
        return;
      }

      // 无结果提示
      if (categories.length === 0) {
        console.log(chalk.yellow('未找到分类'));
        return;
      }

      // 打印分类数量
      console.log(chalk.bold(`\n共 ${categories.length} 个分类:\n`));

      // 按分类组分组显示
      const grouped: Record<string, any[]> = {};
      categories.forEach((cat: any) => {
        const groupName = cat.group?.name || '未分组';
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(cat);
      });

      // 逐组打印分类
      for (const [groupName, cats] of Object.entries(grouped)) {
        console.log(chalk.cyan.bold(`\n${groupName}:`));
        printTable(
          ['ID', '名称', '图标'],
          cats.map((c: any) => [
            c.id,
            c.name,
            c.icon || '-',
          ])
        );
      }
    } catch (error) {
      spinner.fail('获取分类失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 搜索分类命令
 * 按名称搜索分类
 */
categoriesCommand
  .command('search <query>')
  .description('按名称搜索分类')
  .option('--json', '以JSON格式输出')
  .action(async (query, options) => {
    const spinner = ora('正在搜索分类...').start();                                               // 显示加载动画
    
    try {
      const client = await getClient();
      const allCategories = await client.categories.getCategories();
      
      spinner.stop();

      // 执行搜索 (匹配名称或分组名称)
      const queryLower = query.toLowerCase();
      const categories = allCategories.filter((c: any) =>
        c.name?.toLowerCase().includes(queryLower) ||
        c.group?.name?.toLowerCase().includes(queryLower)
      );

      // JSON输出模式
      if (options.json) {
        printJSON(categories);
        return;
      }

      // 无结果提示
      if (categories.length === 0) {
        console.log(chalk.yellow(`未找到匹配的分类 "${query}"`));
        return;
      }

      // 打印搜索结果
      console.log(chalk.bold(`\n找到 ${categories.length} 个分类:\n`));

      printTable(
        ['ID', '名称', '分组'],
        categories.map((c: any) => [
          c.id,
          c.name,
          c.group?.name || '-',
        ])
      );
    } catch (error) {
      spinner.fail('搜索失败');
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
