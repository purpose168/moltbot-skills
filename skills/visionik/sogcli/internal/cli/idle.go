package cli

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"syscall"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/imap"
)

// IdleCmd 使用IMAP IDLE监视新邮件
type IdleCmd struct {
	Folder string `help:"要监视的文件夹" default:"INBOX"`
	Exec   string `help:"收到新邮件时执行的命令（接收主题作为参数）"`
}

// Run 执行idle命令
func (c *IdleCmd) Run(root *Root) error {
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

	fmt.Printf("正在监视 %s 文件夹的新邮件（按 Ctrl+C 停止）...\n", c.Folder)

	// 处理中断信号
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n正在停止...")
		client.Close()
		os.Exit(0)
	}()

	// 开始IDLE模式
	err = client.Idle(c.Folder, func(msgNum uint32) {
		fmt.Printf("收到新邮件！(数量: %d)\n", msgNum)

		// 如果指定了执行命令，则执行
		if c.Exec != "" {
			cmd := exec.Command("sh", "-c", c.Exec)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			_ = cmd.Run()
		}
	})

	if err != nil {
		return fmt.Errorf("idle模式失败: %w", err)
	}

	return nil
}
