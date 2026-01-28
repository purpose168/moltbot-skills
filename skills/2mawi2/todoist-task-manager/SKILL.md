---
name: todoist
description: 通过 `todoist` 命令行工具管理 Todoist 任务（列出、添加、修改、完成、删除）。支持过滤器、项目、标签和优先级。
homepage: https://github.com/sachaos/todoist
metadata: {"clawdbot":{"emoji":"✅","requires":{"bins":["todoist"]},"install":[{"id":"brew","kind":"brew","formula":"todoist-cli","bins":["todoist"],"label":"通过 Homebrew 安装 todoist-cli"}]}}
---

# Todoist 命令行工具

使用 `todoist` 直接从终端管理 Todoist 任务。

## 设置

1. 安装：`brew install todoist-cli`
2. 从 https://app.todoist.com/app/settings/integrations/developer 获取您的 API 令牌
3. 创建配置：
```bash
mkdir -p ~/.config/todoist
echo '{"token": "YOUR_API_TOKEN"}' > ~/.config/todoist/config.json
```
4. 同步：`todoist sync`

## 列出任务

```bash
todoist list                           # 所有任务
todoist list --filter "today"          # 今天到期
todoist list --filter "overdue"        # 逾期任务
todoist list --filter "p1"             # 优先级 1（最高）
todoist list --filter "tomorrow"       # 明天到期
todoist list --filter "@work"          # 按标签
todoist list --filter "#Project"       # 按项目
todoist list --filter "(today | overdue) & p1"  # 组合过滤器
```

## 添加任务

```bash
todoist add "Buy milk"                                    # 简单任务
todoist add "Call mom" --priority 1                       # 带优先级（1=最高，4=最低）
todoist add "Meeting" --date "tomorrow 3pm"               # 带到期日期
todoist add "Report" --project-name "Work"                # 到特定项目
todoist add "Review" --label-names "urgent,review"        # 带标签
todoist quick "Buy eggs tomorrow p1 #Shopping @errands"   # 自然语言
```

## 修改任务

```bash
todoist modify TASK_ID --content "New title"
todoist modify TASK_ID --priority 2
todoist modify TASK_ID --date "next monday"
```

## 完成任务

```bash
todoist close TASK_ID              # 完成任务
todoist close TASK_ID TASK_ID2     # 完成多个任务
```

## 删除任务

```bash
todoist delete TASK_ID
```

## 查看详情

```bash
todoist show TASK_ID               # 显示任务详情
todoist projects                   # 列出所有项目
todoist labels                     # 列出所有标签
```

## 同步

```bash
todoist sync                       # 同步本地缓存与 Todoist
```

## 输出格式

```bash
todoist list --csv                 # CSV 输出（用于脚本）
todoist list --color               # 彩色输出
todoist list --namespace           # 显示父任务为命名空间
todoist list --indent              # 缩进子任务
```

## 过滤器语法

Todoist 命令行工具支持 [官方 Todoist 过滤器语法](https://todoist.com/help/articles/introduction-to-filters-V98wIH)：

| 过滤器 | 描述 |
|--------|------|
| `today` | 今天到期 |
| `tomorrow` | 明天到期 |
| `overdue` | 过期 |
| `no date` | 无到期日期 |
| `p1`, `p2`, `p3`, `p4` | 优先级 |
| `@label` | 按标签 |
| `#Project` | 按项目 |
| `assigned to: me` | 分配给你 |
| `7 days` | 7 天内到期 |

使用 `&`（和）、`|`（或）、`!`（非）组合：
```bash
todoist list --filter "(today | overdue) & p1"
todoist list --filter "#Work & !@done"
```

## 注意事项

- 在网页/移动应用中进行更改后运行 `todoist sync`
- 任务 ID 是数字（例如 `12345678`）
- 配置存储在 `~/.config/todoist/config.json`
- 缓存存储在 `~/.config/todoist/cache.json`