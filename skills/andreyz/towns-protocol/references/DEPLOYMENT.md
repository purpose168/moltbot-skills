# 部署

## 本地开发

```bash
# 启动机器人（默认端口 5123）
bun run dev

# 通过 Tailscale Funnel 暴露 webhook
tailscale funnel 5123
# 创建类似这样的 URL: https://your-machine.taild8e1b0.ts.net/

# 备选方案: ngrok
ngrok http 5123
```

## 在开发者门户中设置 Webhook

1. 转到 https://app.towns.com/developer
2. 选择您的机器人
3. 将 Webhook URL 设置为隧道 URL + `/webhook`
   - 示例: `https://your-machine.taild8e1b0.ts.net/webhook`
4. 保存更改

## 测试清单

- [ ] 机器人服务器正在运行 (`bun run dev`)
- [ ] 隧道活动（Tailscale/ngrok）
- [ ] 在开发者门户中更新了 Webhook URL
- [ ] 机器人在 Space 中安装（设置 → 集成）
- [ ] 机器人添加到特定频道（频道设置 → 集成）
- [ ] 检查传入 webhook 事件的日志

## Render.com 部署

1. 从 Git 仓库创建 Web 服务
2. 设置构建命令: `bun install`
3. 设置启动命令: `bun run start`
4. 设置环境变量:
   - `APP_PRIVATE_DATA`
   - `JWT_SECRET`
   - `DATABASE_URL`（如果使用数据库）
   - `BASE_RPC_URL`（推荐：Alchemy/Infura）
5. 在 app.towns.com/developer 中将 webhook URL 设置为 Render URL + `/webhook`

## 健康检查端点

为需要健康检查的部署平台添加：

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  gasWallet: bot.viem.account.address
}))
```

## 优雅关闭

处理 SIGTERM 以实现干净关闭（Render/Kubernetes 需要）：

```typescript
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM，正在关闭...')
  await pool.end()  // 关闭数据库连接
  process.exit(0)
})
```

## 数据库连接池

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// 启动时健康检查
await pool.query('SELECT 1')
```

## 线程所有权模式（防止竞争）

```typescript
// 第一个写入者获胜
await pool.query(
  `INSERT INTO threads (thread_id, user_id)
   VALUES ($1, $2)
   ON CONFLICT (thread_id) DO NOTHING`,
  [threadId, userId]
)

// 检查所有权
const result = await pool.query(
  'SELECT user_id FROM threads WHERE thread_id = $1',
  [threadId]
)
return result.rows[0]?.user_id === userId
```
