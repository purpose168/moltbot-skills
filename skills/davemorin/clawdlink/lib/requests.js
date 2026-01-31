/**
 * ClawdLink 好友请求协议模块
 * 
 * 实现完整的好友添加流程，确保安全地建立加密通信通道：
 * 
 * 好友请求流程：
 * 1. Alice 解析 Bob 的好友链接，获取 Bob 的公钥和名称
 * 2. Alice 构建签名载荷并发送好友请求到中继服务器（明文，但经过数字签名）
 * 3. Bob 收到请求后，决定是否接受
 * 4. 如果接受，Bob 将 Alice 添加为好友并发送好友接受消息（加密）
 * 5. 双方建立共享密钥，可以进行端到端加密通信
 * 
 * 安全设计：
 * - 好友请求使用 Ed25519 签名，防止伪造
 * - 接受消息使用共享密钥加密，确保只有请求发起方能解密
 * - X25519 密钥交换确保前向安全性
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from './crypto.js';
import relay from './relay.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const PENDING_FILE = join(DATA_DIR, 'pending_requests.json');

/**
 * 加载本地保存的身份信息
 * @returns {Object} 身份信息对象
 */
function loadIdentity() {
  return JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
}

/**
 * 加载用户配置
 * @returns {Object} 配置对象
 */
function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return { displayName: 'ClawdLink 用户' };
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * 加载好友列表
 * @returns {Object} 好友列表对象
 */
function loadFriends() {
  if (!existsSync(FRIENDS_FILE)) return { friends: [] };
  return JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'));
}

/**
 * 保存好友列表到文件
 * @param {Object} data - 好友列表数据
 */
function saveFriends(data) {
  writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2));
}

/**
 * 加载待处理的好友请求
 * @returns {Object} 包含 incoming 和 outgoing 数组的对象
 */
function loadPending() {
  if (!existsSync(PENDING_FILE)) return { incoming: [], outgoing: [] };
  return JSON.parse(readFileSync(PENDING_FILE, 'utf8'));
}

/**
 * 保存待处理请求到文件
 * @param {Object} data - 待处理请求数据
 */
function savePending(data) {
  writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
}

/**
 * 解析好友链接
 * 
 * 好友链接格式：
 * clawdlink://relay.clawdlink.bot/add?key=ed25519:<base64公钥>&name=<URL编码的名称>
 * 
 * @param {string} link - 好友链接字符串
 * @returns {Object} 包含公钥和显示名称的对象
 */
export function parseFriendLink(link) {
  const url = new URL(link.replace('clawdlink://', 'https://'));
  const params = new URLSearchParams(url.search);
  
  let key = params.get('key') || '';
  const name = params.get('name') || '未知用户';
  
  if (key.startsWith('ed25519:')) {
    key = key.slice(8);
  }
  
  if (!key) throw new Error('链接中不包含公钥');
  
  return { 
    publicKey: key, 
    displayName: decodeURIComponent(name)
  };
}

/**
 * 通过中继服务器发送好友请求
 * 
 * 发送流程：
 * 1. 解析好友链接获取对方公钥和名称
 * 2. 检查是否已经是好友
 * 3. 构建签名载荷（发送方:接收方:发送方名称:请求消息）
 * 4. 使用 Ed25519 私钥对载荷进行签名
 * 5. 将请求发送到中继服务器
 * 6. 保存到待发送请求列表
 * 
 * @param {string} friendLink - 好友链接
 * @param {string} message - 附加的请求消息
 * @returns {Promise<Object>} 发送结果
 */
