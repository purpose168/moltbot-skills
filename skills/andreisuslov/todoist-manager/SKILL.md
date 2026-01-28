---
name: todoist
description: 通过 todoist CLI 包装器管理 Todoist 任务、项目、标签和评论。当用户要求添加任务、列出待办事项、完成项目、管理项目或与其 Todoist 账户交互时使用。
---

# Todoist CLI

通过 REST API v2 管理 Todoist。

## 设置

1. 获取 API 令牌：Todoist → 设置 → 集成 → 开发者 → API 令牌
2. 设置环境变量：
   ```bash
   export TODOIST_API_TOKEN="your_token_here"
   ```
3. 使 CLI 可执行：
   ```bash
   chmod +x ~/clawd/skills/todoist/scripts/todoist
   ```

## CLI 位置

```bash
~/clawd/skills/todoist/scripts/todoist
```

## 快速参考

### 任务

```bash
# 列出所有任务
todoist tasks

# 带过滤器列表
todoist tasks --filter "today"
todoist tasks --filter "overdue"
todoist tasks --filter "#Work"
todoist tasks --project PROJECT_ID

# 快速视图
todoist today
todoist overdue
todoist upcoming

# 获取单个任务
todoist task TASK_ID

# 添加任务
todoist add "Buy groceries"
todoist add "Call mom" --due tomorrow
todoist add "Meeting prep" --due "today 3pm" --priority 4
todoist add "Review PR" --project PROJECT_ID --labels "work,urgent"
todoist add "Write docs" --description "Include examples"

# 更新任务
todoist update TASK_ID --content "New title"
todoist update TASK_ID --due "next monday"
todoist update TASK_ID --priority 3

# 完成 / 重新打开 / 删除
todoist complete TASK_ID
todoist reopen TASK_ID
todoist delete-task TASK_ID
```

### 项目

```bash
# 列出项目
todoist projects

# 获取项目
todoist project PROJECT_ID

# 创建项目
todoist add-project "Work"
todoist add-project "Personal" --color blue --favorite

# 更新项目
todoist update-project PROJECT_ID --name "New Name"
todoist update-project PROJECT_ID --color red

# 删除项目
todoist delete-project PROJECT_ID
```

### 版块

```bash
# 列出版块
todoist sections
todoist sections PROJECT_ID

# 创建版块
todoist add-section --name "In Progress" --project PROJECT_ID

# 删除版块
todoist delete-section SECTION_ID
```

### 标签

```bash
# 列出标签
todoist labels

# 创建标签
todoist add-label "urgent"
todoist add-label "blocked" --color red

# 删除标签
todoist delete-label LABEL_ID
```

### 评论

```bash
# 列出评论
todoist comments --task TASK_ID
todoist comments --project PROJECT_ID

# 添加评论
todoist add-comment "Need more info" --task TASK_ID

# 删除评论
todoist delete-comment COMMENT_ID
```

## 过滤器语法

Todoist 支持强大的过滤器查询：

| 过滤器 | 描述 |
|--------|------|
| `today` | 今天到期 |
| `tomorrow` | 明天到期 |
| `overdue` | 已过期 |
| `7 days` | 未来 7 天到期 |
| `no date` | 无截止日期 |
| `#ProjectName` | 在特定项目中 |
| `@label` | 带有标签 |
| `p1`, `p2`, `p3`, `p4` | 优先级级别 |
| `assigned to: me` | 分配给你 |
| `created: today` | 今天创建 |

使用 `&`（和）或 `|`（或）组合：
```bash
todoist tasks --filter "today & #Work"
todoist tasks --filter "overdue | p1"
```

## 截止日期字符串

自然语言截止日期：
- `today`、`tomorrow`、`yesterday`
- `next monday`、`next week`
- `in 3 days`
- `every day`、`every weekday`
- `every monday at 9am`
- `Jan 15`、`2026-01-20`
- `today at 3pm`

## 优先级级别

| 值 | 含义 |
|----|------|
| 1 | 正常（默认）|
| 2 | 中等 |
| 3 | 高 |
| 4 | 紧急 |

## 输出

所有命令都返回 JSON。使用管道到 `jq` 进行格式化：

```bash
todoist tasks | jq '.[] | {id, content, due: .due.string}'
todoist today | jq -r '.[].content'
```

## 注意事项

- 需要 `curl` 和 `jq`
- 所有输出都是 JSON，便于脚本编写
- 任务是数字字符串（例如 "8765432109"）
- 项目也是数字字符串
