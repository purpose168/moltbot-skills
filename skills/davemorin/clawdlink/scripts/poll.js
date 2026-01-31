#!/usr/bin/env node
/**
 * ClawdLink 消息轮询脚本
 * 
 * 此脚本用于从中央中继服务器检查和接收新消息：
 * 
 * 功能特点：
 * - 连接到中继服务器检查新消息
 * - 使用 Ed25519 签名进行身份认证
 * - 自动解密收到的消息
 * - 将消息保存到收件箱
 * 
 * 使用方法：
 * - 基础轮询：node poll.js
 * - 详细输出：node poll.js --verbose
 * - JSON 格式：node poll.js --json
 * 
 * 输出说明：
 * - 如果没有新消息，显示"暂无新消息"
 * - 如果有新消息，显示消息数量和内容
 * - 消息会被保存到 ~/.clawdbot/clawdlink/inbox/ 目录
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import relay from '../lib/relay.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const INBOX_DIR = join(DATA_DIR, 'inbox');

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
 * 通过公钥查找好友
 * 
 * 中继服务器返回的公钥是十六进制格式
 * 本地存储的是 Base64 格式，需要进行转换比较
 * 
 * @param {Array} friends - 好友列表
 * @param {string} publicKeyHex - 十六进制格式的公钥
 * @returns {Object|undefined} 找到的好友对象
 */
function findFriendByKey(friends, publicKeyHex) {
  const keyBase64 = relay.hexToBase64(publicKeyHex);
  return friends.find(f => f.publicKey === keyBase64);
}

/**
 * 将消息保存到收件箱
 * 
 * 文件命名格式：
 * <时间戳>-<好友名称>.json
 * 
 * @param {Object} message - 消息对象
 * @param {Object} friend - 好友对象
 */
function saveToInbox(message, friend) {
  if (!existsSync(INBOX_DIR)) {
    mkdirSync(INBOX_DIR, { recursive: true });
  }
  const filename = `${Date.now()}-${friend?.displayName?.replace(/\s+/g, '_') || 'unknown'}.json`;
  writeFileSync(join(INBOX_DIR, filename), JSON.stringify(message, null, 2));
}

/**
 * 主轮询函数
 * 
 * 轮询流程：
 * 1. 加载身份信息和好友列表
 * 2. 连接到中继服务器获取新消息
 * 3. 遍历每条消息，查找对应的好友
 * 4. 使用共享密钥解密消息内容
 * 5. 显示解密后的消息并保存到收件箱
 */
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');

  if (!jsonOutput) {
    console.log('📥 ClawdLink 消息轮询');
    console.log('='.repeat(50));
  }

  const identity = loadIdentity();
  const { friends } = loadFriends();

  try {
    const messages = await relay.pollMessages(identity);

    if (messages.length === 0) {
      if (jsonOutput) {
        console.log(JSON.stringify({ messages: [], count: 0 }));
      } else {
        console.log('暂无新消息。');
      }
      return;
    }

    if (!jsonOutput) {
      console.log(`✓ 发现 ${messages.length} 条消息`);
      console.log('');
    }

    const decryptedMessages = [];

    for (const msg of messages) {
      const friend = findFriendByKey(friends, msg.from);
      
      if (!friend) {
        if (verbose && !jsonOutput) {
          console.log(`⚠ 来自未知发送者的消息：${msg.from.slice(0, 16)}...`);
        }
        continue;
      }

      try {
        const content = relay.decryptMessage(msg, friend);
        
        const decrypted = {
          id: msg.id,
          from: friend.displayName,
          fromKey: friend.publicKey,
          content,
          receivedAt: new Date().toISOString(),
          relayTimestamp: msg.timestamp
        };

        decryptedMessages.push(decrypted);
        saveToInbox(decrypted, friend);

        if (!jsonOutput) {
          console.log(`📨 发件人：${friend.displayName}`);
          console.log(`   时间：${msg.timestamp}`);
          if (content.text) {
            console.log(`   消息："${content.text}"`);
          } else {
            console.log(`   类型：${content.type || 'unknown'}`);
          }
          console.log('');
        }

      } catch (err) {
        if (verbose && !jsonOutput) {
          console.log(`⚠ 来自 ${friend.displayName} 的消息解密失败：${err.message}`);
        }
      }
    }

    if (jsonOutput) {
      console.log(JSON.stringify({ messages: decryptedMessages, count: decryptedMessages.length }));
    } else {
      console.log('='.repeat(50));
      console.log(`✓ 已处理 ${decryptedMessages.length} 条消息`);
    }

  } catch (err) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`✗ 轮询失败：${err.message}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
