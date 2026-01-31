---
name: clinkding
description: 管理 linkding 书签 - 保存网址、搜索、标签、组织和检索您的个人书签收藏。当用户想要保存链接、搜索书签、管理标签或组织阅读列表时使用。
homepage: https://github.com/daveonkels/clinkding
metadata: {"clawdis":{"emoji":"🔖","requires":{"bins":["clinkding"]},"install":[{"id":"homebrew","kind":"brew","formula":"daveonkels/tap/clinkding","bins":["clinkding"],"label":"Install clinkding (Homebrew)"},{"id":"go","kind":"go","module":"github.com/daveonkels/clinkding@latest","bins":["clinkding"],"label":"Install clinkding (Go)"}]}}
---

# clinkding - Linkding 书签管理器 CLI

一个现代的基于 Go 的 CLI，用于管理 [linkding](https://github.com/sissbruecker/linkding) 中的书签，这是一款自托管的书签管理器。

## 功能概述

**Linkding** 是一款自托管的书签管理器（类似于 Pocket、Instapaper）。**clinkding** 是 CLI 工具，可让您通过终端或 AI 代理管理书签。

它的功能包括：
- **稍后保存** - 捕获您想阅读的网址
- **可搜索库** - 在标题、描述、标签中进行全文搜索
- **有组织的集合** - 标签和捆绑相关书签
- **个人存档** - 保留带有笔记和元数据的重要链接

## 快速开始

### 初始设置

```bash
# 交互式配置
clinkding config init

# 或手动配置
clinkding config set url https://your-linkding-instance.com
clinkding config set token YOUR_API_TOKEN

# 测试连接
clinkding config test
```

### 配置文件

位置: `~/.config/clinkding/config.yaml`

```yaml
url: https://linkding.example.com
token: your-api-token-here

defaults:
  bookmark_limit: 100
  output_format: auto
```

### 环境变量

```bash
export LINKDING_URL="https://linkding.example.com"
export LINKDING_TOKEN="your-api-token-here"
```

## 核心命令

### 书签

#### 列出和搜索

```bash
# 列出最近的书签
clinkding bookmarks list

# 按关键词搜索
clinkding bookmarks list --query "golang tutorial"

# 按标签过滤
clinkding bookmarks list --query "tag:programming"

# 最近的书签（最近 7 天）
clinkding bookmarks list --added-since "7d"

# 未读的书签
clinkding bookmarks list --query "unread:yes"

# 用于脚本化的 JSON 输出
clinkding bookmarks list --json

# 纯文本（制表符分隔）
clinkding bookmarks list --plain
```

#### 创建书签

```bash
# 简单书签
clinkding bookmarks create https://go.dev

# 带元数据
clinkding bookmarks create https://go.dev \
  --title "Go 编程语言" \
  --tags "golang,programming,reference" \
  --description "Go 官方网站" \
  --unread

# 在创建之前检查网址是否已存在
clinkding bookmarks check https://go.dev
```

#### 更新书签

```bash
# 更新标题
clinkding bookmarks update 42 --title "新标题"

# 添加标签
clinkding bookmarks update 42 --add-tags "important,work"

# 移除标签
clinkding bookmarks update 42 --remove-tags "old-tag"

# 标记为已读
clinkding bookmarks update 42 --read

# 更新描述
clinkding bookmarks update 42 --description "更新的笔记"
```

#### 获取书签详情

```bash
# 完整详情
clinkding bookmarks get 42

# JSON 输出
clinkding bookmarks get 42 --json
```

#### 存档和删除

```bash
# 存档（从主列表中隐藏）
clinkding bookmarks archive 42

# 取消存档
clinkding bookmarks unarchive 42

# 永久删除
clinkding bookmarks delete 42
```

### 标签

```bash
# 列出所有标签
clinkding tags list

# 创建标签
clinkding tags create "golang"

# 获取标签详情
clinkding tags get 1

# 纯文本输出
clinkding tags list --plain
```

### 捆绑

捆绑是相关书签的集合。

```bash
# 列出捆绑
clinkding bundles list

# 创建捆绑
clinkding bundles create "Go 资源" \
  --description "与 Go 编程相关的一切"

# 更新捆绑
clinkding bundles update 1 --name "Go 语言资源"

# 获取捆绑详情
clinkding bundles get 1

# 删除捆绑
clinkding bundles delete 1
```

### 资源

上传和管理书签的附件。

```bash
# 列出书签的资源
clinkding assets list 42

# 上传文件
clinkding assets upload 42 ~/Documents/screenshot.png

# 下载资源
clinkding assets download 42 1 -o ./downloaded-file.png

# 删除资源
clinkding assets delete 42 1
```

### 用户资料

```bash
# 获取用户资料信息
clinkding user profile
```

## 代理使用模式

### 从对话中保存网址

```bash
# 用户: "保存这个稍后阅读: https://example.com"
clinkding bookmarks create https://example.com \
  --title "文章标题" \
  --description "来自对话的上下文" \
  --tags "topic,context"
```

### 搜索书签

```bash
# 用户: "找到我的 golang 书签"
clinkding bookmarks list --query "golang"

# 用户: "显示我未读的编程文章"
clinkding bookmarks list --query "tag:programming unread:yes"

# 用户: "我上周保存了什么？"
clinkding bookmarks list --added-since "7d"
```

### 组织和标签

```bash
# 用户: "将书签 42 标记为重要"
clinkding bookmarks update 42 --add-tags "important"

# 用户: "为我的 AI 研究链接创建一个捆绑"
clinkding bundles create "AI 研究" \
  --description "机器学习和 AI 论文"
```

### 检索阅读

```bash
# 用户: "给我一些阅读内容"
clinkding bookmarks list --query "unread:yes" --limit 5

# 用户: "显示我的 golang 教程"
clinkding bookmarks list --query "tag:golang tag:tutorial"
```

## 输出格式

### 自动（默认）
终端显示的人类友好的表格和颜色。

### JSON
```bash
clinkding bookmarks list --json
```
用于脚本化和代理解析的机器可读格式。

### 纯文本
```bash
clinkding bookmarks list --plain
```
制表符分隔的值，便于管道解析。

## 相对日期过滤

支持人类友好的时间范围：

```bash
# 最近 24 小时
clinkding bookmarks list --added-since "24h"

# 最近 7 天
clinkding bookmarks list --added-since "7d"

# 最近 6 个月
clinkding bookmarks list --modified-since "180d"
```

**支持的单位:** `h`（小时）, `d`（天）, `y`（年）

## 常见工作流程

### 早晨阅读例程

```bash
# 检查未读的书签
clinkding bookmarks list --query "unread:yes"

# 获取最近的前 5 个
clinkding bookmarks list --limit 5
```

### 从剪贴板保存

```bash
# macOS
pbpaste | xargs -I {} clinkding bookmarks create {}

# Linux
xclip -o | xargs -I {} clinkding bookmarks create {}
```

### 批量操作

```bash
# 为多个书签添加标签
for id in 42 43 44; do
  clinkding bookmarks update $id --add-tags "important"
done

# 存档旧的未读书签
clinkding bookmarks list --query "unread:yes" --added-since "30d" --plain | \
  while read id _; do
    clinkding bookmarks archive "$id"
  done
```

### 备份书签

```bash
# 将所有书签导出为 JSON
clinkding bookmarks list --json > bookmarks-backup-$(date +%Y%m%d).json

# 导出特定标签
clinkding bookmarks list --query "tag:important" --json > important.json
```

## 全局标志

适用于所有命令：

| 标志 | 描述 |
|------|-------------|
| `-c, --config <file>` | 配置文件路径 |
| `-u, --url <url>` | Linkding 实例 URL |
| `-t, --token <token>` | API 令牌 |
| `--json` | 输出为 JSON |
| `--plain` | 输出为纯文本 |
| `--no-color` | 禁用颜色 |
| `-q, --quiet` | 最小输出 |
| `-v, --verbose` | 详细输出 |

## 退出代码

| 代码 | 含义 |
|------|---------|
| 0 | 成功 |
| 1 | 常规错误（API/网络） |
| 2 | 用法无效（错误的标志/参数） |
| 3 | 身份验证错误 |
| 4 | 未找到 |
| 130 | 中断（Ctrl-C） |

## 故障排除

### 测试配置

```bash
# 验证设置
clinkding config show

# 测试连接
clinkding config test
```

### 常见问题

**身份验证错误:**
- 验证 linkding Web 界面中的 API 令牌
- 检查 URL 包含协议（`https://`）
- 从 URL 中移除尾随斜杠

**命令特定帮助:**
```bash
clinkding bookmarks --help
clinkding bookmarks create --help
```

## 链接

- **GitHub:** https://github.com/daveonkels/clinkding
- **Linkding:** https://github.com/sissbruecker/linkding
- **Homebrew:** `brew install daveonkels/tap/clinkding`

## 安装

### Homebrew (macOS/Linux)

```bash
brew install daveonkels/tap/clinkding
```

### Go 安装

```bash
go install github.com/daveonkels/clinkding@latest
```

### 二进制下载

从 [releases](https://github.com/daveonkels/clinkding/releases) 为您的平台下载。

## Shell 补全

```bash
# Bash
clinkding completion bash > /etc/bash_completion.d/clinkding

# Zsh
clinkding completion zsh > "${fpath[1]}/_clinkding"

# Fish
clinkding completion fish > ~/.config/fish/completions/clinkding.fish
```

---

**创建者:** [@daveonkels](https://github.com/daveonkels)  
**许可证:** MIT

## 智能书签创建的代理工作流程

### 使用自动元数据添加网址

当用户说"添加这个到 linkding"或"保存这个网址"时，遵循此工作流程：

**1. 从 URL 提取元数据**

使用 `summarize` 技能获取标题和描述：

```bash
# 获取页面元数据
summarize url https://example.com --format json
```

这会返回包含以下内容的结构化数据：
- 标题
- 描述/摘要
- 主要内容

**2. 从内容推断适当的标签**

仅映射到**现有的规范标签**。不要创建新标签。

使用此规范标签列表（共 263 个标签）：
- **技术:** webdev, design, programming, ai, cloud, devops, docker, linux, networking, security, privacy
- **内容:** content, media, photography, video, audio, books, podcasting
- **商业:** business, marketing, ecommerce, finance, career, productivity
- **家居:** smart-home, home-assistant, esphome, iot, home-improvement
- **工具:** tools, cli, git, github, editor, reference, documentation
- **数据:** data, analytics, mysql, nosql
- **通信:** communication, email, messaging, slack
- **教育:** education, guide, howto, research, testing
- **地点:** texas, seattle, dallas（谨慎使用）

**标签选择规则:**
- 最多使用 2-5 个标签
- 选择最具体的适用标签
- 如果不确定，默认为更广泛的类别（例如 `tools` 优于 `generator`）
- 首先检查现有标签: `clinkding tags list --plain | grep -i <keyword>`
- 永远不要创建类似这样的标签: `awesome`, `cool`, `interesting`, `resources`, `tips`

**3. 使用元数据创建书签**

```bash
clinkding bookmarks create "https://example.com" \
  --title "来自 summarize 的标题" \
  --description "来自 summarize 的摘要（1-2 句）" \
  --tags "webdev,tools,reference"
```

### 示例工作流程

**用户:** "保存这个到 linkding: https://github.com/awesome/project"

**代理操作:**

```bash
# 1. 检查是否已添加书签
clinkding bookmarks check https://github.com/awesome/project

# 2. 获取元数据（使用 summarize 技能）
summarize url https://github.com/awesome/project --format json

# 3. 分析内容并推断标签
# 来自摘要: "用于 Docker 容器管理的 CLI 工具"
# 规范标签: docker, devops, cli, tools

# 4. 创建书签
clinkding bookmarks create https://github.com/awesome/project \
  --title "Awesome Project - Docker 容器 CLI" \
  --description "用于管理 Docker 容器的命令行工具，具有增强功能" \
  --tags "docker,devops,cli"
```

### 标签映射启发式

使用这些规则将内容映射到规范标签：

| 内容类型 | 规范标签 |
|--------------|----------------|
| Web 开发、HTML、CSS、JavaScript | `webdev`, `css`, `javascript` |
| React、框架、前端 | `webdev`, `react` |
| 设计、UI/UX、原型 | `design` |
| Python、Go、Ruby 代码 | `programming`, `python`/`ruby` |
| Docker、K8s、DevOps | `docker`, `devops`, `cloud` |
| 家庭自动化、ESP32、传感器 | `smart-home`, `esphome`, `iot` |
| AI、ML、LLMs | `ai`, `llm` |
| 生产力工具、工作流程 | `productivity`, `tools` |
| 财务、投资、加密货币 | `finance` |
| 营销、SEO、广告 | `marketing` |
| 购物、优惠、商店 | `ecommerce` |
| 教程、指南、文档 | `guide`, `howto`, `documentation` |
| 安全、隐私、加密 | `security`, `privacy` |
| 本地（DFW/Seattle） | `texas`, `seattle` |

### 创建前的验证

始终运行这些检查：

```bash
# 1. 网址是否已存在？
clinkding bookmarks check <url>

# 2. 标签是否存在？
clinkding tags list --plain | grep -iE "^(tag1|tag2|tag3)$"

# 3. 我们使用的是规范标签吗？
# 与 263 个规范标签交叉引用
# 未经用户明确请求，永远不要创建新标签
```

### 用户请求保存多个链接

如果用户提供多个网址：

```bash
# 使用元数据提取分别处理每个网址
for url in url1 url2 url3; do
  # 获取元数据
  # 推断标签
  # 创建书签
done
```

### 更新现有书签

如果用户说"更新那个书签"或"添加标签到我上次保存的内容"：

```bash
# 获取最近的书签
recent_id=$(clinkding bookmarks list --limit 1 --plain | cut -f1)

# 添加标签（不要移除已有的，除非被要求）
clinkding bookmarks update $recent_id --add-tags "new-tag"

# 更新描述
clinkding bookmarks update $recent_id --description "更新的笔记"
```

### 关键原则

1. **始终获取元数据** - 使用 `summarize` 获取好的标题/描述
2. **使用现有标签** - 永远不要在不检查规范列表的情况下创建新标签
3. **有选择性** - 最多 2-5 个标签，选择最具体的适用标签
4. **首先验证** - 创建前检查重复项
5. **提供上下文** - 包含简要描述说明它为什么有用

---

## 当前规范标签结构

Dave 的 linkding 实例在从 17,189 个重复项合并后有 **263 个规范标签**。

热门类别（按书签数量）：
- `pinboard` (4,987) - 旧导入标签
- `ifttt` (2,639) - 旧导入标签  
- `webdev` (1,679) - Web 开发
- `design` (561) - 设计/UI/UX
- `content` (416) - 内容/写作
- `cloud` (383) - 云/托管/SaaS
- `business` (364) - 商业/策略
- `ecommerce` (308) - 购物/市场
- `smart-home` (295) - 家庭自动化
- `productivity` (291) - 生产力工具

**黄金法则:** 如果有疑问，使用更广泛的现有标签而不是创建新的具体标签。
