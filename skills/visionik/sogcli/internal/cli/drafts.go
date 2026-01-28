package cli

import (
	"fmt"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/imap"
)

// DraftsCmd 处理草稿管理操作
type DraftsCmd struct {
	List   DraftsListCmd   `cmd:"" help:"列出草稿"`
	Create DraftsCreateCmd `cmd:"" help:"创建草稿"`
	Send   DraftsSendCmd   `cmd:"" help:"发送草稿"`
	Delete DraftsDeleteCmd `cmd:"" help:"删除草稿"`
}

// DraftsListCmd 列出草稿
type DraftsListCmd struct {
	Max int `help:"返回的最大草稿数量" default:"20"`
}

// Run 执行列出草稿命令
func (c *DraftsListCmd) Run(root *Root) error {
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

	// 获取草稿列表
	drafts, err := client.ListDrafts(c.Max)
	if err != nil {
		return fmt.Errorf("列出草稿失败: %w", err)
	}

	// 检查是否有草稿
	if len(drafts) == 0 {
		fmt.Println("未找到草稿。")
		return nil
	}

	// 输出草稿列表
	fmt.Printf("%-8s %-12s %-24s %s\n", "UID", "日期", "收件人", "主题")
	for _, d := range drafts {
		to := d.To
		if len(to) > 24 {
			to = to[:21] + "..."
		}
		subject := d.Subject
		if len(subject) > 50 {
			subject = subject[:47] + "..."
		}
		fmt.Printf("%-8d %-12s %-24s %s\n", d.UID, d.Date, to, subject)
	}

	return nil
}

// DraftsCreateCmd 创建新草稿
type DraftsCreateCmd struct {
	To       string `help:"收件人（逗号分隔）"`
	Subject  string `help:"主题"`
	Body     string `help:"正文（纯文本）"`
	BodyFile string `help:"正文文件路径（纯文本；'-' 表示从标准输入读取）" name:"body-file"`
}

// Run 执行创建草稿命令
func (c *DraftsCreateCmd) Run(root *Root) error {
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

	// 获取邮件正文
	body := c.Body
	// TODO: 如果指定了 --body-file，则从文件读取

	// 创建草稿消息
	draft := &imap.Message{
		From:    email,
		To:      c.To,
		Subject: c.Subject,
		Body:    body,
	}

	// 保存草稿
	uid, err := client.SaveDraft(draft)
	if err != nil {
		return fmt.Errorf("保存草稿失败: %w", err)
	}

	// 输出结果
	if uid > 0 {
		fmt.Printf("创建草稿成功: UID %d\n", uid)
	} else {
		fmt.Println("创建草稿成功")
	}
	return nil
}

// DraftsSendCmd 发送草稿
type DraftsSendCmd struct {
	UID uint32 `arg:"" help:"要发送的草稿UID"`
}

// Run 执行发送草稿命令
func (c *DraftsSendCmd) Run(root *Root) error {
	// TODO: 获取草稿，通过SMTP发送，删除草稿
	fmt.Printf("正在发送草稿 %d...（尚未实现）\n", c.UID)
	return nil
}

// DraftsDeleteCmd 删除草稿
type DraftsDeleteCmd struct {
	UID uint32 `arg:"" help:"要删除的草稿UID"`
}

// Run 执行删除草稿命令
func (c *DraftsDeleteCmd) Run(root *Root) error {
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

	// 删除草稿
	if err := client.DeleteDraft(c.UID); err != nil {
		return fmt.Errorf("删除草稿失败: %w", err)
	}

	fmt.Printf("删除草稿成功: %d\n", c.UID)
	return nil
}
