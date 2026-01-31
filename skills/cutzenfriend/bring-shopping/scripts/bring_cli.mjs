#!/usr/bin/env node
/**
 * Bring! 购物清单 CLI 工具
 * 通过 bring-shopping npm 包管理 Bring! 购物列表
 */

import Bring from 'bring-shopping';

const args = process.argv.slice(2);
const command = args[0];

/**
 * 获取带值的命令行参数
 * @param {string} name - 参数名
 * @param {any} fallback - 默认值
 * @returns {any} 参数值或默认值
 */
function getFlag(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  return value ?? fallback;
}

/**
 * 检查是否存在某个命令行参数
 * @param {string} name - 参数名
 * @returns {boolean} 是否存在
 */
function hasFlag(name) {
  return args.includes(name);
}

/**
 * 显示使用帮助信息
 */
function usage() {
  console.log(`用法:
  bring_cli.mjs lists
  bring_cli.mjs items [--list "Willig"]
  bring_cli.mjs add --item "牛奶" [--spec "2L"] [--list "Willig"]
  bring_cli.mjs remove --item "牛奶" [--list "Willig"]
  bring_cli.mjs check --item "牛奶" [--list "Willig"]
  bring_cli.mjs uncheck --item "牛奶" [--spec "2L"] [--list "Willig"]

环境变量:
  BRING_EMAIL, BRING_PASSWORD
`);
}

/**
 * 主函数
 * 处理所有 CLI 命令
 */
async function main() {
  if (!command || hasFlag('--help')) {
    usage();
    process.exit(0);
  }

  // 检查环境变量
  const mail = process.env.BRING_EMAIL;
  const password = process.env.BRING_PASSWORD;
  if (!mail || !password) {
    console.error('缺少 BRING_EMAIL 或 BRING_PASSWORD 环境变量。');
    process.exit(1);
  }

  // 登录 Bring!
  const bring = new Bring({ mail, password });
  await bring.login();

  // lists: 列出所有购物清单
  if (command === 'lists') {
    const lists = await bring.loadLists();
    console.log(JSON.stringify(lists.lists, null, 2));
    return;
  }

  // 获取指定列表
  const listNameOrId = getFlag('--list', 'Willig');
  const lists = await bring.loadLists();
  const list = lists.lists.find((entry) => entry.listUuid === listNameOrId || entry.name === listNameOrId);
  if (!list) {
    console.error(`未找到列表: ${listNameOrId}`);
    process.exit(1);
  }

  // items: 获取列表中的项目
  if (command === 'items') {
    const items = await bring.getItems(list.listUuid);
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  // 解析 --item 参数
  const item = getFlag('--item', null);
  if (!item) {
    console.error('缺少 --item 参数。');
    process.exit(1);
  }

  // add: 添加项目到列表
  if (command === 'add') {
    const spec = getFlag('--spec', '');
    await bring.saveItem(list.listUuid, item, spec);
    console.log(`已添加: ${item}`);
    return;
  }

  // remove: 从列表中移除项目
  if (command === 'remove') {
    await bring.removeItem(list.listUuid, item);
    console.log(`已移除: ${item}`);
    return;
  }

  // check: 选中项目（移动到最近购买列表）
  if (command === 'check') {
    await bring.moveToRecentList(list.listUuid, item);
    console.log(`已选中: ${item}`);
    return;
  }

  // uncheck: 取消选中项目（重新添加到购买列表）
  if (command === 'uncheck') {
    const spec = getFlag('--spec', '');
    await bring.saveItem(list.listUuid, item, spec);
    console.log(`已取消选中: ${item}`);
    return;
  }

  // 未知命令
  console.error(`未知命令: ${command}`);
  usage();
  process.exit(1);
}

// 运行主函数并处理错误
main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
