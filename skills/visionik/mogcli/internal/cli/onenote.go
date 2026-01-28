package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/visionik/mogcli/internal/graph"
)

// OneNoteCmd 处理OneNote操作。
type OneNoteCmd struct {
	Notebooks      OneNoteNotebooksCmd      `cmd:"" help:"列出笔记本"`
	Sections       OneNoteSectionsCmd       `cmd:"" help:"列出笔记本中的分区"`
	Pages          OneNotePagesCmd          `cmd:"" help:"列出分区中的页面"`
	Get            OneNoteGetCmd            `cmd:"" help:"获取页面内容"`
	Search         OneNoteSearchCmd         `cmd:"" help:"搜索OneNote"`
	CreateNotebook OneNoteCreateNotebookCmd `cmd:"" name:"create-notebook" help:"创建新笔记本"`
	CreateSection  OneNoteCreateSectionCmd  `cmd:"" name:"create-section" help:"创建新分区"`
	CreatePage     OneNoteCreatePageCmd     `cmd:"" name:"create-page" help:"创建新页面"`
	Delete         OneNoteDeleteCmd         `cmd:"" help:"删除页面"`
}

// OneNoteNotebooksCmd 列出笔记本。
type OneNoteNotebooksCmd struct{}

// Run 执行onenote notebooks命令。
func (c *OneNoteNotebooksCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	data, err := client.Get(ctx, "/me/onenote/notebooks", nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Notebook `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, nb := range resp.Value {
		fmt.Printf("%-40s %s\n", nb.DisplayName, graph.FormatID(nb.ID))
	}
	return nil
}

// OneNoteSectionsCmd 列出分区。
type OneNoteSectionsCmd struct {
	NotebookID string `arg:"" help:"笔记本ID"`
}

// Run 执行onenote sections命令。
func (c *OneNoteSectionsCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/notebooks/%s/sections", graph.ResolveID(c.NotebookID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Section `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, s := range resp.Value {
		fmt.Printf("%-40s %s\n", s.DisplayName, graph.FormatID(s.ID))
	}
	return nil
}

// OneNotePagesCmd 列出页面。
type OneNotePagesCmd struct {
	SectionID string `arg:"" help:"分区ID"`
}

// Run 执行onenote pages命令。
func (c *OneNotePagesCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/sections/%s/pages", graph.ResolveID(c.SectionID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Page `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, p := range resp.Value {
		fmt.Printf("%-40s %s\n", p.Title, graph.FormatID(p.ID))
	}
	return nil
}

// OneNoteGetCmd 获取页面内容。
type OneNoteGetCmd struct {
	PageID string `arg:"" help:"页面ID"`
	HTML   bool   `help:"输出原始HTML"`
}

// Run 执行onenote get命令。
func (c *OneNoteGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/pages/%s/content", graph.ResolveID(c.PageID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	if c.HTML || root.JSON {
		fmt.Println(string(data))
		return nil
	}

	// 剥离HTML以输出文本
	fmt.Println(stripHTML(string(data)))
	return nil
}

// OneNoteSearchCmd 搜索OneNote。
type OneNoteSearchCmd struct {
	Query string `arg:"" help:"搜索查询"`
}

// Run 执行onenote search命令。
func (c *OneNoteSearchCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	// 搜索页面
	data, err := client.Get(ctx, "/me/onenote/pages", nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Page `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	fmt.Println("注意: 全文搜索需要Graph beta API")
	fmt.Println("改为列出所有页面:")
	for _, p := range resp.Value {
		fmt.Printf("%-40s %s\n", p.Title, graph.FormatID(p.ID))
	}
	return nil
}

// Notebook 表示OneNote笔记本。
type Notebook struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

// Section 表示OneNote分区。
type Section struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

// Page 表示OneNote页面。
type Page struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// OneNoteCreateNotebookCmd 创建笔记本。
type OneNoteCreateNotebookCmd struct {
	Name string `arg:"" help:"笔记本名称"`
}

// Run 执行onenote create-notebook命令。
func (c *OneNoteCreateNotebookCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"displayName": c.Name,
	}

	ctx := context.Background()
	data, err := client.Post(ctx, "/me/onenote/notebooks", body)
	if err != nil {
		return err
	}

	var nb Notebook
	if err := json.Unmarshal(data, &nb); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(nb)
	}

	fmt.Println("✓ 笔记本创建成功")
	fmt.Printf("  名称: %s\n", nb.DisplayName)
	fmt.Printf("  ID: %s\n", graph.FormatID(nb.ID))
	return nil
}

// OneNoteCreateSectionCmd 创建分区。
type OneNoteCreateSectionCmd struct {
	NotebookID string `arg:"" help:"笔记本ID"`
	Name       string `arg:"" help:"分区名称"`
}

// Run 执行onenote create-section命令。
func (c *OneNoteCreateSectionCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"displayName": c.Name,
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/notebooks/%s/sections", graph.ResolveID(c.NotebookID))

	data, err := client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	var section Section
	if err := json.Unmarshal(data, &section); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(section)
	}

	fmt.Println("✓ 分区创建成功")
	fmt.Printf("  名称: %s\n", section.DisplayName)
	fmt.Printf("  ID: %s\n", graph.FormatID(section.ID))
	return nil
}

// OneNoteCreatePageCmd 创建页面。
type OneNoteCreatePageCmd struct {
	SectionID string `arg:"" help:"分区ID"`
	Title     string `arg:"" help:"页面标题"`
	Content   string `arg:"" optional:"" help:"页面内容（可选）"`
}

// Run 执行onenote create-page命令。
func (c *OneNoteCreatePageCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	// OneNote需要HTML表示格式
	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
  <head>
    <title>%s</title>
  </head>
  <body>
    <p>%s</p>
  </body>
</html>`, escapeHTML(c.Title), escapeHTML(c.Content))

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/sections/%s/pages", graph.ResolveID(c.SectionID))

	data, err := client.PostHTML(ctx, path, htmlContent)
	if err != nil {
		return err
	}

	var page Page
	if err := json.Unmarshal(data, &page); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(page)
	}

	fmt.Println("✓ 页面创建成功")
	fmt.Printf("  标题: %s\n", page.Title)
	fmt.Printf("  ID: %s\n", graph.FormatID(page.ID))
	return nil
}

// OneNoteDeleteCmd 删除页面。
type OneNoteDeleteCmd struct {
	PageID string `arg:"" help:"页面ID"`
}

// Run 执行onenote delete命令。
func (c *OneNoteDeleteCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/onenote/pages/%s", graph.ResolveID(c.PageID))

	if err := client.Delete(ctx, path); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "deleted": c.PageID})
	}

	fmt.Println("✓ 页面删除成功")
	return nil
}

// escapeHTML 转义HTML特殊字符。
func escapeHTML(text string) string {
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "&", "&amp;")
	text = strings.ReplaceAll(text, "<", "&lt;")
	text = strings.ReplaceAll(text, ">", "&gt;")
	text = strings.ReplaceAll(text, "\"", "&quot;")
	text = strings.ReplaceAll(text, "'", "&#39;")
	return text
}
