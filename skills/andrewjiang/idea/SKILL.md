---
name: idea
description: "启动后台 Claude 会话来探索和分析商业创意。说 'Idea: [描述]' 来触发。"
homepage: https://github.com/anthropics/claude-code
metadata: {"clawdbot":{"emoji":"💡","requires":{"bins":["claude","tmux","telegram"]}}}
---

# 创意探索技能

启动独立的 Claude Code 会话来深入探索商业创意。获取市场研究、技术分析、上市策略和可操作的建议。

## 快速开始

**触发短语：** 说 `Idea: [描述]`，助手将：
1. 在 tmux 中启动 Claude Code 会话
2. 全面研究和分析创意
3. 将结果保存到 `~/clawd/ideas/<slug>/research.md`
4. 将文件发送到您的 Telegram 保存的消息
5. 通过 cron 完成时通知您

## 工作原理

```
用户: "Idea: AI calendar assistant"
       ↓
┌─────────────────────────────────┐
│  1. explore-idea.sh 启动        │
│  2. 创建 tmux 会话              │
│  3. 运行 Claude Code            │
│  4. Claude 分析并写入            │
│  5. notify-research-complete.sh │
│     → 发送文件到"我"             │
│     → 排队通知                   │
│  6. Cron 检查队列（1 分钟）      │
│  7. 在聊天中通知用户             │
└─────────────────────────────────┘
```

## 设置

### 先决条件
- `claude` CLI（Claude Code）
- `tmux`
- `telegram` CLI（supertelegram）
- 启用 cron 的 Clawdbot

### 1. 创建脚本

查看 `~/clawd/scripts/explore-idea.sh` 获取完整实现。

关键组件：
- 创建带有提示和运行脚本的创意目录
- 取消设置 OAuth 环境变量以使用 Claude Max
- 使用 `--dangerously-skip-permissions` 运行 claude
- 完成后调用通知脚本

### 2. 设置 Cron 作业

```bash
# 每分钟检查通知队列的 Cron 作业
{
  name: "Check notification queue",
  sessionTarget: "isolated",
  wakeMode: "now",
  payload: {
    kind: "agentTurn",
    message: "Check ~/.clawdbot/notify-queue/ for .json files...",
    deliver: true,
    channel: "telegram",
    to: "YOUR_CHAT_ID"
  },
  schedule: { kind: "every", everyMs: 60000 }
}
```

### 3. 添加 AGENTS.md 说明

```markdown
**当用户说 "Idea: [描述]":**
1. 提取创意描述
2. 执行: `CLAWD_SESSION_KEY="main" ~/clawd/scripts/explore-idea.sh "[创意]"`
3. 确认: "创意探索已开始。完成后您将收到通知。"
```

## 分析框架

探索涵盖：

1. **核心概念分析** - 问题、假设、独特性
2. **市场研究** - 用户、TAM/SAM/SOM、竞争对手
3. **技术实施** - 技术栈、MVP 范围、挑战
4. **商业模式** - 收入、定价、单位经济学
5. **上市策略** - 发布、获取、合作伙伴
6. **风险与挑战** - 技术、竞争、监管
7. **结论与建议** - 明确的 是/否 以及行动计划

## 结论类型

- 🟢 **强烈建议** - 明确的机会，积极追求
- 🟡 **有条件建议** - 有前景但需要验证
- 🟠 **建议转型** - 核心洞察良好，执行需要改进
- 🔴 **放弃** - 太多红旗信号

## 示例输出

```
~/clawd/ideas/ai-calendar-assistant/
├── metadata.txt
├── prompt.txt
├── run-claude.sh
└── research.md    # 400-500 行的全面分析
```

## 提示

- 创意分析通常需要 3-5 分钟
- 监控进度: `tmux attach -t idea-<slug>-<timestamp>`
- 即使通知失败，文件也会发送到保存的消息
- 检查 `~/.clawdbot/notify-queue/` 获取卡住的通知
