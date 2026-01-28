# DuckDB CLI AI 技能

一个为 [Claude Code](https://claude.ai/code) 提供的全面 AI 技能，专门帮助用户完成 DuckDB CLI 操作。

## 这是什么？

这是一个用于 Claude Code（Anthropic 的 CLI 工具）的**技能文件**。激活后，它会让 Claude 深入了解 DuckDB CLI，帮助用户完成：

- CSV、Parquet 和 JSON 文件的 SQL 查询
- 格式之间的数据转换
- 数据库操作和数据分析
- 命令行参数和点命令
- 输出格式化和配置

## 安装方法

### Claude Code（推荐）

将 `SKILL.md` 复制到您的 Claude Code 技能目录：

```bash
mkdir -p ~/.claude/skills/duckdb
cp SKILL.md ~/.claude/skills/duckdb/
```

然后在 Claude Code 中使用 `/duckdb` 激活该技能。

### 其他 AI 工具

`SKILL.md` 文件遵循标准的 Markdown 约定，可以适配用于支持自定义说明或系统提示的其他 AI 助手。

## 包含内容

该技能涵盖所有官方的 DuckDB CLI 文档：

- **快速开始** - 直接用 SQL 读取文件
- **命令行参数** - 所有标志和选项
- **数据转换** - CSV、Parquet、JSON 转换
- **点命令** - 架构检查、输出控制
- **输出格式** - 所有 18 种可用格式
- **键盘快捷键** - 导航、历史、编辑
- **自动补全** - 上下文感知补全
- **配置** - ~/.duckdbrc 设置
- **安全模式** - 限制文件访问模式

## 使用示例

激活技能后，您可以向 Claude 询问：

- "将这个 CSV 转换为 Parquet"
- "显示 sales.csv 的统计信息"
- "根据 customer_id 连接这两个文件"
- "DuckDB 导出为 JSON 的命令是什么？"

## 文档来源

基于官方的 DuckDB 文档：
- [CLI 概述](https://duckdb.org/docs/stable/clients/cli/overview)
- [参数](https://duckdb.org/docs/stable/clients/cli/arguments)
- [点命令](https://duckdb.org/docs/stable/clients/cli/dot_commands)
- [输出格式](https://duckdb.org/docs/stable/clients/cli/output_formats)
- [编辑](https://duckdb.org/docs/stable/clients/cli/editing)
- [自动补全](https://duckdb.org/docs/stable/clients/cli/autocomplete)
- [语法高亮](https://duckdb.org/docs/stable/clients/cli/syntax_highlighting)
- [安全模式](https://duckdb.org/docs/stable/clients/cli/safe_mode)

## 许可证

MIT
