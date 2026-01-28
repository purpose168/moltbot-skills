---
name: mole-mac-cleanup
description: macOS 清理和维护工具。清理缓存、释放磁盘空间、管理启动项和优化系统性能。
author: Benjamin Jesuiter <bjesuiter@gmail.com>
metadata:
  clawdbot:
    emoji: "🧹"
    os: ["darwin"]
---

# macOS 清理工具

macOS 清理和维护工具。

## 快速参考

| 操作 | 命令 |
|------|------|
| 清理缓存 | `bash scripts/cleanup.sh caches` |
| 清理日志 | `bash scripts/cleanup.sh logs` |
| 清理下载 | `bash scripts/cleanup.sh downloads` |
| 完整清理 | `bash scripts/cleanup.sh all --dry-run` |
| 分析磁盘 | `bash scripts/analyze.sh` |

## 清理类型

### 缓存清理

清理系统缓存：

```bash
# 清理用户缓存
bash scripts/cleanup.sh caches

# 清理特定应用缓存
bash scripts/cleanup.sh caches --app "Chrome" "Safari"

# 清理所有缓存
bash scripts/cleanup.sh caches --all
```

### 日志清理

清理系统日志：

```bash
# 清理系统日志
bash scripts/cleanup.sh logs

# 清理应用日志
bash scripts/cleanup.sh logs --older-than 7d

# 保留最近日志
bash scripts/cleanup.sh logs --keep 3
```

### 下载清理

清理下载文件夹：

```bash
# 清理旧下载
bash scripts/cleanup.sh downloads --older-than 30d

# 清理大文件
bash scripts/cleanup.sh downloads --size-over 100MB

# 预览清理（不删除）
bash scripts/cleanup.sh downloads --dry-run
```

## 使用方法

### 干运行模式

预览将要删除的内容而不实际删除：

```bash
bash scripts/cleanup.sh all --dry-run
```

### 清理选项

| 选项 | 描述 |
|------|------|
| `--dry-run` | 预览不删除 |
| `--force` | 跳过确认 |
| `--verbose` | 显示详细输出 |
| `--max-age` | 最大文件保留时间 |

## 在 Clawdbot 中使用

### 定期维护

```python
# 每周缓存清理
if day_of_week == "Sunday":
    bash(command="bash scripts/cleanup.sh caches --force")
```

### 磁盘空间不足时

```python
# 检查磁盘空间
if disk_usage > 90%:
    bash(command="bash scripts/cleanup.sh all --dry-run")
    # 显示预览并询问用户确认
```

## 最佳实践

1. **定期清理**：每周运行一次缓存清理
2. **使用干运行**：首次使用时使用 `--dry-run`
3. **保留重要数据**：不要清理最近的文件
4. **监控空间**：使用分析脚本跟踪磁盘使用

## 警告

⚠️ **注意**：
- 清理前确保有备份
- 不要清理系统关键文件
- 谨慎使用 `--force` 选项
- 首次使用干运行模式预览