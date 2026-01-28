---
name: topydo
description: 使用 topydo CLI 管理 todo.txt 任务。添加、列出、完成、优先级、标签和组织任务，支持依赖关系、截止日期、重复、项目和上下文。适用于任何任务管理、待办事项列表，或当用户提及任务、待办事项或 todo.txt 时。
license: MIT
compatibility: 需要 Python 3 和 pip。在 macOS、Linux 和 Windows 上运行。
metadata: {"clawdbot":{"requires":{"bins":["topydo"]},"install":[{"id":"brew","kind":"brew","formula":"topydo","bins":["topydo"],"label":"Install topydo (brew)"},{"id":"pip","kind":"pip","package":"topydo","bins":["topydo"],"label":"Install topydo (pip)"}]}}
---

# topydo - Todo.txt 任务管理器

topydo 是一个强大的 CLI 工具，用于管理 todo.txt 格式的任务。它支持依赖关系、截止日期、开始日期、重复、优先级、项目和上下文。

## 任务格式参考

```
(A) 2025-01-11 任务内容 +Project @Context due:2025-01-15 t:2025-01-10 rec:1w star:1
│   │          │         │        │        │             │            │      │
│   │          │         │        │        │             │            │      └─ 星标标记
│   │          │         │        │        │             │            └─ 重复周期
│   │          │         │        │        │             └─ 开始/阈值日期
│   │          │         │        │        └─ 截止日期
│   │          │         │        └─ 上下文
│   │          │         └─ 项目
│   │          └─ 任务描述
│   └─ 创建日期
└─ 优先级 (A-Z)
```

## 安装

### Homebrew (macOS，首选)
```bash
brew install topydo
```

### pip (所有平台)
```bash
pip3 install topydo
```

使用可选功能：
```bash
pip3 install 'topydo[columns,prompt,ical]'
```

### apt (Ubuntu/Debian)
```bash
sudo apt install python3-pip && pip3 install topydo
```

## 配置

配置文件位置（按优先级排序）：
- `topydo.conf` 或 `.topydo`（当前目录）
- `~/.topydo` 或 `~/.config/topydo/config`
- `/etc/topydo.conf`

示例 `~/.topydo`：
```ini
[topydo]
filename = ~/todo.txt
archive_filename = ~/done.txt
colors = 1
identifiers = text

[add]
auto_creation_date = 1

[sort]
sort_string = desc:importance,due,desc:priority
ignore_weekends = 1
```

## 添加任务

基本任务：
```bash
topydo add "购买杂货"
```

带优先级（A 最高）：
```bash
topydo add "(A) 紧急任务"
```

带项目和上下文：
```bash
topydo add "写报告 +ProjectX @办公室"
```

带截止日期（绝对日期）：
```bash
topydo add "提交提案 due:2025-01-15"
```

带截止日期（相对日期）：
```bash
topydo add "打电话给妈妈 due:明天"
```

带截止日期（星期几）：
```bash
topydo add "每周回顾 due:周五"
```

带开始/阈值日期：
```bash
topydo add "未来任务 t:2025-02-01"
```

带重复（每周）：
```bash
topydo add "浇花 due:周六 rec:1w"
```

带严格重复（始终在每月 1 号）：
```bash
topydo add "付房租 due:2025-02-01 rec:+1m"
```

带依赖（必须先完成任务 1）：
```bash
topydo add "编写测试 before:1"
```

作为任务 1 的子任务：
```bash
topydo add "审查代码 partof:1"
```

## 列出任务

列出所有相关任务：
```bash
topydo ls
```

包括隐藏/阻塞的任务：
```bash
topydo ls -x
```

按项目筛选：
```bash
topydo ls +ProjectX
```

按上下文筛选：
```bash
topydo ls @办公室
```

按优先级筛选：
```bash
topydo ls "(A)"
```

按优先级范围筛选：
```bash
topydo ls "(>C)"
```

筛选今天到期的任务：
```bash
topydo ls due:今天
```

筛选逾期任务：
```bash
topydo ls "due:<今天"
```

