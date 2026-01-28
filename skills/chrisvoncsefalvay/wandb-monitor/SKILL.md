---
name: wandb
description: 监控和分析 Weights & Biases 训练运行。用于检查训练状态、检测失败、分析损失曲线、比较运行或监控实验。触发词："wandb"、"training runs"、"how's training"、"did my run finish"、"any failures"、"check experiments"、"loss curve"、"gradient norm"、"compare runs"。
---

# Weights & Biases

监控、分析和比较 W&B 训练运行。

## 初始设置

```bash
wandb login
# 或在环境中设置 WANDB_API_KEY
```

## 脚本

### 特征化运行（完整健康分析）

```bash
~/clawd/venv/bin/python3 ~/clawd/skills/wandb/scripts/characterize_run.py ENTITY/PROJECT/RUN_ID
```

分析内容：
- 损失曲线趋势（开始 → 当前，百分比变化，方向）
- 梯度范数健康（爆炸/消失检测）
- 评估指标（如果存在）
- 停滞检测（心跳年龄）
- 进度和预计完成时间估计
- 配置亮点
- 整体健康判断

选项: `--json` 用于机器可读输出。

### 监控所有运行中的作业

```bash
~/clawd/venv/bin/python3 ~/clawd/skills/wandb/scripts/watch_runs.py ENTITY [--projects p1,p2]
```

所有运行中作业的快速健康摘要加上最近的失败/完成情况。报。

选项非常适合早晨简：
- `--projects p1,p2` — 要检查的特定项目
- `--all-projects` — 检查所有项目
- `--hours N` — 回溯查看已完成运行的小时数（默认: 24）
- `--json` — 机器可读输出

### 比较两个运行

```bash
~/clawd/venv/bin/python3 ~/clawd/skills/wandb/scripts/compare_runs.py ENTITY/PROJECT/RUN_A ENTITY/PROJECT/RUN_B
```

并排比较：
- 配置差异（突出重要参数）
- 相同步骤的损失曲线
- 梯度范数比较
- 评估指标
- 性能（token/秒，步/小时）
- 胜出判断

## Python API 快速参考

```python
import wandb
api = wandb.Api()

# 获取运行
runs = api.runs("entity/project", {"state": "running"})

# 运行属性
run.state      # running | finished | failed | crashed | canceled
run.name       # 显示名称
run.id         # 唯一标识符
run.summary    # 最终/当前指标
run.config     # 超参数
run.heartbeat_at # 停滞检测

# 获取历史记录
history = list(run.scan_history(keys=["train/loss", "train/grad_norm"]))
```

## 指标键变体

脚本自动处理这些：
- 损失: `train/loss`, `loss`, `train_loss`, `training_loss`
- 梯度: `train/grad_norm`, `grad_norm`, `gradient_norm`
- 步数: `train/global_step`, `global_step`, `step`, `_step`
- 评估: `eval/loss`, `eval_loss`, `eval/accuracy`, `eval_acc`

## 健康阈值

- **梯度 > 10**: 爆炸（严重）
- **梯度 > 5**: 波动（警告）
- **梯度 < 0.0001**: 消失（警告）
- **心跳 > 30分钟**: 停滞（严重）
- **心跳 > 10分钟**: 缓慢（警告）

## 集成说明

对于早晨简报，使用 `watch_runs.py --json` 并解析输出。

对于特定运行的详细分析，使用 `characterize_run.py`。

对于 A/B 测试或超参数比较，使用 `compare_runs.py`。
