package cmd

import (
	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
)

var siteCmd = &cobra.Command{
	Use:   "site",
	Short: "获取站点信息",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		info, err := client.GetSite()
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(map[string]interface{}{"site": info})
		}

		printf("标题:       %s\n", info.Title)
		printf("描述:       %s\n", info.Description)
		printf("URL:         %s\n", info.URL)
		printf("版本:       %s\n", info.Version)
		if info.Logo != "" {
			printf("Logo:        %s\n", info.Logo)
		}
		return nil
	},
}

var settingsCmd = &cobra.Command{
	Use:   "settings",
	Short: "获取站点设置",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		settings, err := client.GetSettings()
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(settings)
		}

		for _, s := range settings.Settings {
			switch v := s.Value.(type) {
			case nil:
				printf("%s: \n", s.Key)
			case bool:
				printf("%s: %t\n", s.Key, v)
			case string:
				printf("%s: %s\n", s.Key, v)
			default:
				printf("%s: %v\n", s.Key, v)
			}
		}
		return nil
	},
}

func init() {
	siteCmd.Flags().Bool("json", false, "以JSON格式输出")
	settingsCmd.Flags().Bool("json", false, "以JSON格式输出")

	rootCmd.AddCommand(siteCmd)
	rootCmd.AddCommand(settingsCmd)
}
