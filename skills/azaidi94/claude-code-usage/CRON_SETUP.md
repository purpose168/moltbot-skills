# 设置自动化监控

## 方式 1：通过 Clawdbot 配置添加（推荐）

将此添加到您的 Clawdbot Gateway 配置（`~/.clawdbot/clawdbot.json`）：

```json
{
  "cron": {
    "jobs": [
      {
        "name": "claude-usage-monitor",
        "schedule": "*/30 * * * *",
        "sessionTarget": "telegram:YOUR_CHAT_ID",
        "payload": {
          "kind": "exec",
          "command": "/Users/ali/clawd/skills/claude-code-usage/scripts/monitor-usage.sh"
        }
      }
    ]
  }
}
```

将 `YOUR_CHAT_ID` 替换为您的 Telegram 聊天 ID（通常是您的电话号码）。

然后重启 Clawdbot：
```bash
clawdbot daemon restart
```

## 方式 2：系统 Cron（替代方案）

添加到您的系统 crontab：

```bash
crontab -e
```

添加这一行：
```
*/30 * * * * /Users/ali/clawd/skills/claude-code-usage/scripts/monitor-usage.sh > /tmp/claude-monitor.log 2>&1
```

**注意：** 系统 cron 不会直接发送 Telegram 通知。您需要检查 `/tmp/claude-monitor.log` 获取重置通知。

## 方式 3：手动测试

随时测试监控器：
```bash
/Users/ali/clawd/skills/claude-code-usage/scripts/monitor-usage.sh
```

## 验证

检查监控是否正常工作：
```bash
# 查看状态文件
cat /tmp/claude-usage-state.json

# 查看上次检查时间
cat /tmp/claude-usage-state.json | grep last_check
```

## 通知格式

检测到重置时，您将收到：

```
🎉 Claude Code 会话已重置！

⏱️  您的5小时配额已重置
📊 使用量: 2%
⏰ 下次重置: 4小时 58分钟

新的使用量已可用！🦞
```
