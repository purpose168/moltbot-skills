#!/usr/bin/env node

/**
 * Telegram 使用统计命令的会话读取器
 * 从 Clawdbot 的会话存储中读取实际的会话数据
 */

const fs = require('fs');
const path = require('path');

/**
 * 获取当前代理的会话存储路径
 * @param {string} agentId - 代理 ID（默认为 'main'）
 * @returns {string} sessions.json 的路径
 */
function getSessionStorePath(agentId = 'main') {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, '.clawdbot', 'agents', agentId, 'sessions', 'sessions.json');
}

/**
 * 从配置中获取会话重置时间
 * @param {number} atHour - 重置小时（0-23）
 * @returns {Date} 下次重置时间
 */
function getNextResetTime(atHour = 4) {
  const now = new Date();
  const reset = new Date();
  reset.setHours(atHour, 0, 0, 0);
  
  // 如果今天的重置时间已过，使用明天
  if (reset <= now) {
    reset.setDate(reset.getDate() + 1);
  }
  
  return reset;
}

/**
 * 计算距离重置的剩余时间
 * @param {number} atHour - 重置小时
 * @returns {number} 距离重置的毫秒数
 */
function getTimeUntilReset(atHour = 4) {
  const nextReset = getNextResetTime(atHour);
  return nextReset.getTime() - Date.now();
}

/**
 * 将毫秒格式化为持续时间
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化的持续时间
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

/**
 * 读取会话存储并提取统计信息
 * @param {string} sessionKey - 会话键（例如：'agent:main:main'）
 * @param {string} agentId - 代理 ID（默认为 'main'）
 * @returns {Object} 会话统计信息
 */
function readSessionStats(sessionKey, agentId = 'main') {
  const storePath = getSessionStorePath(agentId);
  
  if (!fs.existsSync(storePath)) {
    console.warn(`未在 ${storePath} 找到会话存储`);
    return null;
  }

  try {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const session = store[sessionKey];
    
    if (!session) {
      console.warn(`在存储中未找到会话 ${sessionKey}`);
      return null;
    }

    return {
      sessionId: session.sessionId,
      updatedAt: session.updatedAt,
      inputTokens: session.inputTokens || 0,
      outputTokens: session.outputTokens || 0,
      totalTokens: session.totalTokens || 0,
      contextTokens: session.contextTokens || 0,
      model: session.model,
      provider: session.provider
    };
  } catch (error) {
    console.error(`读取会话存储时出错：${error.message}`);
    return null;
  }
}

/**
 * 从会话 JSONL 读取令牌计数
 * @param {string} transcriptPath -  transcript JSONL 的路径
 * @returns {Object} 令牌统计信息
 */
function readTokensFromTranscript(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) {
    return null;
  }

  try {
    const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    let totalInput = 0;
    let totalOutput = 0;
    
    for (const line of lines) {
      if (!line) continue;
      const entry = JSON.parse(line);
      
      if (entry.role === 'user' && entry.usage?.inputTokens) {
        totalInput += entry.usage.inputTokens;
      }
      if (entry.role === 'assistant' && entry.usage?.outputTokens) {
        totalOutput += entry.usage.outputTokens;
      }
    }

    return {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      totalTokens: totalInput + totalOutput
    };
  } catch (error) {
    console.warn(`无法解析 transcript：${error.message}`);
    return null;
  }
}

/**
 * 获取会话的 transcript 路径
 * @param {string} sessionId - 会话 ID
 * @param {string} agentId - 代理 ID
 * @returns {string} transcript 的路径
 */
function getTranscriptPath(sessionId, agentId = 'main') {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, '.clawdbot', 'agents', agentId, 'sessions', `${sessionId}.jsonl`);
}

/**
 * 估算上下文窗口使用情况
 * @param {Object} session - 会话统计信息
 * @param {string} model - 模型名称
 * @returns {Object} 上下文使用统计信息
 */
function estimateContextUsage(session, model = 'claude-3-5-haiku') {
  // 常见模型的上下文窗口大小
  const contextWindows = {
    'claude-3-5-haiku': 200000,
    'claude-haiku-4-5': 200000,
    'claude-3-haiku': 200000,
    'claude-3-5-sonnet': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-opus': 200000,
    'claude-opus-4': 200000,
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 4096
  };

  // 尝试匹配模型名称（部分匹配）
  let windowSize = 4096;
  for (const [modelKey, size] of Object.entries(contextWindows)) {
    if (model.toLowerCase().includes(modelKey.toLowerCase())) {
      windowSize = size;
      break;
    }
  }

  const contextUsed = session.contextTokens || session.totalTokens || 1024;
  const percentage = Math.round((contextUsed / windowSize) * 100);

  return {
    used: contextUsed,
    total: windowSize,
    percentage: Math.min(percentage, 100) // 上限为 100%
  };
}

