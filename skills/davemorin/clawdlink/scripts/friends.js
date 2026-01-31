#!/usr/bin/env node
/**
 * ClawdLink 好友管理器脚本
 * 
 * 提供好友管理命令行功能：
 * - add：添加好友（通过好友链接）
 * - list：列出所有好友
 * - remove：删除好友
 * - link：显示自己的好友链接
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from '../lib/crypto.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

/**
 * 加载本地身份信息
 * @returns {Object} 身份信息对象
 * @throws {Error} 如果身份文件不存在
 */
function loadIdentity() {
  if (!existsSync(IDENTITY_FILE)) {
    throw new Error('未找到身份信息。请先运行设置命令。');
  }
  return JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
}

/**
 * 加载好友列表
 * @returns {Object} 好友列表对象
 */
function loadFriends() {
  if (!existsSync(FRIENDS_FILE)) {
    return { friends: [] };
  }
  return JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'));
}

/**
 * 保存好友列表
 * @param {Object} data - 好友列表数据
 */
function saveFriends(data) {
  writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2));
}

/**
 * 加载用户配置
 * @returns {Object} 配置对象
 */
function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return { displayName: 'ClawdLink 用户' };
  }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * 解析好友链接
 * 
 * 支持两种链接格式：
 * - clawdlink://relay.clawdlink.bot/add?key=ed25519:<公钥>&name=<名称>
 * - https://relay.clawdlink.bot/add?key=ed25519:<公钥>&name=<名称>
 * 
 * @param {string} link - 好友链接字符串
 * @returns {Object} 包含公钥和显示名称的对象
 */
function parseFriendLink(link) {
  try {
    const url = new URL(link.replace('clawdlink://', 'https://'));
    const params = new URLSearchParams(url.search);
    
    let key = params.get('key') || '';
    const name = params.get('name') || '未知用户';
    
    if (key.startsWith('ed25519:')) {
      key = key.slice(8);
    }
    
    if (!key) {
      throw new Error('链接中未找到公钥');
    }
    
    return { publicKey: key, displayName: decodeURIComponent(name) };
  } catch (err) {
    throw new Error(`无效的好友链接：${err.message}`);
  }
}

/**
 * 生成当前用户的好友链接
 * 
 * 好友链接格式：
 * clawdlink://<中继地址>/add?key=ed25519:<base64公钥>&name=<URL编码的名称>
 * 
 * @param {Object} identity - 身份信息对象
 * @param {Object} config - 配置对象
 * @returns {string} 生成的好友链接
 */
function generateFriendLink(identity, config) {
  const params = new URLSearchParams({
    key: `ed25519:${identity.publicKey}`,
    name: config.displayName
  });
  return `clawdlink://relay.clawdlink.bot/add?${params.toString()}`;
}

/**
 * 添加好友
 * 
 * 添加流程：
 * 1. 解析好友链接获取对方信息
 * 2. 检查是否已是好友
 * 3. 使用 X25519 密钥交换派生出共享密钥
 * 4. 将好友信息保存到本地
 * 
 * @param {string} link - 好友链接
 */
function addFriend(link) {
  const identity = loadIdentity();
  const data = loadFriends();
  
  const { publicKey, displayName } = parseFriendLink(link);
  
  const existing = data.friends.find(f => f.publicKey === publicKey);
  if (existing) {
    console.log(`✓ ${displayName} 已经是您的好友了。`);
    return;
  }
  
  const theirX25519Public = crypto.ed25519ToX25519({ secretKey: identity.secretKey, publicKey }).publicKey;
  const sharedSecret = crypto.deriveSharedSecret(identity.x25519SecretKey, publicKey);
  
  const friend = {
    displayName,
    publicKey,
    sharedSecret: Buffer.from(sharedSecret).toString('base64'),
    addedAt: new Date().toISOString(),
    status: 'connected'
  };
  
  data.friends.push(friend);
  saveFriends(data);
  
  console.log(`✓ 已添加好友：${displayName}`);
  console.log(`  公钥：${publicKey.slice(0, 20)}...`);
}

/**
 * 列出所有好友
 * 
 * 显示格式：
 * - 好友名称
 * - 公钥（前20个字符）
 * - 连接状态
 * - 添加时间
 */
function listFriends() {
  const data = loadFriends();
  
  if (data.friends.length === 0) {
    console.log('暂无好友。');
    console.log('');
    console.log('要添加好友，请先分享您的好友链接：');
    showLink();
    return;
  }
  
  console.log(`好友列表（${data.friends.length} 人）：`);
  console.log('');
  
  for (const friend of data.friends) {
    console.log(`  • ${friend.displayName}`);
    console.log(`    密钥：${friend.publicKey.slice(0, 20)}...`);
    console.log(`    状态：${friend.status}`);
    console.log(`    添加于：${friend.addedAt}`);
    console.log('');
  }
}

/**
 * 删除好友
 * 
 * @param {string} nameOrKey - 好友名称或公钥（支持模糊匹配）
 */
function removeFriend(nameOrKey) {
  const data = loadFriends();
  const query = nameOrKey.toLowerCase();
  
  const index = data.friends.findIndex(f => 
    f.displayName?.toLowerCase().includes(query) ||
    f.publicKey?.toLowerCase().includes(query)
  );
  
  if (index === -1) {
    console.error(`✗ 未找到好友：${nameOrKey}`);
    return;
  }
  
  const friend = data.friends[index];
  data.friends.splice(index, 1);
  saveFriends(data);
  
  console.log(`✓ 已删除好友：${friend.displayName}`);
}

/**
 * 显示当前用户的好友链接
 */
function showLink() {
  const identity = loadIdentity();
  const config = loadConfig();
  const link = generateFriendLink(identity, config);
  
  console.log('您的好友链接：');
  console.log('');
  console.log(`  ${link}`);
  console.log('');
  console.log('将此链接分享给朋友，他们就可以添加您。');
}

// 主程序入口
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'add':
    if (!args[1]) {
      console.error('用法：friends.js add <好友链接>');
      process.exit(1);
    }
    addFriend(args[1]);
    break;
    
  case 'list':
    listFriends();
    break;
    
  case 'remove':
    if (!args[1]) {
      console.error('用法：friends.js remove <名称>');
      process.exit(1);
    }
    removeFriend(args[1]);
    break;
    
  case 'link':
    showLink();
    break;
    
  default:
    console.log('ClawdLink 好友管理器');
    console.log('');
    console.log('命令：');
    console.log('  add <链接>     通过链接添加好友');
    console.log('  list           列出所有好友');
    console.log('  remove <名称>  删除好友');
    console.log('  link           显示您的好友链接');
}
