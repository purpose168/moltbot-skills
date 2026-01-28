// Package config 处理 sog 配置和账户管理。
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config 保存 sog 的配置信息。
type Config struct {
	Accounts       map[string]Account `json:"accounts"`
	DefaultAccount string             `json:"default_account,omitempty"`
	Storage        string             `json:"storage,omitempty"` // keychain 或 file
	path           string
}

// Account 保存邮件账户的配置信息。
type Account struct {
	Email   string        `json:"email"`
	IMAP    ServerConfig  `json:"imap"`
	SMTP    ServerConfig  `json:"smtp"`
	CalDAV  CalDAVConfig  `json:"caldav,omitempty"`
	CardDAV CardDAVConfig `json:"carddav,omitempty"`
	WebDAV  WebDAVConfig  `json:"webdav,omitempty"`
}

// CalDAVConfig 保存 CalDAV 服务器配置。
type CalDAVConfig struct {
	URL             string `json:"url,omitempty"`
	DefaultCalendar string `json:"default_calendar,omitempty"`
}

// CardDAVConfig 保存 CardDAV 服务器配置。
type CardDAVConfig struct {
	URL                string `json:"url,omitempty"`
	DefaultAddressBook string `json:"default_address_book,omitempty"`
}

// WebDAVConfig 保存 WebDAV 服务器配置。
type WebDAVConfig struct {
	URL string `json:"url,omitempty"`
}

// ServerConfig 保存服务器连接详情。
type ServerConfig struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	TLS        bool   `json:"tls,omitempty"`
	StartTLS   bool   `json:"starttls,omitempty"`
	Insecure   bool   `json:"insecure,omitempty"`   // 跳过 TLS 证书验证
	NoTLS      bool   `json:"no_tls,omitempty"`     // 完全禁用 TLS
}

// configDir 返回配置目录的路径。
func configDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "sog"), nil
}

// configPath 返回配置文件的路径。
func configPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// Load 从磁盘加载配置。
func Load() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Accounts: make(map[string]Account),
		path:     path,
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return cfg, nil
	}
	if err != nil {
		return nil, fmt.Errorf("读取配置失败: %w", err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	cfg.path = path

	// 从配置设置存储类型
	if cfg.Storage == "file" {
		SetStorageType(StorageFile)
	} else {
		SetStorageType(StorageKeyring)
	}

	return cfg, nil
}

// Save 将配置写入磁盘。
func (c *Config) Save() error {
	dir := filepath.Dir(c.path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("创建配置目录失败: %w", err)
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化配置失败: %w", err)
	}

	if err := os.WriteFile(c.path, data, 0600); err != nil {
		return fmt.Errorf("写入配置失败: %w", err)
	}

	return nil
}

// AddAccount 向配置中添加账户。
func (c *Config) AddAccount(acct Account, password string) error {
	if c.Accounts == nil {
		c.Accounts = make(map[string]Account)
	}

	c.Accounts[acct.Email] = acct

	// 如果是第一个账户则设为默认
	if c.DefaultAccount == "" {
		c.DefaultAccount = acct.Email
	}

	// 在密钥链中存储密码
	if err := SetPassword(acct.Email, password); err != nil {
		return fmt.Errorf("存储密码失败: %w", err)
	}

	return c.Save()
}

// GetAccount 通过邮箱检索账户。
func (c *Config) GetAccount(email string) (*Account, error) {
	acct, ok := c.Accounts[email]
	if !ok {
		return nil, fmt.Errorf("找不到账户: %s", email)
	}
	return &acct, nil
}

// ListAccounts 返回所有已配置的账户。
func (c *Config) ListAccounts() []Account {
	accounts := make([]Account, 0, len(c.Accounts))
	for _, acct := range c.Accounts {
		accounts = append(accounts, acct)
	}
	return accounts
}

// RemoveAccount 从配置中移除账户。
func (c *Config) RemoveAccount(email string) error {
	if _, ok := c.Accounts[email]; !ok {
		return fmt.Errorf("找不到账户: %s", email)
	}

	delete(c.Accounts, email)

	// 如果移除的是默认账户则清除
	if c.DefaultAccount == email {
		c.DefaultAccount = ""
		// 如果还有账户则设置新的默认账户
		for e := range c.Accounts {
			c.DefaultAccount = e
			break
		}
	}

	// 从密钥链中移除
	_ = DeletePassword(email) // 忽略错误

	return c.Save()
}

// GetPassword 检索账户的密码。
func (c *Config) GetPassword(email string) (string, error) {
	return GetPassword(email)
}

// GetPasswordForProtocol 检索账户和协议的密码。
// 如果未设置协议特定密码，则回退到默认密码。
func (c *Config) GetPasswordForProtocol(email string, protocol Protocol) (string, error) {
	return GetPasswordForProtocol(email, protocol)
}
