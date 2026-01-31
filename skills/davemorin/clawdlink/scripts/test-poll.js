#!/usr/bin/env node
/**
 * ClawdLink 消息轮询测试脚本
 * 
 * 此脚本用于测试从中央中继服务器接收消息的功能：
 * - 以测试用户 Matt 的身份轮询消息
 * - 显示收到的所有消息
 * - 自动解密并显示消息内容
 * 
 * 测试前提：
 * - 必须先运行 test-setup.js 创建测试身份
 * - Dave 和 Matt 必须已经是好友
 * - 必须有发送给 Matt 的消息
 * 
 * 使用方法：
 * node test-poll.js
 * 
 * 输出说明：
 * - 如果没有消息，显示"暂无消息"
 * - 如果有消息，显示发件人、时间戳和消息内容
 */

import { readFileSync } from 'fs';
import relay from '../lib/relay.js';

const TEST_DIR = '/tmp/clawdlink-test';

const identity = JSON.parse(readFileSync(`${TEST_DIR}/identity.json`, 'utf8'));
const { friends } = JSON.parse(readFileSync(`${TEST_DIR}/friends.json`, 'utf8'));

console.log('📥 Matt Test 正在轮询消息...');
console.log('='.repeat(50));

try {
  const messages = await relay.pollMessages(identity);
  
  if (messages.length === 0) {
    console.log('暂无消息。');
  } else {
    console.log(`发现 ${messages.length} 条消息：`);
    console.log('');
    
    for (const msg of messages) {
      const friend = friends.find(f => relay.base64ToHex(f.publicKey) === msg.from);
      
      if (friend) {
        const content = relay.decryptMessage(msg, friend);
        console.log(`发件人：${friend.displayName}`);
        console.log(`时间：${msg.timestamp}`);
        console.log(`消息："${content.text}"`);
      } else {
        console.log(`发件人：未知（${msg.from.slice(0, 16)}...）`);
      }
      console.log('');
    }
  }
} catch (err) {
  console.error('错误：', err.message);
}
