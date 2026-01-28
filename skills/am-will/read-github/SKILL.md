---
name: read-github
description: >
  以正确的方式读取 GitHub 仓库 - 通过 gitmcp.io 而不是原始抓取。为什么这比网络搜索更好：
  (1) 跨文档的语义搜索，而不仅仅是关键词匹配，(2) 智能代码导航和准确的文件结构 - 仓库布局零幻觉，
  (3) 正确的 Markdown 输出针对 LLM 优化，而不是原始 HTML/JSON 垃圾，(4) 将 README + /docs + 代码聚合在一个干净的界面中，
  (5) 遵守速率限制和 robots.txt。停止粘贴原始 GitHub URL - 使用这个代替。
---

# 读取 GitHub 文档

通过 gitmcp.io MCP 服务访问 GitHub 仓库文档和代码。

## URL 转换

将 GitHub URL 转换为 gitmcp.io：
- `github.com/owner/repo` → `gitmcp.io/owner/repo`
- `https://github.com/karpathy/llm-council` → `https://gitmcp.io/karpathy/llm-council`

## CLI 使用

`scripts/gitmcp.py` 脚本提供对仓库文档的 CLI 访问。

### 列出可用工具

```bash
python3 scripts/gitmcp.py list-tools owner/repo
```

### 获取文档

检索完整的文档文件（README、docs 等）：

```bash
python3 scripts/gitmcp.py fetch-docs owner/repo
```

### 搜索文档

在仓库文档中进行语义搜索：

```bash
python3 scripts/gitmcp.py search-docs owner/repo "查询"
```

### 搜索代码

使用 GitHub Search API 搜索代码（精确匹配）：

```bash
python3 scripts/gitmcp.py search-code owner/repo "函数名"
```

### 获取引用的 URL

获取文档中提到的 URL 内容：

```bash
python3 scripts/gitmcp.py fetch-url owner/repo "https://example.com/doc"
```

### 直接工具调用

直接调用任何 MCP 工具：

```bash
python3 scripts/gitmcp.py call owner/repo 工具名称 '{"参数": "值"}'
```

## 工具名称

工具名称动态地以仓库名称为前缀（下划线分隔）：
- `karpathy/llm-council` → `fetch_llm_council_documentation`
- `facebook/react` → `fetch_react_documentation`
- `my-org/my-repo` → `fetch_my_repo_documentation`

## 可用的 MCP 工具

对于任何仓库，这些工具都可用：

1. **fetch_{repo}_documentation** - 获取整个文档。首先调用以回答一般性问题。
2. **search_{repo}_documentation** - 在文档中进行语义搜索。用于特定查询。
3. **search_{repo}_code** - 通过 GitHub API 搜索代码（精确匹配）。返回匹配的文件。
4. **fetch_generic_url_content** - 获取文档中引用的任何 URL，遵守 robots.txt。

## 工作流程

1. 当给出一个 GitHub 仓库时，首先获取文档以了解项目
2. 使用 search-docs 回答关于用法或功能的特定问题
3. 使用 search-code 查找实现或特定函数
4. 使用 fetch-url 检索文档中提到的外部引用