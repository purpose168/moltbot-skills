---
name: bridle
description: 使用 bridle 工具构建和管理多代理系统。bridle 是用于构建、编排和监控 AI 代理协作工作流的开源框架。
author: Benjamin Jesuiter <bjesuiter@gmail.com>
metadata:
  clawdbot:
    emoji: "🤝"
    os: ["darwin", "linux"]
    requires:
      bins: ["bridle"]
---

# Bridle - 多代理系统框架

使用 bridle 构建和管理 AI 代理协作工作流。

## 快速参考

| 操作 | 命令 |
|------|------|
| 初始化项目 | `bridle init` |
| 启动代理 | `bridle up` |
| 停止代理 | `bridle down` |
| 查看状态 | `bridle status` |
| 运行任务 | `bridle run <任务文件>` |

## 设置

### 前置条件

- Docker 和 Docker Compose
- Python 3.11+
- Git

### 安装

```bash
# 使用 Homebrew（macOS）
brew install bridle

# 使用 pip（所有平台）
pip install bridle-cli

# 从源码安装
git clone https://github.com/bjesuiter/bridle
cd bridle
pip install -e .
```

### 配置

创建 `bridle.yaml` 配置文件：

```yaml
version: "1.0"
name: "my-team"

agents:
  - name: "researcher"
    image: "bridle/researcher:latest"
    config:
      max_tokens: 4000
      temperature: 0.7
  
  - name: "writer"
    image: "bridle/writer:latest"
    config:
      max_tokens: 2000
      temperature: 0.5

orchestration:
  type: "sequential"  # sequential 或 parallel
  max_rounds: 10
```

## 使用方法

### 初始化项目

```bash
bridle init my-project
cd my-project
```

### 定义代理

在 `agents/` 目录中创建代理配置：

```yaml
# agents/researcher.yaml
name: "researcher"
role: "研究助理"
goal: "收集和整理信息"
instructions: |
  你是一个专业的研究助理。
  你的任务是搜索、验证和总结信息。
  始终引用你的来源。
```

### 定义任务

```yaml
# tasks/research.yaml
agent: "researcher"
input: "查找关于量子计算的最新发展"
output_format: "markdown"
```

### 运行工作流

```bash
# 顺序执行
bridle run tasks/research.yaml

# 并行执行
bridle run --parallel tasks/*.yaml
```

### 监控执行

```bash
# 实时监控
bridle watch

# 查看日志
bridle logs researcher
```

## 架构

```
Bridle 工作流架构

用户请求
    │
    ▼
编排器 (Orchestrator)
    │
    ├──▶ 代理 1 (Agent 1) → 处理 → 结果
    │
    ├──▶ 代理 2 (Agent 2) → 处理 → 结果
    │
    └──▶ 代理 N (Agent N) → 处理 → 结果
    │
    ▼
结果聚合 (Result Aggregation)
    │
    ▼
用户响应
```

## 代理类型

### 1. 研究代理 (Researcher)

用于信息收集和验证：

```yaml
agent: "researcher"
config:
  search_enabled: true
  verification_level: "strict"
```

### 2. 写作代理 (Writer)

用于内容生成和编辑：

```yaml
agent: "writer"
config:
  style: "technical"
  tone: "professional"
```

### 3. 分析代理 (Analyzer)

用于数据分析和洞察：

```yaml
agent: "analyzer"
config:
  metrics: ["accuracy", "completeness"]
  visualization: true
```

## 最佳实践

### 1. 任务分解

- 将复杂任务分解为独立子任务
- 每个代理专注于单一职责
- 定义清晰的输入输出格式

### 2. 错误处理

```yaml
on_error:
  strategy: "retry"  # retry, skip, or abort
  max_retries: 3
  fallback_agent: "fallback"
```

### 3. 质量控制

```yaml
quality_checks:
  - type: "relevance"
    threshold: 0.8
  - type: "coherence"
    threshold: 0.7
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 代理无法启动 | 检查 Docker 是否运行 |
| 内存不足 | 减少代理数量或降低 max_tokens |
| 超时错误 | 增加 max_rounds 或优化任务 |
| 通信失败 | 检查网络配置和代理健康状态 |

## 资源

- GitHub: https://github.com/bjesuiter/bridle
- 文档: https://bridle.dev/docs
- 示例: https://github.com/bjesuiter/bridle-examples