# /task 技能（任务文档存储）

配置文件：
- 自然语言（本文件夹）：NL + `/task` 且 `disable-model-invocation: false`
- 仅斜杠命令：将 `skills/task-slash/` 复制到您的 skills 文件夹作为 `task/`（低冗余）

此技能使用：
- `command-dispatch: tool` 实现确定性行为

它期望：
- 插件工具 `tasker_cmd` 已被列入白名单（推荐）
- 通过插件 `binary` 配置、`TASKER_BIN` 或 PATH 提供 `tasker` CLI

有关端到端设置，请参阅仓库根目录下的 `docs/CLAWDBOT_INTEGRATION.md`。

## 技能概述

这是一个任务管理技能，允许用户通过自然语言或斜杠命令来管理任务。它集成了 Tasker CLI 工具，提供以下功能：

- 任务列表管理
- 查看今天/逾期的任务
- 周计划
- 添加/移动/完成任务
- 显式 `/task` 命令

## 使用方法

### 自然语言模式

您可以使用自然语言描述您的任务需求，例如：
- "tasks today" - 查看今天的任务
- "what's our week" - 查看本周计划
- "add task today" - 添加今天的任务

### 斜杠命令模式

使用 `/task ...` 命令直接与 Tasker 交互。

## 常见命令映射

| 自然语言描述 | 对应的 Tasker 命令 |
|-------------|------------------|
| tasks today / overdue | `tasks --open --format telegram` |
| what's our week | `week --days 7 --format telegram` |
| show tasks for Work | `tasks --project Work --format telegram` |
| show board | `board --project <name> --format telegram` |
| add <task> today | `add "<task>" --today [--project <name>] --format telegram` |
| add <task> \| <details> | `add --text "<task> \| <details>" --format telegram` |
| capture <text> | `capture "<text>" --format telegram` |
| mark <title> done | `done "<title>"` |
| show config | `config show` |

## 注意事项

1. **格式要求**：使用 `--format telegram` 获得聊天友好的输出格式
2. **文本格式**：如果用户包含 ` | `（空格-管道-空格），使用 `--text "<title | details | due 2026-01-23>"` 格式
3. **分隔符**：仅在明确的 ` | ` 处分割，不要猜测其他分隔符
4. **ID 处理**：对于部分选择器，运行 `resolve "<query>"` 解析，然后按 ID 操作
5. **笔记添加**：使用 `note add <selector...> -- <text...>` 避免歧义
