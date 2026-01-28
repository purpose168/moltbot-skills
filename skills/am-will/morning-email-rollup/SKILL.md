---
name: morning-email-rollup
description: 每天早上 8 点自动汇总重要邮件和日历事件，并使用 AI 生成摘要
metadata: {"clawdbot":{"emoji":"📧","requires":{"bins":["gog","gemini","jq","date"]}}}
---

# 晨间邮件汇总

每天自动生成重要邮件的每日摘要，并在丹佛时间上午 8 点发送到 Telegram。

## 设置

**必需：** 设置您的 Gmail 账户邮箱：
```bash
export GOG_ACCOUNT="your-email@gmail.com"
```

或直接编辑脚本以设置默认值。

## 功能

- 每天运行一次，时间为上午 8:00（可配置时区）
- **显示今天的日历事件** 来自 Google 日历
- 搜索过去 24 小时内标记为**重要**或**星标**的邮件
- 使用 AI（Gemini CLI）为每封邮件生成自然语言摘要
- 显示最多 20 封最重要的邮件，包括：
  - 🔴 未读指示器（红色）
  - 🟢 已读指示器（绿色）
  - 发件人姓名/邮箱
  - 主题行
  - **AI 生成的 1 句话摘要**（自然语言，不是抓取的内容）
- 将格式化的摘要发送到 Telegram

## 使用方法

### 手动运行
```bash
# 默认（10 封邮件）
bash skills/morning-email-rollup/rollup.sh

# 自定义邮件数量
MAX_EMAILS=20 bash skills/morning-email-rollup/rollup.sh
MAX_EMAILS=5 bash skills/morning-email-rollup/rollup.sh
```

### 查看日志
```bash
cat $HOME/clawd/morning-email-rollup-log.md
```

## 工作原理

1. **检查日历** - 通过 `gog` 从 Google 日历列出今天的事件
2. **搜索 Gmail** - 查询：`is:important OR is:starred newer_than:1d`
3. **获取详情** - 获取每封邮件的发件人、主题、日期和正文
4. **AI 摘要** - 使用 Gemini CLI 生成自然语言摘要
5. **格式化输出** - 创建带有已读/未读标记的可读摘要
6. **发送到 Telegram** - 通过 Clawdbot 的消息系统发送

## 日历集成

脚本自动使用与查询 Gmail 相同的 `gog` CLI 从您的 Google 日历包含今天的事件。

**优雅降级：**
- 如果 `gog` 未安装 → 日历部分静默跳过（无错误）
- 如果今天没有事件 → 日历部分静默跳过
- 如果有事件 → 显示格式化的列表，包含 12 小时制时间和标题

**要求：**
- `gog` 必须已安装并通过身份验证
- 使用为 Gmail 配置的相同 Google 账户（通过 `GOG_ACCOUNT` 环境变量设置）

## 邮件标准

邮件如果符合**任何**以下条件就会被包含：
- 被 Gmail 标记为**重要**（闪电图标）
- 被您手动**标星**
- 在**过去 24 小时内**收到

## AI 摘要

每封邮件使用 Gemini CLI（`gemini`）进行摘要：
- 提取邮件正文（清理 HTML/CSS）
- 发送到 `gemini --model gemini-2.0-flash`，并带有摘要提示
- 摘要是中等到长的自然语言（不是抓取的内容）
- 如果 Gemini 不可用，则回退到清理后的正文文本

**重要：** 邮件正文作为提示的一部分传递（而不是通过 stdin），因为 gemini CLI 不能正确处理带提示的管道输入。

**示例输出：**
```
🔴 **William Ryan: 团队会议邀请**
   邮件邀请您明天下午 2 点参加团队会议，讨论 Q1 路线图并分配即将到来的冲刺任务。
```

## 已读/未读指示器

- 🔴 红点 = 未读邮件
- 🟢 绿点 = 已读邮件

所有邮件都显示这些标记之一，以保持视觉一致性。

## 格式化说明

