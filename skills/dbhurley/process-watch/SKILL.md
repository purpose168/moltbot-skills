---
name: process-watch
description: 监控系统进程 - CPU、内存、磁盘 I/O、网络、打开的文件、端口。查找资源占用大户，终止失控进程，跟踪机器资源消耗情况。
metadata:
  clawdhub:
    emoji: "📊"
    requires:
      bins: ["python3"]
---

# 进程监控

全面的系统进程监控。超越基本的 `top` 命令，显示：
- CPU 和内存使用情况
- 每个进程的磁盘 I/O
- 网络连接
- 打开的文件和句柄
- 端口绑定
- 进程树

## 命令

### 列出进程
```bash
process-watch list [--sort cpu|mem|disk|name] [--limit 20]
```

### 资源消耗大户
```bash
process-watch top [--type cpu|mem|disk|net] [--limit 10]
```

### 进程详情
```bash
process-watch info <pid>
# 显示：CPU、内存、打开的文件、网络连接、子进程、环境变量
```

### 按名称查找
```bash
process-watch find <name>
# 例如：process-watch find chrome
```

### 端口绑定
```bash
process-watch ports [--port 3000]
# 什么进程在监听哪个端口？
```

### 网络连接
```bash
process-watch net [--pid <pid>] [--established]
```

### 终止进程
```bash
process-watch kill <pid> [--force]
process-watch kill --name "chrome" [--force]
```

### 监控模式
```bash
process-watch watch [--interval 2] [--alert-cpu 80] [--alert-mem 90]
# 带阈值警报的持续监控
```

### 系统摘要
```bash
process-watch summary
# 快速概览：负载、内存、磁盘、顶级进程
```

## 示例

```bash
# 什么在消耗我的 CPU？
process-watch top --type cpu

# 端口 3000 上是什么？
process-watch ports --port 3000

# 特定进程的详情
process-watch info 1234

# 终止所有 Chrome 进程
process-watch kill --name chrome

# 带警报的监控
process-watch watch --alert-cpu 90 --alert-mem 85
```

## 平台支持

- **macOS**：完全支持
- **Linux**：完全支持  
- **Windows**：部分支持（基本进程列表，无 lsof 等效功能）