export async function sendFriendRequest(friendLink, message = '') {
  const identity = loadIdentity();
  const config = loadConfig();
  const { publicKey, displayName } = parseFriendLink(friendLink);
  
  const { friends } = loadFriends();
  if (friends.find(f => f.publicKey === publicKey)) {
    throw new Error(`您已与 ${displayName} 是好友`);
  }
  
  const fromHex = relay.base64ToHex(identity.publicKey);
  const toHex = relay.base64ToHex(publicKey);
  const fromX25519Hex = relay.base64ToHex(identity.x25519PublicKey);
  const msg = message || `${config.displayName} 想在 ClawdLink 上与您建立连接`;
  
  const signPayload = `${fromHex}:${toHex}:${config.displayName}:${msg}`;
  const signature = crypto.sign(signPayload, identity.secretKey);
  
  const response = await fetch(`${relay.RELAY_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromHex,
      to: toHex,
      fromName: config.displayName,
      fromX25519: fromX25519Hex,
      message: msg,
      signature: relay.base64ToHex(signature)
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '请求发送失败');
  }
  
  const pending = loadPending();
  pending.outgoing.push({
    to: displayName,
    toKey: publicKey,
    sentAt: new Date().toISOString(),
    status: 'pending'
  });
  savePending(pending);
  
  return { sent: true, to: displayName };
}

/**
 * 从中继服务器获取待处理的好友请求
 * 
 * 获取流程：
 * 1. 生成当前时间戳
 * 2. 使用 Ed25519 私钥签名时间戳
 * 3. 将密钥、时间和签名发送到服务器进行认证
 * 4. 返回所有待处理的好友请求
 * 
 * @returns {Promise<Array>} 请求对象数组
 */
export async function fetchFriendRequests() {
  const identity = loadIdentity();
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `requests:${timestamp}`;
  const signature = crypto.sign(message, identity.secretKey);
  
  const response = await fetch(`${relay.RELAY_URL}/requests`, {
    method: 'GET',
    headers: {
      'X-ClawdLink-Key': `ed25519:${relay.base64ToHex(identity.publicKey)}`,
      'X-ClawdLink-Timestamp': timestamp,
      'X-ClawdLink-Signature': relay.base64ToHex(signature)
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取请求失败');
  }
  
  const data = await response.json();
  return data.requests || [];
}

/**
 * 处理所有传入消息和好友请求
 * 
 * 此函数同时检查：
 * 1. 来自中继服务器的好友请求
 * 2. 来自好友的加密消息
 * 3. 好友接受通知
 * 
 * @returns {Promise<Object>} 包含 requests、messages 和 accepted 的结果对象
 */
export async function processIncoming() {
  const identity = loadIdentity();
  const { friends } = loadFriends();
  const pending = loadPending();
  
  const results = { requests: [], messages: [], accepted: [] };
  
  try {
    const requests = await fetchFriendRequests();
    
    for (const req of requests) {
      if (!pending.incoming.find(p => p.id === req.id)) {
        const incomingReq = {
          id: req.id,
          from: req.fromName,
          fromKey: relay.hexToBase64(req.from),
          fromX25519: relay.hexToBase64(req.fromX25519),
          message: req.message,
          receivedAt: new Date().toISOString()
        };
        pending.incoming.push(incomingReq);
        savePending(pending);
        
        results.requests.push(incomingReq);
      }
    }
  } catch (e) {
    console.error('获取请求错误:', e.message);
  }
  
  try {
    const messages = await relay.pollMessages(identity);
    
    for (const msg of messages) {
      const friend = friends.find(f => relay.base64ToHex(f.publicKey) === msg.from);
      
      if (friend) {
        try {
          const content = relay.decryptMessage(msg, friend);
          
          if (content.type === 'friend_accept') {
            results.accepted.push({ from: friend.displayName, content });
          } else {
            results.messages.push({
              from: friend.displayName,
              fromKey: friend.publicKey,
              content,
              timestamp: msg.timestamp
            });
          }
        } catch (e) {
        }
      }
    }
  } catch (e) {
    console.error('获取消息错误:', e.message);
  }
  
  for (const req of pending.incoming) {
    if (!results.requests.find(r => r.id === req.id)) {
      results.requests.push(req);
    }
  }
  
  return results;
}

/**
 * 接受好友请求
 * 
 * 接受流程：
 * 1. 找到对应的待处理请求
 * 2. 使用 X25519 密钥交换派生出与请求方的共享密钥
 * 3. 将请求方添加为好友
 * 4. 发送加密的接受消息给请求方
 * 5. 从待处理列表中移除该请求
 * 
 * @param {string} requestId - 要接受的请求 ID 或发送者名称
 * @returns {Promise<Object>} 接受结果
 */
export async function acceptFriendRequest(requestId) {
  const identity = loadIdentity();
  const config = loadConfig();
  const pending = loadPending();
  const friendsData = loadFriends();
  
  const request = pending.incoming.find(r => 
    r.id === requestId || 
    r.from?.toLowerCase().includes(requestId.toLowerCase())
  );
  
  if (!request) {
    throw new Error('未找到好友请求');
  }
  
  const sharedSecret = crypto.deriveSharedSecret(
    identity.x25519SecretKey,
    request.fromX25519
  );
  
  const newFriend = {
    displayName: request.from,
    publicKey: request.fromKey,
    x25519PublicKey: request.fromX25519,
    sharedSecret: Buffer.from(sharedSecret).toString('base64'),
    addedAt: new Date().toISOString(),
    status: 'connected'
  };
  
  friendsData.friends.push(newFriend);
  saveFriends(friendsData);
  
  const content = {
    type: 'friend_accept',
    from: {
      name: config.displayName,
      publicKey: identity.publicKey,
      x25519PublicKey: identity.x25519PublicKey
    },
    timestamp: new Date().toISOString()
  };
  
  await relay.sendMessage({
    to: request.fromKey,
    content,
    identity,
    friend: newFriend
  });
  
  pending.incoming = pending.incoming.filter(r => r.id !== request.id);
  savePending(pending);
  
  return { accepted: true, friend: request.from };
}

/**
 * 获取待处理的好友请求列表
 * @returns {Object} 包含 incoming 和 outgoing 数组的对象
 */
export function getPendingRequests() {
  return loadPending();
}

export default {
  parseFriendLink,
  sendFriendRequest,
  fetchFriendRequests,
  processIncoming,
  acceptFriendRequest,
  getPendingRequests
};
