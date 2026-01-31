#!/usr/bin/env node
/**
 * ClawdLink 命令行界面
 * 
 * 提供 ClawdLink 的命令行交互功能：
 * - 初始化设置：设置用户名称和生成身份密钥
 * - 好友链接：显示自己的好友链接以便分享
 * - 添加好友：通过好友链接添加新好友
 * - 好友列表：查看所有已连接的好友
 * - 发送消息：向好友发送加密消息
 * - 检查消息：轮询中继服务器获取新消息
 * - 查看状态：检查本地和中继服务器状态
 * 
 * 使用方法：
 * clawdlink setup [名称]    初始化 ClawdLink
 * clawdlink link            显示好友链接
 * clawdlink add <链接>       添加好友
 * clawdlink friends         好友列表
 * clawdlink send <好友> <消息>  发送消息
 * clawdlink poll            检查消息
 * clawdlink inbox           检查消息（poll 的别名）
 * clawdlink status          查看状态
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(homedir(), '.clawdbot', 'clawdlink');
const IDENTITY_FILE = join(DATA_DIR, 'identity.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');

const args = process.argv.slice(2);
const command = args[0];

/**
 * 主函数
 * 
 * 根据用户输入的命令执行相应的操作：
 * 1. setup：初始化设置，生成身份密钥
 * 2. link：显示好友链接
 * 3. add：添加好友
 * 4. friends：列出好友
 * 5. send：发送消息
 * 6. poll/inbox：检查消息
 * 7. status：查看状态
 * 8. 默认：显示帮助信息
 */
async function main() {
  switch (command) {
    case 'setup':
      const name = args[1] || 'ClawdLink 用户';
      execSync(`node ${join(__dirname, 'scripts/setup.js')} --name="${name}"`, { stdio: 'inherit' });
      break;

    case 'link':
      if (!existsSync(IDENTITY_FILE)) {
        console.log('尚未设置。请运行：clawdlink setup "您的名称"');
        process.exit(1);
      }
      const identity = JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
      const config = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : { displayName: 'ClawdLink 用户' };
      
      const params = new URLSearchParams({
        key: `ed25519:${identity.publicKey}`,
        name: config.displayName
      });
      console.log(`clawdlink://relay.clawdlink.bot/add?${params.toString()}`);
      break;

    case 'add':
      if (!args[1]) {
        console.log('用法：clawdlink add <好友链接>');
        process.exit(1);
      }
      execSync(`node ${join(__dirname, 'scripts/friends.js')} add "${args[1]}"`, { stdio: 'inherit' });
      break;

    case 'friends':
      execSync(`node ${join(__dirname, 'scripts/friends.js')} list`, { stdio: 'inherit' });
      break;

    case 'send':
      if (!args[1] || !args[2]) {
        console.log('用法：clawdlink send <好友> <消息>');
        process.exit(1);
      }
      const friend = args[1];
      const message = args.slice(2).join(' ');
      execSync(`node ${join(__dirname, 'scripts/send.js')} "${friend}" "${message}"`, { stdio: 'inherit' });
      break;

    case 'poll':
      const pollArgs = args.slice(1).join(' ');
      execSync(`node ${join(__dirname, 'scripts/poll.js')} ${pollArgs}`, { stdio: 'inherit' });
      break;

    case 'inbox':
      execSync(`node ${join(__dirname, 'scripts/poll.js')}`, { stdio: 'inherit' });
      break;

    case 'status':
      console.log('🔗 ClawdLink 状态');
      console.log('='.repeat(50));
      
      if (!existsSync(IDENTITY_FILE)) {
        console.log('状态：未配置');
        console.log('请运行：clawdlink setup "您的名称"');
        break;
      }
      
      const id = JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'));
      const cfg = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : {};
      const friendsData = existsSync(FRIENDS_FILE) ? JSON.parse(readFileSync(FRIENDS_FILE, 'utf8')) : { friends: [] };
      
      console.log(`身份：${cfg.displayName || '未知'}`);
      console.log(`公钥：${id.publicKey.slice(0, 24)}...`);
      console.log(`好友数：${friendsData.friends.length}`);
      console.log('');
      
      try {
        const response = await fetch('https://clawdlink-relay.vercel.app/health');
        const health = await response.json();
        console.log(`中继服务器：✓ 在线（版本 ${health.version}）`);
      } catch (err) {
        console.log('中继服务器：✗ 离线或无法访问');
      }
      break;

    default:
      console.log(`
🔗 ClawdLink - Clawdbot 端到端加密消息系统

命令：
  setup [名称]         使用您的名称初始化 ClawdLink
  link                 显示您的好友链接
  add <链接>           通过链接添加好友
  friends              列出您的好友
  send <好友> <消息>   发送消息
  poll                 检查新消息
  inbox                检查新消息（poll 的别名）
  status               查看 ClawdLink 和中继服务器状态

示例：
  clawdlink setup "Dave Morin"
  clawdlink link
  clawdlink add "clawdlink://relay.clawdlink.bot/add?key=..."
  clawdlink send "Matt" "嘿，想聊聊 AI 助手吗？"
  clawdlink poll
`);
  }
}

main().catch(err => {
  console.error('错误：', err.message);
  process.exit(1);
});
