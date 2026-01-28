// Package cli 定义了 sog 的命令行接口。
package cli

import (
	"fmt"
	"os"
)

// Root 是命令行工具的顶层结构体。
// 包含所有全局标志和子命令的定义。
type Root struct {
	// 全局标志 (与 gog 模式匹配)
	AIHelp  bool        `name:"ai-help" help:"显示 AI/LLM 智能体的详细帮助信息"`
	Account string      `help:"要使用的账户邮箱" env:"SOG_ACCOUNT" short:"a"`
	JSON    bool        `help:"输出 JSON 到标准输出 (最适合脚本处理)" xor:"format"`
	Plain   bool        `help:"输出稳定的、可解析的文本到标准输出 (TSV格式; 无颜色)" xor:"format"`
	Color   string      `help:"颜色输出: auto|always|never" default:"auto" enum:"auto,always,never"`
	Force   bool        `help:"跳过破坏性命令的确认提示"`
	NoInput bool        `help:"从不提示; 直接失败 (适用于 CI 环境)" name:"no-input"`
	Verbose bool        `help:"启用详细日志" short:"v"`
	Version VersionFlag `name:"version" help:"打印版本信息并退出"`

	// 子命令
	Auth     AuthCmd     `cmd:"" help:"管理账户"`
	Mail     MailCmd     `cmd:"" aliases:"m" help:"阅读和发送邮件"`
	Cal      CalCmd      `cmd:"" aliases:"c" help:"日历操作 (CalDAV)"`
	Contacts ContactsCmd `cmd:"" aliases:"con" help:"联系人操作 (CardDAV)"`
	Tasks    TasksCmd    `cmd:"" aliases:"t" help:"任务操作 (CalDAV VTODO)"`
	Drive    DriveCmd    `cmd:"" aliases:"files" help:"文件操作 (WebDAV)"`
	Invite   InviteCmd   `cmd:"" aliases:"inv" help:"会议邀请 (iTIP/iMIP)"`
	Folders  FoldersCmd  `cmd:"" aliases:"f" help:"管理文件夹"`
	Drafts   DraftsCmd   `cmd:"" aliases:"d" help:"管理草稿"`
	Idle     IdleCmd     `cmd:"" help:"监听新邮件 (IMAP IDLE)"`
}

// VersionFlag 处理 --version 参数。
type VersionFlag string

// BeforeApply 在参数应用前打印版本信息并退出。
func (v VersionFlag) BeforeApply() error {
	fmt.Println(v)
	os.Exit(0)
	return nil
}

