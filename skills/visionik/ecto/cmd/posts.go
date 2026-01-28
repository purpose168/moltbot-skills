package cmd

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
	"github.com/visionik/libecto"
)

var postsCmd = &cobra.Command{
	Use:   "posts",
	Short: "列出文章",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		status, _ := cmd.Flags().GetString("status")
		limit, _ := cmd.Flags().GetInt("limit")
		asJSON, _ := cmd.Flags().GetBool("json")

		resp, err := client.ListPosts(status, limit)
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(resp)
		}

		if len(resp.Posts) == 0 {
			println("未找到文章")
			return nil
		}

		for _, p := range resp.Posts {
			printf("[%s] %s - %s (%s)\n", p.Status, p.ID, p.Title, p.Slug)
		}
		return nil
	},
}

var postCmd = &cobra.Command{
	Use:   "post <id|slug>",
	Short: "获取单个文章",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")
		showBody, _ := cmd.Flags().GetBool("body")

		post, err := client.GetPost(args[0])
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(map[string]interface{}{"posts": []interface{}{post}})
		}

		printf("ID:        %s\n", post.ID)
		printf("标题:      %s\n", post.Title)
		printf("别名:      %s\n", post.Slug)
		printf("状态:      %s\n", post.Status)
		printf("创建时间:   %s\n", post.CreatedAt)
		if post.PublishedAt != "" {
			printf("发布时间:   %s\n", post.PublishedAt)
		}
		if len(post.Tags) > 0 {
			var tagNames []string
			for _, t := range post.Tags {
				tagNames = append(tagNames, t.Name)
			}
			printf("标签:      %s\n", strings.Join(tagNames, ", "))
		}
		if post.Excerpt != "" && !showBody {
			printf("\n摘要:\n%s\n", post.Excerpt)
		}
		if showBody && post.HTML != "" {
			printf("\n正文 (HTML):\n%s\n", post.HTML)
		}
		return nil
	},
}

var postCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "创建新文章",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		title, _ := cmd.Flags().GetString("title")
		status, _ := cmd.Flags().GetString("status")
		mdFile, _ := cmd.Flags().GetString("markdown-file")
		stdinFormat, _ := cmd.Flags().GetString("stdin-format")
		tagsStr, _ := cmd.Flags().GetString("tag")

		if title == "" {
			return fmt.Errorf("--title 是必需的")
		}

		post := &libecto.Post{
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
			post.HTML = libecto.MarkdownToHTML(content)
		}

		// 处理标签
		if tagsStr != "" {
			tagNames := strings.Split(tagsStr, ",")
			for _, name := range tagNames {
				post.Tags = append(post.Tags, libecto.Tag{Name: strings.TrimSpace(name)})
			}
		}

		created, err := client.CreatePost(post)
		if err != nil {
			return err
		}

		printf("已创建文章: %s (%s)\n", created.ID, created.Slug)
		return nil
	},
}

var postEditCmd = &cobra.Command{
	Use:   "edit <id|slug>",
	Short: "编辑文章",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		// 首先获取现有文章
		existing, err := client.GetPost(args[0])
		if err != nil {
			return err
		}

		update := &libecto.Post{
			UpdatedAt: existing.UpdatedAt, // 用于冲突检测
		}

		if title, _ := cmd.Flags().GetString("title"); title != "" {
			update.Title = title
		}
		if status, _ := cmd.Flags().GetString("status"); status != "" {
			update.Status = status
		}
		if publishAt, _ := cmd.Flags().GetString("publish-at"); publishAt != "" {
			update.PublishedAt = publishAt
			update.Status = "scheduled"
		}
		if mdFile, _ := cmd.Flags().GetString("markdown-file"); mdFile != "" {
			content, err := os.ReadFile(mdFile)
			if err != nil {
				return fmt.Errorf("读取markdown文件: %w", err)
			}
			update.HTML = libecto.MarkdownToHTML(content)
		}
		if featureImage, _ := cmd.Flags().GetString("feature-image"); featureImage != "" {
			update.FeatureImage = featureImage
		}

		updated, err := client.UpdatePost(existing.ID, update)
		if err != nil {
			return err
		}

		printf("已更新文章: %s\n", updated.ID)
		return nil
	},
}