**主题和摘要清理：**
- 自动从主题行中去除额外的引号（例如 `""Agent Skills""` → `Agent Skills`）
- 来自 Gemini 的摘要也会清理前导/尾随引号
- 这确保了在 Telegram/其他渠道中的干净、可读的输出

## Cron 定时任务

在您偏好的时间设置每日 cron 作业：
```bash
cron add --name "Morning Email Rollup" \
  --schedule "0 8 * * *" \
  --tz "America/Denver" \
  --session isolated \
  --message "GOG_ACCOUNT=your-email@gmail.com bash /path/to/skills/morning-email-rollup/rollup.sh"
```

根据您的偏好调整时间（上午 8:00）和时区。

## 自定义

### 更改邮件数量

默认情况下，汇总显示**10 封邮件**。要更改此设置：

**临时（一次性）：**
```bash
MAX_EMAILS=20 bash skills/morning-email-rollup/rollup.sh
```

**永久：**
编辑 `skills/morning-email-rollup/rollup.sh`：
```bash
MAX_EMAILS="${MAX_EMAILS:-20}"  # 将 10 更改为您偏好的数量
```

### 更改搜索条件

编辑 `skills/morning-email-rollup/rollup.sh`：

```bash
# 当前：过去 24 小时内的重要或星标邮件
IMPORTANT_EMAILS=$(gog gmail search 'is:important OR is:starred newer_than:1d' --max 20 ...)

# 其他搜索示例：
# 仅未读的重要邮件
IMPORTANT_EMAILS=$(gog gmail search 'is:important is:unread newer_than:1d' --max 20 ...)

# 特定发件人
IMPORTANT_EMAILS=$(gog gmail search 'from:boss@company.com OR from:client@example.com newer_than:1d' --max 20 ...)

# 按标签/类别
IMPORTANT_EMAILS=$(gog gmail search 'label:work is:important newer_than:1d' --max 20 ...)
```

### 更改时间

更新 cron 定时任务：
```bash
# 列出 cron 作业以获取 ID
cron list

# 更新定时任务（例如：上午 7 点而不是上午 8 点）
cron update <job-id> --schedule "0 7 * * *" --tz "America/Denver"
```

### 更改摘要样式

编辑 `rollup.sh` 中 `summarize_email()` 函数的提示：

```bash
# 当前：中等到长的 1 句话
"Summarize this email in exactly 1 sentence of natural language. Make it medium to long length. Don't use quotes:"

# 更短的摘要
"Summarize in 1 short sentence:"

# 更多细节
"Summarize in 2-3 sentences with key details:"
```

### 更改 AI 模型

编辑 `summarize_email()` 中的 gemini 命令：
```bash
# 当前：gemini-2.0-flash（快速）
gemini --model gemini-2.0-flash "Summarize..."

# 使用不同的模型
gemini --model gemini-pro "Summarize..."
```

## 故障排除

### 未收到汇总
```bash
# 检查 cron 作业是否已启用
cron list

# 检查上次运行状态
cron runs <job-id>

# 手动测试
bash skills/morning-email-rollup/rollup.sh
```

### 缺少邮件
- Gmail 的重要性标记可能会过滤掉预期的邮件
- 检查邮件是否在 Gmail 中实际标记为重要/星标
- 尝试手动搜索：`gog gmail search 'is:important newer_than:1d'`

### 摘要未出现
- 检查是否安装了 `gemini` CLI：`which gemini`
- 手动测试：`echo "test" | gemini "Summarize this:"`
- 验证 Gemini 已通过身份验证（它应该在首次运行时提示）

### 时区错误
- Cron 使用 `America/Denver`（MST/MDT）
- 使用以下命令更新：`cron update <job-id> --tz "Your/Timezone"`

## 日志历史

所有汇总运行都记录到：
```
$HOME/clawd/morning-email-rollup-log.md
```

格式：
```markdown
- [2026-01-15 08:00:00] 🔄 开始晨间邮件汇总
- [2026-01-15 08:00:02] ✅ 汇总完成：15 封邮件
```