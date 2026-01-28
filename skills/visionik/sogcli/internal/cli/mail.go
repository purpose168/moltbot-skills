package cli

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/imap"
	"github.com/visionik/sogcli/internal/smtp"
)

// MailCmd 处理邮件的读取和发送操作
type MailCmd struct {
	List    MailListCmd    `cmd:"" help:"列出文件夹中的邮件"`
	Get     MailGetCmd     `cmd:"" help:"通过UID获取邮件"`
	Search  MailSearchCmd  `cmd:"" help:"搜索邮件"`
	Send    MailSendCmd    `cmd:"" help:"发送邮件"`
	Reply   MailReplyCmd   `cmd:"" help:"回复邮件"`
	Forward MailForwardCmd `cmd:"" help:"转发邮件"`
	Move    MailMoveCmd    `cmd:"" help:"将邮件移动到其他文件夹"`
	Copy    MailCopyCmd    `cmd:"" help:"将邮件复制到其他文件夹"`
	Flag    MailFlagCmd    `cmd:"" help:"为邮件设置标记"`
	Unflag  MailUnflagCmd  `cmd:"" help:"从邮件中移除标记"`
	Delete  MailDeleteCmd  `cmd:"" help:"删除邮件"`
}

// MailListCmd 列出文件夹中的邮件
type MailListCmd struct {
	Folder string `arg:"" optional:"" default:"INBOX" help:"要列出的文件夹"`
	Max    int    `help:"返回的最大邮件数量" default:"20"`
	Unseen bool   `help:"仅显示未读邮件"`
}

// Run 执行列出邮件命令
func (c *MailListCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 列出邮件
	messages, err := client.ListMessages(c.Folder, c.Max, c.Unseen)
	if err != nil {
		return fmt.Errorf("列出邮件失败: %w", err)
	}

	// 检查是否有邮件
	if len(messages) == 0 {
		fmt.Println("未找到邮件。")
		return nil
	}

	// 输出结果
	if root.JSON {
		// TODO: 使用输出格式化器
		for _, m := range messages {
			fmt.Printf(`{"uid":%d,"from":"%s","date":"%s","subject":"%s","seen":%t}`+"\n",
				m.UID, m.From, m.Date, m.Subject, m.Seen)
		}
	} else {
		// 输出表头
		fmt.Printf("%-8s %-12s %-24s %s\n", "UID", "日期", "发件人", "主题")
		
		for _, m := range messages {
			// 未读标记
			marker := " "
			if !m.Seen {
				marker = "*"
			}
			
			// 处理过长的发件人
			from := m.From
			if len(from) > 24 {
				from = from[:21] + "..."
			}
			
			// 处理过长的主题
			subject := m.Subject
			if len(subject) > 50 {
				subject = subject[:47] + "..."
			}
			
			// 输出邮件信息
			fmt.Printf("%s%-7d %-12s %-24s %s\n", marker, m.UID, m.Date, from, subject)
		}
	}

	return nil
}

// MailGetCmd 通过UID获取邮件
type MailGetCmd struct {
	UID     uint32 `arg:"" help:"邮件UID"`
	Folder  string `help:"包含邮件的文件夹" default:"INBOX"`
	Headers bool   `help:"仅显示邮件头"`
	Raw     bool   `help:"输出原始RFC822格式"`
}

// Run 执行获取邮件命令
func (c *MailGetCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 获取邮件
	msg, err := client.GetMessage(c.Folder, c.UID, c.Headers)
	if err != nil {
		return fmt.Errorf("获取邮件失败: %w", err)
	}

	// 输出结果
	if root.JSON {
		fmt.Printf(`{"uid":%d,"from":"%s","date":"%s","subject":"%s","body":"%s"}`+"\n",
			msg.UID, msg.From, msg.Date, msg.Subject, msg.Body)
	} else {
		// 输出邮件头
		fmt.Printf("发件人: %s\n", msg.From)
		fmt.Printf("日期: %s\n", msg.Date)
		fmt.Printf("主题: %s\n", msg.Subject)
		
		// 输出邮件正文
		if !c.Headers && msg.Body != "" {
			fmt.Println("")
			fmt.Println(msg.Body)
		}
	}

	return nil
}

// MailSearchCmd 搜索邮件
type MailSearchCmd struct {
	Query  string `arg:"" help:"IMAP SEARCH查询"`
	Folder string `help:"要搜索的文件夹" default:"INBOX"`
	Max    int    `help:"最大结果数" default:"20"`
}

