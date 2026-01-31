import { Command } from 'commander';                                                              // 导入命令解析库
import ora from 'ora';                                                                            // 导入加载动画库
import chalk from 'chalk';                                                                        // 导入终端着色库
import { existsSync, readFileSync } from 'fs';                                                    // 导入文件系统操作函数
import { homedir } from 'os';                                                                     // 导入获取用户主目录函数
import { join } from 'path';                                                                      // 导入路径拼接函数
import https from 'https';                                                                        // 导入HTTPS模块
import { MonarchClient } from '../../lib';                                                        // 导入MonarchMoney客户端库
import { printSuccess, printWarning, printError, printInfo } from '../utils/output';              // 导入输出工具函数

// API基础URL和会话文件路径
const BASE_URL = 'https://api.monarch.com';
const SESSION_FILE = join(homedir(), '.mm', 'session.json');

// 创建诊断命令
export const doctorCommand = new Command('doctor')
  .description('检查CLI设置、环境和API连接')                                                      // 命令描述
  .action(async () => {
    const issues: string[] = [];                                                                 // 问题列表
    const warnings: string[] = [];                                                               // 警告列表

    // 检查Node.js版本
    const nodeMajor = parseInt(process.versions.node.split('.')[0] || '0', 10);
    if (nodeMajor < 18) {
      issues.push(`检测到Node.js ${process.versions.node} (需要版本 >= 18)`);
    }

    // 检查环境变量
    const email = process.env.MONARCH_EMAIL;
    const password = process.env.MONARCH_PASSWORD;
    const mfaSecret = process.env.MONARCH_MFA_SECRET;

    if (!email) warnings.push('未设置MONARCH_EMAIL (登录需要)');
    if (!password) warnings.push('未设置MONARCH_PASSWORD (登录需要)');
    if (!mfaSecret) warnings.push('未设置MONARCH_MFA_SECRET (仅MFA启用时需要)');

    // 检查会话文件
    if (!existsSync(SESSION_FILE)) {
      warnings.push('未找到会话 (~/.mm/session.json)。请运行: monarch auth login');
    } else {
      try {
        const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        if (session?.email) {
          printInfo(`找到会话文件，用户: ${session.email}`);
        } else {
          printInfo('找到会话文件');
        }
      } catch {
        warnings.push('会话文件存在但无法解析');
      }
    }

    // 检查API连接
    const apiSpinner = ora('正在检查API连接...').start();
    try {
      const url = new URL(`${BASE_URL}/graphql`);
      const body = JSON.stringify({ query: '{ __typename }' });
      const status = await new Promise<number>((resolve, reject) => {
        const req = https.request(
          {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
            agent: new https.Agent({ keepAlive: false }),
          },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode || 0));
          }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      apiSpinner.stop();
      if (status === 525) {
        issues.push('API端点返回525错误 (Cloudflare SSL握手失败)');
      } else if (status >= 500) {
        issues.push(`API端点返回 ${status} 错误`);
      } else {
        printInfo(`API可访问 (状态码: ${status})`);
      }
    } catch (err) {
      apiSpinner.fail('API连接检查失败');
      issues.push(err instanceof Error ? err.message : String(err));
    }

    // 验证会话有效性 (如果存在)
    const sessionSpinner = ora('正在验证保存的会话...').start();
    try {
      const client = new MonarchClient({ baseURL: BASE_URL, enablePersistentCache: false });
      const loaded = client.loadSession();
      if (!loaded) {
        sessionSpinner.fail('无法加载有效会话');
      } else {
        await client.accounts.getAll();
        sessionSpinner.succeed('会话有效');
      }
      await client.close();
    } catch {
      sessionSpinner.fail('会话无效或已过期');
    }

    // 输出检查结果摘要
    if (issues.length === 0 && warnings.length === 0) {
      printSuccess('诊断检查通过');
      return;
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow('\n警告:'));
      warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (issues.length > 0) {
      console.log(chalk.red('\n问题:'));
      issues.forEach(i => console.log(`  - ${i}`));
      process.exitCode = 1;
    }
  });
