# tmux-agents 🖥️

在持久的 tmux 会话中运行编码代理。它们在后台工作，而您可以同时做其他事情。

## 功能

- **5 种代理**: Claude Code、Codex、Gemini + 本地 Ollama 变体
- **云端或本地**: 使用 API 积分获得速度，或在本地 Ollama 上免费运行
- **并行会话**: 在不同任务上运行多个代理
- **持久性**: 会话在重启后依然存在
- **简单工作流程**: 生成 → 检查 → 收集

## 安装

```bash
clawdhub install tmux-agents
```

要求: `tmux`（如果缺少会自动通过 brew 安装）

## 快速开始

```bash
# 生成带有任务的代理
./skills/tmux-agents/scripts/spawn.sh fix-bug "修复登录验证问题" claude

# 检查进度
./skills/tmux-agents/scripts/check.sh fix-bug

# 实时观看
tmux attach -t fix-bug

# 完成后终止
tmux kill-session -t fix-bug
```

## 可用代理

### ☁️ 云端（API 积分）
| 代理 | 描述 |
|------|------|
| `claude` | Claude Code（默认） |
| `codex` | OpenAI Codex CLI |
| `gemini` | Google Gemini CLI |

### 🦙 本地（通过 Ollama 免费）
| 代理 | 描述 |
|------|------|
| `ollama-claude` | Claude Code + 本地模型 |
| `ollama-codex` | Codex + 本地模型 |

## 示例

```bash
# 快速云端任务
spawn.sh api-fix "修复 REST 端点" claude

# 长时间实验（免费）
spawn.sh big-refactor "重构所有服务" ollama-claude

# 并行代理
spawn.sh backend "构建用户 API" claude
spawn.sh frontend "创建仪表板" codex
spawn.sh tests "编写单元测试" ollama-claude
```

## 命令

| 脚本 | 用途 |
|------|------|
| `spawn.sh <名称> <任务> [代理]` | 启动新的代理会话 |
| `check.sh [名称]` | 检查会话输出 |
| `status.sh` | 所有会话的概览 |

## 本地设置（可选）

对于免费的本地代理：

```bash
ollama pull glm-4.7-flash
ollama launch claude --model glm-4.7-flash --config
ollama launch codex --model glm-4.7-flash --config
```

## 许可证

MIT
