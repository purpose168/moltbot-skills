---
name: pi-orchestration
description: 使用 Pi Coding Agent 和 Claude 作为协调器，编排多个 AI 模型（GLM、MiniMax 等）作为工作者。
homepage: https://github.com/mariozechner/pi-coding-agent
metadata: {"clawdis":{"emoji":"🎭","requires":{"bins":["pi"]}}}
---

# 树莓派编排

使用 Claude 作为编排器，通过 Pi Coding Agent 生成和协调多个 AI 模型工作者（GLM、MiniMax 等）。

## 支持的提供商

| 提供商 | 模型 | 状态 |
|----------|-------|--------|
| **GLM** | glm-4.7 | ✅ 可用 |
| **MiniMax** | MiniMax-M2.1 | ✅ 可用 |
| OpenAI | gpt-4o, 等 | ✅ 可用 |
| Anthropic | claude-* | ✅ 可用 |

## 设置

### 1. GLM（智谱 AI）

从 [open.bigmodel.cn](https://open.bigmodel.cn/) 获取 API 密钥

```bash
export GLM_API_KEY="your-glm-api-key"
```

### 2. MiniMax

从 [api.minimax.chat](https://api.minimax.chat/) 获取 API 密钥

```bash
export MINIMAX_API_KEY="your-minimax-api-key"
export MINIMAX_GROUP_ID="your-group-id"  # MiniMax 必需
```

## 使用方法

### 直接命令

```bash
# GLM-4.7
pi --provider glm --model glm-4.7 -p "你的任务"

# MiniMax M2.1
pi --provider minimax --model MiniMax-M2.1 -p "你的任务"

# 测试连接
pi --provider glm --model glm-4.7 -p "说你好"
```

### 编排模式

Claude (Opus) 可以将这些作为后台工作者生成：

#### 后台工作者
```bash
bash workdir:/tmp/task background:true command:"pi --provider glm --model glm-4.7 -p '构建功能 X'"
```

#### 并行军团（tmux）
```bash
# 创建工作者会话
tmux new-session -d -s worker-1
tmux new-session -d -s worker-2

# 分派任务
tmux send-keys -t worker-1 "pi --provider glm --model glm-4.7 -p '任务 1'" Enter
tmux send-keys -t worker-2 "pi --provider minimax --model MiniMax-M2.1 -p '任务 2'" Enter

# 检查进度
tmux capture-pane -t worker-1 -p
tmux capture-pane -t worker-2 -p
```

#### 映射-归约模式
```bash
# 映射：将子任务分配给工作者
for i in 1 2 3; do
  tmux send-keys -t worker-$i "pi --provider glm --model glm-4.7 -p '处理块 $i'" Enter
done

# 归约：收集并组合结果
for i in 1 2 3; do
  tmux capture-pane -t worker-$i -p >> /tmp/results.txt
done
```

## 编排脚本

```bash
# 快速编排助手
uv run {baseDir}/scripts/orchestrate.py spawn --provider glm --model glm-4.7 --task "构建 REST API"
uv run {baseDir}/scripts/orchestrate.py status
uv run {baseDir}/scripts/orchestrate.py collect
```

## 最佳实践

1. **任务分解**：将大型任务分解为独立的子任务
2. **模型选择**：中文内容使用 GLM，创意任务使用 MiniMax
3. **错误处理**：收集结果前检查工作者状态
4. **资源管理**：完成后清理 tmux 会话

## 示例：并行代码审查

```bash
# Claude 编排 3 个工作者审查不同文件
tmux send-keys -t worker-1 "pi --provider glm -p '审查 auth.py 的安全问题'" Enter
tmux send-keys -t worker-2 "pi --provider minimax -p '审查 api.py 的性能'" Enter  
tmux send-keys -t worker-3 "pi --provider glm -p '审查 db.py 的 SQL 注入'" Enter

# 等待并收集
sleep 30
for i in 1 2 3; do
  echo "=== 工作者 $i ===" >> review.md
  tmux capture-pane -t worker-$i -p >> review.md
done
```

## 注意事项

- 必须安装 Pi Coding Agent：`npm install -g @anthropic/pi-coding-agent`
- GLM 和 MiniMax 有慷慨的免费额度
- Claude 作为协调器，工作者负责繁重的工作
- 与进程工具结合使用以管理后台任务
