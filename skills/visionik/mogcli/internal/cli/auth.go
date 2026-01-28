package cli

import (
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"github.com/visionik/mogcli/internal/config"
	"github.com/visionik/mogcli/internal/graph"
)

// AuthCmd 处理认证命令。
type AuthCmd struct {
	Login  AuthLoginCmd  `cmd:"" help:"登录到 Microsoft 365"`
	Status AuthStatusCmd `cmd:"" help:"显示认证状态"`
	Logout AuthLogoutCmd `cmd:"" help:"登出并清除令牌"`
}

// AuthLoginCmd 登录到 Microsoft 365。
type AuthLoginCmd struct {
	ClientID string `help:"Azure AD 客户端 ID" required:"" env:"MOG_CLIENT_ID" name:"client-id"`
	Storage  string `help:"令牌存储：file 或 keychain" default:"file" enum:"file,keychain"`
}

// Run 执行认证登录命令。
func (c *AuthLoginCmd) Run(root *Root) error {
	// 设置存储类型
	if c.Storage == "keychain" {
		config.SetStorage(config.StorageKeyring)
	} else {
		config.SetStorage(config.StorageFile)
	}

	// 保存客户端 ID 和存储偏好
	cfg := &config.Config{ClientID: c.ClientID, Storage: c.Storage}
	if err := config.Save(cfg); err != nil {
		return fmt.Errorf("保存配置失败: %w", err)
	}

	// 请求设备代码
	fmt.Println("请求设备代码中...")
	dcResp, err := graph.RequestDeviceCode(c.ClientID)
	if err != nil {
		return fmt.Errorf("请求设备代码失败: %w", err)
	}

	fmt.Println()
	fmt.Println(dcResp.Message)
	fmt.Println()

	// 尝试打开浏览器
	openBrowser(dcResp.VerificationURI)

	// 轮询令牌
	fmt.Println("等待授权中...")
	tokens, err := graph.PollForToken(c.ClientID, dcResp.DeviceCode, dcResp.Interval)
	if err != nil {
		return fmt.Errorf("授权失败: %w", err)
	}

	// 使用配置的存储方式保存令牌
	if err := config.SaveTokensAuto(tokens); err != nil {
		return fmt.Errorf("保存令牌失败: %w", err)
	}

	fmt.Println()
	fmt.Printf("✓ 登录成功! (存储: %s)\n", c.Storage)
	return nil
}

// AuthStatusCmd 显示认证状态。
type AuthStatusCmd struct{}

// Run 执行认证状态命令。
func (c *AuthStatusCmd) Run(root *Root) error {
	// 加载配置以获取存储偏好
	cfg, _ := config.Load()
	if cfg != nil && cfg.Storage == "keychain" {
		config.SetStorage(config.StorageKeyring)
	} else {
		config.SetStorage(config.StorageFile)
	}

	tokens, err := config.LoadTokensAuto()
	if err != nil {
		fmt.Println("状态: 未登录")
		return nil
	}

	fmt.Println("状态: 已登录")
	if cfg != nil && cfg.Storage != "" {
		fmt.Printf("存储: %s\n", cfg.Storage)
	}

	if tokens.ExpiresAt > 0 {
		expiresAt := time.Unix(tokens.ExpiresAt, 0)
		remaining := time.Until(expiresAt)
		if remaining > 0 {
			fmt.Printf("令牌过期时间: %s (剩余 %v)\n", expiresAt.Format(time.RFC3339), remaining.Round(time.Minute))
		} else {
			fmt.Println("令牌: 已过期 (下次请求时会刷新)")
		}
	}

	if cfg != nil && cfg.ClientID != "" {
		fmt.Printf("客户端 ID: %s...%s\n", cfg.ClientID[:8], cfg.ClientID[len(cfg.ClientID)-4:])
	}

	return nil
}

// AuthLogoutCmd 登出并清除令牌。
type AuthLogoutCmd struct{}

// Run 执行认证登出命令。
func (c *AuthLogoutCmd) Run(root *Root) error {
	// 加载配置以获取存储偏好
	cfg, _ := config.Load()
	if cfg != nil && cfg.Storage == "keychain" {
		config.SetStorage(config.StorageKeyring)
	} else {
		config.SetStorage(config.StorageFile)
	}

	if err := config.DeleteTokensAuto(); err != nil {
		return fmt.Errorf("删除令牌失败: %w", err)
	}

	if err := graph.ClearSlugs(); err != nil {
		return fmt.Errorf("清除短 ID 失败: %w", err)
	}

	fmt.Println("✓ 登出成功")
	return nil
}

// openBrowser 尝试在默认浏览器中打开给定的 URL
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		return
	}
	_ = cmd.Start()
}