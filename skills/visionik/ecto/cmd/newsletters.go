package cmd

import (
	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
)

var newslettersCmd = &cobra.Command{
	Use:   "newsletters",
	Short: "列出新闻通讯",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		resp, err := client.ListNewsletters()
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(resp)
		}

		if len(resp.Newsletters) == 0 {
			println("未找到新闻通讯")
			return nil
		}

		for _, n := range resp.Newsletters {
			printf("%s - %s (%s) [%s]\n", n.ID, n.Name, n.Slug, n.Status)
		}
		return nil
	},
}

var newsletterCmd = &cobra.Command{
	Use:   "newsletter <id>",
	Short: "获取单个新闻通讯",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		newsletter, err := client.GetNewsletter(args[0])
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(map[string]interface{}{"newsletters": []interface{}{newsletter}})
		}

		printf("ID:          %s\n", newsletter.ID)
		printf("名称:        %s\n", newsletter.Name)
		printf("别名:        %s\n", newsletter.Slug)
		printf("状态:        %s\n", newsletter.Status)
		if newsletter.Description != "" {
			printf("描述:        %s\n", newsletter.Description)
		}
		return nil
	},
}

func init() {
	newslettersCmd.Flags().Bool("json", false, "以JSON格式输出")
	newsletterCmd.Flags().Bool("json", false, "以JSON格式输出")

	rootCmd.AddCommand(newslettersCmd)
	rootCmd.AddCommand(newsletterCmd)
}
