import { MonarchClient } from '../lib';                                              // 导入MonarchMoney客户端库
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';             // 导入文件系统操作函数
import { homedir } from 'os';                                                        // 导入获取用户主目录函数
import { join } from 'path';                                                         // 导入路径拼接函数

// 会话目录路径，与monarchmoney库使用相同的目录 (~/.mm)
const SESSION_DIR = join(homedir(), '.mm');
// CLI配置文件路径
const CLI_CONFIG_FILE = join(SESSION_DIR, 'cli-config.json');

// 正确的API基础URL (非默认的api.monarchmoney.com)
const MONARCH_API_URL = 'https://api.monarch.com';

// CLI配置接口
export interface CliConfig {
  email?: string;      // 用户邮箱地址
}

/**
 * 确保会话目录存在
 * 如果目录不存在则创建，权限设置为700 (仅所有者可读写执行)
 */
function ensureSessionDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * 保存CLI配置
 * 将配置写入cli-config.json文件
 * @param config - CLI配置对象
 */
export function saveCliConfig(config: CliConfig): void {
  ensureSessionDir();
  writeFileSync(CLI_CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });  // 文件权限设置为600
}

/**
 * 加载CLI配置
 * 从cli-config.json文件读取配置
 * @returns 配置对象，如果文件不存在或解析失败则返回null
 */
export function loadCliConfig(): CliConfig | null {
  if (!existsSync(CLI_CONFIG_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(CLI_CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 清除CLI配置
 * 将配置文件重置为空对象
 */
export function clearCliConfig(): void {
  if (existsSync(CLI_CONFIG_FILE)) {
    writeFileSync(CLI_CONFIG_FILE, '{}');
  }
}

/**
 * 获取已认证的MonarchClient实例
 * 从本地会话文件加载已保存的认证状态
 * @returns 已登录的MonarchClient实例
 * @throws 如果未登录则抛出错误
 */
export async function getClient(): Promise<MonarchClient> {
  const client = new MonarchClient({ baseURL: MONARCH_API_URL, enablePersistentCache: false });

  // 从 ~/.mm/session.json 加载已保存的会话
  const loaded = client.loadSession();
  if (!loaded) {
    throw new Error('未登录，请运行: monarch auth login');
  }
  
  return client;
}

/**
 * 使用邮箱密码登录
 * 创建新会话并保存用户邮箱信息
 * @param email - 用户邮箱
 * @param password - 用户密码
 * @param mfaSecret - 可选的MFA密钥
 * @returns 已登录的MonarchClient实例
 */
export async function loginWithCredentials(email: string, password: string, mfaSecret?: string): Promise<MonarchClient> {
  const client = new MonarchClient({ baseURL: MONARCH_API_URL, enablePersistentCache: false });

  // 登录并保存会话
  await client.login({ email, password, mfaSecretKey: mfaSecret, useSavedSession: true, saveSession: true });
  
  // 保存邮箱用于状态显示
  saveCliConfig({ email });

  return client;
}
