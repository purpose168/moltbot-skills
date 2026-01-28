# Claude Code 使用情况技能

直接从 Clawdbot 检查您的 Claude Code OAuth API 使用限制。

## 功能特性

- 📊 会话（5小时）和每周（7天）利用率跟踪
- 🎨 美观的进度条，带颜色编码的状态指示器
- ⚡ 智能缓存（默认60秒）避免 API 请求过多
- 📤 用于脚本的 JSON 输出
- 🦞 友好的 Telegram 格式化
- 🔔 **新增 v1.1.0**：带重置通知的自动化监控

## 快速测试

```bash
cd /Users/ali/clawd/skills/claude-code-usage
./scripts/claude-usage.sh
```

## 输出示例

```
🦞 Claude Code 使用情况

⏱️  会话 (5h): 🟢 █░░░░░░░░░ 18%
   重置时间: 2小时 48分钟

📅 每周 (7d): 🟢 ░░░░░░░░░░ 2%
   重置时间: 6天 21小时
```

## 在 Clawdbot 中的使用

只需询问：
- "我还剩多少 Claude 使用量？"
- "检查我的 Claude Code 限制"
- "我的 Claude 配额是多少？"

该技能会自动触发并提供格式化的响应。

## 自动化监控（v1.2.0+）

### 会话刷新提醒（推荐）

在您的5小时会话配额刷新时获取精确通知！

**单命令设置：**
```bash
cd /Users/ali/clawd/skills/claude-code-usage
./scripts/session-reminder.sh
```

这会创建一个自调度的链，其功能包括：
- 检查您的会话何时刷新
- 为该精确时间安排下一次提醒
- 每5小时自动通知您
- 零维护永久运行

### 重置检测（替代方案）

或者，通过轮询监控配额重置：

```bash
./scripts/monitor-usage.sh  # 测试一次
./scripts/setup-monitoring.sh  # 设置自动化轮询
```

有关详细比较和配置选项，请参阅 `SKILL.md`。

## 发布到 ClawdHub

与社区分享：

```bash
cd /Users/ali/clawd/skills
clawdhub publish claude-code-usage \
  --slug claude-code-usage \
  --name "Claude Code 使用情况" \
  --version 1.0.0 \
  --changelog "初始发布：会话和每周使用量跟踪，格式化美观"
```

## 作者

由 RZA 为 Clawdbot 创建 🦞