// AIHelpText 包含 AI/LLM 智能体的详细帮助信息。
var AIHelpText = `# sog — 标准运维工具

用于 IMAP/SMTP/CalDAV/CardDAV/WebDAV 的命令行工具。
开放标准替代方案，类似于 gog (Google) 和 mog (Microsoft)。

## 快速开始

sog auth add you@fastmail.com --discover
sog auth test
sog mail list

## 全局标志

--account, -a    要使用的账户邮箱 ($SOG_ACCOUNT)
--json           JSON 输出 (用于脚本)
--plain          TSV 输出 (可解析)
--force          跳过确认提示
--no-input       从不提示 (CI 模式)
--verbose, -v    调试日志
--ai-help        显示此帮助信息

## 身份验证

sog auth add <邮箱> [标志]
  --discover       从 DNS 自动发现服务器
  --imap-host      IMAP 服务器主机名
  --imap-port      IMAP 端口 (默认: 993)
  --smtp-host      SMTP 服务器主机名
  --smtp-port      SMTP 端口 (默认: 587)
  --caldav-url     CalDAV 服务器 URL
  --carddav-url    CardDAV 服务器 URL
  --webdav-url     WebDAV 服务器 URL
  --password       密码 (存储在密钥链中)

sog auth list                    列出账户
sog auth test [邮箱]             测试连接
sog auth remove <邮箱>           移除账户
sog auth password <邮箱>         设置协议特定的密码
  --imap, --smtp, --caldav, --carddav, --webdav

## 邮件 (IMAP/SMTP)

sog mail list [文件夹]
  --最大 N          最大消息数 (默认: 20)
  --unseen         仅未读消息

sog mail get <uid>
  --headers        仅标题
  --raw            原始 RFC822 格式

sog mail search <查询>
  IMAP SEARCH 语法: FROM, TO, SUBJECT, SINCE, BEFORE 等
  示例: sog mail search "FROM john SINCE 1-Jan-2026"

sog mail send --to <邮箱> --subject <文本> [标志]
  --to             收件人
  --cc             抄送收件人
  --bcc            密送收件人
  --subject        主题行
  --body           消息正文
  --body-file      从文件读取正文 (- 表示标准输入)

sog mail reply <uid> --body <文本>
sog mail forward <uid> --to <邮箱>
sog mail move <uid> <文件夹>
sog mail copy <uid> <文件夹>
sog mail flag <uid> <标志>       标志: seen, flagged, answered, deleted
sog mail unflag <uid> <标志>
sog mail delete <uid>

## 文件夹

sog folders list
sog folders create <名称>
sog folders delete <名称>
sog folders rename <旧名称> <新名称>

## 草稿

sog drafts list
sog drafts create [标志]        与邮件发送相同的标志
sog drafts send <uid>
sog drafts delete <uid>

## 日历 (CalDAV)

sog cal list [日历]
  --from           开始日期 (默认: 今天)
  --to             结束日期 (默认: +30天)
  --最大            最大事件数

sog cal get <uid>
sog cal search <查询>           在标题/描述/位置中搜索
sog cal today [日历]
sog cal week [日历]

sog cal create <标题> --start <日期时间> [标志]
  --start          开始时间 (YYYY-MM-DDTHH:MM 或 YYYY-MM-DD 表示全天)
  --结束            结束时间
  --duration       持续时间 (1h, 30m)
  --location       位置
  --description    描述

sog cal update <uid> [标志]     与创建相同的标志
sog cal delete <uid>
sog cal calendars               列出日历

## 联系人 (CardDAV)

sog contacts list [地址簿]
  --最大            最大联系人数量

sog contacts get <uid>
sog contacts search <查询>      搜索姓名/邮箱/电话

sog contacts create <名称> [标志]
  -e, --邮箱       邮箱地址
  -p, --电话       电话号码
  --org            组织
  --title          职位
  --note           备注

sog contacts update <uid> [标志]  与创建相同的标志
sog contacts delete <uid>
sog contacts books               列出地址簿

## 任务 (CalDAV VTODO)

sog tasks list [列表]
  --all            包含已完成的任务

sog tasks add <标题> [标志]
  --due            截止日期 (YYYY-MM-DD)
  -p, --priority   优先级 (1-9, 1=最高)
  -d, --description 描述

sog tasks get <uid>
sog tasks update <uid> [标志]   与添加相同的标志
sog tasks done <uid>            标记为完成
sog tasks undo <uid>            标记为未完成
sog tasks delete <uid>
sog tasks clear                  删除所有已完成的任务
sog tasks due <日期>             截止到日期的任务
sog tasks overdue                逾期任务
sog tasks lists                  列出任务列表

## 文件 (WebDAV)

sog drive ls [路径]
  -l               带详细信息的长格式
  --all            显示隐藏文件

sog drive get <路径>             获取文件元数据
sog drive download <远程路径> [本地路径]
sog drive upload <本地路径> [远程路径]
sog drive mkdir <路径>
sog drive delete <路径>
sog drive move <源路径> <目标路径>
sog drive copy <源路径> <目标路径>
sog drive cat <路径>             将文件输出到标准输出

## 会议邀请 (iTIP/iMIP)

sog invite send <摘要> <参会人>... --start <日期时间> [标志]
  --start          开始时间
  --duration       持续时间 (默认: 1h)
  --location       位置
  --description    描述

sog invite reply <文件> --status <accept|decline|tentative>
  --comment        可选评论

sog invite cancel <uid> <参会人>...
sog invite parse <文件>          解析 .ics 文件
sog invite preview <摘要> <参会人>... --start <日期时间>

## IMAP IDLE

sog idle [文件夹]                监听新邮件 (推送通知)
  --timeout        超时时间（秒）

## 输出格式

默认: 人类可读的有颜色输出
--json:  每行一个 JSON 对象 (JSONL)
--plain: 制表符分隔的值 (TSV)

## 环境变量

SOG_ACCOUNT      默认账户邮箱

## 示例

# 列出最近的邮件
sog mail list --max 10

# 发送邮件
sog mail send --to user@example.com --subject "Hello" --body "Hi there"

# 今天的日历
sog cal today

# 创建带邀请的会议
sog invite send "团队同步" alice@example.com bob@example.com \
  --start "2026-01-25T14:00" --duration 30m --location "Zoom"

# 添加任务
sog tasks add "审查 PR" --due 2026-01-26 -p 1

# 上传文件
sog drive upload report.pdf /documents/

# 搜索联系人
sog contacts search "John"
`
