package cli

import (
	"fmt"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/discover"
	"github.com/visionik/sogcli/internal/imap"
	"github.com/visionik/sogcli/internal/smtp"
)

// AuthCmd 处理账户管理。
type AuthCmd struct {
	Add      AuthAddCmd      `cmd:"" help:"添加 IMAP/SMTP 账户"`
	List     AuthListCmd     `cmd:"" help:"列出已配置的账户"`
	Test     AuthTestCmd     `cmd:"" help:"测试账户连接"`
	Remove   AuthRemoveCmd   `cmd:"" help:"移除账户"`
	Password AuthPasswordCmd `cmd:"" help:"设置协议特定的密码"`
}

// AuthAddCmd 添加新账户。
type AuthAddCmd struct {
	Email      string `arg:"" help:"账户的邮箱地址"`
	IMAPHost   string `help:"IMAP 服务器主机名" name:"imap-host"`
	IMAPPort   int    `help:"IMAP 服务器端口" name:"imap-port" default:"993"`
	SMTPHost   string `help:"SMTP 服务器主机名" name:"smtp-host"`
	SMTPPort   int    `help:"SMTP 服务器端口" name:"smtp-port" default:"587"`
	CalDAVURL  string `help:"CalDAV 服务器 URL (例如: https://caldav.example.com/)" name:"caldav-url"`
	CardDAVURL string `help:"CardDAV 服务器 URL (例如: https://carddav.example.com/)" name:"carddav-url"`
	WebDAVURL  string `help:"WebDAV 服务器 URL (例如: https://webdav.example.com/)" name:"webdav-url"`
	Password   string `help:"密码 (如果未提供将提示输入)"`
	Discover   bool   `help:"从 DNS 自动发现服务器"`
	Insecure   bool   `help:"跳过 TLS 证书验证"`
	NoTLS      bool   `help:"禁用 TLS (明文连接)" name:"no-tls"`
	Storage    string `help:"密码存储方式: keychain 或 file" default:"keychain" enum:"keychain,file"`
}

// Run 执行 auth add 命令。
func (c *AuthAddCmd) Run(root *Root) error {
	// 设置存储类型
	if c.Storage == "file" {
		config.SetStorageType(config.StorageFile)
	} else {
		config.SetStorageType(config.StorageKeyring)
	}

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 保存存储偏好设置
	cfg.Storage = c.Storage

	// 如果设置了 --discover 标志则自动发现
	if c.Discover {
		fmt.Printf("正在为 %s 自动发现服务器...\n", c.Email)
		result, err := discover.Discover(c.Email)
		if err != nil {
			return fmt.Errorf("自动发现失败: %w", err)
		}
		if result.IMAP != nil && c.IMAPHost == "" {
			c.IMAPHost = result.IMAP.Host
			c.IMAPPort = result.IMAP.Port
			fmt.Printf("  IMAP: %s:%d\n", c.IMAPHost, c.IMAPPort)
		}
		if result.SMTP != nil && c.SMTPHost == "" {
			c.SMTPHost = result.SMTP.Host
			c.SMTPPort = result.SMTP.Port
			fmt.Printf("  SMTP: %s:%d\n", c.SMTPHost, c.SMTPPort)
		}
	}

	// 验证必填字段
	if c.IMAPHost == "" {
		return fmt.Errorf("--imap-host 是必需的 (或使用 --discover)")
	}
	if c.SMTPHost == "" {
		return fmt.Errorf("--smtp-host 是必需的 (或使用 --discover)")
	}

	// TODO: 如果未提供密码则提示输入
	if c.Password == "" {
		return fmt.Errorf("--password 是必需的 (密钥链集成即将推出)")
	}

	acct := config.Account{
		Email: c.Email,
		IMAP: config.ServerConfig{
			Host:     c.IMAPHost,
			Port:     c.IMAPPort,
			TLS:      !c.NoTLS,
			Insecure: c.Insecure,
			NoTLS:    c.NoTLS,
		},
		SMTP: config.ServerConfig{
			Host:     c.SMTPHost,
			Port:     c.SMTPPort,
			TLS:      !c.NoTLS,
			StartTLS: !c.NoTLS,
			Insecure: c.Insecure,
			NoTLS:    c.NoTLS,
		},
		CalDAV: config.CalDAVConfig{
			URL: c.CalDAVURL,
		},
		CardDAV: config.CardDAVConfig{
			URL: c.CardDAVURL,
		},
		WebDAV: config.WebDAVConfig{
			URL: c.WebDAVURL,
		},
	}

	if err := cfg.AddAccount(acct, c.Password); err != nil {
		return fmt.Errorf("添加账户失败: %w", err)
	}

	fmt.Printf("已添加账户: %s (存储方式: %s)\n", c.Email, c.Storage)
	return nil
}

// AuthListCmd 列出已配置的账户。
type AuthListCmd struct{}

