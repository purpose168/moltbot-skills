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

// PPTCmd 处理PowerPoint操作。
type PPTCmd struct {
	List   PPTListCmd   `cmd:"" help:"列出PowerPoint演示文稿"`
	Get    PPTGetCmd    `cmd:"" help:"获取演示文稿元数据"`
	Export PPTExportCmd `cmd:"" help:"导出演示文稿"`
	Copy   PPTCopyCmd   `cmd:"" help:"复制演示文稿"`
	Create PPTCreateCmd `cmd:"" help:"创建新演示文稿"`
}

// PPTListCmd 列出演示文稿。
type PPTListCmd struct {
	Max int `help:"最大结果数" default:"50"`
}

// Run 执行ppt list命令。
func (c *PPTListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$orderby", "lastModifiedDateTime desc")

	data, err := client.Get(ctx, "/me/drive/root/search(q='.pptx')", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	// 过滤出仅.pptx文件
	var presentations []DriveItem
	for _, item := range resp.Value {
		if strings.HasSuffix(strings.ToLower(item.Name), ".pptx") {
			presentations = append(presentations, item)
		}
	}

	if root.JSON {
		return outputJSON(presentations)
	}

	if len(presentations) == 0 {
		fmt.Println("未找到PowerPoint演示文稿")
		return nil
	}

	fmt.Println("PowerPoint演示文稿")
	fmt.Println()
	for _, ppt := range presentations {
		fmt.Printf("📊 %s  %s  %s\n", ppt.Name, formatSize(ppt.Size), ppt.LastModifiedDateTime[:10])
		fmt.Printf("   ID: %s\n", graph.FormatID(ppt.ID))
		if root.Verbose && ppt.WebURL != "" {
			fmt.Printf("   URL: %s\n", ppt.WebURL)
		}
	}
	fmt.Printf("\n%d 个演示文稿\n", len(presentations))
	return nil
}

// PPTGetCmd 获取演示文稿元数据。
type PPTGetCmd struct {
	ID string `arg:"" help:"演示文稿ID"`
}

// Run 执行ppt get命令。
func (c *PPTGetCmd) Run(root *Root) error {
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

// PPTExportCmd 导出演示文稿。
type PPTExportCmd struct {
	ID     string `arg:"" help:"演示文稿ID"`
	Out    string `help:"输出路径" required:""`
	Format string `help:"导出格式（pptx, pdf）" default:"pptx"`
}

// Run 执行ppt export命令。
func (c *PPTExportCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	pptID := graph.ResolveID(c.ID)

	format := strings.ToLower(c.Format)
	var path string

	if format == "pdf" {
		path = fmt.Sprintf("/me/drive/items/%s/content?format=pdf", pptID)
	} else {
		path = fmt.Sprintf("/me/drive/items/%s/content", pptID)
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

// PPTCopyCmd 复制演示文稿。
type PPTCopyCmd struct {
	ID     string `arg:"" help:"演示文稿ID"`
	Name   string `arg:"" help:"新名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行ppt copy命令。
func (c *PPTCopyCmd) Run(root *Root) error {
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

// PPTCreateCmd 创建演示文稿。
type PPTCreateCmd struct {
	Name   string `arg:"" help:"演示文稿名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行ppt create命令。
func (c *PPTCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	// 确保.pptx扩展名
	name := c.Name
	if !strings.HasSuffix(strings.ToLower(name), ".pptx") {
		name += ".pptx"
	}

	ctx := context.Background()
	var path string
	if c.Folder != "" {
		path = fmt.Sprintf("/me/drive/items/%s:/%s:/content", graph.ResolveID(c.Folder), name)
	} else {
		path = fmt.Sprintf("/me/drive/root:/%s:/content", name)
	}

	// 创建空的pptx
	data, err := client.Put(ctx, path, []byte{}, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
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

	fmt.Println("✓ 演示文稿创建成功")
	fmt.Printf("  名称: %s\n", item.Name)
	fmt.Printf("  ID: %s\n", graph.FormatID(item.ID))
	return nil
}
