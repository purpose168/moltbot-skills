package cli

import (
	"fmt"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/imap"
)

// FoldersCmd 处理文件夹管理操作
type FoldersCmd struct {
	List   FoldersListCmd   `cmd:"" help:"列出文件夹"`
	Create FoldersCreateCmd `cmd:"" help:"创建文件夹"`
	Delete FoldersDeleteCmd `cmd:"" help:"删除文件夹"`
	Rename FoldersRenameCmd `cmd:"" help:"重命名文件夹"`
}

// FoldersListCmd 列出文件夹
type FoldersListCmd struct{}

// Run 执行列出文件夹命令
func (c *FoldersListCmd) Run(root *Root) error {
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

	// 列出所有文件夹
	folders, err := client.ListFolders()
	if err != nil {
		return fmt.Errorf("列出文件夹失败: %w", err)
	}

	// 输出文件夹列表
	for _, f := range folders {
		fmt.Println(f)
	}
	return nil
}

// FoldersCreateCmd 创建文件夹
type FoldersCreateCmd struct {
	Name string `arg:"" help:"要创建的文件夹名称"`
}

// Run 执行创建文件夹命令
func (c *FoldersCreateCmd) Run(root *Root) error {
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

	// 创建文件夹
	if err := client.CreateFolder(c.Name); err != nil {
		return err
	}

	fmt.Printf("创建文件夹成功: %s\n", c.Name)
	return nil
}

// FoldersDeleteCmd 删除文件夹
type FoldersDeleteCmd struct {
	Name string `arg:"" help:"要删除的文件夹名称"`
	// 注意: 使用全局 --force 标志跳过确认
}

// Run 执行删除文件夹命令
func (c *FoldersDeleteCmd) Run(root *Root) error {
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

	// 删除文件夹
	if err := client.DeleteFolder(c.Name); err != nil {
		return err
	}

	fmt.Printf("删除文件夹成功: %s\n", c.Name)
	return nil
}

// FoldersRenameCmd 重命名文件夹
type FoldersRenameCmd struct {
	Old string `arg:"" help:"当前文件夹名称"`
	New string `arg:"" help:"新文件夹名称"`
}

// Run 执行重命名文件夹命令
func (c *FoldersRenameCmd) Run(root *Root) error {
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

	// 重命名文件夹
	if err := client.RenameFolder(c.Old, c.New); err != nil {
		return err
	}

	fmt.Printf("重命名文件夹成功: %s -> %s\n", c.Old, c.New)
	return nil
}
