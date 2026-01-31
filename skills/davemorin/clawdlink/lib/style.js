/**
 * ClawdLink 消息样式适配模块
 * 
 * 根据用户的通信风格偏好，调整消息的呈现方式：
 * 
 * 支持的通信风格：
 * - natural（自然）：日常对话风格，友好但不正式
 * - casual（休闲）：轻松随意的风格
 * - formal（正式）：正式的书信风格
 * - brief（简洁）：简洁明了，只传达关键信息
 * 
 * 功能说明：
 * - 根据偏好生成不同的问候语
 * - 显示消息上下文（如紧急程度、场景分类）
 * - 长消息自动生成摘要
 * - 格式化时间戳显示
 * - 批量消息分组显示
 */

import preferences from './preferences.js';

/**
 * 根据用户偏好格式化消息用于投递
 * 
 * 格式化流程：
 * 1. 根据风格生成问候语
 * 2. 如果启用上下文显示，添加紧急程度和场景信息
 * 3. 如果是长消息，生成摘要并显示完整内容
 * 4. 应用语气适配
 * 5. 添加时间戳
 * 
 * @param {Object} message - 消息对象
 * @param {Object} prefs - 用户偏好设置
 * @returns {string} 格式化后的消息文本
 */
export function formatForDelivery(message, prefs) {
  const style = prefs.style;
  const friendPrefs = prefs.friends[message.from] || {};
  const tone = friendPrefs.customTone || style.tone;
  
  const parts = [];
  
  const greeting = getGreeting(message.from, style.greetingStyle, tone);
  if (greeting) parts.push(greeting);
  
  if (prefs.delivery.includeContext && message.content?.context) {
    parts.push(formatContext(message.content));
  }
  
  if (prefs.delivery.summarizeFirst && message.content?.text?.length > 200) {
    parts.push(summarize(message.content.text));
    parts.push('');
    parts.push('**完整消息：**');
  }
  
  const text = message.content?.text || JSON.stringify(message.content);
  parts.push(adaptTone(text, tone));
  
  parts.push('');
  parts.push(`_${formatTimestamp(message.timestamp)}_`);
  
  return parts.join('\n');
}

/**
 * 根据风格生成问候语
 * 
 * 问候语由两部分组成：
 * - 问候风格（friendly、minimal、warm）
 * - 语气（natural、casual、formal、brief）
 * 
 * @param {string} fromName - 发送者名称
 * @param {string} greetingStyle - 问候风格
 * @param {string} tone - 通信语气
 * @returns {string} 格式化后的问候语
 */
function getGreeting(fromName, greetingStyle, tone) {
  const greetings = {
    friendly: {
      natural: `📨 **${fromName}** 给您发送了消息：`,
      casual: `📨 来自 **${fromName}** 的消息：`,
      formal: `📨 您收到了来自 **${fromName}** 的消息：`,
      brief: `📨 **${fromName}**：`
    },
    minimal: {
      natural: `**${fromName}：**`,
      casual: `**${fromName}：**`,
      formal: `来自 **${fromName}：**`,
      brief: `**${fromName}：**`
    },
    warm: {
      natural: `📨 **${fromName}** 联系了您：`,
      casual: `📨 嘿，**${fromName}** 说：`,
      formal: `📨 **${fromName}** 发送了以下消息：`,
      brief: `📨 **${fromName}**：`
    }
  };
  
  return greetings[greetingStyle]?.[tone] || greetings.friendly.natural;
}

/**
 * 格式化消息上下文信息
 * 
 * 上下文信息包括：
 * - 紧急程度（urgent 显示红色标记，fyi 显示蓝色标记）
 * - 场景分类（work、personal、social 等）
 * - 响应截止时间
 * 
 * @param {Object} content - 消息内容对象
 * @returns {string} 格式化的上下文字符串
 */
