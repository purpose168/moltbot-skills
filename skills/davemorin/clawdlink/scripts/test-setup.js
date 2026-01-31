#!/usr/bin/env node
/**
 * ClawdLink 测试环境设置脚本
 * 
 * 此脚本用于创建测试身份和建立测试好友关系：
 * 
 * 设置流程：
 * 1. 在 /tmp/clawdlink-test/ 目录下创建 Matt Test 的测试身份
 * 2. 生成 Ed25519 和 X25519 密钥对
 * 3. 加载 Dave 的真实身份信息
 * 4. 建立 Matt 和 Dave 之间的好友关系
 *    - 双向添加好友
 *    - 使用 X25519 密钥交换建立共享密钥
 * 5. 显示测试准备就绪的信息
 * 
 * 使用方法：
 * node test-setup.js
 * 
 * 注意事项：
 * - 此脚本会在 /tmp/clawdlink-test/ 目录创建测试数据
 * - 不会影响用户的真实身份数据
 * - 运行前必须确保 Dave 的真实身份已设置
 * 
 * 测试完成后可以运行：
 * - node test-send.js "测试消息" 发送消息
 * - node test-poll.js 接收消息
 */

import crypto from '../lib/crypto.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const TEST_DIR = '/tmp/clawdlink-test';
const REAL_DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');

mkdirSync(TEST_DIR, { recursive: true });

const identity = crypto.generateIdentity();
const x25519 = crypto.ed25519ToX25519(identity.secretKey);

const fullIdentity = {
  publicKey: identity.publicKey,
  secretKey: identity.secretKey,
  x25519PublicKey: x25519.publicKey,
  x25519SecretKey: x25519.secretKey,
  createdAt: new Date().toISOString()
};

writeFileSync(join(TEST_DIR, 'identity.json'), JSON.stringify(fullIdentity, null, 2));
writeFileSync(join(TEST_DIR, 'config.json'), JSON.stringify({ displayName: 'Matt Test' }, null, 2));
writeFileSync(join(TEST_DIR, 'friends.json'), JSON.stringify({ friends: [] }, null, 2));

console.log('🧪 测试身份已创建');
console.log('='.repeat(50));
console.log('名称：Matt Test');
console.log('公钥：', identity.publicKey);
console.log('X25519 公钥：', x25519.publicKey);
console.log('');

const daveIdentity = JSON.parse(readFileSync(join(REAL_DATA_DIR, 'identity.json'), 'utf8'));
const daveConfig = existsSync(join(REAL_DATA_DIR, 'config.json')) 
  ? JSON.parse(readFileSync(join(REAL_DATA_DIR, 'config.json'), 'utf8'))
  : { displayName: 'Dave' };

const daveFriends = JSON.parse(readFileSync(join(REAL_DATA_DIR, 'friends.json'), 'utf8'));

const daveSharedSecret = crypto.deriveSharedSecret(daveIdentity.x25519SecretKey, x25519.publicKey);

const mattAsFriend = {
  displayName: 'Matt Test',
  publicKey: identity.publicKey,
  x25519PublicKey: x25519.publicKey,
  sharedSecret: Buffer.from(daveSharedSecret).toString('base64'),
  addedAt: new Date().toISOString(),
  status: 'connected'
};

const existingMatt = daveFriends.friends.findIndex(f => f.displayName === 'Matt Test');
if (existingMatt >= 0) {
  daveFriends.friends[existingMatt] = mattAsFriend;
} else {
  daveFriends.friends.push(mattAsFriend);
}
writeFileSync(join(REAL_DATA_DIR, 'friends.json'), JSON.stringify(daveFriends, null, 2));

const mattSharedSecret = crypto.deriveSharedSecret(x25519.secretKey, daveIdentity.x25519PublicKey);

const mattFriends = {
  friends: [{
    displayName: daveConfig.displayName,
    publicKey: daveIdentity.publicKey,
    x25519PublicKey: daveIdentity.x25519PublicKey,
    sharedSecret: Buffer.from(mattSharedSecret).toString('base64'),
    addedAt: new Date().toISOString(),
    status: 'connected'
  }]
};
writeFileSync(join(TEST_DIR, 'friends.json'), JSON.stringify(mattFriends, null, 2));

console.log('✓ 已将 Matt Test 添加到 Dave 的好友列表');
console.log('✓ 已将 Dave 添加到 Matt Test 的好友列表');
console.log('');
console.log('测试环境准备就绪！请尝试：');
console.log('  node cli.js send "Matt Test" "来自 Dave 的测试消息！"');
