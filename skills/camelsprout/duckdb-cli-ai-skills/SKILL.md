---
name: duckdb-en
description: "DuckDB CLI 专业技能，用于 SQL 数据分析、数据处理和文件转换。用于 SQL 查询、CSV/Parquet/JSON 分析、数据库查询或数据转换。触发词包括：'duckdb'、'sql'、'query'、'数据分析'、'parquet'、'数据转换'。"
---

# DuckDB CLI 专业技能

通过 DuckDB CLI 帮助进行数据分析、SQL 查询和文件转换。

## 快速开始

### 直接用 SQL 读取数据文件
```bash
# CSV 文件
duckdb -c "SELECT * FROM 'data.csv' LIMIT 10"

# Parquet 文件
duckdb -c "SELECT * FROM 'data.parquet'"

# 使用通配符读取多个文件
duckdb -c "SELECT * FROM read_parquet('logs/*.parquet')"

# JSON 文件
duckdb -c "SELECT * FROM read_json_auto('data.json')"
```

### 打开持久化数据库
```bash
# 创建/打开数据库
duckdb my_database.duckdb

# 只读模式
duckdb -readonly existing.duckdb
```

## 命令行参数

### 输出格式（作为标志）
| 标志 | 格式 |
|------|------|
| `-csv` | 逗号分隔 |
| `-json` | JSON 数组 |
| `-table` | ASCII 表格 |
| `-markdown` | Markdown 表格 |
| `-html` | HTML 表格 |
| `-line` | 每行一个值 |

### 执行参数
| 参数 | 功能描述 |
|------|---------|
| `-c 命令` | 执行 SQL 并退出 |
| `-f 文件名` | 从文件执行脚本 |
| `-init 文件` | 使用替代的 ~/.duckdbrc |
| `-readonly` | 以只读模式打开 |
| `-echo` | 执行前显示命令 |
| `-bail` | 遇到第一个错误时停止 |
| `-header` / `-noheader` | 显示/隐藏列标题 |
| `-nullvalue 文本` | NULL 值的显示文本 |
| `-separator 分隔符` | 列分隔符 |

## 数据转换

### CSV 转 Parquet
```bash
duckdb -c "COPY (SELECT * FROM 'input.csv') TO 'output.parquet' (FORMAT PARQUET)"
```

### Parquet 转 CSV
```bash
duckdb -c "COPY (SELECT * FROM 'input.parquet') TO 'output.csv' (HEADER, DELIMITER ',')"
```

### JSON 转 Parquet
```bash
duckdb -c "COPY (SELECT * FROM read_json_auto('input.json')) TO 'output.parquet' (FORMAT PARQUET)"
```

### 带筛选条件的转换
```bash
duckdb -c "COPY (SELECT * FROM 'data.csv' WHERE amount > 1000) TO 'filtered.parquet' (FORMAT PARQUET)"
```

## 点命令

### 架构检查
| 命令 | 功能描述 |
|------|---------|
| `.tables [模式]` | 显示表（支持 LIKE 模式） |
| `.schema [表]` | 显示 CREATE 语句 |
| `.databases` | 显示附加的数据库 |

### 输出控制
| 命令 | 功能描述 |
|------|---------|
| `.mode 格式` | 更改输出格式 |
| `.output 文件` | 将输出发送到文件 |
| `.once 文件` | 下一个输出到文件 |
| `.headers on/off` | 显示/隐藏列标题 |
| `.separator 列 行` | 设置分隔符 |

### 查询相关
| 命令 | 功能描述 |
|------|---------|
| `.timer on/off` | 显示执行时间 |
| `.echo on/off` | 执行前显示命令 |
| `.bail on/off` | 遇到第一个错误时停止 |
| `.read sql文件.sql` | 从文件执行 SQL |

### 编辑操作
| 命令 | 功能描述 |
|------|---------|
| `.edit` 或 `\e` | 在外部编辑器中打开查询 |
| `.help [模式]` | 显示帮助信息 |

## 输出格式（18 种可用格式）

### 数据导出
- **csv** - 逗号分隔，适用于电子表格
- **tabs** - 制表符分隔
- **json** - JSON 数组
- **jsonlines** - 换行符分隔的 JSON（流式）

