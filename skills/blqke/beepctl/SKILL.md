---
name: beepctl
description: 系统蜂鸣器控制工具。用于在终端中生成蜂鸣声、播放音频提示和发送通知。
---

# 系统蜂鸣器控制

生成蜂鸣声、音频提示和通知声音。

## 快速参考

| 操作 | 命令 |
|------|------|
| 播放蜂鸣声 | `bash scripts/beep.sh` |
| 播放成功提示 | `bash scripts/beep.sh success` |
| 播放错误提示 | `bash scripts/beep.sh error` |
| 播放警告提示 | `bash scripts/beep.sh warning` |
| 自定义蜂鸣 | `bash scripts/beep.sh --frequency 440 --duration 500` |
| 系统通知 | `bash scripts/notify.sh "标题" "消息"` |

## 蜂鸣模式

### 预设模式

| 模式 | 频率 | 持续时间 | 使用场景 |
|------|------|----------|----------|
| **默认** | 440Hz | 200ms | 一般提示 |
| **成功** | 880Hz | 300ms × 2 | 操作成功 |
| **错误** | 220Hz | 500ms | 错误或失败 |
| **警告** | 660Hz | 400ms | 警告信息 |
| **信息** | 520Hz | 150ms | 信息提示 |

### 自定义参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `--frequency` | 频率（Hz） | 440 |
| `--duration` | 持续时间（毫秒） | 200 |
| `--repeats` | 重复次数 | 1 |

## 使用方法

### 基本蜂鸣

```bash
# 默认蜂鸣
bash scripts/beep.sh
```

### 带模式的蜂鸣

```bash
# 成功提示
bash scripts/beep.sh success

# 错误提示
bash scripts/beep.sh error

# 警告提示
bash scripts/beep.sh warning
```

### 自定义蜂鸣

```bash
# 1000Hz，持续500ms
bash scripts/beep.sh --frequency 1000 --duration 500

# 重复3次
bash scripts/beep.sh --frequency 600 --repeats 3
```

### 系统通知

```bash
# 发送通知
bash scripts/notify.sh "任务完成" "备份已成功完成"

# 紧急通知
bash scripts/notify.sh --urgent "警告" "磁盘空间不足"
```

## 在 Clawdbot 中使用

### 作为任务完成提示

```python
# 在长时间任务后播放成功提示
if task_completed:
    bash(command="bash scripts/beep.sh success")
```

### 作为错误处理

```python
# 捕获错误时播放错误提示
except Exception:
    bash(command="bash scripts/beep.sh error")
```

### 作为定时器

```python
# 30秒后提醒
bash(command="sleep 30 && bash scripts/beep.sh")
```

## 兼容性

| 系统 | 支持状态 |
|------|----------|
| **Linux** | ✅ PC 扬声器或 ALSA |
| **macOS** | ✅ 使用 afplay |
| **Windows** | ⚠️ 需要 WSL 或外部工具 |

## 提示

- 在安静环境中降低音量
- 避免频繁使用高频蜂鸣
- 使用不同模式区分通知类型