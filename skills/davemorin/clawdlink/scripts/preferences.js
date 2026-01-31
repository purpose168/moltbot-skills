#!/usr/bin/env node
/**
 * ClawdLink 偏好设置管理器
 * 
 * 提供命令行方式管理消息投递偏好设置：
 * 
 * 支持的配置类别：
 * - 静音时段（quiet-hours）：设置休息时间，避免打扰
 * - 批量投递（batch）：将非紧急消息汇总后投递
 * - 通信语气（tone）：设置消息呈现风格
 * - 好友优先级（friend）：为特定好友设置特殊规则
 * - 时区设置（timezone）：设置所在时区
 * 
 * 使用方法：
 * - 显示所有设置：node preferences.js show
 * - 设置静音时段：node preferences.js quiet-hours 22:00 08:00
 * - 启用批量投递：node preferences.js batch on
 * - 设置通信语气：node preferences.js tone casual
 * - 设置好友优先级：node preferences.js friend "张三" priority high
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import prefs from '../lib/preferences.js';

const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');

const args = process.argv.slice(2);
const command = args[0];

/**
 * 显示所有偏好设置
 */
function showPreferences() {
  const p = prefs.loadPreferences();
  console.log(JSON.stringify(p, null, 2));
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🔗 ClawdLink 偏好设置

命令：
  show                        显示所有偏好设置
  set <路径> <值>             设置特定偏好值
  quiet-hours <开|关>         启用/禁用静音时段
  quiet-hours <开始时间> <结束时间>  设置静音时段（如 22:00 08:00）
  batch <开|关>               启用/禁用批量投递
  batch-times <时间1,时间2>   设置批量投递时间（如 09:00,18:00）
  tone <natural|casual|formal|brief>  设置通信语气
  friend <名称> priority <high|normal>  设置好友优先级
  friend <名称> always-deliver <开|关>  设置是否始终立即投递
  timezone <时区>             设置时区（如 America/Los_Angeles）

示例：
  node preferences.js show
  node preferences.js quiet-hours on
  node preferences.js quiet-hours 22:00 07:00
  node preferences.js batch on
  node preferences.js batch-times 08:00,12:00,18:00
  node preferences.js tone casual
  node preferences.js friend "张三" priority high
  node preferences.js timezone America/New_York
`);
}

/**
 * 主程序
 */
function main() {
  if (!existsSync(IDENTITY_FILE)) {
    console.error('ClawdLink 尚未设置。请运行：node cli.js setup "您的名称"');
    process.exit(1);
  }

  switch (command) {
    case 'show':
      showPreferences();
      break;

    case 'set':
      if (args.length < 3) {
        console.error('用法：set <路径> <值>');
        process.exit(1);
      }
      const path = args[1];
      let value = args.slice(2).join(' ');
      try {
        value = JSON.parse(value);
      } catch {
      }
      prefs.updatePreference(path, value);
      console.log(`✓ 已设置 ${path} = ${JSON.stringify(value)}`);
      break;

    case 'quiet-hours':
      if (args[1] === 'on') {
        prefs.updatePreference('schedule.quietHours.enabled', true);
        console.log('✓ 已启用静音时段');
      } else if (args[1] === 'off') {
        prefs.updatePreference('schedule.quietHours.enabled', false);
        console.log('✓ 已禁用静音时段');
      } else if (args[1] && args[2]) {
        prefs.updatePreference('schedule.quietHours.enabled', true);
        prefs.updatePreference('schedule.quietHours.start', args[1]);
        prefs.updatePreference('schedule.quietHours.end', args[2]);
        console.log(`✓ 静音时段已设置为：${args[1]} - ${args[2]}`);
      } else {
        const p = prefs.loadPreferences();
        const qh = p.schedule.quietHours;
        console.log(`静音时段：${qh.enabled ? '开启' : '关闭'}（${qh.start} - ${qh.end}）`);
      }
      break;

    case 'batch':
      if (args[1] === 'on') {
        prefs.updatePreference('schedule.batchDelivery.enabled', true);
        console.log('✓ 已启用批量投递');
      } else if (args[1] === 'off') {
        prefs.updatePreference('schedule.batchDelivery.enabled', false);
        console.log('✓ 已禁用批量投递');
      } else {
       .loadPreferences();
        const p = prefs const bd = p.schedule.batchDelivery;
        console.log(`批量投递：${bd.enabled ? '开启' : '关闭'}，时间：${bd.times.join(', ')}`);
      }
      break;

    case 'batch-times':
      if (!args[1]) {
        console.error('用法：batch-times <时间1,时间2,...>');
        process.exit(1);
      }
      const times = args[1].split(',').map(t => t.trim());
      prefs.updatePreference('schedule.batchDelivery.times', times);
      console.log(`✓ 批量投递时间已设置为：${times.join(', ')}`);
      break;

    case 'tone':
      const validTones = ['natural', 'casual', 'formal', 'brief'];
      if (!args[1] || !validTones.includes(args[1])) {
        console.error(`用法：tone <${validTones.join('|')}> `);
        process.exit(1);
      }
      prefs.updatePreference('style.tone', args[1]);
      console.log(`✓ 语气已设置为：${args[1]}`);
      break;

    case 'friend':
      if (!args[1]) {
        console.error('用法：friend <名称> <设置> <值>');
        process.exit(1);
      }
      const friendName = args[1];
      const setting = args[2];
      const settingValue = args[3];
      
      if (setting === 'priority') {
        prefs.setFriendPrefs(friendName, { priority: settingValue });
        console.log(`✓ ${friendName}：priority = ${settingValue}`);
      } else if (setting === 'always-deliver') {
        prefs.setFriendPrefs(friendName, { alwaysDeliver: settingValue === 'on' });
        console.log(`✓ ${friendName}：always-deliver = ${settingValue}`);
      } else {
        console.error('未知的好友设置。可用设置：priority 或 always-deliver');
      }
      break;

    case 'timezone':
      if (!args[1]) {
        const p = prefs.loadPreferences();
        console.log(`时区：${p.schedule.timezone}`);
      } else {
        prefs.updatePreference('schedule.timezone', args[1]);
        console.log(`✓ 时区已设置为：${args[1]}`);
      }
      break;

    default:
      showHelp();
  }
}

main();
