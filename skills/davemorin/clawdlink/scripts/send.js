#!/usr/bin/env node
/**
 * ClawdLink 消息发送脚本
 * 
 * 此脚本用于向好友发送加密消息：
 * 
 * 功能特点：
 * - 通过中继服务器发送端到端加密消息
 * - 支持查找好友（按名称或公钥）
 * - 自动加密和签名消息
 * - 将发送记录保存到发件箱
 * 
 * 使用方法：
 * node send.js <好友名称> <消息内容>
 * 
 * 示例：
 * node send.js "张三" "嘿，想聊聊 AI 助手吗？"
 * 
 * 注意事项：
 * - 收件人必须是已连接的好友
 * - 消息会经过 XChaCha20-Poly1305 加密
 * - 发送记录会保存在 ~/.clawdbot/clawdlink/outbox/ 目录
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from '../lib/crypto.js';
import relay from '../lib/relay.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const OUTBOX_DIR = join(DATA_DIR, 'outbox');

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
 * 通过名称或公钥查找好友
 * 
 * 搜索策略：
 * - 首先尝试按名称模糊匹配（不区分大小写）
 * - 如果未找到，尝试按公钥匹配
 * 
 * @param {Array} friends - 好友列表
 * @param {string} nameOrKey - 好友名称或公钥
 * @returns {Object|undefined} 找到的好友对象
 */
function findFriend(friends, nameOrKey) {
  const query = nameOrKey.toLowerCase();
  return friends.find(f => 
    f.displayName?.toLowerCase().includes(query) ||
    f.publicKey?.toLowerCase().includes(query)
  );
}

/**
 * 将发送的消息保存到发件箱
 * 
 * 用于保存发送记录，方便后续查询和审计
 * 
 * @param {Object} message - 消息对象
 * @param {Object} friend - 好友对象
 */
function saveToOutbox(message, friend) {
  if (!existsSync(OUTBOX_DIR)) {
    mkdirSync(OUTBOX_DIR, { recursive: true });
  }
  const filename = `${Date.now()}-${friend.displayName.replace(/\s+/g, '_')}.json`;
  writeFileSync(join(OUTBOX_DIR, filename), JSON.stringify(message, null, 2));
}

/**
 * 主发送函数
 * 
 * 发送流程：
 * 1. 解析命令行参数获取好友名称和消息内容
 * 2. 加载身份信息和好友列表
 * 3. 查找目标好友
 * 4. 构建消息包（包含发送者信息、时间戳等）
 * 5. 通过中继服务器发送加密消息
 * 6. 保存发送记录
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('用法：node send.js <好友名称> <消息内容>');
    console.log('');
    console.log('示例：');
    console.log('  node send.js "张三" "嘿，想聊聊 AI 助手吗？"');
    process.exit(1);
  }

  const friendName = args[0];
  const messageText = args.slice(1).join(' ');

  console.log('📤 ClawdLink 消息发送');
  console.log('='.repeat(50));

  const identity = loadIdentity();
  const { friends } = loadFriends();

  const friend = findFriend(friends, friendName);
  if (!friend) {
    console.error(`✗ 未找到好友：${friendName}`);
    console.log('');
    console.log('可用的好友列表：');
    friends.forEach(f => console.log(`  • ${f.displayName}`));
    process.exit(1);
  }

  if (friend.status !== 'connected') {
    console.error(`✗ 好友 ${friend.displayName} 尚未连接（状态：${friend.status}）`);
    process.exit(1);
  }

  console.log(`→ 发送给：${friend.displayName}`);
  console.log(`→ 消息内容："${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`);

  const content = {
    type: 'message',
    text: messageText,
    timestamp: new Date().toISOString(),
    from: {
      name: identity.displayName || '未知',
      key: identity.publicKey
    }
  };

  try {
    const result = await relay.sendMessage({
      to: friend.publicKey,
      content,
      identity,
      friend
    });

    console.log('');
    console.log(`✓ 消息已发送！`);
    console.log(`  消息 ID：${result.id}`);
    console.log(`  发送时间：${result.timestamp}`);

    saveToOutbox({
      id: result.id,
      to: friend.displayName,
      toKey: friend.publicKey,
      content,
      sentAt: result.timestamp
    }, friend);

  } catch (err) {
    console.error(`✗ 发送失败：${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
