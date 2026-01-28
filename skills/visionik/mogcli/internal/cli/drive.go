package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	"github.com/visionik/mogcli/internal/graph"
)

// DriveCmd 处理 OneDrive 操作命令。
type DriveCmd struct {
	Ls       DriveLsCmd       `cmd:"" help:"列出文件"`
	Search   DriveSearchCmd   `cmd:"" help:"搜索文件"`
	Get      DriveGetCmd      `cmd:"" help:"获取文件元数据"`
	Download DriveDownloadCmd `cmd:"" help:"下载文件"`
	Upload   DriveUploadCmd   `cmd:"" help:"上传文件"`
	Mkdir    DriveMkdirCmd    `cmd:"" help:"创建文件夹"`
	Move     DriveMoveCmd     `cmd:"" help:"移动文件"`
	Copy     DriveCopyCmd     `cmd:"" help:"复制文件"`
	Rename   DriveRenameCmd   `cmd:"" help:"重命名文件"`
	Delete   DriveDeleteCmd   `cmd:"" aliases:"rm" help:"删除文件"`
}

// DriveLsCmd 列出文件。
type DriveLsCmd struct {
	Path string `arg:"" optional:"" help:"文件夹路径或 ID" default:""`
}

// Run 执行驱动器列表命令。
func (c *DriveLsCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := "/me/drive/root/children"
	if c.Path != "" {
		if len(c.Path) > 20 {
			// 看起来像 ID
			path = fmt.Sprintf("/me/drive/items/%s/children", graph.ResolveID(c.Path))
		} else {
			path = fmt.Sprintf("/me/drive/root:/%s:/children", c.Path)
		}
	}

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, item := range resp.Value {
		itemType := "📄"
		if item.Folder != nil {
			itemType = "📁"
		}
		size := ""
		if item.Size > 0 {
			size = formatSize(item.Size)
		}
		fmt.Printf("%s %-40s %8s  %s\n", itemType, item.Name, size, graph.FormatID(item.ID))
	}
	return nil
}

// DriveSearchCmd 搜索文件。
type DriveSearchCmd struct {
	Query string `arg:"" help:"搜索查询"`
	Max   int    `help:"最大结果数" default:"25"`
}

// Run 执行驱动器搜索命令。
func (c *DriveSearchCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))

	path := fmt.Sprintf("/me/drive/root/search(q='%s')", url.PathEscape(c.Query))
	data, err := client.Get(ctx, path, query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, item := range resp.Value {
		itemType := "📄"
		if item.Folder != nil {
			itemType = "📁"
		}
		fmt.Printf("%s %s  %s\n", itemType, item.Name, graph.FormatID(item.ID))
	}
	return nil
}

// DriveGetCmd 获取文件元数据。
type DriveGetCmd struct {
	ID string `arg:"" help:"文件 ID"`
}

// Run 执行驱动器获取命令。
func (c *DriveGetCmd) Run(root *Root) error {
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
	fmt.Printf("创建:     %s\n", item.CreatedDateTime)
	fmt.Printf("修改:     %s\n", item.LastModifiedDateTime)
	if item.WebURL != "" {
		fmt.Printf("URL:      %s\n", item.WebURL)
	}
	return nil
}

// DriveDownloadCmd 下载文件。
type DriveDownloadCmd struct {
	ID  string `arg:"" help:"文件 ID"`
	Out string `help:"输出路径" required:""`
}

// Run 执行驱动器下载命令。
func (c *DriveDownloadCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/content", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	if err := os.WriteFile(c.Out, data, 0644); err != nil {
		return err
	}

	fmt.Printf("✓ 下载完成: %s\n", c.Out)
	return nil
}

// DriveUploadCmd 上传文件。
type DriveUploadCmd struct {
	Path   string `arg:"" help:"本地文件路径"`
	Folder string `help:"目标文件夹 ID"`
	Name   string `help:"上传时重命名文件"`
}