### 可读格式
- **duckbox**（默认）- 带有 Unicode 框线字符的漂亮 ASCII 表格
- **table** - 简单 ASCII 表格
- **markdown** - 适用于文档
- **html** - HTML 表格
- **latex** - 适用于学术论文

### 专用格式
- **insert 表名** - SQL INSERT 语句
- **column** - 可调宽度的列
- **line** - 每行一个值
- **list** - 管道分隔
- **trash** - 丢弃输出

## 键盘快捷键（macOS/Linux）

### 导航
| 快捷键 | 功能 |
|--------|------|
| `Home` / `End` | 行首/行尾 |
| `Ctrl+左/右` | 跳跃一个单词 |
| `Ctrl+A` / `Ctrl+E` | 缓冲区开头/结尾 |

### 历史记录
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+P` / `Ctrl+N` | 上一个/下一个命令 |
| `Ctrl+R` | 搜索历史记录 |
| `Alt+<` / `Alt+>` | 历史记录中第一个/最后一个 |

### 编辑
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+W` | 向后删除一个单词 |
| `Alt+D` | 向前删除一个单词 |
| `Alt+U` / `Alt+L` | 单词大写/小写 |
| `Ctrl+K` | 删除到行尾 |

### 自动补全
| 快捷键 | 功能 |
|--------|------|
| `Tab` | 自动补全/下一个建议 |
| `Shift+Tab` | 上一个建议 |
| `Esc+Esc` | 撤销自动补全 |

## 自动补全

使用 `Tab` 激活上下文感知的自动补全：
- **关键词** - SQL 命令
- **表名** - 数据库对象
- **列名** - 字段和函数
- **文件名** - 路径补全

## 数据库操作

### 从文件创建表
```sql
CREATE TABLE sales AS SELECT * FROM 'sales_2024.csv';
```

### 插入数据
```sql
INSERT INTO sales SELECT * FROM 'sales_2025.csv';
```

### 导出表
```sql
COPY sales TO 'backup.parquet' (FORMAT PARQUET);
```

## 分析示例

### 快速统计
```sql
SELECT
    COUNT(*) as 数量,
    AVG(amount) as 平均值,
    SUM(amount) as 总和
FROM 'transactions.csv';
```

### 分组统计
```sql
SELECT
    category,
    COUNT(*) as 数量,
    SUM(amount) as 总和
FROM 'data.csv'
GROUP BY category
ORDER BY 总和 DESC;
```

### 文件连接
```sql
SELECT a.*, b.name
FROM 'orders.csv' a
JOIN 'customers.parquet' b ON a.customer_id = b.id;
```

### 描述数据
```sql
DESCRIBE SELECT * FROM 'data.csv';
```

## 管道和标准输入输出

```bash
# 从标准输入读取
cat data.csv | duckdb -c "SELECT * FROM read_csv('/dev/stdin')"

# 管道到另一个命令
duckdb -csv -c "SELECT * FROM 'data.parquet'" | head -20

# 写入标准输出
duckdb -c "COPY (SELECT * FROM 'data.csv') TO '/dev/stdout' (FORMAT CSV)"
```

## 配置

在 `~/.duckdbrc` 中保存常用设置：
```sql
.timer on
.mode duckbox
.maxrows 50
.highlight on
```

### 语法高亮颜色
```sql
.keyword green
.constant yellow
.comment brightblack
.error red
```

## 外部编辑器

在编辑器中打开复杂查询：
```sql
.edit
```

编辑器选择优先级：`DUCKDB_EDITOR` → `EDITOR` → `VISUAL` → `vi`

## 安全模式

限制文件访问的安全模式。启用时：
- 无法访问外部文件
- 禁用 `.read`、`.output`、`.import`、`.sh` 等
- **无法**在同一会话中禁用

## 使用技巧

- 在大文件上使用 `LIMIT` 进行快速预览
- Parquet 比 CSV 更适合重复查询
- `read_csv_auto` 和 `read_json_auto` 会自动推断列类型
- 参数按顺序处理（类似于 SQLite CLI）
- WSL2 在某些 Ubuntu 版本上可能显示不正确的 `memory_limit` 值
