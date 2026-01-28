#!/usr/bin/env node

/**
 * Telegram /usage 命令处理器
 * 在整洁的格式化消息中显示会话使用统计信息
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 将毫秒级的时间持续格式化为人类可读的字符串
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
 * 格式化数字，添加千位分隔符
 */
function formatNumber(n) {
  return n.toLocaleString('zh-CN');
}

/**
 * 根据百分比计算进度条并返回表情符号指示器
 */
function getQuotaIndicator(percentage) {
  if (percentage >= 75) return '🟢'; // 良好
  if (percentage >= 50) return '🟡'; // 警告
  if (percentage >= 25) return '🟠'; // 较低
  return '🔴'; // 紧急
}

/**
 * 从 clawdbot 模型状态获取真实的配额数据
 */
function getRealQuotaData() {
  try {
    const output = execSync('clawdbot models status', { encoding: 'utf-8' });

    // 解析类似 "- anthropic usage: 5h 58% left ⏱1h 1m" 的行
    const usageMatch = output.match(/usage:\s+\d+h\s+(\d+)%\s+left\s+⏱(.+)/);

    if (usageMatch) {
      const percentage = parseInt(usageMatch[1], 10);
      const timeRemaining = usageMatch[2].trim();

      // 将时间字符串转换为毫秒以保持一致性
      const timeMs = parseTimeToMs(timeRemaining);

      return {
        quotaRemaining: percentage,
        sessionTimeRemaining: timeMs,
        timeRemainingFormatted: timeRemaining
      };
    }
  } catch (error) {
    console.error('获取配额数据失败：', error.message);
  }

  // 返回默认值
  return {
    quotaRemaining: 0,
    sessionTimeRemaining: 0,
    timeRemainingFormatted: '0分钟'
  };
}

/**
 * 解析如 "1小时 1分钟" 格式的时间字符串并转换为毫秒
 */
function parseTimeToMs(timeStr) {
  let totalMs = 0;

  const hourMatch = timeStr.match(/(\d+)小时/);
  if (hourMatch) {
    totalMs += parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }

  const minMatch = timeStr.match(/(\d+)分钟/);
  if (minMatch) {
    totalMs += parseInt(minMatch[1], 10) * 60 * 1000;
  }

  return totalMs;
}

/**
 * 获取配额跟踪文件的路径
 */
function getQuotaTrackerPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, '.clawdbot', 'quota-tracker.json');
}

/**
 * 从跟踪器读取配额开始时间
 */
function getQuotaStartTime() {
  const trackerPath = getQuotaTrackerPath();

  if (!fs.existsSync(trackerPath)) {
    // 使用当前时间创建新的跟踪器
    const quotaData = {
      startTime: Date.now(),
      resetHours: 4
    };
    try {
      fs.writeFileSync(trackerPath, JSON.stringify(quotaData, null, 2));
    } catch (error) {
      console.error('创建配额跟踪器失败：', error.message);
    }
    return quotaData;
  }

  try {
    const data = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
    return data;
  } catch (error) {
    console.error('读取配额跟踪器失败：', error.message);
    return { startTime: Date.now(), resetHours: 4 };
  }
}

/**
 * 计算距离配额重置的剩余时间（从开始起 4 小时）
 */
function getTimeUntilReset() {
  const quotaData = getQuotaStartTime();
  const resetHours = quotaData.resetHours || 4;
  const resetTime = quotaData.startTime + (resetHours * 60 * 60 * 1000);
  const timeRemaining = resetTime - Date.now();

  // 如果配额周期已过，重置它
  if (timeRemaining <= 0) {
    const trackerPath = getQuotaTrackerPath();
    const newQuotaData = {
      startTime: Date.now(),
      resetHours: resetHours
    };
    try {
      fs.writeFileSync(trackerPath, JSON.stringify(newQuotaData, null, 2));
    } catch (error) {
      console.error('重置配额跟踪器失败：', error.message);
    }
    return resetHours * 60 * 60 * 1000; // 返回整个周期
  }

  return timeRemaining;
}

/**
 * 生成使用报告消息
 * @param {Object} stats - 会话统计信息
 * @returns {string} 格式化的 Telegram 消息
 */
function generateUsageReport(stats) {
  const {
    quotaRemaining = 85,
    sessionTimeRemaining = 14400000, // 4 小时的毫秒数
    provider = 'anthropic'
  } = stats;

  const quotaIndicator = getQuotaIndicator(quotaRemaining);
  const timeRemaining = formatDuration(sessionTimeRemaining);

  let message = `📊 API 使用统计\n\n`;
  message += `🔋 配额：${quotaIndicator} ${quotaRemaining}%\n`;
  message += `⏱️ 重置倒计时：${timeRemaining}`;

  return message;
}

/**
 * 解析状态/上下文数据（如果提供）
 */
function parseContextData(contextInfo) {
  if (!contextInfo) return null;
  
  // 从上下文信息中提取令牌计数
  const tokenMatch = contextInfo.match(/(\d+)\s*\/\s*(\d+)/);
  if (tokenMatch) {
    return {
      used: parseInt(tokenMatch[1]),
      total: parseInt(tokenMatch[2])
    };
  }
  return null;
}

/**
 * 主处理器
 */
async function main() {
  // 解析命令行参数（如果有）
  const args = process.argv.slice(2);
  const command = args[0] || 'report';

  // 从 clawdbot 获取真实的配额数据
  const quotaData = getRealQuotaData();

  // 默认会话统计信息
  // 在实际实现中，这些应该来自网关 API 或会话状态
  const stats = {
    quotaRemaining: quotaData.quotaRemaining,
    sessionTimeRemaining: quotaData.sessionTimeRemaining,
    totalTokens: {
      input: 2847,
      output: 1523
    },
    contextUsage: {
      used: 1856,
      total: 4096
    },
    model: 'Claude 3.5 Haiku',
    provider: 'anthropic'
  };

  if (command === 'report') {
    const report = generateUsageReport(stats);
    console.log(report);
    process.exit(0);
  }

  if (command === 'json') {
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  // 未知命令
  console.error(`未知命令：${command}`);
  process.exit(1);
}

// 导出供作为模块使用
module.exports = {
  generateUsageReport,
  formatDuration,
  formatNumber,
  getQuotaIndicator,
  parseContextData,
  getQuotaStartTime,
  getTimeUntilReset
};

// 如果直接调用则运行
if (require.main === module) {
  main().catch(err => {
    console.error('错误：', err.message);
    process.exit(1);
  });
}
