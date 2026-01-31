---
name: monarch-money
description: 用于 Monarch Money 预算管理的 TypeScript 库和 CLI 工具。按日期/商家/金额搜索交易、更新分类、列出账户和预算、管理身份认证。当用户询问 Monarch Money 交易、想要分类支出、查找特定交易或想要自动化预算任务时使用。
metadata:
  clawdbot:
    requires:
      env: ["MONARCH_EMAIL", "MONARCH_PASSWORD", "MONARCH_MFA_SECRET"]
    install:
      - id: node
        kind: node
        package: "."
        bins: ["monarch-money"]
        label: "安装 Monarch Money CLI"
---

# Monarch Money

用于 Monarch Money 预算自动化的 CLI 工具和 TypeScript 库。

## 前置条件

### 环境变量（必需）

| 变量 | 必需 | 描述 |
|----------|----------|-------------|
| `MONARCH_EMAIL` | **是** | Monarch Money 账户邮箱 |
| `MONARCH_PASSWORD` | **是** | Monarch Money 账户密码 |
| `MONARCH_MFA_SECRET` | **是** | MFA 所需的 TOTP 密钥（见下方） |

### 获取 MFA 密钥

Monarch Money 需要 MFA 验证。生成 TOTP 密钥的步骤：

1. 登录 https://app.monarchmoney.com
2. 进入设置 > 安全 > 双因素身份认证
3. 如果 MFA 已启用：先禁用再重新启用以获取新密钥
4. 显示二维码时：点击"无法扫描？查看设置密钥"
5. 复制密钥（base32 字符串，如 `JBSWY3DPEHPK3PXP`）
6. 在验证器应用中完成 MFA 设置
7. 设置密钥：`export MONARCH_MFA_SECRET="YOUR_SECRET"`

## 快速开始

```bash
# 检查配置
monarch-money doctor

# 登录（默认使用环境变量）
monarch-money auth login

# 列出交易
monarch-money tx list --limit 10

# 列出分类
monarch-money cat list
```

## CLI 命令

### 身份认证

```bash
# 使用环境变量登录
monarch-money auth login

# 使用明确凭据登录
monarch-money auth login -e email@example.com -p password --mfa-secret SECRET

# 检查认证状态
monarch-money auth status

# 退出登录
monarch-money auth logout
```

### 交易

```bash
# 列出最近的交易
monarch-money tx list --limit 20

# 按日期搜索
monarch-money tx list --start-date 2026-01-01 --end-date 2026-01-31

# 按商家搜索
monarch-money tx list --merchant "Walmart"

# 按 ID 获取交易
monarch-money tx get <transaction_id>

# 更新分类
monarch-money tx update <id> --category <category_id>

# 更新商家名称
monarch-money tx update <id> --merchant "New Name"

# 添加备注
monarch-money tx update <id> --notes "My notes here"
```

### 分类

```bash
# 列出所有分类
monarch-money cat list

# 列出分类（显示 ID，用于更新操作）
monarch-money cat list --show-ids
```

### 账户

```bash
# 列出账户
monarch-money acc list

# 显示账户详情
monarch-money acc get <account_id>
```

### 医生（诊断）

```bash
# 运行诊断检查
monarch-money doctor
```

检查项目：
- 环境变量是否设置
- API 连接性
- 会话有效性
- Node.js 版本

## 库使用方式

直接导入和使用 TypeScript 库：

```typescript
import { MonarchClient } from 'monarch-money';

const client = new MonarchClient({ baseURL: 'https://api.monarch.com' });

// 登录
await client.login({
  email: process.env.MONARCH_EMAIL,
  password: process.env.MONARCH_PASSWORD,
  mfaSecretKey: process.env.MONARCH_MFA_SECRET
});

// 获取交易
const transactions = await client.transactions.getTransactions({ limit: 10 });

// 获取分类
const categories = await client.categories.getCategories();

// 获取账户
const accounts = await client.accounts.getAll();
```

## 常见工作流程

### 查找并更新交易

```bash
# 1. 查找交易
monarch-money tx list --date 2026-01-15 --merchant "Target"

# 2. 获取分类 ID
monarch-money cat list --show-ids

# 3. 更新交易
monarch-money tx update <transaction_id> --category <category_id>
```

### 按日期范围搜索交易

```bash
monarch-money tx list --start-date 2026-01-01 --end-date 2026-01-31 --limit 100
```

### 检查预算状态

```bash
monarch-money acc list
```

## 错误处理

| 错误 | 解决方案 |
|-------|----------|
| "未登录" | 运行 `monarch-money auth login` |
| "需要 MFA 验证码" | 设置 `MONARCH_MFA_SECRET` 环境变量 |
| "凭据无效" | 验证邮箱/密码在 app.monarchmoney.com 是否有效 |
| "会话已过期" | 重新运行 `monarch-money auth login` |

## 会话管理

会话会缓存在本地 `~/.mm/session.json`。首次登录后，后续命令会重用保存的会话以加快执行速度。

清除会话：`monarch-money auth logout`

## 参考资料

- [API.md](references/API.md) - GraphQL API 详情和高级用法
- [TROUBLESHOOTING.md](references/TROUBLESHOOTING.md) - 常见问题和解决方案
