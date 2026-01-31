#!/usr/bin/env node
/**
 * ClawdLink 消息发送测试脚本
 * 
 * 此脚本用于测试发送加密消息的功能：
 * - 以测试用户 Matt 的身份发送消息
 * - 向 Dave 发送加密消息
 * - 显示发送结果
 * 
 * 测试前提：
 * - 必须先运行 test-setup.js 创建测试身份
 * - Dave 和 Matt 必须已经是好友
 * 
 * 使用方法：
 * node test-send.js [消息内容]
 * 默认消息："来自 Matt 的测试回复。"
 * 
 * 发送流程：
 * 1. 加载 Matt 的身份和好友列表
 * 2. 找到 Dave 作为收件人
 * 3. 构建消息包（包含类型、文本、时间戳、发送者信息）
 * 4. 使用共享密钥加密消息
 * 5. 通过中继服务器发送
 * 6. 显示发送结果（消息 ID 和时间戳）
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import relay from '../lib/relay.js';
import crypto from '../lib/crypto.js';

const TEST_DIR = '/tmp/clawdlink-test';

const identity = JSON.parse(readFileSync(`${TEST_DIR}/identity.json`, 'utf8'));
identity.displayName = 'Matt Test';
const { friends } = JSON.parse(readFileSync(`${TEST_DIR}/friends.json`, 'utf8'));

const message = process.argv.slice(2).join(' ') || '来自 Matt 的测试回复。';

console.log('📤 Matt Test 正在发送消息...');
console.log('='.repeat(50));

const friend = friends[0];
if (!friend) {
  console.error('没有好友可发送消息。');
  process.exit(1);
}

console.log(`→ 发送给：${friend.displayName}`);
console.log(`→ 消息内容："${message}"`);

const content = {
  type: 'message',
  text: message,
  timestamp: new Date().toISOString(),
  from: {
    name: 'Matt Test',
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
  console.log('✓ 消息已发送！');
  console.log(`  消息 ID：${result.id}`);
  console.log(`  发送时间：${result.timestamp}`);
} catch (err) {
  console.error('错误：', err.message);
}
