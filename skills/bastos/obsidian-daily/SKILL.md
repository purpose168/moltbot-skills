---
name: obsidian-daily
description: 通过 obsidian-cli 管理 Obsidian 每日笔记。创建和打开每日笔记、附加条目（日志、任务、链接）、按日期阅读过去的笔记以及搜索保险库内容。处理相对日期如"昨天"、"上周五"、"3天前"。
compatibility: 需要通过 Homebrew（Mac/Linux）或 Scoop（Windows）安装 obsidian-cli
metadata: {"clawdbot":{"requires":{"bins":["obsidian-cli"]},"install":[{"id":"brew","kind":"brew","formula":"yakitrak/yakitrak/obsidian-cli","bins":["obsidian-cli"],"label":"Install obsidian-cli (brew)"}]}}
---

# Obsidian 每日笔记

与 Obsidian 每日笔记交互：创建笔记、附加条目、按日期阅读和搜索内容。

## 设置

检查是否配置了默认保险库：

```bash
obsidian-cli print-default --path-only 2>/dev/null && echo "OK" || echo "NOT_SET"
```

如果显示 `NOT_SET`，请询问用户：
1. **保险库名称**（必需）
2. **每日笔记文件夹**（默认：保险库根目录，常见值：`Daily Notes`、`Journal`、`daily`）
3. **日期格式**（默认：`YYYY-MM-DD`）

配置保险库：

```bash
obsidian-cli set-default "保险库名称"
```

**Obsidian 每日笔记插件默认值：**
- 日期格式：`YYYY-MM-DD`
- 新文件位置：保险库根目录
- 模板文件位置：（无）

## 日期处理

获取当前日期：

```bash
date +%Y-%m-%d
```

跨平台相对日期（优先 GNU，回退 BSD）：

| 参照 | 命令 |
|------|------|
| 今天 | `date +%Y-%m-%d` |
| 昨天 | `date -d yesterday +%Y-%m-%d 2>/dev/null \|\| date -v-1d +%Y-%m-%d` |
| 上周五 | `date -d "last friday" +%Y-%m-%d 2>/dev/null \|\| date -v-friday +%Y-%m-%d` |
| 3天前 | `date -d "3 days ago" +%Y-%m-%d 2>/dev/null \|\| date -v-3d +%Y-%m-%d` |
| 下周一 | `date -d "next monday" +%Y-%m-%d 2>/dev/null \|\| date -v+monday +%Y-%m-%d` |

## 命令

### 打开/创建今天的笔记

```bash
obsidian-cli daily
```

在 Obsidian 中打开今天的每日笔记，如果不存在则从模板创建。

### 附加条目

```bash
obsidian-cli daily && obsidian-cli create "$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "条目文本")" --append
```

使用自定义文件夹：

```bash
obsidian-cli daily && obsidian-cli create "Daily Notes/$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "条目文本")" --append
```

### 读取笔记

今天：

```bash
obsidian-cli print "$(date +%Y-%m-%d).md"
```

特定日期：

```bash
obsidian-cli print "2025-01-10.md"
```

相对日期（昨天）：

```bash
obsidian-cli print "$(date -d yesterday +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d).md"
```

### 搜索内容

```bash
obsidian-cli search-content "搜索词"
```

### 搜索笔记

交互式模糊查找：

```bash
obsidian-cli search
```

### 指定保险库

在任何命令中添加 `--vault "名称"`：

```bash
obsidian-cli print "2025-01-10.md" --vault "工作"
```

## 示例输出

```markdown
- 去看医生
- [ ] 购买杂货
- https://github.com/anthropics/skills
- 15:45 这是一条日志
```

## 使用场景

**日记条目：**
```bash
obsidian-cli daily && obsidian-cli create "$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "- 去看医生")" --append
```

**任务：**
```bash
obsidian-cli daily && obsidian-cli create "$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "- [ ] 购买杂货")" --append
```

**链接：**
```bash
obsidian-cli daily && obsidian-cli create "$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "- https://github.com/anthropics/skills")" --append
```

**带时间戳的日志：**
```bash
obsidian-cli daily && obsidian-cli create "$(date +%Y-%m-%d).md" --content "$(printf '\n%s' "- $(date +%H:%M) 这是一条日志")" --append
```

**读取上周五：**
```bash
obsidian-cli print "$(date -d 'last friday' +%Y-%m-%d 2>/dev/null || date -v-friday +%Y-%m-%d).md"
```

**搜索"会议"：**
```bash
obsidian-cli search-content "会议"
```