---
name: self-improvement
description: "捕获学习、错误和修正以实现持续改进。在以下情况下使用：(1) 命令或操作意外失败，(2) 用户纠正 Claude（'不，那是错的...'，'实际上...'），(3) 用户请求不存在的功能，(4) 外部 API 或工具失败，(5) Claude 意识到其知识过时或不正确，(6) 为重复任务发现更好的方法。在主要任务前也应回顾学习内容。"
---

# 自我改进技能

将学习和错误记录到 markdown 文件中以实现持续改进。编码代理稍后可以将这些处理为修复，重要的学习内容会被提升到项目记忆中。

## 快速参考

| 情况 | 操作 |
|------|------|
| 命令/操作失败 | 记录到 `.learnings/ERRORS.md` |
| 用户纠正你 | 记录到 `.learnings/LEARNINGS.md`，类别为 `correction` |
| 用户想要缺失的功能 | 记录到 `.learnings/FEATURE_REQUESTS.md` |
| API/外部工具失败 | 记录到 `.learnings/ERRORS.md`，包含集成详情 |
| 知识过时 | 记录到 `.learnings/LEARNINGS.md`，类别为 `knowledge_gap` |
| 发现更好的方法 | 记录到 `.learnings/LEARNINGS.md`，类别为 `best_practice` |
| 与现有条目相似 | 使用 `**参见**` 链接，考虑提高优先级 |
| 广泛适用的学习 | 提升到 `CLAUDE.md` 和/或 `AGENTS.md` |

## 设置

如果 `.learnings/` 目录不存在，在项目根目录创建：

```bash
mkdir -p .learnings
```

从 `assets/` 复制模板或创建带有标题的文件。

## 日志格式

### 学习条目

追加到 `.learnings/LEARNINGS.md`：

```markdown
## [LRN-YYYYMMDD-XXX] category

**记录时间**：ISO-8601 时间戳
**优先级**：low | medium | high | critical
**状态**：pending
**领域**：frontend | backend | infra | tests | docs | config

### 摘要
一行描述所学内容

### 详情
完整上下文：发生了什么，什么是错误的，什么是正确的

### 建议操作
具体的修复或改进措施

### 元数据
- 来源：conversation | error | user_feedback
- 相关文件：path/to/file.ext
- 标签：tag1, tag2
- 参见：LRN-20250110-001（如果与现有条目相关）

---
```

### 错误条目

追加到 `.learnings/ERRORS.md`：

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**记录时间**：ISO-8601 时间戳
**优先级**：high
**状态**：pending
**领域**：frontend | backend | infra | tests | docs | config

### 摘要
简要描述失败的内容

### 错误
```
实际错误消息或输出
```

### 上下文
- 尝试的命令/操作
- 使用的输入或参数
- 相关的环境详情

### 建议修复
如果可识别，可能解决此问题的方法

### 元数据
- 可重现：yes | no | unknown
- 相关文件：path/to/file.ext
- 参见：ERR-20250110-001（如果重复）

---
```

### 功能请求条目

追加到 `.learnings/FEATURE_REQUESTS.md`：

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**记录时间**：ISO-8601 时间戳
**优先级**：medium
**状态**：pending
**领域**：frontend | backend | infra | tests | docs | config

### 请求的功能
用户想要做什么

### 用户上下文
他们为什么需要它，他们正在解决什么问题

### 复杂度估计
simple | medium | complex

### 建议实现
如何构建此功能，它可能扩展什么

### 元数据
- 频率：first_time | recurring
- 相关功能：existing_feature_name

---
```

## ID 生成

格式：`TYPE-YYYYMMDD-XXX`
- TYPE: `LRN` (学习), `ERR` (错误), `FEAT` (功能)
- YYYYMMDD: 当前日期
- XXX: 序号或随机 3 个字符（例如，`001`, `A7B`）

示例：`LRN-20250115-001`, `ERR-20250115-A3F`, `FEAT-20250115-002`

## 解决条目

当问题得到修复时，更新条目：

1. 将 `**状态**：pending` → `**状态**：resolved`
2. 在元数据后添加解决块：

```markdown
### 解决
- **解决时间**：2025-01-16T09:00:00Z
- **提交/PR**：abc123 或 #42
- **备注**：简要描述所做的工作
```

其他状态值：
- `in_progress` - 正在积极处理
- `wont_fix` - 决定不解决（在解决备注中添加原因）
- `promoted` - 提升到 CLAUDE.md 或 AGENTS.md

## 提升到项目记忆

当学习内容广泛适用（不是一次性修复）时，将其提升到永久项目记忆中。

### 何时提升

- 学习内容适用于多个文件/功能
- 任何贡献者（人类或 AI）都应该知道的知识
- 防止重复错误
- 记录项目特定的约定

