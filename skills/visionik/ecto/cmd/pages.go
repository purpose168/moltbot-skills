package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
	"github.com/visionik/libecto"
)

var pagesCmd = &cobra.Command{
	Use:   "pages",
	Short: "列出页面",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		status, _ := cmd.Flags().GetString("status")
		limit, _ := cmd.Flags().GetInt("limit")
		asJSON, _ := cmd.Flags().GetBool("json")

		resp, err := client.ListPages(status, limit)
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(resp)
		}

		if len(resp.Pages) == 0 {
			println("未找到页面")
			return nil
		}

		for _, p := range resp.Pages {
			printf("[%s] %s - %s (%s)\n", p.Status, p.ID, p.Title, p.Slug)
		}
		return nil
	},
}

var pageCmd = &cobra.Command{
	Use:   "page <id|slug>",
	Short: "获取单个页面",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		page, err := client.GetPage(args[0])
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(map[string]interface{}{"pages": []interface{}{page}})
		}

		printf("ID:      %s\n", page.ID)
		printf("标题:    %s\n", page.Title)
		printf("别名:    %s\n", page.Slug)
		printf("状态:    %s\n", page.Status)
		printf("创建时间: %s\n", page.CreatedAt)
		if page.PublishedAt != "" {
			printf("发布时间: %s\n", page.PublishedAt)
		}
		return nil
	},
}

var pageCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "创建新页面",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		title, _ := cmd.Flags().GetString("title")
		status, _ := cmd.Flags().GetString("status")
		mdFile, _ := cmd.Flags().GetString("markdown-file")
		stdinFormat, _ := cmd.Flags().GetString("stdin-format")

		if title == "" {
			return fmt.Errorf("--title 是必需的")
		}

		page := &libecto.Page{
			Title:  title,
			Status: status,
		}

		// 读取内容
		var content []byte
		if mdFile != "" {
			content, err = os.ReadFile(mdFile)
			if err != nil {
				return fmt.Errorf("读取markdown文件: %w", err)
			}
		} else if stdinFormat == "markdown" {
			scanner := bufio.NewScanner(os.Stdin)
			var lines []string
			for scanner.Scan() {
				lines = append(lines, scanner.Text())
			}
			content = []byte(strings.Join(lines, "\n"))
		}

		if len(content) > 0 {
			page.HTML = libecto.MarkdownToHTML(content)
		}

		created, err := client.CreatePage(page)
		if err != nil {
			return err
		}

		printf("已创建页面: %s (%s)\n", created.ID, created.Slug)
		return nil
	},
}

var pageEditCmd = &cobra.Command{
	Use:   "edit <id|slug>",
	Short: "编辑页面",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		existing, err := client.GetPage(args[0])
		if err != nil {
			return err
		}

		update := &libecto.Page{
			UpdatedAt: existing.UpdatedAt,
		}

		if title, _ := cmd.Flags().GetString("title"); title != "" {
			update.Title = title
		}
		if status, _ := cmd.Flags().GetString("status"); status != "" {
			update.Status = status
		}
		if mdFile, _ := cmd.Flags().GetString("markdown-file"); mdFile != "" {
			content, err := os.ReadFile(mdFile)
			if err != nil {
				return fmt.Errorf("读取markdown文件: %w", err)
			}
			update.HTML = libecto.MarkdownToHTML(content)
		}

		updated, err := client.UpdatePage(existing.ID, update)
		if err != nil {
			return err
		}

		printf("已更新页面: %s\n", updated.ID)
		return nil
	},
}

var pageDeleteCmd = &cobra.Command{
	Use:   "delete <id|slug>",
	Short: "删除页面",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		force, _ := cmd.Flags().GetBool("force")

		page, err := client.GetPage(args[0])
		if err != nil {
			return err
		}

		if !force {
			printf("删除页面 %q (%s)? [y/N]: ", page.Title, page.ID)
			var answer string
			fmt.Scanln(&answer)
			if strings.ToLower(answer) != "y" {
				println("已取消")
				return nil
			}
		}

		if err := client.DeletePage(page.ID); err != nil {
			return err
		}

		printf("已删除页面: %s\n", page.ID)
		return nil
	},
}

var pagePublishCmd = &cobra.Command{
	Use:   "publish <id|slug>",
	Short: "发布页面",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		updated, err := client.PublishPage(args[0])
		if err != nil {
			return err
		}

		printf("已发布页面: %s\n", updated.ID)
		return nil
	},
}

func init() {
	pagesCmd.Flags().String("status", "", "按状态过滤 (draft|published|all)")
	pagesCmd.Flags().Int("limit", 15, "返回的页面数量")
	pagesCmd.Flags().Bool("json", false, "以JSON格式输出")

	pageCmd.Flags().Bool("json", false, "以JSON格式输出")

	pageCreateCmd.Flags().String("title", "", "页面标题 (必需)")
	pageCreateCmd.Flags().String("status", "draft", "页面状态 (draft|published)")
	pageCreateCmd.Flags().String("markdown-file", "", "内容的markdown文件路径")
	pageCreateCmd.Flags().String("stdin-format", "", "从stdin读取内容 (markdown)")

	pageEditCmd.Flags().String("title", "", "新标题")
	pageEditCmd.Flags().String("status", "", "新状态")
	pageEditCmd.Flags().String("markdown-file", "", "新内容的markdown文件路径")

	pageDeleteCmd.Flags().Bool("force", false, "无需确认直接删除")

	pageCmd.AddCommand(pageCreateCmd)
	pageCmd.AddCommand(pageEditCmd)
	pageCmd.AddCommand(pageDeleteCmd)
	pageCmd.AddCommand(pagePublishCmd)

	rootCmd.AddCommand(pagesCmd)
	rootCmd.AddCommand(pageCmd)
}
