# Telegram 使用统计命令技能

一个自定义的 Telegram 命令技能，可以在一格式整洁的消息中显示全面的会话使用统计信息。

## 功能特性

✅ **剩余配额** - 显示剩余 API 配额的百分比（特定于提供者）  
✅ **会话时间** - 显示会话重置前的剩余时间  
✅ **令牌使用量** - 显示会话中使用的输入和输出令牌数量  
✅ **上下文窗口** - 显示当前上下文窗口使用情况  
✅ **可视化指示器** - 颜色编码的表情符号，便于快速状态检查  
✅ **单条消息** - 所有信息整合在一条整洁的 Telegram 消息中  

## 安装方法

### 方式一：通过 ClawdHub 自动安装

```bash
clawdhub install telegram-usage
```

### 方式二：手动安装（已存在于工作区）

该技能位于您 Clawdbot 工作区的 `/skills/telegram-usage` 目录。

## 配置步骤

### 1. 启用技能

确保在 `~/.clawdbot/clawdbot.json` 中启用了该技能：

```json
{
  "skills": {
    "entries": {
      "telegram-usage": {
        "enabled": true
      }
    }
  }
}
```

### 2. 添加自定义命令到 Telegram（可选）

通过配置在 Telegram 机器人菜单中注册命令：

```json
{
  "channels": {
    "telegram": {
      "customCommands": [
        {
          "command": "usage",
          "description": "显示会话使用统计"
        }
      ]
    }
  }
}
```

### 3. 重启网关

```bash
clawdbot gateway restart
```

或者如果手动运行：

```bash
clawdbot gateway
```

## 使用方法

### 在 Telegram 中使用

发送以下任意命令：

```
/telegram_usage
/usage          （如果已注册自定义命令）
/skill telegram-usage
```

### 输出示例

```
📊 会话使用报告

🔋 剩余配额
🟢 82% 的 API 配额可用
提供者：anthropic

⏱️ 会话时间
3 小时 40 分钟剩余
（每天凌晨 4:00 重置）

🎯 已使用令牌
4,370 个令牌总数
├─ 输入：2,847
└─ 输出：1,523

📦 上下文窗口
🟢 已使用 45%
1,856 / 4,096 个令牌

模型：Claude 3.5 Haiku
```

## 配置说明

无需额外配置。该技能会自动从 Clawdbot 的会话状态中读取数据。

### 可选：调整重置时间

默认会话重置时间为凌晨 4:00。在 `~/.clawdbot/clawdbot.json` 中配置：

```json
{
  "session": {
    "reset": {
      "mode": "daily",
      "atHour": 4
    }
  }
}
```

## 颜色指示器含义

- 🟢 **绿色** - 良好（剩余 75% 以上）
- 🟡 **黄色** - 警告（剩余 50-75%）
- 🟠 **橙色** - 低（剩余 25-50%）
- 🔴 **红色** - 紧急（剩余不足 25%）

## 工作原理

1. **作为技能运行** - 通过 Clawdbot 的技能系统加载
2. **使用会话数据** - 从当前会话存储中读取
3. **使用 HTML 格式化** - Telegram 安全的 HTML 格式（粗体、代码块）
4. **单条消息** - 在一条 Telegram 消息中返回所有信息
5. **实时更新** - 每次调用时使用当前值更新

## 包含的文件

- `SKILL.md` - 技能元数据和 AgentSkills 清单
- `handler.js` - 用于格式化使用数据的 Node.js 处理器
- `README.md` - 本文档
- `config-example.json` - 配置示例

## 测试方法

### 手动测试（命令行）

```bash
node /home/drew-server/clawd/skills/telegram-usage/handler.js
```

预期输出：HTML 格式的使用报告

### JSON 输出

```bash
node /home/drew-server/clawd/skills/telegram-usage/handler.js json
```

预期输出：原始统计数据的 JSON 格式

### 在 Telegram 中测试

1. 在与机器人的任何私聊中发送 `/usage`
2. 期望收到包含当前统计信息的格式消息
3. 重复操作以查看更新后的值

## 故障排除

### 命令未出现在 Telegram 中

- 确保技能已启用：`clawdbot config get skills.entries.telegram-usage.enabled`
- 重启网关：`clawdbot gateway restart`
- 检查日志：`clawdbot logs --follow`

### 统计显示为零/错误值

- 该技能从当前会话状态读取数据
- 使用 `/new` 开始新会话后再试
- 验证会话文件是否存在：`~/.clawdbot/agents/main/sessions/sessions.json`

### HTML 格式显示错误

- Telegram 的 HTML 支持有限
- 该技能使用安全的标签：`<b>`、`<i>`、`<code>`
- 如果 Telegram 拒绝，请检查网关日志

## 技术细节

### 配额来源

配额百分比来自：
1. 当前提供者的使用情况跟踪（如果已启用）
2. 如果没有跟踪数据，默认为 85%
3. 可以按提供者自定义

### 会话时间

- 在配置的时间（默认本地时间凌晨 4:00）重置
- 显示距离下次重置的剩余时间
- 可以通过 `/reset` 或 `/new` 命令覆盖

### 令牌统计

- **输入令牌**：从助手的输入上下文中计算
- **输出令牌**：从助手的响应中计算
- **总数**：当前会话的输入 + 输出之和

### 上下文使用情况

- 显示在上下文窗口中的当前位置
- 随着对话增长而更新
- 包括消息、文件、工具和系统提示

## 使用限制

- **仅限私聊** - 群组显示会话特定的统计信息，但结构相同
- **基于会话** - 统计信息在会话重置时重置（每天或显式 `/reset` 时）
- **近似值** - 百分比四舍五入到最接近的整数
- **依赖于提供者** - 配额详情因 API 提供者而异（Anthropic、OpenAI 等）

## 未来改进方向

潜在的改进：
- [ ] 图形可视化（基于文本）
- [ ] 跨会话历史记录跟踪
- [ ] 每个提供者的成本估算
- [ ] 令牌消耗率（令牌/分钟）
- [ ] 上下文压缩建议
- [ ] 低配额警报

## 许可证

此技能是 Clawdbot 项目的一部分。

## 支持

- **文档**：https://docs.clawd.bot/tools/skills
- **问题反馈**：查看 Clawdbot GitHub
- **常见问题**：在 Telegram 中使用 `/help` 查看