### 提升目标

| 目标 | 适合的内容 |
|------|------------|
| `CLAUDE.md` | 项目事实、约定、所有 Claude 交互的注意事项 |
| `AGENTS.md` | 代理特定的工作流程、工具使用模式、自动化规则 |

### 如何提升

1. **提炼**学习内容为简洁的规则或事实
2. **添加**到目标文件的适当部分
3. **更新**原始条目：
   - 将 `**状态**：pending` → `**状态**：promoted`
   - 添加 `**提升到**：CLAUDE.md` 或 `**提升到**：AGENTS.md`

### 提升示例

**学习**（详细）：
> 项目使用 pnpm workspaces。尝试 `npm install` 但失败。
> 锁文件是 `pnpm-lock.yaml`。必须使用 `pnpm install`。

**在 CLAUDE.md 中**（简洁）：
```markdown
## 构建与依赖
- 包管理器：pnpm（不是 npm）- 使用 `pnpm install`
```

**学习**（详细）：
> 修改 API 端点时，必须重新生成 TypeScript 客户端。
> 忘记这一点会导致运行时类型不匹配。

**在 AGENTS.md 中**（可操作）：
```markdown
## API 变更后
1. 重新生成客户端：`pnpm run generate:api`
2. 检查类型错误：`pnpm tsc --noEmit`
```

## 重复模式检测

如果记录的内容与现有条目相似：

1. **先搜索**：`grep -r "keyword" .learnings/`
2. **链接条目**：在元数据中添加 `**参见**：ERR-20250110-001`
3. **提高优先级**如果问题持续重复
4. **考虑系统性修复**：重复问题通常表明：
   - 缺少文档（→ 提升到 CLAUDE.md）
   - 缺少自动化（→ 添加到 AGENTS.md）
   - 架构问题（→ 创建技术债务工单）

## 定期审查

在自然断点审查 `.learnings/`：

### 何时审查
- 在开始新的主要任务之前
- 完成功能后
- 在有过去学习内容的领域工作时
- 积极开发期间每周

### 快速状态检查
```bash
# 计算待处理项目
grep -h "状态\*\*: pending" .learnings/*.md | wc -l

# 列出待处理的高优先级项目
grep -B5 "优先级\*\*: high" .learnings/*.md | grep "^## \["

# 查找特定领域的学习
grep -l "领域\*\*: backend" .learnings/*.md
```

### 审查操作
- 解决已修复的项目
- 提升适用的学习内容
- 链接相关条目
- 升级重复问题

## 检测触发器

当你注意到以下情况时自动记录：

**修正**（→ 学习，类别为 `correction`）：
- "不，那不对..."
- "实际上，应该是..."
- "你错了关于..."
- "那已经过时了..."

**功能请求**（→ 功能请求）：
- "你也能..."
- "我希望你能..."
- "有没有办法..."
- "你为什么不能..."

**知识缺口**（→ 学习，类别为 `knowledge_gap`）：
- 用户提供你不知道的信息
- 你引用的文档过时
- API 行为与你的理解不同

**错误**（→ 错误条目）：
- 命令返回非零退出码
- 异常或堆栈跟踪
- 意外输出或行为
- 超时或连接失败

## 优先级指南

| 优先级 | 使用场景 |
|--------|----------|
| `critical` | 阻塞核心功能，数据丢失风险，安全问题 |
| `high` | 重大影响，影响常见工作流程，重复问题 |
| `medium` | 中等影响，存在变通方法 |
| `low` | 轻微不便，边缘情况，锦上添花 |

## 领域标签

用于按代码库区域筛选学习内容：

| 领域 | 范围 |
|------|------|
| `frontend` | UI、组件、客户端代码 |
| `backend` | API、服务、服务器端代码 |
| `infra` | CI/CD、部署、Docker、云 |
| `tests` | 测试文件、测试工具、覆盖率 |
| `docs` | 文档、注释、README |
| `config` | 配置文件、环境、设置 |

## 最佳实践

1. **立即记录** - 问题发生后上下文最清晰
2. **具体明确** - 未来的代理需要快速理解
3. **包含重现步骤** - 特别是对于错误
4. **链接相关文件** - 使修复更容易
5. **建议具体修复** - 而不仅仅是"调查"
6. **使用一致的类别** - 启用筛选
7. **积极提升** - 如果有疑问，添加到 CLAUDE.md
8. **定期审查** - 过时的学习内容会失去价值

## Gitignore 选项

**保持学习内容本地**（每个开发者）：
```gitignore
.learnings/
```

**在仓库中跟踪学习内容**（团队范围）：
不要添加到 .gitignore - 学习内容成为共享知识。

**混合**（跟踪模板，忽略条目）：
```gitignore
.learnings/*.md
!.learnings/.gitkeep
```
