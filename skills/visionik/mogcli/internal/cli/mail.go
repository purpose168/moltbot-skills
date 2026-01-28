package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/visionik/mogcli/internal/graph"
)

// MailCmd 处理邮件操作命令。
type MailCmd struct {
	List       MailListCmd       `cmd:"" help:"列出消息（search * 的别名）"`
	Search     MailSearchCmd     `cmd:"" help:"搜索消息"`
	Get        MailGetCmd        `cmd:"" help:"获取消息"`
	Send       MailSendCmd       `cmd:"" help:"发送电子邮件"`
	Folders    MailFoldersCmd    `cmd:"" help:"列出邮件文件夹"`
	Drafts     MailDraftsCmd     `cmd:"" help:"草稿操作"`
	Attachment MailAttachmentCmd `cmd:"" help:"附件操作"`
}

// MailListCmd 列出消息（search * 的别名）。
type MailListCmd struct {
	Max    int    `help:"最大结果数" default:"25"`
	Folder string `help:"要列出的文件夹 ID"`
}

// Run 执行邮件列表命令（委托给 search *）。
func (c *MailListCmd) Run(root *Root) error {
	search := &MailSearchCmd{
		Query:  "*",
		Max:    c.Max,
		Folder: c.Folder,
	}
	return search.Run(root)
}

// MailSearchCmd 搜索消息。
type MailSearchCmd struct {
	Query  string `arg:"" help:"搜索查询（使用 * 表示所有）"`
	Max    int    `help:"最大结果数" default:"25"`
	Folder string `help:"要搜索的文件夹 ID"`
}