// Run 执行搜索邮件命令
func (c *MailSearchCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 搜索邮件
	messages, err := client.SearchMessages(c.Folder, c.Query, c.Max)
	if err != nil {
		return fmt.Errorf("搜索失败: %w", err)
	}

	// 检查是否有邮件
	if len(messages) == 0 {
		fmt.Println("未找到邮件。")
		return nil
	}

	// 输出结果
	if root.JSON {
		for _, m := range messages {
			fmt.Printf(`{"uid":%d,"from":"%s","date":"%s","subject":"%s","seen":%t}`+"\n",
				m.UID, m.From, m.Date, m.Subject, m.Seen)
		}
	} else {
		// 输出表头
		fmt.Printf("%-8s %-12s %-24s %s\n", "UID", "日期", "发件人", "主题")
		
		for _, m := range messages {
			// 未读标记
			marker := " "
			if !m.Seen {
				marker = "*"
			}
			
			// 处理过长的发件人
			from := m.From
			if len(from) > 24 {
				from = from[:21] + "..."
			}
			
			// 处理过长的主题
			subject := m.Subject
			if len(subject) > 50 {
				subject = subject[:47] + "..."
			}
			
			// 输出邮件信息
			fmt.Printf("%s%-7d %-12s %-24s %s\n", marker, m.UID, m.Date, from, subject)
		}
	}

	return nil
}

// MailSendCmd 发送邮件
type MailSendCmd struct {
	To       string `help:"收件人（逗号分隔）" required:""`
	Cc       string `help:"抄送收件人（逗号分隔）"`
	Bcc      string `help:"密送收件人（逗号分隔）"`
	Subject  string `help:"主题行" required:""`
	Body     string `help:"正文（纯文本）"`
	BodyFile string `help:"正文文件路径（纯文本；'-' 表示标准输入）" name:"body-file"`
}

// Run 执行发送邮件命令
func (c *MailSendCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 获取邮件正文
	body := c.Body
	if c.BodyFile != "" {
		var data []byte
		if c.BodyFile == "-" {
			data, err = io.ReadAll(os.Stdin)
		} else {
			data, err = os.ReadFile(c.BodyFile)
		}
		if err != nil {
			return fmt.Errorf("读取正文失败: %w", err)
		}
		body = string(data)
	}

	// 检查正文是否为空
	if body == "" {
		return fmt.Errorf("必须指定 --body 或 --body-file")
	}

	// 解析逗号分隔的收件人
	to := parseRecipients(c.To)
	cc := parseRecipients(c.Cc)
	bcc := parseRecipients(c.Bcc)

	// 创建SMTP客户端
	smtpClient := smtp.NewClient(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		TLS:      acct.SMTP.TLS,
		StartTLS: acct.SMTP.StartTLS,
		Insecure: acct.SMTP.Insecure,
		NoTLS:    acct.SMTP.NoTLS,
		Email:    email,
		Password: password,
	})

	// 发送邮件
	msg := &smtp.Message{
		From:    email,
		To:      to,
		Cc:      cc,
		Bcc:     bcc,
		Subject: c.Subject,
		Body:    body,
	}

	if err := smtpClient.Send(context.Background(), msg); err != nil {
		return fmt.Errorf("发送失败: %w", err)
	}

	fmt.Printf("已发送给 %v\n", to)
	return nil
}

