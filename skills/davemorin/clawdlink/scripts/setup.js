#!/usr/bin/env node
/**
 * ClawdLink 设置脚本
 * 
 * 初始化 ClawdLink 所需的所有配置和身份信息：
 * 
 * 设置流程：
 * 1. 创建数据目录 ~/.clawdbot/clawdlink/
 * 2. 生成新的 Ed25519 身份密钥对
 * 3. 将 Ed25519 密钥转换为 X25519 加密密钥
 * 4. 保存身份信息到 identity.json（权限设置为仅所有者可读写）
 * 5. 初始化空的好友列表
 * 6. 设置显示名称
 * 
 * 使用方法：
 * node setup.js
 * node setup.js --name="您的名称"
 * 
 * 输出说明：
 * - 控制台显示设置进度和结果
 * - 最后输出 JSON 格式的状态信息，供 Clawdbot 读取
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from '../lib/crypto.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

/**
 * 确保数据目录存在
 * 
 * 如果目录不存在，创建完整的目录路径
 */
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✓ 已创建数据目录：${DATA_DIR}`);
  }
}

/**
 * 设置身份信息
 * 
 * 身份设置流程：
 * 1. 检查是否已存在身份文件
 * 2. 如果存在，加载并显示现有身份
 * 3. 如果不存在，生成新的 Ed25519 密钥对
 * 4. 将 Ed25519 转换为 X25519 用于加密
 * 5. 保存完整的身份信息到文件
 * 
 * @returns {Object} 身份信息对象
 */
function setupIdentity() {
  if (existsSync(IDENTITY_FILE)) {
    const identity = JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
    console.log(`✓ 已加载现有身份`);
    console.log(`  公钥：${identity.publicKey.slice(0, 20)}...`);
    return identity;
  }

  console.log('→ 正在生成新身份...');
  const identity = crypto.generateIdentity();
  const x25519 = crypto.ed25519ToX25519(identity.secretKey);
  
  const fullIdentity = {
    publicKey: identity.publicKey,
    secretKey: identity.secretKey,
    x25519PublicKey: x25519.publicKey,
    x25519SecretKey: x25519.secretKey,
    createdAt: new Date().toISOString()
  };

  writeFileSync(IDENTITY_FILE, JSON.stringify(fullIdentity, null, 2), { mode: 0o600 });
  console.log(`✓ 已生成新身份`);
  console.log(`  公钥：${identity.publicKey.slice(0, 20)}...`);
  
  return fullIdentity;
}

/**
 * 初始化好友列表文件
 * 
 * 如果文件不存在，创建空的友谊列表
 */
function setupFriends() {
  if (!existsSync(FRIENDS_FILE)) {
    writeFileSync(FRIENDS_FILE, JSON.stringify({ friends: [] }, null, 2));
    console.log(`✓ 已初始化好友列表`);
  } else {
    const data = JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'));
    console.log(`✓ 已加载 ${data.friends?.length || 0} 位好友`);
  }
}

/**
 * 设置显示名称
 * 
 * 显示名称设置策略：
 * 1. 如果通过命令行参数传入名称，使用该名称
 * 2. 如果配置文件已存在，保留现有名称
 * 3. 如果都没有，使用默认名称"ClawdLink 用户"
 * 
 * @param {string} name - 命令行传入的名称（可选）
 * @returns {Object} 配置对象
 */
function setupConfig(name) {
  let config = {};
  if (existsSync(CONFIG_FILE)) {
    config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  }

  if (name) {
    config.displayName = name;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  if (!config.displayName) {
    config.displayName = 'ClawdLink 用户';
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  console.log(`✓ 显示名称：${config.displayName}`);
  return config;
}

/**
 * 生成好友链接
 * 
 * 好友链接格式：
 * clawdlink://<中继地址>/add?key=ed25519:<公钥>&name=<URL编码的名称>
 * 
 * @param {Object} identity - 身份信息对象
 * @param {Object} config - 配置对象
 * @param {string} tunnelUrl - 中继服务器地址
 * @returns {string} 生成的好友链接
 */
function generateFriendLink(identity, config, tunnelUrl) {
  const params = new URLSearchParams({
    key: `ed25519:${identity.publicKey}`,
    name: config.displayName
  });
  return `clawdlink://${tunnelUrl}/add?${params.toString()}`;
}

/**
 * 主设置函数
 * 
 * 设置流程：
 * 1. 解析命令行参数获取名称
 * 2. 确保数据目录存在
 * 3. 设置身份信息
 * 4. 初始化好友列表
 * 5. 设置显示名称
 * 6. 显示完成信息和后续步骤
 */
async function main() {
  console.log('🔗 ClawdLink 设置');
  console.log('='.repeat(50));

  const args = process.argv.slice(2);
  const nameArg = args.find(a => a.startsWith('--name='));
  const name = nameArg ? nameArg.split('=')[1] : null;

  ensureDataDir();
  const identity = setupIdentity();
  setupFriends();
  const config = setupConfig(name);

  console.log('');
  console.log('='.repeat(50));
  console.log('✓ ClawdLink 设置完成！');
  console.log('');
  console.log('下一步：请运行 `node scripts/tunnel.js` 启动隧道');
  console.log('');

  console.log(JSON.stringify({
    status: 'ready',
    publicKey: identity.publicKey,
    displayName: config.displayName,
    dataDir: DATA_DIR
  }));
}

main().catch(console.error);
