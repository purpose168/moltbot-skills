---
name: pm2
description: 使用 PM2 进程管理器管理 Node.js 应用程序。适用于在生产环境中部署、监控和自动重启 Node 应用程序。涵盖启动应用程序、查看日志、设置开机自启动以及管理多个进程。
---

# PM2 进程管理器

适用于 Node.js 的生产级进程管理器，内置负载均衡器。

## 安装

```bash
npm install -g pm2
```

## 快速入门

```bash
# 启动应用程序
pm2 start app.js
pm2 start npm --name "my-app" -- start
pm2 start "npm run start" --name my-app

# 指定端口/环境变量
pm2 start npm --name "my-app" -- start -- --port 3000
PORT=3000 pm2 start npm --name "my-app" -- start
```

## 常用命令

```bash
# 列出进程
pm2 list
pm2 ls

# 查看日志
pm2 logs              # 所有日志
pm2 logs my-app       # 指定应用日志
pm2 logs --lines 100  # 最近 100 行

# 控制
pm2 restart my-app
pm2 stop my-app
pm2 delete my-app
pm2 reload my-app     # 零停机重载

# 信息
pm2 show my-app
pm2 monit             # 实时监控
```

## 开机自启动

```bash
# 保存当前进程列表
pm2 save

# 生成启动脚本（使用 sudo 运行输出命令）
pm2 startup

# 示例输出 - 运行此命令：
# sudo env PATH=$PATH:/opt/homebrew/bin pm2 startup launchd -u username --hp /Users/username
```

## Next.js / 生产构建

```bash
# 首先构建
npm run build

# 启动生产服务器
pm2 start npm --name "my-app" -- start

# 或使用配置文件
pm2 start ecosystem.config.js
```

## 配置文件（ecosystem.config.js）

```javascript
module.exports = {
  apps: [{
    name: 'my-app',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 常用参数

| 参数 | 说明 |
|------|-------------|
| `--name` | 进程名称 |
| `--watch` | 文件变化时重启 |
| `-i max` | 集群模式（使用所有 CPU） |
| `--max-memory-restart 200M` | 内存限制时自动重启 |
| `--cron "0 * * * *"` | 定时重启 |

## 清理

```bash
pm2 delete all        # 移除所有进程
pm2 kill              # 终止 PM2 守护进程
pm2 unstartup         # 移除启动脚本
```