// Run 执行邮件搜索命令。
func (c *MailSearchCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$orderby", "receivedDateTime desc")
	query.Set("$select", "id,subject,from,receivedDateTime,isRead,hasAttachments")

	if c.Query != "*" && c.Query != "" {
		query.Set("$search", fmt.Sprintf(`"%s"`, c.Query))
	}

	path := "/me/messages"
	if c.Folder != "" {
		path = fmt.Sprintf("/me/mailFolders/%s/messages", graph.ResolveID(c.Folder))
	}

	data, err := client.Get(ctx, path, query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Message `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("未找到消息")
		return nil
	}

	for _, msg := range resp.Value {
		printMessage(msg, root.Verbose)
	}

	fmt.Printf("\n%d 条消息\n", len(resp.Value))
	return nil
}

// MailGetCmd 获取消息。
type MailGetCmd struct {
	ID string `arg:"" help:"消息 ID 或短 ID"`
}

// Run 执行邮件获取命令。
func (c *MailGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/messages/%s", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(msg)
	}

	printMessageDetail(msg, root.Verbose)
	return nil
}

// MailSendCmd 发送电子邮件。
type MailSendCmd struct {
	To               []string `help:"收件人" required:""`
	Cc               []string `help:"抄送收件人"`
	Bcc              []string `help:"密送收件人"`
	Subject          string   `help:"主题行" required:""`
	Body             string   `help:"消息正文"`
	BodyFile         string   `help:"从文件读取正文（- 表示标准输入）" name:"body-file"`
	BodyHTML         string   `help:"HTML 正文" name:"body-html"`
	ReplyToMessageID string   `help:"回复消息 ID" name:"reply-to-message-id"`
}

// Run 执行邮件发送命令。
func (c *MailSendCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := c.Body
	contentType := "text"

	if c.BodyHTML != "" {
		body = c.BodyHTML
		contentType = "html"
	} else if c.BodyFile != "" {
		var data []byte
		if c.BodyFile == "-" {
			data, err = io.ReadAll(os.Stdin)
		} else {
			data, err = os.ReadFile(c.BodyFile)
		}
		if err != nil {
			return fmt.Errorf("读取正文文件失败: %w", err)
		}
		body = string(data)
	}

	if body == "" {
		return fmt.Errorf("消息正文是必需的（使用 --body, --body-file, 或 --body-html）")
	}

	ctx := context.Background()

	// 回复现有消息
	if c.ReplyToMessageID != "" {
		messageID := graph.ResolveID(c.ReplyToMessageID)
		replyMsg := map[string]interface{}{
			"message": map[string]interface{}{
				"body": map[string]string{
					"contentType": contentType,
					"content":     body,
				},
				"toRecipients":  formatRecipients(c.To),
				"ccRecipients":  formatRecipients(c.Cc),
				"bccRecipients": formatRecipients(c.Bcc),
			},
			"comment": body,
		}
		_, err = client.Post(ctx, fmt.Sprintf("/me/messages/%s/reply", messageID), replyMsg)
		if err != nil {
			return err
		}
	} else {
		// 发送新邮件
		msg := map[string]interface{}{
			"message": map[string]interface{}{
				"subject": c.Subject,
				"body": map[string]string{
					"contentType": contentType,
					"content":     body,
				},
				"toRecipients":  formatRecipients(c.To),
				"ccRecipients":  formatRecipients(c.Cc),
				"bccRecipients": formatRecipients(c.Bcc),
			},
		}
		_, err = client.Post(ctx, "/me/sendMail", msg)
		if err != nil {
			return err
		}
	}

	fmt.Println("✓ 邮件发送成功")
	return nil
}

// MailFoldersCmd 列出邮件文件夹。
type MailFoldersCmd struct{}

// Run 执行邮件文件夹命令。
func (c *MailFoldersCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	data, err := client.Get(ctx, "/me/mailFolders", nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []MailFolder `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	fmt.Printf("%-10s %-20s %s\n", "未读", "名称", "ID")
	for _, f := range resp.Value {
		slug := graph.FormatID(f.ID)
		fmt.Printf("%-10d %-20s %s\n", f.UnreadItemCount, f.DisplayName, slug)
		if root.Verbose {
			fmt.Printf("           完整 ID: %s\n", f.ID)
		}
	}
	return nil
}

// MailDraftsCmd 处理草稿操作。
type MailDraftsCmd struct {
	List   MailDraftsListCmd   `cmd:"" help:"列出草稿"`
	Create MailDraftsCreateCmd `cmd:"" help:"创建草稿"`
	Send   MailDraftsSendCmd   `cmd:"" help:"发送草稿"`
	Delete MailDraftsDeleteCmd `cmd:"" help:"删除草稿"`
}

// MailDraftsListCmd 列出草稿。
type MailDraftsListCmd struct {
	Max int `help:"最大结果数" default:"25"`
}

// Run 执行草稿列表命令。
func (c *MailDraftsListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))

	data, err := client.Get(ctx, "/me/mailFolders/drafts/messages", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Message `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("无草稿")
		return nil
	}

	for _, msg := range resp.Value {
		printMessage(msg, root.Verbose)
	}
	return nil
}

// MailDraftsCreateCmd 创建草稿。
type MailDraftsCreateCmd struct {
	To       []string `help:"收件人"`
	Subject  string   `help:"主题行"`
	Body     string   `help:"消息正文"`
	BodyFile string   `help:"从文件读取正文" name:"body-file"`
}

// Run 执行草稿创建命令。
func (c *MailDraftsCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := c.Body
	if c.BodyFile != "" {
		data, err := os.ReadFile(c.BodyFile)
		if err != nil {
			return err
		}
		body = string(data)
	}

	msg := map[string]interface{}{
		"subject": c.Subject,
		"body": map[string]string{
			"contentType": "text",
			"content":     body,
		},
		"toRecipients": formatRecipients(c.To),
	}

	ctx := context.Background()
	data, err := client.Post(ctx, "/me/messages", msg)
	if err != nil {
		return err
	}

	var created Message
	if err := json.Unmarshal(data, &created); err != nil {
		return err
	}

	fmt.Printf("✓ 草稿创建成功: %s\n", graph.FormatID(created.ID))
	return nil
}

// MailDraftsSendCmd 发送草稿。
type MailDraftsSendCmd struct {
	ID string `arg:"" help:"草稿 ID"`
}

// Run 执行草稿发送命令。
func (c *MailDraftsSendCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/messages/%s/send", graph.ResolveID(c.ID))
	_, err = client.Post(ctx, path, nil)
	if err != nil {
		return err
	}

	fmt.Println("✓ 草稿发送成功")
	return nil
}

// MailDraftsDeleteCmd 删除草稿。
type MailDraftsDeleteCmd struct {
	ID string `arg:"" help:"草稿 ID"`
}

// Run 执行草稿删除命令。
func (c *MailDraftsDeleteCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/messages/%s", graph.ResolveID(c.ID))
	if err := client.Delete(ctx, path); err != nil {
		return err
	}

	fmt.Println("✓ 草稿删除成功")
	return nil
}

// MailAttachmentCmd 处理附件操作。
type MailAttachmentCmd struct {
	List     MailAttachmentListCmd     `cmd:"" help:"列出附件"`
	Download MailAttachmentDownloadCmd `cmd:"" help:"下载附件"`
}

// MailAttachmentListCmd 列出附件。
type MailAttachmentListCmd struct {
	MessageID string `arg:"" help:"消息 ID"`
}

// Run 执行附件列表命令。
func (c *MailAttachmentListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/messages/%s/attachments", graph.ResolveID(c.MessageID))
	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Attachment `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, a := range resp.Value {
		fmt.Printf("%s  %s (%d 字节)\n", graph.FormatID(a.ID), a.Name, a.Size)
	}
	return nil
}

// MailAttachmentDownloadCmd 下载附件。
type MailAttachmentDownloadCmd struct {
	MessageID    string `arg:"" help:"消息 ID"`
	AttachmentID string `arg:"" help:"附件 ID"`
	Out          string `help:"输出文件路径" required:""`
}

