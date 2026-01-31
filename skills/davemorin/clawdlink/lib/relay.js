/**
 * ClawdLink 中继服务器客户端模块
 * 
 * 此模块负责与 ClawdLink 中央中继服务器通信，实现：
 * - 发送加密消息到指定收件人
 * - 从中继服务器轮询待接收的消息
 * - 解密收到的加密消息
 * - 检查中继服务器健康状态
 * 
 * 中继服务器架构说明：
 * 由于点对点直接通信存在 NAT 穿透等困难，ClawdLink 采用中央中继模式
 * 用户将加密后的消息上传到中继服务器，好友上线后从服务器拉取消息
 * 消息内容全程加密，中继服务器无法解密查看内容
 */

import crypto from './crypto.js';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const { decodeBase64 } = util;

const RELAY_URL = 'https://clawdlink-relay.vercel.app';

/**
 * 将 Base64 编码转换为十六进制字符串
 * 
 * 中继服务器 API 使用十六进制格式传输密钥和签名
 * 此函数将 Base64 编码的密钥转换为十六进制字符串
 * 
 * @param {string} b64 - Base64 编码字符串
 * @returns {string} 十六进制字符串（小写）
 */
export function base64ToHex(b64) {
  const bytes = decodeBase64(b64);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * 将十六进制字符串转换为 Base64 编码
 * 
 * 用于将从十六进制格式的中继服务器响应转换回 Base64 格式
 * 以便与本地加密库配合使用
 * 
 * @param {string} hex - 十六进制字符串
 * @returns {string} Base64 编码字符串
 */
export function hexToBase64(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return util.encodeBase64(bytes);
}

/**
 * 通过中继服务器发送加密消息
 * 
 * 发送流程：
 * 1. 使用共享密钥和 XChaCha20-Poly1305 加密消息内容
 * 2. 使用 Ed25519 私钥对密文进行数字签名
 * 3. 将加密后的消息、随机数和签名发送到中继服务器
 * 
 * @param {Object} params - 发送参数对象
 * @param {string} params.to - 收件人的 Ed25519 公钥（Base64 编码）
 * @param {Object} params.content - 要发送的消息内容
 * @param {Object} params.identity - 发送者的身份信息
 * @param {Object} params.friend - 好友对象，包含共享密钥
 * @returns {Promise<Object>} 服务器响应，包含消息 ID 和时间戳
 */
export async function sendMessage({ to, content, identity, friend }) {
  const sharedSecretBytes = decodeBase64(friend.sharedSecret);
  
  const { ciphertext, nonce } = crypto.encrypt(content, sharedSecretBytes);
  
  const signature = crypto.sign(ciphertext, identity.secretKey);
  
  const response = await fetch(`${RELAY_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `ed25519:${base64ToHex(identity.publicKey)}`,
      to: `ed25519:${base64ToHex(to)}`,
      ciphertext,
      nonce,
      signature: base64ToHex(signature)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '消息发送失败');
  }

  return response.json();
}

/**
 * 从中继服务器轮询待接收的消息
 * 
 * 轮询流程：
 * 1. 生成当前时间戳
 * 2. 使用 Ed25519 私钥对时间戳进行签名
 * 3. 将公钥、时间和签名作为认证头发送到中继服务器
 * 4. 服务器验证签名后返回该用户的所有待接收消息
 * 
 * @param {Object} identity - 用户的身份信息
 * @returns {Promise<Array>} 加密消息数组
 */
export async function pollMessages(identity) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `poll:${timestamp}`;
  const signature = crypto.sign(message, identity.secretKey);
  
  const response = await fetch(`${RELAY_URL}/poll`, {
    method: 'GET',
    headers: {
      'X-ClawdLink-Key': `ed25519:${base64ToHex(identity.publicKey)}`,
      'X-ClawdLink-Timestamp': timestamp,
      'X-ClawdLink-Signature': base64ToHex(signature)
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '轮询消息失败');
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * 解密从中继服务器收到的消息
 * 
 * 解密流程：
 * 1. 获取与该好友共享的密钥
 * 2. 使用 XChaCha20-Poly1305 解密消息内容
 * 3. 返回解密后的原始消息对象
 * 
 * @param {Object} encryptedMsg - 从中继收到的加密消息对象
 * @param {Object} friend - 好友对象，包含共享密钥
 * @returns {Object} 解密后的消息内容
 * @throws {Error} 如果解密失败（可能是密钥不匹配）
 */
export function decryptMessage(encryptedMsg, friend) {
  try {
    const sharedSecretBytes = decodeBase64(friend.sharedSecret);
    return crypto.decrypt(
      encryptedMsg.ciphertext,
      encryptedMsg.nonce,
      sharedSecretBytes
    );
  } catch (err) {
    throw new Error('消息解密失败');
  }
}

/**
 * 检查中继服务器健康状态
 * 
 * 用于诊断连接问题，确认中继服务器是否正常运行
 * 
 * @returns {Promise<Object>} 服务器健康状态信息
 */
export async function checkHealth() {
  const response = await fetch(`${RELAY_URL}/health`);
  return response.json();
}

export default {
  sendMessage,
  pollMessages,
  decryptMessage,
  checkHealth,
  base64ToHex,
  hexToBase64,
  RELAY_URL
};
