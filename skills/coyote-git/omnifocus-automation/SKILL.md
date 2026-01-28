---
name: omnifocus
description: 通过 Omni Automation 管理 OmniFocus 任务、项目和文件夹。用于任务管理、待办事项列表、项目跟踪、GTD 工作流、添加/完成/编辑任务、设置截止日期、管理标签和重复任务。需要 macOS 上安装 OmniFocus。
---

# OmniFocus

通过 JXA（JavaScript for Automation）控制 OmniFocus。

## 要求

- 已安装 OmniFocus 3 或 4 的 macOS
- OmniFocus 必须在运行中（或将自动启动）

## 快速参考

```bash
# 通过包装脚本运行
./scripts/of <命令> [参数...]

# 或直接运行
osascript -l JavaScript ./scripts/omnifocus.js <命令> [参数...]
```

## 命令

### 列出/查询

| 命令 | 描述 |
|------|------|
| `inbox` | 列出收件箱任务 |
| `folders` | 列出所有文件夹 |
| `projects [文件夹]` | 列出项目，可按文件夹筛选 |
| `tasks <项目>` | 列出项目中的任务 |
| `tags` | 列出所有标签 |
| `today` | 今天或逾期任务 |
| `flagged` | 已标记的未完成任务 |
| `search <查询>` | 按名称搜索任务 |
| `info <任务ID>` | 完整任务详情 |

### 创建

| 命令 | 描述 |
|------|------|
| `add <名称> [项目]` | 添加任务到收件箱或项目 |
| `newproject <名称> [文件夹]` | 创建项目 |
| `newfolder <名称>` | 创建顶级文件夹 |
| `newtag <名称>` | 创建或获取标签 |

### 修改

| 命令 | 描述 |
|------|------|
| `complete <任务ID>` | 标记为完成 |
| `uncomplete <任务ID>` | 标记为未完成 |
| `delete <任务ID>` | 永久删除 |
| `rename <任务ID> <名称>` | 重命名任务 |
| `note <任务ID> <文本>` | 追加到备注 |
| `setnote <任务ID> <文本>` | 替换备注 |
| `defer <任务ID> <日期>` | 设置推迟日期（YYYY-MM-DD） |
| `due <任务ID> <日期>` | 设置截止日期 |
| `flag <任务ID> [true\|false]` | 设置标记 |
| `tag <任务ID> <标签>` | 添加标签（如果需要则创建） |
| `untag <任务ID> <标签>` | 移除标签 |
| `move <任务ID> <项目>` | 移动到项目 |

### 重复

```bash
# repeat <任务ID> <方法> <间隔> <单位>
of repeat abc123 fixed 1 weeks
of repeat abc123 due-after-completion 2 days
of repeat abc123 defer-after-completion 1 months
of unrepeat abc123
```

方法: `fixed`, `due-after-completion`, `defer-after-completion`  
单位: `days`, `weeks`, `months`, `years`

## 输出格式

所有命令都返回 JSON。成功响应包括 `"success": true`。错误包括 `"error": "message"`。

```json
{
  "success": true,
  "task": {
    "id": "abc123",
    "name": "任务名称",
    "note": "备注内容",
    "flagged": false,
    "completed": false,
    "deferDate": "2026-01-30",
    "dueDate": "2026-02-01",
    "project": "项目名称",
    "tags": ["标签1", "标签2"],
    "repeat": {"method": "fixed", "rule": "RRULE:FREQ=WEEKLY;INTERVAL=1"}
  }
}
```

## 示例

```bash
# 添加任务到收件箱
of add "购买杂货"

# 添加任务到特定项目
of add "审查文档" "工作项目"

# 设置截止日期和标记
of due abc123 2026-02-01
of flag abc123 true

# 添加标签
of tag abc123 "紧急"
of tag abc123 "家庭"

# 创建重复任务
of add "每周回顾" "习惯"
of repeat xyz789 fixed 1 weeks

# 搜索并完成
of search "杂货"
of complete abc123

# 获取今天的任务
of today
```

## 注意事项

- 任务 ID 是 OmniFocus 内部 ID（在所有任务响应中返回）
- 日期使用 ISO 格式：YYYY-MM-DD
- 项目和文件夹名称区分大小写
- 使用 `tag` 命令时，如果标签不存在会自动创建
- 所有输出都是 JSON，便于解析

## 技术细节

此技能对大多数操作使用 JavaScript for Automation（JXA），对于标签和重复操作使用 AppleScript 回退（由于这些特定 OmniFocus API 的已知 JXA 类型转换错误）。

混合方法提供：
- 易于解析的 JSON 输出
- 对标签名称中特殊字符的健壮转义
- 带有清晰消息的错误处理

**首次运行：** OmniFocus 可能会提示允许自动化访问。在系统设置 > 隐私与安全 > 自动化中启用。