var postDeleteCmd = &cobra.Command{
	Use:   "delete <id|slug>",
	Short: "删除文章",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		force, _ := cmd.Flags().GetBool("force")

		// 首先获取文章以获取ID并确认
		post, err := client.GetPost(args[0])
		if err != nil {
			return err
		}

		if !force {
			printf("删除文章 %q (%s)? [y/N]: ", post.Title, post.ID)
			var answer string
			fmt.Scanln(&answer)
			if strings.ToLower(answer) != "y" {
				println("已取消")
				return nil
			}
		}

		if err := client.DeletePost(post.ID); err != nil {
			return err
		}

		printf("已删除文章: %s\n", post.ID)
		return nil
	},
}

var postPublishCmd = &cobra.Command{
	Use:   "publish <id|slug>",
	Short: "发布文章",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		updated, err := client.PublishPost(args[0])
		if err != nil {
			return err
		}

		printf("已发布文章: %s\n", updated.ID)
		return nil
	},
}

var postUnpublishCmd = &cobra.Command{
	Use:   "unpublish <id|slug>",
	Short: "取消发布文章（设置为草稿）",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		updated, err := client.UnpublishPost(args[0])
		if err != nil {
			return err
		}

		printf("已取消发布文章: %s\n", updated.ID)
		return nil
	},
}

var postScheduleCmd = &cobra.Command{
	Use:   "schedule <id|slug>",
	Short: "安排文章发布",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		at, _ := cmd.Flags().GetString("at")

		if at == "" {
			return fmt.Errorf("--at 是必需的 (ISO8601 时间戳)")
		}

		updated, err := client.SchedulePost(args[0], at)
		if err != nil {
			return err
		}

		printf("已安排文章 %s 于 %s 发布\n", updated.ID, at)
		return nil
	},
}

// outputJSON 将数据以JSON格式输出到当前的输出写入器。
func outputJSON(v interface{}) error {
	enc := json.NewEncoder(output)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func init() {
	postsCmd.Flags().String("status", "", "按状态过滤 (draft|published|scheduled|all)")
	postsCmd.Flags().Int("limit", 15, "返回的文章数量")
	postsCmd.Flags().Bool("json", false, "以JSON格式输出")

	postCmd.Flags().Bool("json", false, "以JSON格式输出")
	postCmd.Flags().Bool("body", false, "包含完整HTML正文")

	postCreateCmd.Flags().String("title", "", "文章标题 (必需)")
	postCreateCmd.Flags().String("status", "draft", "文章状态 (draft|published)")
	postCreateCmd.Flags().String("markdown-file", "", "内容的markdown文件路径")
	postCreateCmd.Flags().String("stdin-format", "", "从stdin读取内容 (markdown)")
	postCreateCmd.Flags().String("tag", "", "逗号分隔的标签")

	postEditCmd.Flags().String("title", "", "新标题")
	postEditCmd.Flags().String("status", "", "新状态")
	postEditCmd.Flags().String("markdown-file", "", "新内容的markdown文件路径")
	postEditCmd.Flags().String("publish-at", "", "安排发布时间 (ISO8601)")
	postEditCmd.Flags().String("feature-image", "", "特色图片URL")

	postDeleteCmd.Flags().Bool("force", false, "无需确认直接删除")

	postScheduleCmd.Flags().String("at", "", "发布时间 (ISO8601)")

	postCmd.AddCommand(postCreateCmd)
	postCmd.AddCommand(postEditCmd)
	postCmd.AddCommand(postDeleteCmd)
	postCmd.AddCommand(postPublishCmd)
	postCmd.AddCommand(postUnpublishCmd)
	postCmd.AddCommand(postScheduleCmd)

	rootCmd.AddCommand(postsCmd)
	rootCmd.AddCommand(postCmd)
}
