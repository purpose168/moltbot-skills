# 📬 sog — 标准运维工具

> **开放标准的命令行工具** — 通过 IMAP/SMTP/CalDAV/CardDAV/WebDAV 管理邮件、日历、联系人、任务、文件

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**开放标准**的对应工具，与 [gog](https://github.com/steipete/gog)（Google）和 [mog](https://github.com/visionik/mogcli)（Microsoft）相对应。相同的使用模式，支持任何服务提供商。

---

## ✨ 特性

| 模块 | 协议 | 描述 |
|------|------|------|
| 📧 **邮件** | IMAP/SMTP | 搜索、发送、回复、转发、文件夹、草稿 |
| 📅 **日历** | CalDAV | 事件、创建、更新、搜索、今日、本周 |
| 👥 **联系人** | CardDAV | 列表、搜索、创建、更新、删除 |
| ✅ **任务** | CalDAV VTODO | 添加、完成、截止日期、优先级、清除 |
| 📁 **文件** | WebDAV | 列表、上传、下载、移动、复制、删除 |
| 📨 **邀请** | iTIP/iMIP | 发送、回复、取消会议邀请 |

**额外功能：**
- 🤖 **AI友好** — `--ai-help` 为 LLM 输出全面的文档
- 🔄 **兼容 gog/mog** — 相同的标志和模式，便于肌肉记忆
- 🔐 **安全** — 密码存储在系统密钥链中

---

## 🚀 快速开始

```bash
# 安装
go install github.com/visionik/sogcli/cmd/sog@latest

# 添加账户（自动发现服务器）
sog auth add you@fastmail.com --discover

# 查看邮件
sog mail list --max 10

# 发送邮件
sog mail send --to bob@example.com --subject "Hello" --body "Hi Bob!"

# 今日日历
sog cal today

# 创建事件
sog cal create "Team Meeting" --start "2025-01-15T10:00" --duration 1h

# 添加任务
sog tasks add "Review PR" --due 2025-01-16 -p 1

# 上传到 WebDAV
sog drive upload ./report.pdf /documents/

# 发送会议邀请
sog invite send "团队同步" alice@example.com bob@example.com \
  --start "2026-01-25T14:00" --duration 30m --location "Zoom"
```

---

## 📦 安装

```bash
# Go 安装（推荐）
go install github.com/visionik/sogcli/cmd/sog@latest

# 或克隆用于开发
git clone https://github.com/visionik/sogcli.git
cd sogcli
go build -o sog ./cmd/sog
```

---

## ⚙️ 设置

### 1. 添加账户

```bash
# 从 DNS 自动发现（推荐）
sog auth add you@fastmail.com --discover

# 或手动指定服务器
sog auth add you@example.com \
  --imap-host imap.example.com \
  --smtp-host smtp.example.com \
  --caldav-url https://caldav.example.com/ \
  --carddav-url https://carddav.example.com/ \
  --webdav-url https://webdav.example.com/
```

### 2. 验证

```bash
sog auth test
sog auth list
```

### 3. 协议特定密码（如需）

```bash
sog auth password you@example.com \
  --imap "password1" \
  --smtp "password2" \
  --caldav "password3"
```

---

## 📖 命令参考

### 全局选项

| 选项 | 描述 |
|------|------|
| `--account, -a` | 要使用的账户邮箱 |
| `--json` | 输出 JSON（最适合脚本） |
| `--plain` | 稳定的文本输出（TSV，无颜色） |
| `--verbose, -v` | 显示额外细节 |
| `--force` | 跳过确认 |
| `--no-input` | 从不提示（CI 模式） |
| `--ai-help` | 为 AI 智能体提供完整文档 |

---

### 📧 邮件

```bash
sog mail list [folder]               # 列出邮件
sog mail list --max 10 --unseen      # 最近未读
sog mail get <uid>                   # 读取邮件
sog mail search "FROM john"          # IMAP 搜索语法

sog mail send --to X --subject Y --body Z
sog mail send --to X --subject Y --body-file ./message.txt

sog mail reply <uid> --body "Thanks!"
sog mail forward <uid> --to bob@example.com

sog mail move <uid> Archive
sog mail flag <uid> flagged
sog mail delete <uid>

# 文件夹
sog folders list
sog folders create "Projects"
sog folders rename "Old" "New"

# 草稿
sog drafts list
sog drafts create --to X --subject Y --body Z
sog drafts send <uid>
```

**别名：** `sog m` → `sog mail`

---

### 📅 日历

```bash
sog cal list                         # 即将到来的事件
sog cal list --from 2025-01-01 --to 2025-01-31
sog cal today                        # 今日事件
sog cal week                         # 本周
sog cal search "meeting"             # 搜索事件

sog cal create "Meeting" --start "2025-01-15T10:00" --duration 1h
sog cal create "All Day" --start "2025-01-15"  # 全天事件

sog cal get <uid>
sog cal update <uid> --title "New Title" --location "Zoom"
sog cal delete <uid>

sog cal calendars                    # 列出日历
```

**别名：** `sog c` → `sog cal`

---

### 📁 文件（WebDAV）

```bash
sog drive ls                         # 根文件夹
sog drive ls /Documents -l           # 详细格式
sog drive get /file.pdf              # 文件元数据

sog drive download /remote/file.pdf ./local.pdf
sog drive upload ./doc.pdf /remote/
sog drive cat /file.txt              # 输出到标准输出

sog drive mkdir /New-Folder
sog drive move /old.pdf /new.pdf
sog drive copy /src.pdf /dst.pdf
sog drive delete /file.pdf
```

**别名：** `sog files` → `sog drive`

---

### ✅ 任务

```bash
sog tasks lists                      # 列出任务列表
sog tasks list                       # 默认列表中的任务
sog tasks list --all                 # 包含已完成的任务

sog tasks add "Buy milk"
sog tasks add "Review PR" --due 2025-01-16 -p 1
sog tasks add "Call mom" -d "Birthday reminder"

sog tasks get <uid>
sog tasks update <uid> --title "Updated" --due 2025-01-20
sog tasks done <uid>
sog tasks undo <uid>
sog tasks delete <uid>

sog tasks due tomorrow               # 截止到指定日期的任务
sog tasks overdue                    # 逾期任务
sog tasks clear                      # 清除已完成的任务
```

**别名：** `sog t` → `sog tasks`

---

### 👥 联系人

```bash
sog contacts list
sog contacts search "john"
sog contacts get <uid>

sog contacts create "John Doe" -e john@example.com -p 555-1234
sog contacts update <uid> --email new@example.com
sog contacts delete <uid>

sog contacts books                   # 列出地址簿
```

**别名：** `sog con` → `sog contacts`

---

### 📨 会议邀请

```bash
# 发送邀请
sog invite send "Team Sync" alice@example.com bob@example.com \
  --start "2025-01-15T14:00" --duration 30m --location "Zoom"

# 回复邀请
sog invite reply ./invite.ics --status accept
sog invite reply ./invite.ics --status decline --comment "Can't make it"
sog invite reply ./invite.ics --status tentative

# 取消会议
sog invite cancel <uid> alice@example.com bob@example.com

# 解析 .ics 文件
sog invite parse ./meeting.ics

# 预览而不发送
sog invite preview "Meeting" alice@example.com --start "2025-01-15T10:00"
```

**别名：** `sog inv` → `sog invite`

---

### 🔔 IMAP IDLE

```bash
sog idle                             # 监视收件箱的新邮件
sog idle "Work"                      # 监视特定文件夹
sog idle --timeout 300               # 5分钟超时
```

---

## 🤖 AI友好

运行 `sog --ai-help` 获取全面的文档，包括：

- 所有命令及其选项
- 日期/时间格式规范
- 每个命令的示例
- 输出格式详情

---

## 🔄 gog/mog 兼容性

sog 遵循 [gog](https://github.com/steipete/gog) 和 [mog](https://github.com/visionik/mogcli) 的模式：

| 模式 | sog | gog | mog |
|------|-----|-----|-----|
| 日历事件 | `--start`, `--duration` | 相同 | `--from`, `--to` |
| 任务优先级 | `-p, --priority` | 相同 | `--important` |
| 输出格式 | `--json`, `--plain` | 相同 | 相同 |
| 最大结果数 | `--max` | 相同 | 相同 |

---

## 🗂️ 配置

| 文件 | 用途 |
|------|------|
| `~/.config/sog/config.json` | 账户设置 |
| 系统密钥链 | 密码（安全） |

**环境变量：**

| 变量 | 描述 |
|------|------|
| `SOG_ACCOUNT` | 默认账户邮箱 |

---

## ✅ 已测试的服务提供商

| 提供商 | IMAP/SMTP | CalDAV | CardDAV | WebDAV |
|--------|-----------|--------|---------|--------|
| **Fastmail** | ✅ | ✅ | ✅ | ✅ |

*其他符合标准的提供商应该也能工作，但尚未测试。*

---

## 📄 许可证

MIT

---

## 👨‍💻 开发者

**[visionik](mailto:visionik@pobox.com)** 和 **Vinston 🐺**（[Clawdbot](https://github.com/clawdbot/clawdbot)）使用 visionik.md 框架/技能开发。