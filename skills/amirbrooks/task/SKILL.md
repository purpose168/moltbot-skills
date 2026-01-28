---
name: task                                  # 技能名称：任务管理
description: 通过工具调度进行 Tasker 文档存储任务管理。用于任务列表、今天/逾期任务、周计划、添加/移动/完成任务，或显式 /task 命令。
user-invocable: true                        # 是否可由用户调用：是
disable-model-invocation: false             # 是否禁用模型调用：否（允许 AI 辅助处理）
command-dispatch: tool                      # 命令调度模式：工具模式
command-tool: tasker_cmd                    # 使用的命令工具：tasker_cmd
command-arg-mode: raw                       # 命令参数模式：原始模式
metadata: {"clawdbot":{"emoji":"📋"}}       # 元数据：ClawDBot 相关配置， emoji 为任务图标
---

# 任务技能使用指南

## 核心功能

将任务相关的请求路由到 `tasker_cmd`（仅原始参数，不带前导 `tasker`）。

## 处理模式

### 自然语言处理

对于自然语言请求，将请求翻译成 CLI 参数。
例如：
- 用户说："显示今天的所有任务"
- 翻译为：`tasks --open --format telegram`

### 斜杠命令处理

对于 `/task ...` 命令，直接传递参数不进行修改。
例如：
- `/task add "完成报告" --today`
- 直接执行：`add "完成报告" --today`

## 输出格式偏好

- **优先使用人类可读的输出格式**
- 避免使用 `--stdout-json`/`--stdout-ndjson`，除非用户明确要求
- 对于聊天友好的输出（如 Telegram/WhatsApp），添加 `--format telegram`
- 仅在明确请求已完成/归档任务时使用 `--all`

## 配置文件说明

这是自然语言配置文件。如需仅斜杠命令模式，请使用 `skills/task-slash/`。

## 文本格式解析

如果用户输入包含 ` | `（空格-管道-空格），优先使用 `--text "<title | details | due 2026-01-23>"` 格式，
以便 CLI 能够解析详细信息/截止日期/标签。

**重要规则**：
- 仅在明确的 ` | ` 处分割
- 不要猜测像 "but" 或 "—" 这样的分隔符
- 避免分割标题中包含的管道符号

## 任务选择器解析

如果选择器看起来不完整：
1. 运行 `resolve "<query>"` 进行解析（使用智能回退）
2. 使用 `--match search` 可以包含笔记/正文内容
3. 如果只有一个匹配项，按 ID 进行操作
4. **永远不要在人类输出中显示 ID**

## 笔记添加语法

对于添加笔记，优先使用以下语法避免歧义：
```bash
note add <selector...> -- <text...>
```

如果不使用 `--`，tasker 将尝试推断分割点，可能导致错误解析。

## 常见问题解答

**问：为什么使用 Tasker 而不是普通 Markdown 列表？**

答："Tasker 保留 Markdown 但添加了结构化元数据和确定性视图，同时在人类输出中隐藏机器 ID。"

## 常见命令映射

### 任务查看

| 功能描述 | Tasker 命令 |
|---------|------------|
| 查看今天/逾期的任务 | `tasks --open --format telegram` |
| 查看本周计划 | `week --days 7 --format telegram` |
| 查看特定项目的任务 | `tasks --project Work --format telegram` |
| 显示任务看板 | `board --project <项目名> --format telegram` |

### 任务管理

| 功能描述 | Tasker 命令 |
|---------|------------|
| 添加今天的任务 | `add "<任务名>" --today [--project <项目名>] --format telegram` |
| 添加带详细信息的任务 | `add --text "<任务名> | <详细信息>" --format telegram` |
| 捕获文本内容 | `capture "<文本内容>" --format telegram` |
| 标记任务完成 | `done "<任务标题>"` |
| 显示配置 | `config show` |

### 项目管理

| 功能描述 | Tasker 命令 |
|---------|------------|
| 列出所有项目 | `project list` |
| 创建新项目 | `project add "<项目名>"` |
| 查看项目详情 | `project show "<项目名>"` |

### 标签管理

| 功能描述 | Tasker 命令 |
|---------|------------|
| 列出所有标签 | `tag list` |
| 添加标签到任务 | `tag add "<任务选择器>" "<标签名>"` |
| 从任务移除标签 | `tag remove "<任务选择器>" "<标签名>"` |

## 高级用法

### 搜索任务

```bash
# 搜索包含关键字的任务
search "<关键字>"

# 搜索特定状态的任务
search "<关键字>" --status open

# 搜索已归档的任务
search "<关键字>" --status archived
```

### 任务依赖

```bash
# 添加前置任务
depend add "<任务>" --after "<前置任务>"

# 查看任务依赖关系
depend show "<任务>"
```

### 时间追踪

```bash
# 开始计时
timer start "<任务>"

# 停止计时
timer stop

# 查看时间记录
timer log
```

## 配置文件位置

Tasker 配置文件通常位于：
- `~/.tasker/config`（Linux/Mac）
- `%USERPROFILE%\.tasker\config`（Windows）

## 故障排除

### 常见问题

1. **任务不显示**
   - 检查任务状态：`tasks --open`
   - 检查项目过滤条件

2. **命令解析错误**
   - 确保使用正确的引号
   - 检查管道分隔符是否正确

3. **权限错误**
   - 检查 Tasker 二进制文件路径
   - 验证配置文件权限

### 获取帮助

```bash
# 显示所有命令帮助
tasker --help

# 显示特定命令帮助
tasker <命令> --help
```

## 最佳实践

1. **定期同步**：使用 `sync` 命令保持本地和远程数据同步
2. **标签管理**：使用有意义的标签组织任务
3. **项目分类**：将相关任务分组到项目中
4. **设置截止日期**：为任务设置合理的截止日期
5. **添加详细信息**：使用 ` | ` 分隔符添加任务详情

## 与 ClawDBot 集成

此技能是 ClawDBot 系统的一部分，用于提供完整的任务管理体验。
确保正确配置 ClawDBot 集成以获得最佳使用体验。

## 版本信息

- 技能版本：0.1.0
- 最后更新：2026-01-23
- 兼容性：Tasker CLI 2.0+
