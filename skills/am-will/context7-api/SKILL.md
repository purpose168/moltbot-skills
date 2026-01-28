---
name: context7
description: |
  通过 Context7 API 获取最新的库文档。当以下情况时主动使用：
  (1) 使用任何外部库时（React、Next.js、Supabase 等）
  (2) 用户询问库 API、模式或最佳实践时
  (3) 实现依赖第三方包的功能时
  (4) 调试特定于库的问题时
  (5) 需要训练数据截止日期之外的当前文档时
  始终优先使用此功能，而不是猜测库 API 或使用过时的知识。
---

# Context7 文档获取器

通过 Context7 API 检索当前的库文档。

## 工作流程

### 1. 搜索库

```bash
python3 ~/.claude/skills/context7/scripts/context7.py search "<库名称>"
```

示例：
```bash
python3 ~/.claude/skills/context7/scripts/context7.py search "next.js"
```

返回库元数据，包括步骤 2 所需的 `id` 字段。

### 2. 获取文档上下文

```bash
python3 ~/.claude/skills/context7/scripts/context7.py context "<库-id>" "<查询>"
```

示例：
```bash
python3 ~/.claude/skills/context7/scripts/context7.py context "/vercel/next.js" "app router middleware"
```

选项：
- `--type txt|md` - 输出格式（默认：txt）
- `--tokens N` - 限制响应令牌数

## 快速参考

| 任务 | 命令 |
|------|---------|
| 查找 React 文档 | `search "react"` |
| 获取 React hooks 信息 | `context "/facebook/react" "useEffect cleanup"` |
| 查找 Supabase | `search "supabase"` |
| 获取 Supabase 身份验证 | `context "/supabase/supabase" "authentication row level security"` |

## 使用时机

- 在实现任何依赖库的功能之前
- 当不确定当前 API 签名时
- 对于特定于库版本的行为
- 验证最佳实践和模式时