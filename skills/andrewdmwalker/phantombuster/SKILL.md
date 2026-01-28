---
name: phantombuster
description: 通过 API 控制 PhantomBuster 自动化智能体。列出智能体、启动自动化、获取输出/结果、检查状态以及中止正在运行的智能体。当用户需要运行 LinkedIn 抓取、Twitter 自动化、潜在客户生成 phantom 或任何 PhantomBuster 工作流程时使用。
version: 1.0.0
author: captmarbles
---

# PhantomBuster 技能

从命令行控制您的 [PhantomBuster](https://phantombuster.com) 自动化智能体。

## 设置

1. 从 [工作区设置](https://phantombuster.com/workspace-settings) 获取您的 API 密钥
2. 设置环境变量：
   ```bash
   export PHANTOMBUSTER_API_KEY=your-api-key-here
   ```

## 使用方法

所有命令都使用此技能目录中捆绑的 `pb.py` 脚本。

### 列出智能体

查看您配置的所有 PhantomBuster 智能体。

```bash
python3 pb.py list
python3 pb.py list --json  # JSON 输出
```

### 启动智能体

按 ID 或名称启动 phantom。

```bash
python3 pb.py launch <agent-id>
python3 pb.py launch <agent-id> --argument '{"search": "CEO fintech"}'
```

### 获取智能体输出

获取最近一次运行的結果/输出。

```bash
python3 pb.py output <agent-id>
python3 pb.py output <agent-id> --json  # 原始 JSON
```

### 检查智能体状态

查看智能体是否正在运行、已完成或出错。

```bash
python3 pb.py status <agent-id>
```

### 中止正在运行的智能体

停止当前正在运行的智能体。

```bash
python3 pb.py abort <agent-id>
```

### 获取智能体详情

获取特定智能体的完整详情。

```bash
python3 pb.py get <agent-id>
```

## 示例提示

- *"列出我的 PhantomBuster 智能体"*
- *"启动我的 LinkedIn Sales Navigator 抓取器"*
- *"获取智能体 12345 的输出"*
- *"检查我的 Twitter 关注者 phantom 是否仍在运行"*
- *"中止当前正在运行的智能体"*

## 常见的 Phantom

PhantomBuster 提供许多预构建的自动化：
- **LinkedIn Sales Navigator 搜索** — 从搜索中提取潜在客户
- **LinkedIn 个人资料抓取器** — 获取个人资料数据
- **Twitter 关注者收集器** — 抓取关注者
- **Instagram 个人资料抓取器** — 获取 IG 个人资料数据
- **Google Maps 搜索导出** — 提取商家列表

## 速率限制

PhantomBuster 根据您的套餐有执行时间限制。API 本身没有严格的速率限制，但智能体执行会消耗您套餐的分钟数。