// Run 执行 auth list 命令。
func (c *AuthListCmd) Run(root *Root) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	accounts := cfg.ListAccounts()
	if len(accounts) == 0 {
		fmt.Println("未配置任何账户。使用 'sog auth add' 添加账户。")
		return nil
	}

	for _, acct := range accounts {
		marker := "  "
		if acct.Email == cfg.DefaultAccount {
			marker = "* "
		}
		extras := ""
		if acct.CalDAV.URL != "" {
			extras += ", CalDAV: ✓"
		}
		if acct.CardDAV.URL != "" {
			extras += ", CardDAV: ✓"
		}
		if acct.WebDAV.URL != "" {
			extras += ", WebDAV: ✓"
		}
		fmt.Printf("%s%s (IMAP: %s:%d, SMTP: %s:%d%s)\n",
			marker, acct.Email,
			acct.IMAP.Host, acct.IMAP.Port,
			acct.SMTP.Host, acct.SMTP.Port,
			extras)
	}

	return nil
}

// AuthTestCmd 测试账户连接。
type AuthTestCmd struct {
	Email string `arg:"" optional:"" help:"要测试的账户 (默认: 默认账户)"`
}

// Run 执行 auth test 命令。
func (c *AuthTestCmd) Run(root *Root) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	email := c.Email
	if email == "" {
		email = root.Account
	}
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户且未设置默认账户")
	}

	acct, err := cfg.GetAccount(email)
	if err != nil {
		return err
	}

	password, err := cfg.GetPassword(email)
	if err != nil {
		return fmt.Errorf("获取密码失败: %w", err)
	}

	fmt.Printf("正在测试 %s...\n", email)

	// 测试 IMAP
	fmt.Printf("  IMAP %s:%d... ", acct.IMAP.Host, acct.IMAP.Port)
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
		fmt.Printf("失败: %v\n", err)
	} else {
		fmt.Println("成功")
		imapClient.Close()
	}

	// 测试 SMTP
	fmt.Printf("  SMTP %s:%d... ", acct.SMTP.Host, acct.SMTP.Port)
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
	if err := smtpClient.TestConnection(); err != nil {
		fmt.Printf("失败: %v\n", err)
	} else {
		fmt.Println("成功")
	}

	return nil
}

// AuthRemoveCmd 移除账户。
type AuthRemoveCmd struct {
	Email string `arg:"" help:"要移除的账户"`
	// 注意: 使用全局 --force 标志跳过确认
}

// Run 执行 auth remove 命令。
func (c *AuthRemoveCmd) Run(root *Root) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// TODO: 如果不是 --force 则显示确认提示

	if err := cfg.RemoveAccount(c.Email); err != nil {
		return err
	}

	fmt.Printf("已移除账户: %s\n", c.Email)
	return nil
}

// AuthPasswordCmd 设置协议特定的密码。
type AuthPasswordCmd struct {
	Email   string `arg:"" help:"账户邮箱"`
	IMAP    string `help:"IMAP 密码" name:"imap"`
	SMTP    string `help:"SMTP 密码" name:"smtp"`
	CalDAV  string `help:"CalDAV 密码" name:"caldav"`
	CardDAV string `help:"CardDAV 密码" name:"carddav"`
	WebDAV  string `help:"WebDAV 密码" name:"webdav"`
	Default string `help:"默认密码 (当未设置协议特定密码时使用)" name:"default"`
}

// Run 执行 auth password 命令。
func (c *AuthPasswordCmd) Run(root *Root) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 验证账户是否存在
	if _, err := cfg.GetAccount(c.Email); err != nil {
		return err
	}

	var set []string

	if c.Default != "" {
		if err := config.SetPassword(c.Email, c.Default); err != nil {
			return fmt.Errorf("设置默认密码失败: %w", err)
		}
		set = append(set, "default")
	}
	if c.IMAP != "" {
		if err := config.SetPasswordForProtocol(c.Email, config.ProtocolIMAP, c.IMAP); err != nil {
			return fmt.Errorf("设置 IMAP 密码失败: %w", err)
		}
		set = append(set, "imap")
	}
	if c.SMTP != "" {
		if err := config.SetPasswordForProtocol(c.Email, config.ProtocolSMTP, c.SMTP); err != nil {
			return fmt.Errorf("设置 SMTP 密码失败: %w", err)
		}
		set = append(set, "smtp")
	}
	if c.CalDAV != "" {
		if err := config.SetPasswordForProtocol(c.Email, config.ProtocolCalDAV, c.CalDAV); err != nil {
			return fmt.Errorf("设置 CalDAV 密码失败: %w", err)
		}
		set = append(set, "caldav")
	}
	if c.CardDAV != "" {
		if err := config.SetPasswordForProtocol(c.Email, config.ProtocolCardDAV, c.CardDAV); err != nil {
			return fmt.Errorf("设置 CardDAV 密码失败: %w", err)
		}
		set = append(set, "carddav")
	}
	if c.WebDAV != "" {
		if err := config.SetPasswordForProtocol(c.Email, config.ProtocolWebDAV, c.WebDAV); err != nil {
			return fmt.Errorf("设置 WebDAV 密码失败: %w", err)
		}
		set = append(set, "webdav")
	}

	if len(set) == 0 {
		return fmt.Errorf("未指定密码。使用 --default、--imap、--smtp、--caldav、--carddav 或 --webdav")
	}

	fmt.Printf("已为 %s 设置密码: %v\n", c.Email, set)
	return nil
}
