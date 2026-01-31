/**
 * ClawdLink 消息投递偏好设置模块
 * 
 * 此模块控制消息的投递方式和时间：
 * - 静音时段设置：避免在休息时间被打扰
 * - 批量投递：将非紧急消息汇总后在指定时间投递
 * - 紧急消息处理：紧急消息即使在静音时段也会立即投递
 * - 通信风格：支持自然、正式、休闲、简洁等风格
 * - 好友特定设置：为不同好友设置不同的优先级和投递规则
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const PREFS_FILE = join(DATA_DIR, 'preferences.json');
const HELD_FILE = join(DATA_DIR, 'held_messages.json');

const DEFAULT_PREFERENCES = {
  // 定时设置
  schedule: {
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00"
    },
    batchDelivery: {
      enabled: false,
      times: ["09:00", "18:00"]
    },
    timezone: "America/Los_Angeles"
  },
  
  // 投递规则
  delivery: {
    allowUrgentDuringQuiet: true,
    summarizeFirst: true,
    includeContext: true,
    maxPerDelivery: 10
  },
  
  // 通信风格
  style: {
    tone: "natural",
    voice: null,
    rewriteMessages: false,
    greetingStyle: "friendly"
  },
  
  // 好友特定覆盖设置
  friends: {
  },
  
  // 上下文偏好
  context: {
    workHours: { start: "09:00", end: "18:00" },
    preferredContexts: ["personal", "work", "social"],
    muteContexts: []
  }
};

/**
 * 加载用户偏好设置
 * 如果偏好文件不存在，返回默认设置
 * 使用深度合并确保所有字段都存在
 * 
 * @returns {Object} 完整的偏好设置对象
 */
export function loadPreferences() {
  if (!existsSync(PREFS_FILE)) {
    return { ...DEFAULT_PREFERENCES };
  }
  
  const saved = JSON.parse(readFileSync(PREFS_FILE, 'utf8'));
  return deepMerge(DEFAULT_PREFERENCES, saved);
}

/**
 * 保存用户偏好设置到文件
 * 
 * @param {Object} prefs - 偏好设置对象
 */
export function savePreferences(prefs) {
  writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
}

/**
 * 更新特定偏好设置
 * 支持点号分隔的路径格式，如 'schedule.quietHours.enabled'
 * 
 * @param {string} path - 偏好设置路径（使用点号分隔）
 * @param {*} value - 要设置的值
 * @returns {Object} 更新后的完整偏好设置
 */
export function updatePreference(path, value) {
  const prefs = loadPreferences();
  setNestedValue(prefs, path, value);
  savePreferences(prefs);
  return prefs;
}

/**
 * 加载待投递消息列表
 * 这些消息因各种原因被暂时保留，等待合适时机投递
 * 
 * @returns {Array} 待投递消息数组
 */
export function loadHeldMessages() {
  if (!existsSync(HELD_FILE)) {
    return [];
  }
  return JSON.parse(readFileSync(HELD_FILE, 'utf8'));
}

/**
 * 保存待投递消息列表到文件
 * 
 * @param {Array} messages - 待投递消息数组
 */
export function saveHeldMessages(messages) {
  writeFileSync(HELD_FILE, JSON.stringify(messages, null, 2));
}

/**
 * 保留消息等待稍后投递
 * 
 * @param {Object} message - 要保留的消息对象
 * @param {string} reason - 保留原因说明
 */
export function holdMessage(message, reason) {
  const held = loadHeldMessages();
  held.push({
    ...message,
    heldAt: new Date().toISOString(),
    heldReason: reason
  });
  saveHeldMessages(held);
}

/**
 * 检查当前时间是否在静音时段内
 * 
 * 静音时段处理逻辑：
 * - 如果静音时段跨越午夜（如 22:00 - 08:00），需要特殊处理
 * - 返回 true 表示当前在静音时段内
 * 
 * @param {Object} prefs - 偏好设置对象
 * @returns {boolean} 是否在静音时段
 */
