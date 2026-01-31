# 条目示例

格式良好的条目的具体示例，包含所有字段。

## 学习：修正

```markdown
## [LRN-20250115-001] correction

**记录时间**：2025-01-15T10:30:00Z
**优先级**：high
**状态**：pending
**领域**：tests

### 摘要
错误假设 pytest fixtures 默认作用域为函数级别

### 详情
在编写测试 fixtures 时，我假设所有 fixtures 都是函数作用域的。
用户纠正说虽然函数作用域是默认值，但代码库约定使用模块作用域的 fixtures 用于数据库连接以
提高测试性能。

### 建议操作
当创建涉及昂贵设置的 fixtures（数据库、网络）时，
在默认使用函数作用域之前，先检查现有 fixtures 的作用域模式。

### 元数据
- 来源：user_feedback
- 相关文件：tests/conftest.py
- 标签：pytest, testing, fixtures

---
```

## 学习：知识缺口（已解决）

```markdown
## [LRN-20250115-002] knowledge_gap

**记录时间**：2025-01-15T14:22:00Z
**优先级**：medium
**状态**：resolved
**领域**：config

### 摘要
项目使用 pnpm 而非 npm 进行包管理

### 详情
尝试运行 `npm install` 但项目使用 pnpm workspaces。
锁文件是 `pnpm-lock.yaml`，不是 `package-lock.json`。

### 建议操作
在假设使用 npm 之前，检查是否存在 `pnpm-lock.yaml` 或 `pnpm-workspace.yaml`。
为此项目使用 `pnpm install`。

### 元数据
- 来源：error
- 相关文件：pnpm-lock.yaml, pnpm-workspace.yaml
- 标签：package-manager, pnpm, setup

### 解决
- **解决时间**：2025-01-15T14:30:00Z
- **提交/PR**：N/A - 知识更新
- **备注**：已添加到 CLAUDE.md 供将来参考

---
```

## 学习：提升到 CLAUDE.md

```markdown
## [LRN-20250115-003] best_practice

**记录时间**：2025-01-15T16:00:00Z
**优先级**：high
**状态**：promoted
**提升到**：CLAUDE.md
**领域**：backend

### 摘要
API 响应必须包含来自请求头的关联 ID

### 详情
所有 API 响应都应回显请求中的 X-Correlation-ID 头。
这是分布式追踪所必需的。没有此头的响应会破坏可观测性管道。

### 建议操作
在 API 处理程序中始终包含关联 ID 传递。

### 元数据
- 来源：user_feedback
- 相关文件：src/middleware/correlation.ts
- 标签：api, observability, tracing

---
```

## 学习：提升到 AGENTS.md

```markdown
## [LRN-20250116-001] best_practice

**记录时间**：2025-01-16T09:00:00Z
**优先级**：high
**状态**：promoted
**提升到**：AGENTS.md
**领域**：backend

### 摘要
修改 OpenAPI 规范后必须重新生成 API 客户端

### 详情
修改 API 端点时，必须重新生成 TypeScript 客户端。
忘记这一点会导致仅在运行时出现的类型不匹配。
生成脚本还会运行验证。

### 建议操作
添加到代理工作流程：在任何 API 更改后，运行 `pnpm run generate:api`。

### 元数据
- 来源：error
- 相关文件：openapi.yaml, src/client/api.ts
- 标签：api, codegen, typescript

---
```

## 错误条目

```markdown
## [ERR-20250115-A3F] docker_build

**记录时间**：2025-01-15T09:15:00Z
**优先级**：high
**状态**：pending
**领域**：infra

### 摘要
Docker 构建在 M1 Mac 上失败，原因是平台不匹配

### 错误
```
error: failed to solve: python:3.11-slim: no match for platform linux/arm64
```

### 上下文
- 命令：`docker build -t myapp .`
- Dockerfile 使用 `FROM python:3.11-slim`
- 运行在 Apple Silicon (M1/M2) 上

### 建议修复
添加平台标志：`docker build --platform linux/amd64 -t myapp .`
或更新 Dockerfile：`FROM --platform=linux/amd64 python:3.11-slim`

### 元数据
- 可重现：yes
- 相关文件：Dockerfile

---
```

## 错误条目：重复问题

```markdown
## [ERR-20250120-B2C] api_timeout

**记录时间**：2025-01-20T11:30:00Z
**优先级**：critical
**状态**：pending
**领域**：backend

### 摘要
结账过程中第三方支付 API 超时

### 错误
```
TimeoutError: Request to payments.example.com timed out after 30000ms
```

### 上下文
- 命令：POST /api/checkout
- 超时设置为 30s
- 在高峰时段（午餐、晚上）发生

### 建议修复
实现带指数退避的重试。考虑断路器模式。

### 元数据
- 可重现：yes (在高峰时段)
- 相关文件：src/services/payment.ts
- 参见：ERR-20250115-X1Y, ERR-20250118-Z3W

---
```

## 功能请求

```markdown
## [FEAT-20250115-001] export_to_csv

**记录时间**：2025-01-15T16:45:00Z
**优先级**：medium
**状态**：pending
**领域**：backend

### 请求的功能
将分析结果导出为 CSV 格式

### 用户上下文
用户每周运行报告，需要与非技术
利益相关者在 Excel 中共享结果。目前手动复制输出。

### 复杂度估计
simple

### 建议实现
为 analyze 命令添加 `--output csv` 标志。使用标准 csv 模块。
可以扩展现有的 `--output json` 模式。

### 元数据
- 频率：recurring
- 相关功能：analyze 命令, json 输出

---
```

## 功能请求：已解决

```markdown
## [FEAT-20250110-002] dark_mode

**记录时间**：2025-01-10T14:00:00Z
**优先级**：low
**状态**：resolved
**领域**：frontend

### 请求的功能
仪表板的深色模式支持

### 用户上下文
用户工作到很晚，发现明亮的界面令人疲劳。
其他几个用户也非正式地提到了这一点。

### 复杂度估计
medium

### 建议实现
使用 CSS 变量设置颜色。在用户设置中添加切换开关。
考虑系统偏好检测。

### 元数据
- 频率：recurring
- 相关功能：user settings, theme system

### 解决
- **解决时间**：2025-01-18T16:00:00Z
- **提交/PR**：#142
- **备注**：已实现，包含系统偏好检测和手动切换

---
```
