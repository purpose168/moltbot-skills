/**
 * ClawdLink Clawdbot 集成模块
 * 
 * 此模块提供 ClawdLink 与 Clawdbot 的集成功能，包括：
 * - 轮询消息并格式化以便在聊天中传递
 * - 处理好友请求
 * - 通过自然语言发送消息
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import relay from './relay.js';
import requests from './requests.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

/**
 * 检查 ClawdLink 是否已设置
 * @returns {boolean} 是否已设置身份信息
 */
function isSetup() {
  return existsSync(IDENTITY_FILE);
}

/**
 * 加载本地保存的身份信息
 * @returns {Object} 身份信息对象，包含公钥和私钥
 */
function loadIdentity() {
  return JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
}

/**
 * 加载好友列表
 * @returns {Object} 好友列表对象，包含 friends 数组
 */
function loadFriends() {
  if (!existsSync(FRIENDS_FILE)) return { friends: [] };
  return JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'));
}

/**
 * 加载用户配置
 * @returns {Object} 配置对象，包含显示名称等设置
 */
function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return { displayName: 'ClawdLink 用户' };
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * 检查新消息和好友请求
 * 返回格式化后的输出，供 Clawdbot 传递给用户
 * @returns {Promise<Object>} 包含消息、请求和已接受请求的结果对象
 */
export async function checkMessages() {
  if (!isSetup()) {
    return { 
      setup: false, 
      message: 'ClawdLink 尚未设置。请运行: clawdlink setup "您的名称"' 
    };
  }

  try {
    const result = await requests.processIncoming();
    const output = { setup: true, messages: [], requests: [], accepted: [] };

    for (const req of result.requests) {
      output.requests.push({
        id: req.id,
        from: req.from,
        message: req.message,
        formatted: `🔗 **${req.from} 发来的好友请求**\n"${req.message}"\n\n输入"接受来自 ${req.from} 的好友请求"来连接。`
      });
    }

    for (const acc of result.accepted) {
      output.accepted.push({
        from: acc.from,
        formatted: `✓ **${acc.from}** 接受了您的好友请求！现在您可以向他们发送消息了。`
      });
    }

    for (const msg of result.messages) {
      const text = msg.content.text || JSON.stringify(msg.content);
      output.messages.push({
        from: msg.from,
        text,
        timestamp: msg.timestamp,
        formatted: `📨 **来自 ${msg.from} 的消息：**\n"${text}"`
      });
    }

    return output;
  } catch (err) {
    return { setup: true, error: err.message };
  }
}

/**
 * 向好友发送消息
 * 
 * @param {string} friendName - 好友的名称
 * @param {string} messageText - 消息文本内容
 * @param {Object} options - 可选的元数据
 * @param {string} options.urgency - 紧急程度：'normal' | 'urgent' | 'fyi'
 * @param {string} options.context - 上下文：'work' | 'personal' | 'social'
 * @param {string} options.respondBy - 响应截止时间的 ISO 时间戳
 * @returns {Promise<Object>} 发送结果对象
 */