function formatContext(content) {
  const parts = [];
  
  if (content.urgency && content.urgency !== 'normal') {
    const urgencyEmoji = content.urgency === 'urgent' ? '🔴' : '💭';
    parts.push(`${urgencyEmoji} *${content.urgency}*`);
  }
  
  if (content.context) {
    parts.push(`📌 *${content.context}*`);
  }
  
  if (content.respondBy) {
    const date = new Date(content.respondBy);
    parts.push(`⏰ *请于 ${date.toLocaleDateString()} 前回复*`);
  }
  
  return parts.length > 0 ? parts.join(' · ') : '';
}

/**
 * 生成消息摘要
 * 
 * 摘要生成策略：
 * 1. 尝试提取第一句话（以句号、问号或感叹号结尾）
 * 2. 如果第一句话较短，截取前100个字符
 * 3. 如果消息较短，不生成摘要
 * 
 * @param {string} text - 消息原文
 * @returns {string} 生成的摘要
 */
function summarize(text) {
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length < text.length) {
    return `**摘要：** ${firstSentence[0]}`;
  }
  
  if (text.length > 100) {
    return `**摘要：** ${text.slice(0, 100)}...`;
  }
  
  return '';
}

/**
 * 根据语气调整文本呈现
 * 
 * 语气适配策略：
 * - brief（简洁）：保持原样，去除过多客套话
 * - formal（正式）：用引号包裹内容
 * - casual/natural（休闲/自然）：保持原样
 * 
 * 注意：此函数不修改消息内容，只调整呈现方式
 * 
 * @param {string} text - 消息原文
 * @param {string} tone - 目标语气
 * @returns {string} 调整后的文本
 */
function adaptTone(text, tone) {
  switch (tone) {
    case 'brief':
      return text;
    case 'formal':
      return `"${text}"`;
    case 'casual':
    case 'natural':
    default:
      return text;
  }
}

/**
 * 友好地格式化时间戳
 * 
 * 时间显示策略：
 * - 不到1分钟：显示"刚刚"
 * - 不到1小时：显示"X 分钟前"
 * - 不到24小时：显示"X 小时前"
 * - 更早：显示完整日期时间
 * 
 * @param {string} timestamp - ISO 格式的时间戳
 * @returns {string} 友好格式的时间字符串
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  
  return date.toLocaleString('zh-CN', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * 格式化好友请求用于展示
 * 
 * @param {Object} request - 好友请求对象
 * @param {Object} prefs - 用户偏好设置
 * @returns {string} 格式化的好友请求文本
 */
export function formatFriendRequest(request, prefs) {
  const style = prefs.style;
  
  const parts = [
    `🔗 **${request.from} 发来的好友请求**`,
    '',
    `"${request.message}"`,
    '',
    `输入"接受来自 ${request.from} 的好友请求"来连接。`
  ];
  
  return parts.join('\n');
}

/**
 * 格式化接受通知
 * 
 * @param {Object} acceptance - 接受通知对象
 * @param {Object} prefs - 用户偏好设置
 * @returns {string} 格式化的通知文本
 */
export function formatAcceptance(acceptance, prefs) {
  return `✓ **${acceptance.from}** 接受了您的好友请求！现在您可以向他们发送消息了。`;
}

/**
 * 格式化批量消息
 * 
 * 批量消息处理：
 * - 如果只有一条消息，按普通消息处理
 * - 如果多条消息，先显示总数，再逐条显示
 * 
 * @param {Array} messages - 消息数组
 * @param {Object} prefs - 用户偏好设置
 * @returns {string} 格式化的批量消息文本
 */
export function formatBatch(messages, prefs) {
  if (messages.length === 0) return '';
  
  if (messages.length === 1) {
    return formatForDelivery(messages[0], prefs);
  }
  
  const parts = [
    `📬 **${messages.length} 条新消息：**`,
    ''
  ];
  
  for (const msg of messages) {
    parts.push('---');
    parts.push(formatForDelivery(msg, prefs));
    parts.push('');
  }
  
  return parts.join('\n');
}

export default {
  formatForDelivery,
  formatFriendRequest,
  formatAcceptance,
  formatBatch
};
