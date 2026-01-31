#!/usr/bin/env node
/**
 * ClawdLink 消息处理器
 * 
 * 提供 Clawdbot 集成的 JSON API 接口：
 * - check：检查新消息和好友请求
 * - send：向好友发送消息
 * - add：添加好友
 * - accept：接受好友请求
 * - link：获取好友链接
 * - friends：列出好友
 * - status：获取状态
 * - preferences：管理偏好设置
 * - quiet-hours：静音时段设置
 * - batch：批量投递设置
 * - tone：通信语气设置
 * 
 * 使用方法：node handler.js <操作> [参数...]
 * 输出格式：JSON 格式的运行结果
 */

import clawdbot from './lib/clawdbot.js';
import prefs from './lib/preferences.js';

const args = process.argv.slice(2);
const action = args[0];

/**
 * 解析命令行参数中的标志位
 * 
 * 支持的参数格式：
 * --key=value    设置键值对
 * --key value    设置布尔值或字符串值
 * --key          设置为 true
 * 
 * @param {Array} args - 命令行参数数组
 * @returns {Object} 解析后的标志位对象
 */
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        flags[k] = v;
      } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

/**
 * 主函数
 * 
 * 根据操作类型执行相应的功能：
 * 1. check：检查新消息和好友请求
 * 2. send：发送消息，支持 --urgent 和 --context 标志
 * 3. add：添加好友
 * 4. accept：接受好友请求
 * 5. link：获取好友链接
 * 6. friends：列出好友列表
 * 7. status：获取系统状态
 * 8. preferences：查看或设置偏好
 * 9. quiet-hours：管理静音时段
 * 10. batch：管理批量投递
 * 11. tone：设置通信语气
 */
async function main() {
  let result;
  const flags = parseFlags(args);

  switch (action) {
    case 'check':
      result = await clawdbot.checkMessages();
      break;

    case 'send':
      if (args.length < 3) {
        result = { success: false, error: '用法：send <好友> <消息> [--urgent] [--context=work|personal|social]' };
      } else {
        const options = {
          urgency: flags.urgent ? 'urgent' : (flags.fyi ? 'fyi' : 'normal'),
          context: flags.context || 'personal',
          respondBy: flags.respondBy || null
        };
        result = await clawdbot.sendToFriend(args[1], args[2], options);
      }
      break;

    case 'add':
      if (!args[1]) {
        result = { success: false, error: '用法：add <好友链接> [消息]' };
      } else {
        result = await clawdbot.addFriend(args[1], args[2] || '');
      }
      break;

    case 'accept':
      if (!args[1]) {
        result = { success: false, error: '用法：accept <好友名称>' };
      } else {
        result = await clawdbot.acceptFriend(args[1]);
      }
      break;

    case 'link':
      result = clawdbot.getFriendLink();
      break;

    case 'friends':
      result = clawdbot.listFriends();
      break;

    case 'status':
      result = await clawdbot.getStatus();
      break;

    case 'preferences':
    case 'prefs':
      if (!args[1]) {
        result = { preferences: prefs.loadPreferences() };
      } else if (args[1] === 'set' && args[2] && args[3]) {
        let value = args[3];
        try { value = JSON.parse(value); } catch {}
        prefs.updatePreference(args[2], value);
        result = { success: true, path: args[2], value };
      } else {
        result = { error: '用法：preferences [set <路径> <值>]' };
      }
      break;

    case 'quiet-hours':
      if (args[1] === 'on') {
        prefs.updatePreference('schedule.quietHours.enabled', true);
        result = { success: true, quietHours: 'enabled' };
      } else if (args[1] === 'off') {
        prefs.updatePreference('schedule.quietHours.enabled', false);
        result = { success: true, quietHours: 'disabled' };
      } else if (args[1] && args[2]) {
        prefs.updatePreference('schedule.quietHours.enabled', true);
        prefs.updatePreference('schedule.quietHours.start', args[1]);
        prefs.updatePreference('schedule.quietHours.end', args[2]);
        result = { success: true, quietHours: { start: args[1], end: args[2] } };
      } else {
        const p = prefs.loadPreferences();
        result = { quietHours: p.schedule.quietHours };
      }
      break;

    case 'batch':
      if (args[1] === 'on') {
        prefs.updatePreference('schedule.batchDelivery.enabled', true);
        result = { success: true, batch: 'enabled' };
      } else if (args[1] === 'off') {
        prefs.updatePreference('schedule.batchDelivery.enabled', false);
        result = { success: true, batch: 'disabled' };
      } else {
        const p = prefs.loadPreferences();
        result = { batchDelivery: p.schedule.batchDelivery };
      }
      break;

    case 'tone':
      const validTones = ['natural', 'casual', 'formal', 'brief'];
      if (args[1] && validTones.includes(args[1])) {
        prefs.updatePreference('style.tone', args[1]);
        result = { success: true, tone: args[1] };
      } else {
        const p = prefs.loadPreferences();
        result = { tone: p.style.tone, valid: validTones };
      }
      break;

    default:
      result = {
        error: '未知操作',
        usage: {
          check: '检查消息和好友请求',
          send: 'send <好友> <消息> [--urgent] [--context=work]',
          add: 'add <好友链接> [消息]',
          accept: 'accept <好友名称>',
          link: '获取您的好友链接',
          friends: '列出好友',
          status: '获取 ClawdLink 状态',
          preferences: 'preferences [set <路径> <值>]',
          'quiet-hours': 'quiet-hours [on|off|<开始时间> <结束时间>]',
          batch: 'batch [on|off]',
          tone: 'tone [natural|casual|formal|brief]'
        }
      };
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.log(JSON.stringify({ error: err.message }));
  process.exit(1);
});
