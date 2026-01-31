# Monarch Money API 参考

## 目录

- [认证](#认证)
- [交易 API](#交易-api)
- [分类 API](#分类-api)
- [账户 API](#账户-api)
- [GraphQL 直接访问](#graphql-直接访问)

## 认证

MonarchClient 会自动处理认证：

```typescript
import { MonarchClient } from 'monarch-money';

const client = new MonarchClient({
  baseURL: 'https://api.monarch.com',
  enablePersistentCache: false
});

await client.login({
  email: process.env.MONARCH_EMAIL,
  password: process.env.MONARCH_PASSWORD,
  mfaSecretKey: process.env.MONARCH_MFA_SECRET,
  useSavedSession: true,
  saveSession: true
});
```

### 会话管理

会话会被加密并存储在 `~/.mm/session.json`。`useSavedSession` 选项会加载现有会话，`saveSession` 会持久化新会话。

```typescript
// 加载保存的会话
const loaded = client.loadSession();

// 删除会话
client.deleteSession();

// 关闭客户端
await client.close();
```

## 交易 API

### 获取交易

```typescript
const result = await client.transactions.getTransactions({
  limit: 50,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  verbosity: 'light'  // 'ultra-light' | 'light' | 'standard'
});

// result.transactions 包含 Transaction 对象数组
```

### 交易对象

```typescript
interface Transaction {
  id: string;
  amount: number;
  date: string;
  merchant: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
  account: {
    id: string;
    displayName: string;
  };
  notes?: string;
  reviewStatus: 'needs_review' | 'reviewed';
  isPending: boolean;
}
```

### 更新交易

```typescript
await client.transactions.updateTransaction(transactionId, {
  categoryId: 'new_category_id',
  notes: 'Updated notes',
  merchantName: 'New Merchant Name'
});
```

### 拆分交易

```typescript
const splits = [
  { amount: -20.00, categoryId: 'cat1', merchantName: 'Store', notes: 'Item 1' },
  { amount: -15.00, categoryId: 'cat2', merchantName: 'Store', notes: 'Item 2' }
];

await client.transactions.splitTransaction(transactionId, splits);
```

## 分类 API

### 获取所有分类

```typescript
const categories = await client.categories.getCategories();

// categories 是 Category 对象数组
```

### 分类对象

```typescript
interface Category {
  id: string;
  name: string;
  group: {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'transfer';
  };
  icon?: string;
}
```

### 常用分类 ID

分类因用户账户而异。使用 CLI 获取您的特定 ID：

```bash
monarch-money cat list --show-ids
```

## 账户 API

### 获取所有账户

```typescript
const accounts = await client.accounts.getAll({
  includeHidden: false,
  verbosity: 'light'
});
```

### 账户对象

```typescript
interface Account {
  id: string;
  displayName: string;
  currentBalance: number;
  type: string;
  subtype: string;
  institution: {
    id: string;
    name: string;
  };
  isHidden: boolean;
}
```

## GraphQL 直接访问

对于高级用例，直接访问 GraphQL 客户端：

```typescript
// 查询
const result = await client['graphql'].query(queryString, variables);

// 变更
const result = await client['graphql'].mutation(mutationString, variables);
```

### 示例：自定义查询

```typescript
const query = `
  query GetTransactionDetails($id: UUID!) {
    getTransaction(id: $id) {
      id
      amount
      date
      merchant { name }
      category { name }
      notes
    }
  }
`;

const result = await client['graphql'].query(query, { id: transactionId });
```

### 常用变更

**更新交易：**
```graphql
mutation UpdateTransaction($input: UpdateTransactionInput!) {
  updateTransaction(input: $input) {
    transaction { id }
    errors { message }
  }
}
```

**拆分交易：**
```graphql
mutation SplitTransaction($input: UpdateTransactionSplitInput!) {
  updateTransactionSplit(input: $input) {
    transaction { id }
    errors { message }
  }
}
```

## 详细程度级别

使用详细程度控制响应详情：

| 级别 | 用例 | 包含数据 |
|------|------|----------|
| `ultra-light` | 快速概览 | 仅包含 ID、金额、名称 |
| `light` | 标准显示 | 核心字段 + 日期 + 分类 |
| `standard` | 完整分析 | 所有字段，包括元数据 |

```typescript
const accounts = await client.accounts.getAll({ verbosity: 'ultra-light' });
// 返回最小数据以快速处理
```

## 速率限制

客户端包含内置速率限制。默认设置：

- 每秒 10 个请求
- 突发大小 20

在客户端选项中配置：

```typescript
const client = new MonarchClient({
  baseURL: 'https://api.monarch.com',
  rateLimit: {
    requestsPerSecond: 5,
    burstSize: 10
  }
});
```

## 缓存

提供两种级别的缓存：

**内存缓存：** 会话内缓存（默认启用）
**持久缓存：** 跨会话缓存（可选）

```typescript
const client = new MonarchClient({
  baseURL: 'https://api.monarch.com',
  cache: {
    enabled: true,
    ttl: 300000  // 5 分钟
  },
  enablePersistentCache: true
});
```