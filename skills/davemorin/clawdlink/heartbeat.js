#!/usr/bin/env node
/**
 * ClawdLink 心跳处理器
 * 
 * 此脚本由 Clawdbot 心跳机制定期调用，负责：
 * 1. 检查是否已完成设置
 * 2. 加载用户的投递偏好设置
 * 3. 检查新消息和好友请求
 * 4. 根据偏好设置决定是否立即投递
 * 5. 处理需要保留稍后投递的消息
 * 6. 在批量投递时间点投递保留的消息
 * 7. 输出格式化的消息内容
 * 
 * 消息投递规则：
 * - 好友请求：立即投递
 * - 好友接受通知：立即投递
 * - 普通消息：根据静音时段和批量投递设置决定
 * - 紧急消息：即使在静音时段也会立即投递
 * 
 * 使用方法：node heartbeat.js
 * 输出：如果有待投递消息，输出 Markdown 格式文本；否则输出空
 */

import clawdbot from './lib/clawdbot.js';
import preferences from './lib/preferences.js';
import style from './lib/style.js';

/**
 * 主函数
 * 
 * 处理流程：
 * 1. 检查系统是否已设置，未设置则静默退出
 * 2. 加载用户的投递偏好
 * 3. 检查新消息和好友请求
 * 4. 处理好友请求（立即投递）
 * 5. 处理好友接受通知（立即投递）
 * 6. 处理普通消息（根据偏好决定是否立即投递）
 * 7. 检查是否到了批量投递时间
 * 8. 输出待投递的消息
 */
async function main() {
  try {
    const status = await clawdbot.getStatus();
    if (!status.setup) {
      return;
    }
    
    const prefs = preferences.loadPreferences();
    
    const result = await clawdbot.checkMessages();
    
    if (result.error) {
      console.error(`ClawdLink 错误：${result.error}`);
      return;
    }
    
    const toDeliver = [];
    const toHold = [];
    
    if (result.requests?.length > 0) {
      for (const req of result.requests) {
        toDeliver.push({
          type: 'request',
          data: req,
          formatted: style.formatFriendRequest(req, prefs)
        });
      }
    }
    
    if (result.accepted?.length > 0) {
      for (const acc of result.accepted) {
        toDeliver.push({
          type: 'accepted',
          data: acc,
          formatted: style.formatAcceptance(acc, prefs)
        });
      }
    }
    
    if (result.messages?.length > 0) {
      for (const msg of result.messages) {
        const decision = preferences.shouldDeliverNow(msg, prefs);
        
        if (decision.deliver) {
          toDeliver.push({
            type: 'message',
            data: msg,
            formatted: style.formatForDelivery(msg, prefs)
          });
        } else {
          preferences.holdMessage(msg, decision.reason);
          toHold.push(msg);
        }
      }
    }
    
    if (preferences.isBatchDeliveryTime(prefs)) {
      const held = preferences.loadHeldMessages();
      if (held.length > 0) {
        toDeliver.push({
          type: 'batch',
          data: held,
          formatted: style.formatBatch(held, prefs)
        });
        preferences.saveHeldMessages([]);
      }
    }
    
    if (toDeliver.length > 0) {
      const outputs = toDeliver.map(item => item.formatted);
      console.log(outputs.join('\n\n---\n\n'));
    }
    
    if (toHold.length > 0) {
      console.error(`ClawdLink：保留 ${toHold.length} 条消息稍后投递`);
    }
    
  } catch (err) {
    console.error(`ClawdLink 心跳错误：${err.message}`);
  }
}

main();
