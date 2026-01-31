import chalk from 'chalk';
import Table from 'cli-table3';

// 输出选项接口
export interface OutputOptions {
  json?: boolean;         // 是否以JSON格式输出
  verbose?: boolean;      // 是否详细输出
}

/**
 * 格式化货币金额
 * 金额为负数时显示红色，为正数时显示绿色
 * @param amount - 金额数值
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toFixed(2);
  if (amount < 0) {
    return chalk.red(`-$${formatted}`);
  }
  return chalk.green(`$${formatted}`);
}

/**
 * 格式化日期字符串
 * 将ISO日期格式转换为美式日期格式 (如: Jan 1, 2024)
 * @param dateStr - ISO格式的日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 打印表格
 * 使用cli-table3库在控制台输出格式化的表格
 * @param headers - 表头数组
 * @param rows - 行数据数组
 * @param options - 可选配置 (可自定义表头样式)
 */
export function printTable(
  headers: string[],
  rows: (string | number)[][],
  options?: { head?: string[] }
): void {
  const table = new Table({
    head: options?.head || headers.map(h => chalk.cyan(h)),  // 默认使用青色表头
    style: { head: [], border: [] },
  });
  
  rows.forEach(row => table.push(row.map(String)));
  console.log(table.toString());
}

/**
 * 打印JSON数据
 * @param data - 要打印的数据对象
 */
export function printJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * 打印成功消息
 * @param message - 成功信息文本
 */
export function printSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * 打印错误消息
 * @param message - 错误信息文本
 */
export function printError(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * 打印警告消息
 * @param message - 警告信息文本
 */
export function printWarning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * 打印信息消息
 * @param message - 信息文本
 */
export function printInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * 截断字符串
 * 当字符串长度超过指定长度时，截取并添加省略号
 * @param str - 原始字符串
 * @param length - 最大长度
 * @returns 截断后的字符串
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}
