import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { MonarchClient } from '../../lib';                                                        // 导入MonarchMoney客户端库
import { saveCliConfig, clearCliConfig, loadCliConfig } from '../client';                         // 导入CLI配置管理函数
import { printSuccess, printError, printInfo } from '../utils/output';                            // 导入输出工具函数

// Monarch Money API基础URL
const MONARCH_API_URL = 'https://api.monarch.com';

// 创建认证命令组
export const authCommand = new Command('auth')
  .description('认证相关命令');                                                                   // 命令组描述

/**
 * 登录命令
 * 使用邮箱密码登录Monarch Money账户
 */
authCommand
  .command('login')
  .description('登录Monarch Money账户')
  .option('-e, --email <email>', '邮箱地址')                                                     // 邮箱选项
  .option('-p, --password <password>', '密码')                                                   // 密码选项
  .option('--mfa-secret <secret>', 'MFA密钥 (可选)')                                             // MFA密钥选项
  .action(async (options) => {
    const spinner = ora('正在登录...').start();                                                   // 显示加载动画
    
    try {
      // 从命令行参数或环境变量获取认证信息
      const email = options.email || process.env.MONARCH_EMAIL;
      const password = options.password || process.env.MONARCH_PASSWORD;
      const mfaSecret = options.mfaSecret || process.env.MONARCH_MFA_SECRET;
      
      // 验证必填参数
      if (!email || !password) {
        spinner.fail('请提供邮箱和密码');
        console.log('\n使用方法:');
        console.log('  monarch auth login -e <邮箱> -p <密码>');
        console.log('\n或设置环境变量:');
        console.log('  MONARCH_EMAIL=your@email.com');
        console.log('  MONARCH_PASSWORD=yourpassword');
        process.exit(1);
      }

      // 创建客户端并登录
      const client = new MonarchClient({ baseURL: MONARCH_API_URL, enablePersistentCache: false });
      await client.login({ email, password, mfaSecretKey: mfaSecret, useSavedSession: true, saveSession: true });
      
      // 保存邮箱用于状态显示
      saveCliConfig({ email });

      spinner.succeed(`登录成功: ${chalk.cyan(email)}`);                                          // 显示成功信息
    } catch (error) {
      spinner.fail('登录失败');
      printError(error instanceof Error ? error.message : String(error));                        // 显示错误信息
      process.exit(1);
    }
  });

/**
 * 登出命令
 * 清除本地会话和配置
 */
authCommand
  .command('logout')
  .description('登出并清除会话')
  .action(() => {
    const client = new MonarchClient({ baseURL: MONARCH_API_URL, enablePersistentCache: false });
    client.deleteSession();                                                                       // 删除会话文件
    clearCliConfig();                                                                             // 清除CLI配置
    printSuccess('已成功登出');
  });

/**
 * 状态命令
 * 检查当前认证状态
 */
authCommand
  .command('status')
  .description('查看认证状态')
  .action(async () => {
    const spinner = ora('正在检查会话...').start();                                               // 显示加载动画
    
    try {
      const client = new MonarchClient({ baseURL: MONARCH_API_URL, enablePersistentCache: false });
      const loaded = client.loadSession();                                                        // 加载本地会话
      
      if (!loaded) {
        spinner.fail('未登录');
        printInfo('请运行: monarch auth login');
        return;
      }
      
      // 尝试调用API验证会话有效性
      await client.accounts.getAll();
      
      const config = loadCliConfig();
      const email = config?.email || 'unknown';
      
      spinner.succeed(`已登录: ${chalk.cyan(email)}`);                                            // 显示登录状态
    } catch {
      spinner.fail('会话已过期或无效');
      printInfo('请运行: monarch auth login');
    }
  });