筛选周五到期的任务：
```bash
topydo ls "due:<=周五"
```

组合多个筛选条件：
```bash
topydo ls +ProjectX @办公室 due:今天
```

排除上下文：
```bash
topydo ls -- -@等待中
```

按优先级排序：
```bash
topydo ls -s priority
```

按截止日期降序，然后按优先级：
```bash
topydo ls -s desc:due,priority
```

按项目分组：
```bash
topydo ls -g project
```

限制为 5 个结果：
```bash
topydo ls -n 5
```

自定义输出格式：
```bash
topydo ls -F "%I %p %s %{due:}d"
```

输出为 JSON：
```bash
topydo ls -f json
```

## 完成任务

按 ID 完成：
```bash
topydo do 1
```

完成多个任务：
```bash
topydo do 1 2 3
```

完成所有今天到期的任务：
```bash
topydo do -e due:今天
```

使用自定义日期完成：
```bash
topydo do -d 昨天 1
```

## 优先级管理

设置优先级 A：
```bash
topydo pri 1 A
```

为多个任务设置优先级：
```bash
topydo pri 1 2 3 B
```

移除优先级：
```bash
topydo depri 1
```

## 标签任务

设置截止日期：
```bash
topydo tag 1 due 明天
```

星标任务：
```bash
topydo tag 1 star 1
```

移除标签：
```bash
topydo tag 1 due
```

使用相对日期设置自定义标签：
```bash
topydo tag -r 1 review 2w
```

## 修改任务

追加文本到任务：
```bash
topydo append 1 "附加笔记"
```

追加截止日期：
```bash
topydo append 1 due:周五
```

在文本编辑器中编辑任务：
```bash
topydo edit 1
```

编辑项目中的所有任务：
```bash
topydo edit -e +ProjectX
```

## 删除任务

按 ID 删除：
```bash
topydo del 1
```

删除多个：
```bash
topydo del 1 2 3
```

按表达式删除：
```bash
topydo del -e completed:今天
```

## 依赖关系

添加依赖（任务 2 依赖于任务 1）：
```bash
topydo dep add 2 to 1
```

任务 2 是任务 1 的一部分：
```bash
topydo dep add 2 partof 1
```

列出依赖任务 1 的任务：
```bash
topydo dep ls 1 to
```

列出任务 1 依赖的任务：
```bash
topydo dep ls to 1
```

移除依赖：
```bash
topydo dep rm 2 to 1
```

可视化依赖关系（需要 graphviz）：
```bash
topydo dep dot 1 | dot -Tpng -o deps.png
```

## 推迟任务

推迟 1 周：
```bash
topydo postpone 1 1w
```

推迟 3 天：
```bash
topydo postpone 1 3d
```

包括开始日期推迟：
```bash
topydo postpone -s 1 1w
```

## 其他命令

排序 todo.txt 文件：
```bash
topydo sort
```

回退上一个命令：
```bash
topydo revert
```

显示回退历史：
```bash
topydo revert ls
```

列出所有项目：
```bash
topydo lsprj
```

列出所有上下文：
```bash
topydo lscon
```

归档已完成的任务：
```bash
topydo archive
```

## 相对日期

- `今天`、`明天`、`昨天`
- 星期几：`周一`、`周二`、`周三`、`周四`、`周五`、`周六`、`周日`
- 时间段：`1d`（天）、`2w`（周）、`3m`（月）、`1y`（年）
- 工作日：`5b`（排除周末）

## 排序/分组字段

- `priority`、`due`、`creation`、`completed`
- `importance`、`importance-avg`
- `project`、`context`、`text`、`length`

添加 `desc:` 前缀以降序排列。示例：`desc:importance,due`

## 提示

- 使用清晰、易读的格式向用户呈现结果
- 启用稳定的文本 ID：在配置中设置 `identifiers = text`
- 星标重要任务：添加 `star:1` 标签
- 默认隐藏标签：`id`、`p`、`ical`
- 重要性 = 优先级 + 截止日期接近度 + 星标状态