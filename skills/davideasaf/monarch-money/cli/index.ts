#!/usr/bin/env node                                                                              // 指定使用Node.js解释器执行

import { Command } from 'commander';                                                            // 导入命令解析库
import { transactionsCommand } from './commands/transactions';                                  // 导入交易管理命令
import { categoriesCommand } from './commands/categories';                                      // 导入分类管理命令
import { accountsCommand } from './commands/accounts';                                          // 导入账户管理命令
import { authCommand } from './commands/auth';                                                  // 导入认证命令
import { receiptsCommand } from './commands/receipts';                                          // 导入收据管理命令
import { doctorCommand } from './commands/doctor';                                              // 导入系统诊断命令
import { testCommand } from './commands/test';                                                  // 导入测试命令

// 创建CLI程序实例
const program = new Command();

// 配置CLI程序基本信息
program
  .name('monarch-money')                                                                      // 程序名称
  .description('Monarch Money预算管理命令行工具')                                             // 程序描述
  .version('1.0.0');                                                                          // 版本号

// 添加所有子命令
program.addCommand(authCommand);                                                               // 认证命令组
program.addCommand(transactionsCommand);                                                      // 交易命令组
program.addCommand(categoriesCommand);                                                        // 分类命令组
program.addCommand(accountsCommand);                                                          // 账户命令组
program.addCommand(receiptsCommand);                                                          // 收据命令组
program.addCommand(doctorCommand);                                                            // 系统诊断命令
program.addCommand(testCommand);                                                              // 测试命令

// 解析命令行参数
program.parse();
