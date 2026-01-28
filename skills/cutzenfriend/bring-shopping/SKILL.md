---
name: bring-shopping
description: 通过非官方的 bring-shopping Node.js 库使用邮箱/密码登录管理 Bring! 购物列表。用于列出列表、读取项目、添加/删除项目以及选中/取消选中项目（当 API 风格访问可接受时）。
---

# Bring! 购物

## 概述

使用 `bring-shopping` npm 包通过邮箱/密码凭据访问 Bring! 列表。默认列表是 "Willig"，除非用户指定其他列表。

## 快速开始

1. 在技能文件夹中安装依赖：
   - `npm install bring-shopping`
2. 在 Clawdbot 配置（首选）或 shell 中设置环境变量：
   - `BRING_EMAIL` 和 `BRING_PASSWORD`
3. 运行 CLI 脚本：
   - `node scripts/bring_cli.mjs items --list "Willig"`

## 任务

### 显示列表

- `node scripts/bring_cli.mjs lists`

### 显示项目

- `node scripts/bring_cli.mjs items --list "Willig"`

### 添加项目

- `node scripts/bring_cli.mjs add --item "牛奶" --spec "2L" --list "Willig"`

### 移除项目

- `node scripts/bring_cli.mjs remove --item "牛奶" --list "Willig"`

### 选中项目

- `node scripts/bring_cli.mjs check --item "牛奶" --list "Willig"`

### 取消选中项目

- `node scripts/bring_cli.mjs uncheck --item "牛奶" --spec "2L" --list "Willig"`

## 注意事项

- 将凭据存储在 Clawdbot 配置 env 中，这样它们不会与技能捆绑在一起。
- 如果列表名称不明确，运行 `lists` 并询问要使用哪个列表。
- 如果项目已选中，`uncheck` 会将其重新添加到购买列表中。