export async function sendToFriend(friendName, messageText, options = {}) {
  if (!isSetup()) {
    return { success: false, error: 'ClawdLink 尚未设置' };
  }

  const identity = loadIdentity();
  const config = loadConfig();
  const { friends } = loadFriends();

  const query = friendName.toLowerCase();
  const friend = friends.find(f => 
    f.displayName?.toLowerCase().includes(query)
  );

  if (!friend) {
    const available = friends.map(f => f.displayName).join(', ');
    return { 
      success: false, 
      error: `未找到好友 "${friendName}"。`,
      available: available || '暂无好友'
    };
  }

  if (friend.status !== 'connected') {
    return { success: false, error: `${friend.displayName} 尚未接受您的好友请求。` };
  }

  const content = {
    type: 'message',
    text: messageText,
    timestamp: new Date().toISOString(),
    from: {
      name: config.displayName,
      key: identity.publicKey
    },
    deliveryMetadata: {
      urgency: options.urgency || 'normal',
      context: options.context || 'personal',
      respondBy: options.respondBy || null
    }
  };

  try {
    const result = await relay.sendMessage({
      to: friend.publicKey,
      content,
      identity,
      friend
    });

    return {
      success: true,
      to: friend.displayName,
      messageId: result.id,
      formatted: `✓ 消息已发送给 ${friend.displayName}`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 通过链接添加好友
 * @param {string} friendLink - 好友链接字符串
 * @param {string} message - 可选的附加消息
 * @returns {Promise<Object>} 发送好友请求的结果
 */
export async function addFriend(friendLink, message = '') {
  if (!isSetup()) {
    return { success: false, error: 'ClawdLink 尚未设置' };
  }

  try {
    const result = await requests.sendFriendRequest(friendLink, message);
    return {
      success: true,
      to: result.to,
      formatted: `✓ 好友请求已发送给 ${result.to}。他们查看 ClawdLink 时会收到请求。`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 接受好友请求
 * @param {string} nameOrId - 好友的名称或请求 ID
 * @returns {Promise<Object>} 接受请求的结果
 */
export async function acceptFriend(nameOrId) {
  if (!isSetup()) {
    return { success: false, error: 'ClawdLink 尚未设置' };
  }

  const pending = requests.getPendingRequests();
  
  const query = nameOrId.toLowerCase();
  const request = pending.incoming.find(r => 
    r.from?.toLowerCase().includes(query) || 
    r.id?.toLowerCase().includes(query)
  );

  if (!request) {
    return { 
      success: false, 
      error: `未找到来自 "${nameOrId}" 的待处理请求`,
      pending: pending.incoming.map(r => r.from)
    };
  }

  try {
    const result = await requests.acceptFriendRequest(request.id);
    return {
      success: true,
      friend: result.friend,
      formatted: `✓ 您现在已与 ${result.friend} 建立连接！可以随时向他们发送消息。`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 获取当前用户的好友链接
 * @returns {Object} 包含好友链接和显示名称的结果对象
 */
export function getFriendLink() {
  if (!isSetup()) {
    return { success: false, error: 'ClawdLink 尚未设置' };
  }

  const identity = loadIdentity();
  const config = loadConfig();

  const params = new URLSearchParams({
    key: `ed25519:${identity.publicKey}`,
    name: config.displayName
  });

  return {
    success: true,
    link: `clawdlink://relay.clawdlink.bot/add?${params.toString()}`,
    name: config.displayName
  };
}

/**
 * 列出所有好友
 * @returns {Object} 包含好友列表的结果对象
 */
export function listFriends() {
  if (!isSetup()) {
    return { success: false, error: 'ClawdLink 尚未设置' };
  }

  const { friends } = loadFriends();
  return {
    success: true,
    friends: friends.map(f => ({
      name: f.displayName,
      status: f.status,
      addedAt: f.addedAt
    })),
    count: friends.length
  };
}

/**
 * 获取 ClawdLink 当前状态
 * @returns {Promise<Object>} 包含设置状态、好友数量、中继服务器状态等信息的对象
 */
export async function getStatus() {
  const setup = isSetup();
  
  if (!setup) {
    return { setup: false };
  }

  const config = loadConfig();
  const { friends } = loadFriends();
  const pending = requests.getPendingRequests();

  let relayStatus = 'unknown';
  try {
    const health = await relay.checkHealth();
    relayStatus = health.status === 'ok' ? 'online' : 'error';
  } catch {
    relayStatus = 'offline';
  }

  return {
    setup: true,
    name: config.displayName,
    friends: friends.length,
    pendingIncoming: pending.incoming.length,
    pendingOutgoing: pending.outgoing.length,
    relay: relayStatus
  };
}

export default {
  checkMessages,
  sendToFriend,
  addFriend,
  acceptFriend,
  getFriendLink,
  listFriends,
  getStatus
};
