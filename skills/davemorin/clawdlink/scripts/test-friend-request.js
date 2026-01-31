#!/usr/bin/env node
/**
 * ClawdLink 好友请求流程测试脚本
 * 
 * 此脚本用于测试完整的好友请求流程：
 * 1. 创建模拟用户 Sophie 的身份
 * 2. 向 Dave 发送好友请求
 * 3. 验证请求是否成功发送
 * 
 * 测试场景：
 * - Sophie 向 Dave 发送好友请求
 * - 请求消息为："嘿 Dave！我们来连接 Clawdbot 吧，这样就能协调播客了。"
 * - 使用 Ed25519 签名确保请求真实性
 * 
 * 预期结果：
 * - 好友请求成功发送到中继服务器
 * - 返回请求 ID
 * - 运行 handler.js check 可以看到来自 Sophie 的好友请求
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from '../lib/crypto.js';
import relay from '../lib/relay.js';

const SOPHIE_DIR = '/tmp/clawdlink-sophie';
const DAVE_DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');

mkdirSync(SOPHIE_DIR, { recursive: true });

const sophieIdentity = crypto.generateIdentity();
const sophieX25519 = crypto.ed25519ToX25519(sophieIdentity.secretKey);

const sophieData = {
  publicKey: sophieIdentity.publicKey,
  secretKey: sophieIdentity.secretKey,
  x25519PublicKey: sophieX25519.publicKey,
  x25519SecretKey: sophieX25519.secretKey,
  createdAt: new Date().toISOString()
};

writeFileSync(join(SOPHIE_DIR, 'identity.json'), JSON.stringify(sophieData, null, 2));
writeFileSync(join(SOPHIE_DIR, 'config.json'), JSON.stringify({ displayName: 'Sophie Bakalar' }, null, 2));
writeFileSync(join(SOPHIE_DIR, 'friends.json'), JSON.stringify({ friends: [] }, null, 2));

console.log('🧪 已创建 Sophie Bakalar 的身份');
console.log('');

const daveIdentity = JSON.parse(readFileSync(join(DAVE_DATA_DIR, 'identity.json'), 'utf8'));

console.log('→ Sophie 正在向 Dave 发送好友请求...');

const fromHex = relay.base64ToHex(sophieIdentity.publicKey);
const toHex = relay.base64ToHex(daveIdentity.publicKey);
const fromX25519Hex = relay.base64ToHex(sophieX25519.publicKey);
const message = "嘿 Dave！我们来连接 Clawdbot 吧，这样就能协调播客了。";
const fromName = 'Sophie Bakalar';

const signPayload = `${fromHex}:${toHex}:${fromName}:${message}`;
const signature = crypto.sign(signPayload, sophieIdentity.secretKey);

const response = await fetch(`${relay.RELAY_URL}/request`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: fromHex,
    to: toHex,
    fromName,
    fromX25519: fromX25519Hex,
    message,
    signature: relay.base64ToHex(signature)
  })
});

const result = await response.json();
if (result.error) {
  console.error('错误：', result.error);
} else {
  console.log('✓ 好友请求已发送！');
  console.log('  请求 ID：', result.id);
  console.log('');
  console.log('现在请运行：node handler.js check');
  console.log('您应该能看到来自 Sophie 的好友请求。');
}
