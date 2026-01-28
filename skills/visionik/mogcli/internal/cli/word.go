package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/visionik/mogcli/internal/graph"
)

// WordCmd 处理Word文档操作。
type WordCmd struct {
	List   WordListCmd   `cmd:"" help:"列出Word文档"`
	Get    WordGetCmd    `cmd:"" help:"获取文档元数据"`
	Export WordExportCmd `cmd:"" help:"导出文档"`
	Copy   WordCopyCmd   `cmd:"" help:"复制文档"`
	Create WordCreateCmd `cmd:"" help:"创建新文档"`
}

// WordListCmd 列出文档。
type WordListCmd struct {
	Max int `help:"最大结果数" default:"50"`
}

// Run 执行word list命令。
func (c *WordListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$orderby", "lastModifiedDateTime desc")

	data, err := client.Get(ctx, "/me/drive/root/search(q='.docx')", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	// 过滤出仅.docx文件
	var docs []DriveItem
	for _, item := range resp.Value {
		if strings.HasSuffix(strings.ToLower(item.Name), ".docx") {
			docs = append(docs, item)
		}
	}

	if root.JSON {
		return outputJSON(docs)
	}

	if len(docs) == 0 {
		fmt.Println("未找到Word文档")
		return nil
	}

	fmt.Println("Word文档")
	fmt.Println()
	for _, doc := range docs {
		fmt.Printf("📝 %s  %s  %s\n", doc.Name, formatSize(doc.Size), doc.LastModifiedDateTime[:10])
		fmt.Printf("   ID: %s\n", graph.FormatID(doc.ID))
		if root.Verbose && doc.WebURL != "" {
			fmt.Printf("   URL: %s\n", doc.WebURL)
		}
	}
	fmt.Printf("\n%d 个文档\n", len(docs))
	return nil
}

// WordGetCmd 获取文档元数据。
type WordGetCmd struct {
	ID string `arg:"" help:"文档ID"`
}

// Run 执行word get命令。
func (c *WordGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var item DriveItem
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(item)
	}

	fmt.Printf("ID:       %s\n", graph.FormatID(item.ID))
	fmt.Printf("名称:     %s\n", item.Name)
	fmt.Printf("大小:     %s\n", formatSize(item.Size))
	fmt.Printf("创建时间: %s\n", item.CreatedDateTime)
	fmt.Printf("修改时间: %s\n", item.LastModifiedDateTime)
	if item.WebURL != "" {
		fmt.Printf("URL:      %s\n", item.WebURL)
	}
	return nil
}

// WordExportCmd 导出文档。
type WordExportCmd struct {
	ID     string `arg:"" help:"文档ID"`
	Out    string `help:"输出路径" required:""`
	Format string `help:"导出格式（docx, pdf）" default:"docx"`
}

// Run 执行word export命令。
func (c *WordExportCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	docID := graph.ResolveID(c.ID)

	format := strings.ToLower(c.Format)
	var path string

	if format == "pdf" {
		path = fmt.Sprintf("/me/drive/items/%s/content?format=pdf", docID)
	} else {
		path = fmt.Sprintf("/me/drive/items/%s/content", docID)
	}

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	if err := os.WriteFile(c.Out, data, 0644); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "path": c.Out, "format": format})
	}

	fmt.Println("✓ 导出成功")
	fmt.Printf("  格式: %s\n", strings.ToUpper(format))
	fmt.Printf("  保存到: %s\n", c.Out)
	return nil
}

// WordCopyCmd 复制文档。
type WordCopyCmd struct {
	ID     string `arg:"" help:"文档ID"`
	Name   string `arg:"" help:"新名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行word copy命令。
func (c *WordCopyCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"name": c.Name,
	}
	if c.Folder != "" {
		body["parentReference"] = map[string]string{
			"id": graph.ResolveID(c.Folder),
		}
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/copy", graph.ResolveID(c.ID))

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "name": c.Name})
	}

	fmt.Println("✓ 复制已启动")
	fmt.Printf("  名称: %s\n", c.Name)
	return nil
}

// WordCreateCmd 创建文档。
type WordCreateCmd struct {
	Name   string `arg:"" help:"文档名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行word create命令。
func (c *WordCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	// 确保.docx扩展名
	name := c.Name
	if !strings.HasSuffix(strings.ToLower(name), ".docx") {
		name += ".docx"
	}

	ctx := context.Background()
	var path string
	if c.Folder != "" {
		path = fmt.Sprintf("/me/drive/items/%s:/%s:/content", graph.ResolveID(c.Folder), name)
	} else {
		path = fmt.Sprintf("/me/drive/root:/%s:/content", name)
	}

	// 创建空的docx
	data, err := client.Put(ctx, path, []byte{}, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	if err != nil {
		return err
	}

	var item DriveItem
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(item)
	}

	fmt.Println("✓ 文档创建成功")
	fmt.Printf("  名称: %s\n", item.Name)
	fmt.Printf("  ID: %s\n", graph.FormatID(item.ID))
	return nil
}
