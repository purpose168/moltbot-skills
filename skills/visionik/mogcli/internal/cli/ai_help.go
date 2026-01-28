package cli

// AIHelpText 包含 AI/LLM 智能体的详细帮助信息。
var AIHelpText = `# mog — Microsoft 操作小工具

Microsoft 365 命令行工具 — 邮件、日历、驱动器、联系人、任务、OneNote。

## 快速开始

mog auth login --client-id 你的_AZURE客户端_ID
mog auth status
mog mail search "*" --max 10

## 全局标志

--json           JSON 输出（用于脚本）
--plain          纯文本输出（TSV）
--verbose, -v    显示完整 ID
--force          跳过确认
--no-input       从不提示（CI 模式）
--ai-help        此帮助文本

## 认证

mog auth login --client-id <id>    # 设备代码流程
mog auth status                     # 检查认证状态
mog auth logout                     # 清除令牌

所需的 Azure AD 权限（委派）：
- User.Read, offline_access
- Mail.ReadWrite, Mail.Send
- Calendars.ReadWrite
- Files.ReadWrite.All
- Contacts.ReadWrite
- Tasks.ReadWrite
- Notes.ReadWrite

## 邮件

mog mail search <query>              # 搜索消息（* 表示所有）
  --max N                            # 最大结果数（默认：25）
  --folder <id>                      # 在特定文件夹中搜索

mog mail get <id>                    # 通过 ID 获取消息

mog mail send [flags]
  --to <email>                       # 收件人（必需）
  --cc <email>                       # 抄送收件人
  --bcc <email>                      # 密送收件人
  --subject <text>                   # 主题（必需）
  --body <text>                      # 正文文本
  --body-file <path>                 # 从文件读取正文（- 表示标准输入）
  --body-html <html>                 # HTML 正文

mog mail folders                     # 列出邮件文件夹

mog mail drafts list
mog mail drafts create [flags]       # 与 send 相同的标志
mog mail drafts send <draftId>
mog mail drafts delete <draftId>

mog mail attachment list <messageId>
mog mail attachment download <messageId> <attachmentId> --out <path>

## 日历

mog calendar list                    # 列出事件
  --from <date>                      # 开始日期（默认：今天）
  --to <date>                        # 结束日期（默认：+30d）
  --max N                            # 最大事件数
  --calendar <id>                    # 特定日历

mog calendar get <eventId>

mog calendar create [flags]
  --summary <text>                   # 事件标题（必需）
  --from <datetime>                  # 开始时间（必需，ISO 格式）
  --to <datetime>                    # 结束时间（必需）
  --location <text>                  # 地点
  --body <text>                      # 描述
  --attendees <email>                # 与会者电子邮件
  --all-day                          # 全天事件
  --calendar <id>                    # 特定日历

mog calendar update <eventId> [flags]
mog calendar delete <eventId>
mog calendar calendars               # 列出日历

mog calendar respond <eventId> <response>
  # response: accept, decline, tentative
  --comment <text>                   # 可选评论

mog calendar freebusy <emails>... --start <datetime> --end <datetime>

别名: mog cal → mog calendar

## 驱动器 (OneDrive)

mog drive ls [path]                  # 列出文件
mog drive search <query>             # 搜索文件
mog drive get <id>                   # 获取文件元数据

mog drive download <id> --out <path>
mog drive upload <path>
  --folder <id>                      # 目标文件夹
  --name <name>                      # 上传时重命名

mog drive mkdir <name>
  --parent <id>                      # 父文件夹

mog drive move <id> <destinationId>
mog drive rename <id> <newName>
mog drive copy <id> --name <name>
mog drive rm <id>                    # 删除文件

## 联系人

mog contacts list
mog contacts search <query>
mog contacts get <id>

mog contacts create [flags]
  --name <text>                      # 显示名称（必需）
  --email <email>                    # 电子邮件地址
  --phone <number>                   # 电话号码
  --company <text>                   # 公司名称
  --title <text>                     # 职位

mog contacts update <id> [flags]     # 与 create 相同的标志
mog contacts delete <id>
mog contacts directory <query>       # 搜索组织目录

## 任务 (Microsoft To-Do)

mog tasks lists                      # 列出任务列表
mog tasks list [listId]              # 列出任务
  --all                              # 包含已完成的

mog tasks add <title>
  --list <id>                        # 任务列表 ID
  --due <date>                       # 截止日期（YYYY-MM-DD 或 'tomorrow'）
  --notes <text>                     # 任务备注
  --important                        # 标记为重要

mog tasks update <taskId> [flags]
  --list <id>                        # 任务列表 ID（必需）

mog tasks done <taskId> --list <id>
mog tasks undo <taskId> --list <id>
mog tasks delete <taskId> --list <id>
mog tasks clear [listId]             # 清除已完成的任务

别名: mog todo → mog tasks

## OneNote

mog onenote notebooks                # 列出笔记本
mog onenote sections <notebookId>    # 列出分区
mog onenote pages <sectionId>        # 列出页面
mog onenote get <pageId>             # 获取页面内容
  --html                             # 输出原始 HTML
mog onenote search <query>           # 搜索（有限）

## Excel

mog excel list                       # 列出工作簿（通过驱动器搜索）
mog excel metadata <id>              # 列出工作表
mog excel get <id> [sheet] [range]   # 读取数据
mog excel update <id> <sheet> <range> <values>...
mog excel append <id> <table> <values>...
mog excel create <name>
mog excel export <id> --out <path>
mog excel copy <id> <name>

注意：Go 版本中的 Excel 操作有限。使用驱动器命令。

## Word

mog word list                        # 通过驱动器搜索
mog word export <id> --out <path>
mog word copy <id> <name>

注意：大多数操作使用驱动器命令。

## PowerPoint

mog ppt list                         # 通过驱动器搜索
mog ppt export <id> --out <path>
mog ppt copy <id> <name>

注意：大多数操作使用驱动器命令。

## 短 ID 系统

Microsoft Graph 使用非常长的 ID。mog 生成 8 字符的短 ID：
- 所有命令默认输出短 ID
- 所有命令接受短 ID 或完整 ID
- 使用 --verbose 查看完整 ID
- 短 ID 缓存在 ~/.config/mog/slugs.json

## 输出格式

默认：人类可读的彩色输出
--json: 用于脚本的 JSON 输出
--plain: 制表符分隔的值

## 环境变量

MOG_CLIENT_ID    Azure AD 客户端 ID

## 配置

~/.config/mog/settings.json   客户端 ID
~/.config/mog/tokens.json     OAuth 令牌（敏感）
~/.config/mog/slugs.json      ID 短 ID 缓存

## 示例

# 发送电子邮件
mog mail send --to user@example.com --subject "Hello" --body "Hi!"

# 今天的日历
mog cal list --from today --to tomorrow

# 创建会议
mog cal create --summary "团队同步" \
  --from "2025-01-15T14:00:00" --to "2025-01-15T15:00:00" \
  --attendees "alice@example.com"

# 添加任务
mog tasks add "Review PR" --due tomorrow --important

# 上传文件
mog drive upload ./report.pdf

# 搜索联系人
mog contacts search "john"
`
