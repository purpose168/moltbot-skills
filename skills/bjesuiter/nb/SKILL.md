---
name: nb
description: 使用 nb CLI 管理笔记、书签和笔记本。跨多个笔记本创建、列出、搜索和组织笔记，支持 Git 版本控制。
author: Benjamin Jesuiter <bjesuiter@gmail.com>
homepage: https://github.com/xwmx/nb
metadata:
  clawdbot:
    emoji: "📓"
    os: ["darwin", "linux"]
    requires:
      bins: ["nb"]
---

# nb - 命令行笔记工具

命令行和本地网络笔记工具，具有纯文本数据存储、Git 版本控制和维基风格链接。

## 快速参考

### 笔记本操作

```bash
# 列出所有笔记本
nb notebooks

# 切换到笔记本
nb use <笔记本名>

# 创建新笔记本
nb notebooks add <名称>

# 显示当前笔记本
nb notebooks current
```

### 添加笔记

```bash
# 添加带标题的笔记
nb add -t "标题" -c "内容"

# 添加到特定笔记本
nb <笔记本名>: add -t "标题" -c "内容"

# 添加带标签的笔记
nb add -t "标题" --tags tag1,tag2

# 从文件内容添加笔记
nb add <笔记本名>:文件名.md
```

### 列出笔记

```bash
# 列出当前笔记本中的笔记
nb list

# 列出所有笔记（无限制）
nb list -a

# 列出特定笔记本中的笔记
nb <笔记本名>: list

# 列出带摘录
nb list -e

# 列出显示标签
nb list --tags
```

### 显示笔记

```bash
# 按 ID 或标题显示笔记
nb show <id>
nb show "<标题>"

# 从特定笔记本显示笔记
nb show <笔记本名>:<id>

# 打印内容（用于管道）
nb show <id> --print
```

### 搜索笔记

```bash
# 跨所有笔记本搜索
nb search "查询"

# 在特定笔记本中搜索
nb <笔记本名>: search "查询"

# 使用 AND/OR/NOT 搜索
nb search "词1" --and "词2"
nb search "词1" --or "词2"
nb search "词1" --not "词2"
```

### 书签管理

```bash
# 添加书签
nb bookmark add <URL>

# 列出书签
nb bookmark list

# 带描述添加书签
nb bookmark add <URL> --title "标题" --description "描述"
```

## 设置

### 安装

```bash
# macOS (Homebrew)
brew install nb

# Linux (下载预编译二进制文件)
curl -L https://github.com/xwmx/nb/releases/download/latest/nb-linux-x86_64.tar.gz | tar xz
sudo mv nb /usr/local/bin/

# pip
pip install nb
```

### 初始化

```bash
# 初始化 nb（创建主笔记本）
nb init

# 初始化特定文件夹
nb init --path ~/notes/
```

### Git 集成

nb 自动为每个笔记本创建 Git 仓库：

```bash
# 查看 Git 状态
nb git status

# 提交更改
nb git commit -m "添加新笔记"

# 查看历史
nb git log

# 推送到远程
nb git push
```

## 笔记本管理

### 笔记本结构

```
~/notes/
├── .nb/
│   ├── config           # nb 配置
│   └── notebooks/       # 笔记本目录
│       ├── home/        # 主笔记本
│       ├── work/        # 工作笔记本
│       └── journal/     # 日记笔记本
├── home/                # 笔记本文件夹
│   ├── 001_note.md
│   └── 002_note.md
├── work/
└── journal/
```

### 笔记本命令

```bash
# 切换到笔记本（临时）
nb use work

# 创建笔记本
nb notebooks add projects

# 重命名笔记本
nb notebooks rename projects "新名称"

# 删除笔记本
nb notebooks delete projects
```

## 标签系统

### 添加标签

```bash
# 单个标签
nb add -t "标题" --tags python

# 多个标签
nb add -t "标题" --tags python,coding,learning

# 在笔记本中添加标签
nb work: add -t "标题" --tags project
```

### 按标签搜索

```bash
# 搜索特定标签
nb search --tags python

# 搜索多个标签
nb search --tags "python coding"

# 列出所有标签
nb tags
```

## 书签功能

### 添加书签

```bash
# 简单添加
nb bookmark add https://example.com

# 带标题和描述
nb bookmark add https://example.com \
  --title "示例网站" \
  --description "这是一个示例网站"

# 添加到特定笔记本
nb bookmarks: add https://example.com
```

### 管理书签

```bash
# 列出书签
nb bookmark list
nb bookmarks: list

# 搜索书签
nb bookmark search "python"

# 删除书签
nb bookmark delete <id>
```

## 同步和备份

### 同步到 GitHub/GitLab

在 `~/.nbconfig` 中配置：

```json
{
  "sync": {
    "enabled": true,
    "remote": "git@github.com:user/notes.git",
    "branch": "main"
  }
}
```

### 手动同步

```bash
# 推送到远程
nb git push

# 从远程拉取
nb git pull
```

## 插件和扩展

### 安装插件

```bash
# 安装主题
nb plugin install nb-theme

# 安装语法高亮
nb plugin install syntax-highlighting
```

### 常用插件

| 插件 | 功能 |
|------|------|
| `nb-theme` | 主题和颜色方案 |
| `syntax-highlighting` | 代码语法高亮 |
| `emoji-completion` | Emoji 自动完成 |
| `pomodoro` | 番茄钟集成 |

## 使用场景

### 1. 项目笔记

```bash
# 创建项目笔记本
nb notebooks add myproject

# 添加项目笔记
nb myproject: add -t "架构设计" -c "项目架构说明..."

# 标记为项目笔记
nb myproject: add -t "待办事项" --tags project,todo
```

### 2. 每日日志

```bash
# 创建日记笔记本
nb notebooks add journal

# 添加今日日志
nb journal: add -t "$(date +%Y-%m-%d)" -c "今天完成了..."

# 搜索今天的日志
nb journal: search "$(date +%Y-%m-%d)"
```

### 3. 代码片段库

```bash
# 创建代码笔记本
nb notebooks add snippets

# 添加 Python 片段
nb snippets: add -t "Python 列表推导" \
  --tags "python,list-comprehension" \
  -c "```python\n[x for x in range(10) if x % 2 == 0]\n```"
```

### 4. 书签收藏

```bash
# 添加开发资源书签
nb bookmarks: add https://docs.python.org \
  --title "Python 官方文档" \
  --tags "python,documentation"

# 搜索书签
nb bookmarks: search python
```

## 重要提示

⚠️ **重要提示**：永远不要手动编辑 nb Git 仓库中的文件（`~/.nb/*`）！始终使用 `nb` CLI 以确保正确的索引和 Git 提交。

## 提示和技巧

### 快速笔记

```bash
# 快速添加（提示输入）
nb add

# 使用别名
alias n=nb
n add -t "快速笔记"
```

### 导出和备份

```bash
# 导出为 Markdown
nb export

# 导出为 HTML
nb export --format html

# 完整备份
nb git backup
```

### 别名配置

在 shell 配置中添加：

```bash
# ~/.bashrc 或 ~/.zshrc
alias n=nb
alias nl="nb list"
alias ns="nb search"
alias nn="nb notebooks current"
```

## 资源

- GitHub: https://github.com/xwmx/nb
- 文档: https://xbx.me/nb/
- 维基: https://github.com/xwmx/nb/wiki