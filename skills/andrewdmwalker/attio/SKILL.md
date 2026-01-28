---
name: attio
description: Attio CRM 集成，用于管理公司、人员、交易、笔记、任务和自定义对象。在处理 Attio CRM 数据、搜索联系人、管理销售管道、向记录添加笔记、创建任务或同步潜在客户信息时使用。
---

# Attio CRM

通过 REST API 管理 Attio CRM。支持公司、人员、交易、列表（管道）、笔记和任务。

## 设置

在环境变量或 `~/.env` 中设置 `ATTIO_API_KEY`：
```bash
echo "ATTIO_API_KEY=your_api_key" >> ~/.env
```

获取您的 API 密钥：Attio → 工作区设置 → 开发者 → 新建访问令牌

## 快速参考

### 对象（记录）

```bash
# 列出/搜索记录
attio objects list                     # 列出可用的对象
attio records list <object>            # 列出记录（公司、人员、交易等）
attio records search <object> <query>  # 按文本搜索
attio records get <object> <id>        # 获取单个记录
attio records create <object> <json>   # 创建记录
attio records update <object> <id> <json>  # 更新记录
```

### 列表（管道）

```bash
attio lists list                       # 显示所有管道/列表
attio entries list <list_slug>         # 列出管道中的条目
attio entries add <list_slug> <object> <record_id>  # 将记录添加到管道
```

### 笔记

```bash
attio notes list <object> <record_id>  # 记录上的笔记
attio notes create <object> <record_id> <title> <content>
```

### 任务

```bash
attio tasks list                       # 所有任务
attio tasks create <content> [deadline]  # 创建任务（截止日期: YYYY-MM-DD）
attio tasks complete <task_id>         # 标记完成
```

## 示例

### 查找公司并添加笔记
```bash
# 搜索公司
attio records search companies "Acme"

# 向公司添加笔记（使用搜索结果中的 record_id）
attio notes create companies abc123-uuid "通话笔记" "讨论 Q1 路线图..."
```

### 使用管道
```bash
# 列出管道阶段
attio entries list sales_pipeline

# 将公司添加到管道
attio entries add sales_pipeline companies abc123-uuid
```

### 创建后续任务
```bash
attio tasks create "跟进 Acme 的 John" "2024-02-15"
```

## API 限制

- 速率限制：约 100 次请求/分钟
- 分页：对于大型数据集使用 `limit` 和 `offset` 参数

## 完整 API 文档

https://docs.attio.com/