// Run 执行驱动器上传命令。
func (c *DriveUploadCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	data, err := os.ReadFile(c.Path)
	if err != nil {
		return err
	}

	name := c.Name
	if name == "" {
		name = filepath.Base(c.Path)
	}

	ctx := context.Background()
	var path string
	if c.Folder != "" {
		path = fmt.Sprintf("/me/drive/items/%s:/%s:/content", graph.ResolveID(c.Folder), name)
	} else {
		path = fmt.Sprintf("/me/drive/root:/%s:/content", name)
	}

	// 对于小文件，使用简单上传
	// 注意：这是简化版 - 大文件需要分块上传
	respData, err := client.Put(ctx, path, data, "application/octet-stream")
	if err != nil {
		return err
	}

	var item DriveItem
	if err := json.Unmarshal(respData, &item); err != nil {
		return err
	}

	fmt.Printf("✓ 上传完成: %s (%s)\n", item.Name, graph.FormatID(item.ID))
	return nil
}

// DriveMkdirCmd 创建文件夹。
type DriveMkdirCmd struct {
	Name   string `arg:"" help:"文件夹名称"`
	Parent string `help:"父文件夹 ID"`
}

// Run 执行驱动器创建文件夹命令。
func (c *DriveMkdirCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"name":   c.Name,
		"folder": map[string]interface{}{},
	}

	ctx := context.Background()
	path := "/me/drive/root/children"
	if c.Parent != "" {
		path = fmt.Sprintf("/me/drive/items/%s/children", graph.ResolveID(c.Parent))
	}

	data, err := client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	var item DriveItem
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	fmt.Printf("✓ 文件夹创建成功: %s (%s)\n", item.Name, graph.FormatID(item.ID))
	return nil
}

// DriveMoveCmd 移动文件。
type DriveMoveCmd struct {
	ID          string `arg:"" help:"文件 ID"`
	Destination string `arg:"" help:"目标文件夹 ID"`
}

// Run 执行驱动器移动命令。
func (c *DriveMoveCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"parentReference": map[string]string{
			"id": graph.ResolveID(c.Destination),
		},
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s", graph.ResolveID(c.ID))

	_, err = client.Patch(ctx, path, body)
	if err != nil {
		return err
	}

	fmt.Println("✓ 文件移动成功")
	return nil
}

// DriveCopyCmd 复制文件。
type DriveCopyCmd struct {
	ID   string `arg:"" help:"文件 ID"`
	Name string `help:"复制的新名称" required:""`
}

// Run 执行驱动器复制命令。
func (c *DriveCopyCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"name": c.Name,
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/copy", graph.ResolveID(c.ID))

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	fmt.Printf("✓ 复制已启动: %s\n", c.Name)
	return nil
}

// DriveRenameCmd 重命名文件。
type DriveRenameCmd struct {
	ID   string `arg:"" help:"文件 ID"`
	Name string `arg:"" help:"新名称"`
}

// Run 执行驱动器重命名命令。
func (c *DriveRenameCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"name": c.Name,
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s", graph.ResolveID(c.ID))

	_, err = client.Patch(ctx, path, body)
	if err != nil {
		return err
	}

	fmt.Printf("✓ 重命名为: %s\n", c.Name)
	return nil
}

// DriveDeleteCmd 删除文件。
type DriveDeleteCmd struct {
	ID string `arg:"" help:"文件 ID"`
}

// Run 执行驱动器删除命令。
func (c *DriveDeleteCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s", graph.ResolveID(c.ID))

	if err := client.Delete(ctx, path); err != nil {
		return err
	}

	fmt.Println("✓ 文件删除成功")
	return nil
}

// DriveItem 表示 OneDrive 项目。
type DriveItem struct {
	ID                   string      `json:"id"`
	Name                 string      `json:"name"`
	Size                 int64       `json:"size"`
	CreatedDateTime      string      `json:"createdDateTime"`
	LastModifiedDateTime string      `json:"lastModifiedDateTime"`
	WebURL               string      `json:"webUrl"`
	Folder               *FolderInfo `json:"folder,omitempty"`
	File                 *FileInfo   `json:"file,omitempty"`
}

// FolderInfo 表示文件夹信息。
type FolderInfo struct {
	ChildCount int `json:"childCount"`
}

// FileInfo 表示文件信息。
type FileInfo struct {
	MimeType string `json:"mimeType"`
}

// formatSize 格式化文件大小为人类可读形式。
func formatSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
