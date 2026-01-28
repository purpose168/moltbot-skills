---
name: tmux-agents
description: 在 tmux 会话中管理后台编码代理。生成 Claude Code 或其他代理，检查进度，获取结果。
version: 1.0.0
author: Jose Munoz
homepage: https://clawdhub.com/skills/tmux-agents
triggers:
  - spawn agent
  - coding task
  - background task
  - tmux session
  - run codex
  - run gemini
  - local agent
  - ollama agent
metadata:
  clawdbot:
    emoji: "🖥️"
    requires:
      bins: ["tmux"]
    install:
      - id: brew-tmux
        kind: brew
        formula: tmux
        bins: ["tmux"]
        label: "安装 tmux (brew)"
---

# Tmux 代理

在持久的 tmux 会话中运行编码代理。它们在后台工作，而您可以同时做其他事情。

## 可用代理

### ☁️ 云端代理（API 积分）

| 代理 | 命令 | 最佳用途 |
|------|------|---------|
| **claude** | Claude Code | 复杂编码、重构、完整项目 |
| **codex** | OpenAI Codex | 快速编辑、自动批准模式 |
| **gemini** | Google Gemini | 研究、分析、文档 |

### 🦙 本地代理（通过 Ollama 免费）

| 代理 | 命令 | 最佳用途 |
|------|------|---------|
| **ollama-claude** | Claude Code + Ollama | 长时间实验、重构 |
| **ollama-codex** | Codex + Ollama | 扩展编码会话 |

本地代理使用您的 Mac 的 GPU — 无 API 成本，非常适合实验！

## 快速命令

### 生成新的代理会话
```bash
./skills/tmux-agents/scripts/spawn.sh <名称> <任务> [代理]

# 云端（使用 API 积分）
./skills/tmux-agents/scripts/spawn.sh fix-bug "修复登录验证" claude
./skills/tmux-agents/scripts/spawn.sh refactor "重构认证模块" codex
./skills/tmux-agents/scripts/spawn.sh research "研究缓存策略" gemini

# 本地（免费 - 使用 Ollama）
./skills/tmux-agents/scripts/spawn.sh experiment "重写整个测试套件" ollama-claude
./skills/tmux-agents/scripts/spawn.sh big-refactor "重构所有服务" ollama-codex
```

### 列出运行中的会话
```bash
tmux list-sessions
# 或
./skills/tmux-agents/scripts/status.sh
```

### 检查会话
```bash
./skills/tmux-agents/scripts/check.sh 会话名称
```

### 附加以实时观看
```bash
tmux attach -t 会话名称
# 分离使用: Ctrl+B，然后 D
```

### 发送额外指令
```bash
tmux send-keys -t 会话名称 "额外指令" Enter
```

### 完成后终止会话
```bash
tmux kill-session -t 会话名称
```

## 何时使用本地 vs 云端

| 场景 | 推荐 |
|------|------|
| 快速修复、时间敏感 | ☁️ 云端（更快） |
| 昂贵任务、预算重要 | 🦙 本地 |
| 长时间实验，可能失败 | 🦙 本地 |
| 生产代码审查 | ☁️ 云端（更智能） |
| 学习/探索 | 🦙 本地 |
| 重构 | 🦙 本地 |

## 并行代理

同时运行多个代理：

```bash
# 混合云端 + 本地
./scripts/spawn.sh backend "实现用户 API" claude           # 云端
./scripts/spawn.sh frontend "构建登录表单" ollama-codex      # 本地
./scripts/spawn.sh docs "编写 API 文档" gemini         # 云端
./scripts/spawn.sh tests "编写所有单元测试" ollama-claude    # 本地
```

一次性检查所有：
```bash
./skills/tmux-agents/scripts/status.sh
```

## Ollama 设置

本地代理需要 Ollama 和编码模型：

```bash
# 拉取推荐模型
ollama pull glm-4.7-flash

# 配置工具（一次性）
ollama launch claude --model glm-4.7-flash --config
ollama launch codex --model glm-4.7-flash --config
```

## 提示

- 即使 Clawdbot 重启，会话也会保留
- 对风险/实验性工作使用本地代理
- 对生产关键任务使用云端
- 检查 `tmux ls` 查看所有正在进行的任务
- 完成后终止会话以释放资源