export function isQuietHours(prefs) {
  if (!prefs.schedule.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: prefs.schedule.timezone 
  });
  
  const start = prefs.schedule.quietHours.start;
  const end = prefs.schedule.quietHours.end;
  
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  return currentTime >= start && currentTime < end;
}

/**
 * 检查当前时间是否是批量投递时间
 * 
 * 批量投递时间检查：
 * - 在批量投递时间点的前后5分钟内返回 true
 * - 这样可以捕捉到用户设定时间附近的任何检查
 * 
 * @param {Object} prefs - 偏好设置对象
 * @returns {boolean} 是否是批量投递时间
 */
export function isBatchDeliveryTime(prefs) {
  if (!prefs.schedule.batchDelivery.enabled) return false;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: prefs.schedule.timezone 
  });
  
  for (const batchTime of prefs.schedule.batchDelivery.times) {
    const [batchHour, batchMin] = batchTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    const batchMinutes = batchHour * 60 + batchMin;
    const currentMinutes = currentHour * 60 + currentMin;
    
    if (Math.abs(currentMinutes - batchMinutes) <= 5) {
      return true;
    }
  }
  return false;
}

/**
 * 判断消息是否应该立即投递
 * 
 * 投递决策逻辑：
 * 1. 检查好友特定设置：是否标记为"始终投递"
 * 2. 检查静音时段：紧急消息是否允许在静音时段投递
 * 3. 检查批量投递设置：高优先级好友是否立即投递
 * 4. 检查批量投递时间：是否到了批量投递时间点
 * 5. 检查上下文设置：某些上下文是否需要批量处理
 * 
 * @param {Object} message - 消息对象
 * @param {Object} prefs - 偏好设置对象
 * @returns {Object} 包含 deliver（是否投递）和原因的结果
 */
export function shouldDeliverNow(message, prefs) {
  const friendName = message.from;
  const friendPrefs = prefs.friends[friendName] || {};
  const urgency = message.content?.urgency || 'normal';
  const context = message.content?.context || 'personal';
  
  if (friendPrefs.alwaysDeliver) {
    return { deliver: true, reason: '好友标记为始终投递' };
  }
  
  if (isQuietHours(prefs)) {
    if (urgency === 'urgent' && prefs.delivery.allowUrgentDuringQuiet) {
      return { deliver: true, reason: '静音时段的紧急消息' };
    }
    return { deliver: false, reason: '静音时段', holdUntil: 'quiet_end' };
  }
  
  if (prefs.schedule.batchDelivery.enabled) {
    if (friendPrefs.priority === 'high') {
      return { deliver: true, reason: '高优先级好友' };
    }
    
    if (isBatchDeliveryTime(prefs)) {
      return { deliver: true, reason: '批量投递时间' };
    }
    
    if (prefs.context.muteContexts.includes(context)) {
      return { deliver: false, reason: '该上下文设置为批量处理', holdUntil: 'batch_time' };
    }
    
    if (urgency !== 'urgent') {
      return { deliver: false, reason: '已启用批量投递', holdUntil: 'batch_time' };
    }
  }
  
  return { deliver: true, reason: '默认投递' };
}

/**
 * 获取特定好友的偏好设置
 * 
 * @param {string} friendName - 好友名称
 * @returns {Object} 该好友的特定偏好设置
 */
export function getFriendPrefs(friendName) {
  const prefs = loadPreferences();
  return prefs.friends[friendName] || {};
}

/**
 * 设置特定好友的偏好设置
 * 
 * @param {string} friendName - 好友名称
 * @param {Object} friendPrefs - 要设置的偏好对象
 */
export function setFriendPrefs(friendName, friendPrefs) {
  const prefs = loadPreferences();
  prefs.friends[friendName] = { ...prefs.friends[friendName], ...friendPrefs };
  savePreferences(prefs);
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

export default {
  loadPreferences,
  savePreferences,
  updatePreference,
  loadHeldMessages,
  saveHeldMessages,
  holdMessage,
  isQuietHours,
  isBatchDeliveryTime,
  shouldDeliverNow,
  getFriendPrefs,
  setFriendPrefs,
  DEFAULT_PREFERENCES
};
