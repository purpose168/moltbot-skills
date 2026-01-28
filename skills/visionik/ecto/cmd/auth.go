package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "管理站点认证",
}

var authAddCmd = &cobra.Command{
	Use:   "add <name>",
	Short: "添加新站点配置",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		url, _ := cmd.Flags().GetString("url")
		key, _ := cmd.Flags().GetString("key")

		if url == "" || key == "" {
			return fmt.Errorf("--url 和 --key 是必需的")
		}

		cfg, err := config.Load()
		if err != nil {
			return err
		}

		if err := cfg.AddSite(name, url, key); err != nil {
			return err
		}

		printf("已添加站点 %q\n", name)
		if cfg.DefaultSite == name {
			println("已设置为默认站点")
		}
		return nil
	},
}

var authListCmd = &cobra.Command{
	Use:   "list",
	Short: "列出已配置的站点",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}

		if len(cfg.Sites) == 0 {
			println("未配置站点。使用 'ecto auth add' 添加一个。")
			return nil
		}

		for name, site := range cfg.Sites {
			marker := "  "
			if name == cfg.DefaultSite {
				marker = "* "
			}
			printf("%s%s: %s\n", marker, name, site.URL)
		}
		return nil
	},
}

var authDefaultCmd = &cobra.Command{
	Use:   "default <name>",
	Short: "设置默认站点",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]

		cfg, err := config.Load()
		if err != nil {
			return err
		}

		if err := cfg.SetDefault(name); err != nil {
			return err
		}

		printf("默认站点已设置为 %q\n", name)
		return nil
	},
}

var authRemoveCmd = &cobra.Command{
	Use:   "remove <name>",
	Short: "删除站点配置",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]

		cfg, err := config.Load()
		if err != nil {
			return err
		}

		if _, ok := cfg.Sites[name]; !ok {
			return fmt.Errorf("站点 %q 未找到", name)
		}

		if err := cfg.RemoveSite(name); err != nil {
			return err
		}

		printf("已删除站点 %q\n", name)
		return nil
	},
}

func init() {
	authAddCmd.Flags().String("url", "", "Ghost 站点 URL")
	authAddCmd.Flags().String("key", "", "管理 API 密钥")

	authCmd.AddCommand(authAddCmd)
	authCmd.AddCommand(authListCmd)
	authCmd.AddCommand(authDefaultCmd)
	authCmd.AddCommand(authRemoveCmd)
	rootCmd.AddCommand(authCmd)
}