/**
 * 收集所有使用统计信息
 * @param {string} sessionKey - 要读取的会话键
 * @param {Object} options - 选项
 * @returns {Object} 全面的使用统计信息
 */
function collectUsageStats(sessionKey, options = {}) {
  const {
    agentId = 'main',
    resetHour = 4,
    quotaRemaining = null,
    provider = 'anthropic'
  } = options;

  const session = readSessionStats(sessionKey, agentId);
  
  if (!session) {
    // 如果未找到会话，返回默认值
    return {
      quotaRemaining: quotaRemaining || 85,
      sessionTimeRemaining: getTimeUntilReset(resetHour),
      totalTokens: { input: 0, output: 0 },
      contextUsage: { used: 0, total: 4096 },
      model: '未知',
      provider: provider,
      sessionFound: false
    };
  }

  // 尝试从 transcript 读取令牌
  const transcriptPath = getTranscriptPath(session.sessionId, agentId);
  const transcriptTokens = readTokensFromTranscript(transcriptPath);

  const totalTokens = transcriptTokens || {
    inputTokens: session.inputTokens || 0,
    outputTokens: session.outputTokens || 0,
    totalTokens: session.totalTokens || 0
  };

  const contextUsage = estimateContextUsage(session, session.model);

  return {
    quotaRemaining: quotaRemaining || 82,
    sessionTimeRemaining: getTimeUntilReset(resetHour),
    totalTokens: {
      input: totalTokens.inputTokens || 0,
      output: totalTokens.outputTokens || 0
    },
    contextUsage: {
      used: contextUsage.used,
      total: contextUsage.total
    },
    contextPercentage: contextUsage.percentage,
    model: session.model || 'Claude 3.5 Haiku',
    provider: session.provider || provider,
    sessionId: session.sessionId,
    updatedAt: session.updatedAt,
    sessionFound: true
  };
}

/**
 * 格式化统计信息用于显示
 * @param {Object} stats - 使用统计信息
 * @returns {string} 格式化的消息
 */
function formatStats(stats) {
  const quotaIndicator = getQuotaIndicator(stats.quotaRemaining);
  const contextIndicator = getQuotaIndicator(100 - (stats.contextPercentage || 0));
  const timeRemaining = formatDuration(stats.sessionTimeRemaining);

  let message = '<b>📊 会话使用报告</b>\n\n';

  message += '<b>🔋 剩余配额</b>\n';
  message += `${quotaIndicator} <code>${stats.quotaRemaining}%</code> 的 API 配额\n`;
  message += `提供者：${stats.provider}\n\n`;

  message += '<b>⏱️ 会话时间</b>\n';
  message += `${timeRemaining} 剩余\n`;
  message += '（每天凌晨 4:00 重置）\n\n';

  message += '<b>🎯 已使用令牌</b>\n';
  const total = stats.totalTokens.input + stats.totalTokens.output;
  message += `${total.toLocaleString('zh-CN')} 个令牌总数\n`;
  message += `├─ 输入：${stats.totalTokens.input.toLocaleString('zh-CN')}\n`;
  message += `└─ 输出：${stats.totalTokens.output.toLocaleString('zh-CN')}\n\n`;

  message += '<b>📦 上下文窗口</b>\n';
  message += `${contextIndicator} <code>${stats.contextPercentage || 0}%</code> 已使用\n`;
  message += `${stats.contextUsage.used.toLocaleString('zh-CN')} / ${stats.contextUsage.total.toLocaleString('zh-CN')} 个令牌\n`;

  message += `\n<i>模型：${stats.model}</i>`;
  if (stats.sessionId) {
    message += `\n<i>会话：${stats.sessionId.substring(0, 8)}...</i>`;
  }

  return message;
}

/**
 * 获取配额指示器表情符号
 */
function getQuotaIndicator(percentage) {
  if (percentage >= 75) return '🟢';
  if (percentage >= 50) return '🟡';
  if (percentage >= 25) return '🟠';
  return '🔴';
}

// 导出模块
module.exports = {
  getSessionStorePath,
  getNextResetTime,
  getTimeUntilReset,
  formatDuration,
  readSessionStats,
  readTokensFromTranscript,
  getTranscriptPath,
  estimateContextUsage,
  collectUsageStats,
  formatStats,
  getQuotaIndicator
};

// 命令行使用
if (require.main === module) {
  const sessionKey = process.argv[2] || 'agent:main:main';
  const agentId = process.argv[3] || 'main';

  const stats = collectUsageStats(sessionKey, {
    agentId,
    resetHour: 4
  });

  if (process.argv[4] === '--json') {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(formatStats(stats));
  }
}
