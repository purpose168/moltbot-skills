---
name: todoist
description: 通过 `todoist` 命令行工具管理 Todoist 任务、项目、标签和板块。当用户要求添加/完成/列出任务、显示今天的任务、搜索任务或管理项目时使用此工具。
homepage: https://github.com/buddyh/todoist-cli
metadata: {"clawdbot":{"emoji":"✅","requires":{"bins":["todoist"]},"install":[{"id":"brew","kind":"brew","formula":"buddyh/tap/todoist","bins":["todoist"],"label":"安装 todoist (brew)"},{"id":"go","kind":"go","module":"github.com/buddyh/todoist-cli/cmd/todoist@latest","bins":["todoist"],"label":"安装 todoist-cli (go)"}]}}
---

# Todoist CLI（命令行工具）

使用 `todoist` 通过 Todoist REST API 管理任务、项目、标签和板块。

## 任务管理

```bash
# 查看今天的任务（默认行为）
todoist

# 列出任务
todoist tasks --all
todoist tasks --filter "p1"           # 高优先级
todoist tasks --filter "overdue"      # 已过期
todoist tasks -p 工作                 # 按项目筛选

# 添加新任务
todoist add "购买日用品"
todoist add "给妈妈打电话" -d 明天
todoist add "紧急任务" -P 1 -d "今天 17:00" -l urgent

# 完成 / 重新打开任务
todoist complete <任务ID>
todoist done <任务ID>
todoist reopen <任务ID>

# 更新任务
todoist update <任务ID> --due "下周一"
todoist update <任务ID> -P 2

# 移动任务（看板视图）
todoist move <任务ID> --section "进行中"
todoist move <任务ID> --project "工作"

# 删除任务
todoist delete <任务ID>

# 查看 / 搜索任务
todoist view <任务ID>
todoist search "会议"
```

## 项目管理

```bash
# 列出所有项目
todoist projects
# 添加新项目
todoist projects add "新项目" --color 蓝色
```

## 标签管理

```bash
# 列出所有标签
todoist labels
# 添加新标签
todoist labels add urgent --color 红色
```

## 板块管理

```bash
# 列出项目中的板块
todoist sections -p 工作
# 添加新板块
todoist sections add "进行中" -p 工作
```

## 任务评论

```bash
# 查看任务的评论
todoist comment <任务ID>
# 添加评论
todoist comment <任务ID> "这是一个备注"
```

## 已完成任务

```bash
# 查看已完成的任务
todoist completed
todoist completed --since 2024-01-01 --limit 50
```

## 命令参考

| 命令 | 功能描述 |
|------|---------|
| `todoist` | 显示今天的任务列表 |
| `todoist tasks` | 带筛选条件的任务列表 |
| `todoist add` | 创建新任务 |
| `todoist complete` | 标记任务为完成 |
| `todoist done` | complete 命令的别名 |
| `todoist reopen` | 重新打开已完成的的任务 |
| `todoist move` | 将任务移动到指定板块/项目 |
| `todoist update` | 更新任务信息 |
| `todoist delete` | 删除任务 |
| `todoist view` | 查看任务详情 |
| `todoist search` | 搜索任务 |
| `todoist projects` | 列出/管理项目 |
| `todoist labels` | 列出/管理标签 |
| `todoist sections` | 列出/管理板块 |
| `todoist comment` | 查看/添加任务评论 |
| `todoist completed` | 显示已完成的任务 |

## 优先级映射

| CLI 参数 | Todoist 优先级 |
|---------|---------------|
| `-P 1` | p1（最高优先级） |
| `-P 2` | p2 |
| `-P 3` | p3 |
| `-P 4` | p4（最低优先级） |

## 重要说明

- 所有命令都支持 `--json` 参数以输出机器可读的 JSON 格式
- 身份验证：运行 `todoist auth` 命令或设置 `TODOIST_API_TOKEN` 环境变量
