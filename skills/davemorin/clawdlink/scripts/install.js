#!/usr/bin/env node
/**
 * ClawdLink 安装脚本
 * 
 * 此脚本用于将 ClawdLink 心跳轮询集成到用户的 HEARTBEAT.md 文件中
 * 
 * 使用方法：
 * 1. 安装 skill 后运行：node scripts/install.js
 * 2. 脚本会自动在 HEARTBEAT.md 中添加 ClawdLink 的轮询命令
 * 3. Clawdbot 会在每次心跳时执行轮询，检查新消息
 * 
 * 功能说明：
 * - 检查是否已安装（HEARTBEAT.md 中是否已包含 ClawdLink）
 * - 如果 HEARTBEAT.md 不存在，提示用户手动创建
 * - 如果已安装，提示用户无需重复安装
 * - 添加成功后显示后续操作指南
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CLAWD_DIR = join(homedir(), 'clawd');
const HEARTBEAT_FILE = join(CLAWD_DIR, 'HEARTBEAT.md');

const CLAWDLINK_SECTION = `
## ClawdLink
- 轮询加密消息：\`node ~/clawd/skills/clawdlink/heartbeat.js\`
- 如果输出非空，将消息传递给用户
- 处理：消息、好友请求、接受通知
`;

/**
 * 主安装函数
 * 
 * 安装流程：
 * 1. 检查 HEARTBEAT.md 是否存在
 * 2. 检查是否已安装 ClawdLink
 * 3. 如果不存在，提示手动创建
 * 4. 如果已存在且未安装，追加 ClawdLink 配置
 * 5. 如果已安装，显示相应提示
 */
function main() {
  console.log('🔗 ClawdLink 安装程序');
  console.log('='.repeat(50));
  
  if (!existsSync(HEARTBEAT_FILE)) {
    console.log('⚠ 未在以下位置找到 HEARTBEAT.md：', HEARTBEAT_FILE);
    console.log('  请手动创建并添加 ClawdLink 配置。');
    console.log('');
    console.log('请在您的 HEARTBEAT.md 中添加以下内容：');
    console.log(CLAWDLINK_SECTION);
    return;
  }
  
  const content = readFileSync(HEARTBEAT_FILE, 'utf8');
  if (content.includes('ClawdLink') || content.includes('clawdlink')) {
    console.log('✓ HEARTBEAT.md 中已包含 ClawdLink 配置');
    return;
  }
  
  appendFileSync(HEARTBEAT_FILE, CLAWDLINK_SECTION);
  console.log('✓ 已在 HEARTBEAT.md 中添加 ClawdLink');
  console.log('');
  console.log('ClawdLink 现在会在每次心跳时轮询检查消息。');
  console.log('');
  console.log('下一步：如果尚未设置，请运行：');
  console.log('  node cli.js setup "您的名称"');
}

main();