// Run 执行附件下载命令。
func (c *MailAttachmentDownloadCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/messages/%s/attachments/%s",
		graph.ResolveID(c.MessageID), graph.ResolveID(c.AttachmentID))
	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var att Attachment
	if err := json.Unmarshal(data, &att); err != nil {
		return err
	}

	if err := os.WriteFile(c.Out, att.ContentBytes, 0644); err != nil {
		return err
	}

	fmt.Printf("✓ 下载完成: %s\n", c.Out)
	return nil
}

// Message 表示电子邮件消息。
type Message struct {
	ID               string       `json:"id"`
	Subject          string       `json:"subject"`
	From             *EmailAddr   `json:"from"`
	ToRecipients     []EmailAddr  `json:"toRecipients"`
	ReceivedDateTime string       `json:"receivedDateTime"`
	IsRead           bool         `json:"isRead"`
	HasAttachments   bool         `json:"hasAttachments"`
	Body             *MessageBody `json:"body"`
}

// EmailAddr 表示电子邮件地址。
type EmailAddr struct {
	EmailAddress struct {
		Name    string `json:"name"`
		Address string `json:"address"`
	} `json:"emailAddress"`
}

// MessageBody 表示消息正文。
type MessageBody struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

// MailFolder 表示邮件文件夹。
type MailFolder struct {
	ID              string `json:"id"`
	DisplayName     string `json:"displayName"`
	UnreadItemCount int    `json:"unreadItemCount"`
	TotalItemCount  int    `json:"totalItemCount"`
}

// Attachment 表示附件。
type Attachment struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Size         int    `json:"size"`
	ContentType  string `json:"contentType"`
	ContentBytes []byte `json:"contentBytes"`
}

// formatRecipients 格式化收件人列表为 API 所需格式。
func formatRecipients(emails []string) []map[string]interface{} {
	var result []map[string]interface{}
	for _, email := range emails {
		result = append(result, map[string]interface{}{
			"emailAddress": map[string]string{
				"address": email,
			},
		})
	}
	return result
}

// printMessage 打印邮件摘要信息。
func printMessage(msg Message, verbose bool) {
	read := "●"
	if msg.IsRead {
		read = " "
	}
	attach := "  "
	if msg.HasAttachments {
		attach = "📎"
	}

	from := "Unknown"
	if msg.From != nil && msg.From.EmailAddress.Address != "" {
		from = msg.From.EmailAddress.Name
		if from == "" {
			from = msg.From.EmailAddress.Address
		}
	}
	if len(from) > 20 {
		from = from[:20]
	}

	date := formatMessageDate(msg.ReceivedDateTime)
	subject := msg.Subject
	if subject == "" {
		subject = "(无主题)"
	}

	fmt.Printf("%s %s %-8s %-20s %s\n", read, attach, date, from, subject)
	fmt.Printf("  ID: %s\n", graph.FormatID(msg.ID))
	if verbose {
		fmt.Printf("  完整: %s\n", msg.ID)
	}
}

// printMessageDetail 打印邮件详细信息。
func printMessageDetail(msg Message, verbose bool) {
	fmt.Printf("ID:      %s\n", graph.FormatID(msg.ID))
	if verbose {
		fmt.Printf("完整 ID: %s\n", msg.ID)
	}
	fmt.Printf("主题:    %s\n", msg.Subject)
	if msg.From != nil {
		fmt.Printf("发件人:  %s <%s>\n", msg.From.EmailAddress.Name, msg.From.EmailAddress.Address)
	}
	fmt.Printf("日期:    %s\n", msg.ReceivedDateTime)
	fmt.Printf("已读:    %v\n", msg.IsRead)
	if msg.Body != nil {
		fmt.Println("\n--- 正文 ---")
		content := msg.Body.Content
		if msg.Body.ContentType == "html" {
			content = stripHTML(content)
		}
		fmt.Println(content)
	}
}

// formatMessageDate 格式化消息日期为人类可读形式。
func formatMessageDate(dateStr string) string {
	t, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		return dateStr[:10]
	}

	now := time.Now()
	diff := now.Sub(t)

	if diff < 24*time.Hour && t.Day() == now.Day() {
		return t.Format("15:04")
	} else if diff < 7*24*time.Hour {
		return t.Format("Mon")
	}
	return t.Format("1月2日")
}

// stripHTML 简单的 HTML 标签剥离函数。
func stripHTML(html string) string {
	// 简单的 HTML 剥离 - 删除标签
	result := html
	for {
		start := strings.Index(result, "<")
		if start == -1 {
			break
		}
		end := strings.Index(result[start:], ">" )
		if end == -1 {
			break
		}
		result = result[:start] + result[start+end+1:]
	}
	return strings.TrimSpace(result)
}

// outputJSON 输出 JSON 格式数据。
func outputJSON(v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}