// parseRecipients 将逗号分隔的字符串分割为收件人列表
func parseRecipients(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// MailMoveCmd 将邮件移动到其他文件夹
type MailMoveCmd struct {
	UID    uint32 `arg:"" help:"邮件UID"`
	Folder string `arg:"" help:"目标文件夹"`
	From   string `help:"源文件夹" default:"INBOX"`
}

// Run 执行移动邮件命令
func (c *MailMoveCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 移动邮件
	if err := client.MoveMessage(c.From, c.UID, c.Folder); err != nil {
		return err
	}

	fmt.Printf("已将邮件 %d 移动到 %s\n", c.UID, c.Folder)
	return nil
}

// MailCopyCmd 将邮件复制到其他文件夹
type MailCopyCmd struct {
	UID    uint32 `arg:"" help:"邮件UID"`
	Folder string `arg:"" help:"目标文件夹"`
	From   string `help:"源文件夹" default:"INBOX"`
}

// Run 执行复制邮件命令
func (c *MailCopyCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 复制邮件
	if err := client.CopyMessage(c.From, c.UID, c.Folder); err != nil {
		return err
	}

	fmt.Printf("已将邮件 %d 复制到 %s\n", c.UID, c.Folder)
	return nil
}

// MailFlagCmd 为邮件设置标记
type MailFlagCmd struct {
	UID    uint32 `arg:"" help:"邮件UID"`
	Flag   string `arg:"" help:"要设置的标记（seen, flagged, answered, deleted, draft）"`
	Folder string `help:"包含邮件的文件夹" default:"INBOX"`
}

// Run 执行设置邮件标记命令
func (c *MailFlagCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 设置标记
	if err := client.SetFlag(c.Folder, c.UID, c.Flag, true); err != nil {
		return err
	}

	fmt.Printf("已为邮件 %d 设置 %s 标记\n", c.UID, c.Flag)
	return nil
}

// MailUnflagCmd 从邮件中移除标记
type MailUnflagCmd struct {
	UID    uint32 `arg:"" help:"邮件UID"`
	Flag   string `arg:"" help:"要移除的标记（seen, flagged, answered, deleted, draft）"`
	Folder string `help:"包含邮件的文件夹" default:"INBOX"`
}

// Run 执行移除邮件标记命令
func (c *MailUnflagCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// 移除标记
	if err := client.SetFlag(c.Folder, c.UID, c.Flag, false); err != nil {
		return err
	}

	fmt.Printf("已从邮件 %d 移除 %s 标记\n", c.UID, c.Flag)
	return nil
}

// MailDeleteCmd 删除邮件
type MailDeleteCmd struct {
	UID    uint32 `arg:"" help:"邮件UID"`
	Folder string `help:"包含邮件的文件夹" default:"INBOX"`
}

// Run 执行删除邮件命令
func (c *MailDeleteCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接IMAP服务器
	client, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer client.Close()

	// TODO: 如果没有 --force，则显示确认提示

	// 删除邮件
	if err := client.DeleteMessage(c.Folder, c.UID); err != nil {
		return err
	}

	fmt.Printf("已删除邮件 %d\n", c.UID)
	return nil
}

// MailReplyCmd 回复邮件
type MailReplyCmd struct {
	UID     uint32 `arg:"" help:"要回复的邮件UID"`
	Body    string `help:"回复正文（纯文本）" required:""`
	All     bool   `help:"回复所有收件人" name:"all"`
	Folder  string `help:"包含邮件的文件夹" default:"INBOX"`
}

// Run 执行回复邮件命令
func (c *MailReplyCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 获取原始邮件
	imapClient, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer imapClient.Close()

	original, err := imapClient.GetMessage(c.Folder, c.UID, false)
	if err != nil {
		return fmt.Errorf("获取邮件失败: %w", err)
	}

	// 构建回复
	to := original.From
	subject := original.Subject
	if !strings.HasPrefix(strings.ToLower(subject), "re:") {
		subject = "Re: " + subject
	}

	// 通过SMTP发送
	smtpClient := smtp.NewClient(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		TLS:      acct.SMTP.TLS,
		StartTLS: acct.SMTP.StartTLS,
		Insecure: acct.SMTP.Insecure,
		NoTLS:    acct.SMTP.NoTLS,
		Email:    email,
		Password: password,
	})

	msg := &smtp.Message{
		From:    email,
		To:      []string{to},
		Subject: subject,
		Body:    c.Body,
	}

	if err := smtpClient.Send(context.Background(), msg); err != nil {
		return fmt.Errorf("发送失败: %w", err)
	}

	// 标记原始邮件为已回复
	_ = imapClient.SetFlag(c.Folder, c.UID, "answered", true)

	fmt.Printf("已回复 %s\n", to)
	return nil
}

// MailForwardCmd 转发邮件
type MailForwardCmd struct {
	UID    uint32 `arg:"" help:"要转发的邮件UID"`
	To     string `help:"转发到的收件人（逗号分隔）" required:""`
	Body   string `help:"附加消息（纯文本）"`
	Folder string `help:"包含邮件的文件夹" default:"INBOX"`
}

// Run 执行转发邮件命令
func (c *MailForwardCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	// 获取密码
	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	// 获取原始邮件
	imapClient, err := imap.Connect(imap.Config{
		Host:     acct.IMAP.Host,
		Port:     acct.IMAP.Port,
		TLS:      acct.IMAP.TLS,
		Insecure: acct.IMAP.Insecure,
		NoTLS:    acct.IMAP.NoTLS,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer imapClient.Close()

	original, err := imapClient.GetMessage(c.Folder, c.UID, false)
	if err != nil {
		return fmt.Errorf("获取邮件失败: %w", err)
	}

	// 构建转发邮件
	subject := original.Subject
	if !strings.HasPrefix(strings.ToLower(subject), "fwd:") {
		subject = "Fwd: " + subject
	}

	body := c.Body
	if body != "" {
		body += "\n\n"
	}
	body += "---------- Forwarded message ----------\n"
	body += fmt.Sprintf("From: %s\n", original.From)
	body += fmt.Sprintf("Date: %s\n", original.Date)
	body += fmt.Sprintf("Subject: %s\n\n", original.Subject)
	body += original.Body

	// 通过SMTP发送
	smtpClient := smtp.NewClient(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		TLS:      acct.SMTP.TLS,
		StartTLS: acct.SMTP.StartTLS,
		Insecure: acct.SMTP.Insecure,
		NoTLS:    acct.SMTP.NoTLS,
		Email:    email,
		Password: password,
	})

	to := parseRecipients(c.To)

	msg := &smtp.Message{
		From:    email,
		To:      to,
		Subject: subject,
		Body:    body,
	}

	if err := smtpClient.Send(context.Background(), msg); err != nil {
		return fmt.Errorf("发送失败: %w", err)
	}

	fmt.Printf("已转发给 %v\n", to)
	return nil
}
