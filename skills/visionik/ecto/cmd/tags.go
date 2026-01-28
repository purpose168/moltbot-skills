package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
	"github.com/visionik/libecto"
)

var tagsCmd = &cobra.Command{
	Use:   "tags",
	Short: "列出标签",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		limit, _ := cmd.Flags().GetInt("limit")
		asJSON, _ := cmd.Flags().GetBool("json")

		resp, err := client.ListTags(limit)
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(resp)
		}

		if len(resp.Tags) == 0 {
			println("未找到标签")
			return nil
		}

		for _, t := range resp.Tags {
			printf("%s - %s (%s)\n", t.ID, t.Name, t.Slug)
		}
		return nil
	},
}

var tagCmd = &cobra.Command{
	Use:   "tag <id|slug>",
	Short: "获取或管理标签",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		tag, err := client.GetTag(args[0])
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(map[string]interface{}{"tags": []interface{}{tag}})
		}

		printf("ID:          %s\n", tag.ID)
		printf("名称:        %s\n", tag.Name)
		printf("别名:        %s\n", tag.Slug)
		printf("描述:        %s\n", tag.Description)
		return nil
	},
}

var tagCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "创建新标签",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		slug, _ := cmd.Flags().GetString("slug")
		description, _ := cmd.Flags().GetString("description")

		tag := &libecto.Tag{
			Name:        args[0],
			Slug:        slug,
			Description: description,
		}

		created, err := client.CreateTag(tag)
		if err != nil {
			return err
		}

		printf("已创建标签: %s (%s)\n", created.ID, created.Slug)
		return nil
	},
}

var tagEditCmd = &cobra.Command{
	Use:   "edit <id|slug>",
	Short: "编辑标签",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		existing, err := client.GetTag(args[0])
		if err != nil {
			return err
		}

		update := &libecto.Tag{}

		if name, _ := cmd.Flags().GetString("name"); name != "" {
			update.Name = name
		}
		if description, _ := cmd.Flags().GetString("description"); description != "" {
			update.Description = description
		}

		updated, err := client.UpdateTag(existing.ID, update)
		if err != nil {
			return err
		}

		printf("已更新标签: %s\n", updated.ID)
		return nil
	},
}

var tagDeleteCmd = &cobra.Command{
	Use:   "delete <id|slug>",
	Short: "删除标签",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		force, _ := cmd.Flags().GetBool("force")

		tag, err := client.GetTag(args[0])
		if err != nil {
			return err
		}

		if !force {
			printf("删除标签 %q (%s)? [y/N]: ", tag.Name, tag.ID)
			var answer string
			fmt.Scanln(&answer)
			if strings.ToLower(answer) != "y" {
				println("已取消")
				return nil
			}
		}

		if err := client.DeleteTag(tag.ID); err != nil {
			return err
		}

		printf("已删除标签: %s\n", tag.ID)
		return nil
	},
}

func init() {
	tagsCmd.Flags().Int("limit", 15, "返回的标签数量")
	tagsCmd.Flags().Bool("json", false, "以JSON格式输出")

	tagCmd.Flags().Bool("json", false, "以JSON格式输出")

	tagCreateCmd.Flags().String("slug", "", "标签别名")
	tagCreateCmd.Flags().String("description", "", "标签描述")

	tagEditCmd.Flags().String("name", "", "新名称")
	tagEditCmd.Flags().String("description", "", "新描述")

	tagDeleteCmd.Flags().Bool("force", false, "无需确认直接删除")

	tagCmd.AddCommand(tagCreateCmd)
	tagCmd.AddCommand(tagEditCmd)
	tagCmd.AddCommand(tagDeleteCmd)

	rootCmd.AddCommand(tagsCmd)
	rootCmd.AddCommand(tagCmd)
}
