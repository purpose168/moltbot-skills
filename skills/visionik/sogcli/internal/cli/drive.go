package cli

import (
	"context"
	"fmt"
	"os"
	"path"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/webdav"
)

// DriveCmd 处理文件操作
type DriveCmd struct {
	Ls       DriveListCmd     `cmd:"" aliases:"list" help:"列出文件和文件夹"`
	Get      DriveGetCmd      `cmd:"" aliases:"stat,info" help:"获取文件/文件夹元数据"`
	Download DriveDownloadCmd `cmd:"" help:"下载文件"`
	Upload   DriveUploadCmd   `cmd:"" aliases:"put" help:"上传文件"`
	Mkdir    DriveMkdirCmd    `cmd:"" help:"创建目录"`
	Delete   DriveDeleteCmd   `cmd:"" aliases:"rm,del" help:"删除文件或目录"`
	Move     DriveMoveCmd     `cmd:"" aliases:"mv,rename" help:"移动或重命名文件"`
	Copy     DriveCopyCmd     `cmd:"" aliases:"cp" help:"复制文件"`
	Cat      DriveCatCmd      `cmd:"" help:"将文件内容输出到标准输出"`
}

// DriveListCmd 列出文件
type DriveListCmd struct {
	Path string `arg:"" optional:"" default:"/" help:"要列出的远程路径"`
	Long bool   `help:"显示详细信息的长格式" short:"l"`
	All  bool   `help:"显示隐藏文件"`
}

// Run 执行drive ls命令
func (c *DriveListCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 列出指定路径的文件
	ctx := context.Background()
	files, err := client.List(ctx, c.Path)
	if err != nil {
		return fmt.Errorf("列出失败: %w", err)
	}

	// 检查目录是否为空
	if len(files) == 0 {
		fmt.Println("目录为空。")
		return nil
	}

	// 过滤隐藏文件
	if !c.All {
		var visible []webdav.FileInfo
		for _, f := range files {
			if !webdav.IsHidden(f.Name) {
				visible = append(visible, f)
			}
		}
		files = visible
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputFilesJSON(files)
	}

	if c.Long {
		return outputFilesLong(files)
	}

	return outputFilesShort(files)
}

// DriveGetCmd 获取文件元数据
type DriveGetCmd struct {
	Path string `arg:"" help:"要检查的路径"`
}

// Run 执行drive get命令
func (c *DriveGetCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 获取文件元数据
	ctx := context.Background()
	info, err := client.Stat(ctx, c.Path)
	if err != nil {
		return fmt.Errorf("获取信息失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputFilesJSON([]webdav.FileInfo{*info})
	}

	// 输出文件详细信息
	fmt.Printf("路径:     %s\n", info.Path)
	fmt.Printf("名称:     %s\n", info.Name)
	fmt.Printf("类型:     %s\n", fileType(info))
	if !info.IsDir {
		fmt.Printf("大小:     %s (%d 字节)\n", webdav.FormatSize(info.Size), info.Size)
	}
	if info.ContentType != "" {
		fmt.Printf("MIME:     %s\n", info.ContentType)
	}
	if !info.Modified.IsZero() {
		fmt.Printf("修改时间: %s\n", info.Modified.Format("2006-01-02 15:04:05"))
	}
	if info.ETag != "" {
		fmt.Printf("ETag:     %s\n", info.ETag)
	}
	return nil
}

// DriveDownloadCmd 下载文件
type DriveDownloadCmd struct {
	Remote string `arg:"" help:"远程文件路径"`
	Local  string `arg:"" optional:"" help:"本地路径（默认：当前目录，使用相同名称）"`
}

// Run 执行drive download命令
func (c *DriveDownloadCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 确定本地路径
	local := c.Local
	if local == "" {
		local = path.Base(c.Remote)
	}

	// 下载文件
	ctx := context.Background()
	if err := client.Download(ctx, c.Remote, local); err != nil {
		return fmt.Errorf("下载失败: %w", err)
	}

	fmt.Printf("下载成功: %s -> %s\n", c.Remote, local)
	return nil
}

// DriveUploadCmd 上传文件
type DriveUploadCmd struct {
	Local  string `arg:"" help:"本地文件路径"`
	Remote string `arg:"" optional:"" help:"远程路径（默认：/，使用相同名称）"`
}

// Run 执行drive upload命令
func (c *DriveUploadCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 确定远程路径
	remote := c.Remote
	if remote == "" {
		remote = "/" + path.Base(c.Local)
	}

	// 上传文件
	ctx := context.Background()
	if err := client.Upload(ctx, c.Local, remote); err != nil {
		return fmt.Errorf("上传失败: %w", err)
	}

	fmt.Printf("上传成功: %s -> %s\n", c.Local, remote)
	return nil
}

// DriveMkdirCmd 创建目录
type DriveMkdirCmd struct {
	Path string `arg:"" help:"要创建的目录路径"`
}

// Run 执行drive mkdir命令
func (c *DriveMkdirCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 创建目录
	ctx := context.Background()
	if err := client.Mkdir(ctx, c.Path); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	fmt.Printf("创建成功: %s\n", c.Path)
	return nil
}

// DriveDeleteCmd 删除文件或目录
type DriveDeleteCmd struct {
	Path string `arg:"" help:"要删除的路径"`
}

// Run 执行drive delete命令
func (c *DriveDeleteCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 删除文件或目录
	ctx := context.Background()
	if err := client.Delete(ctx, c.Path); err != nil {
		return fmt.Errorf("删除失败: %w", err)
	}

	fmt.Printf("删除成功: %s\n", c.Path)
	return nil
}

// DriveMoveCmd 移动/重命名文件
type DriveMoveCmd struct {
	Src string `arg:"" help:"源路径"`
	Dst string `arg:"" help:"目标路径"`
}

// Run 执行drive move命令
func (c *DriveMoveCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 移动或重命名文件
	ctx := context.Background()
	if err := client.Move(ctx, c.Src, c.Dst); err != nil {
		return fmt.Errorf("移动失败: %w", err)
	}

	fmt.Printf("移动成功: %s -> %s\n", c.Src, c.Dst)
	return nil
}

// DriveCopyCmd 复制文件
type DriveCopyCmd struct {
	Src string `arg:"" help:"源路径"`
	Dst string `arg:"" help:"目标路径"`
}

// Run 执行drive copy命令
func (c *DriveCopyCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 复制文件
	ctx := context.Background()
	if err := client.Copy(ctx, c.Src, c.Dst); err != nil {
		return fmt.Errorf("复制失败: %w", err)
	}

	fmt.Printf("复制成功: %s -> %s\n", c.Src, c.Dst)
	return nil
}

// DriveCatCmd 输出文件内容
type DriveCatCmd struct {
	Path string `arg:"" help:"文件路径"`
}

// Run 执行drive cat命令
func (c *DriveCatCmd) Run(root *Root) error {
	// 获取WebDAV客户端
	client, err := getWebDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 将文件内容输出到标准输出
	ctx := context.Background()
	if err := client.DownloadToWriter(ctx, c.Path, os.Stdout); err != nil {
		return fmt.Errorf("读取文件失败: %w", err)
	}

	return nil
}

// getWebDAVClient 从配置创建WebDAV客户端
func getWebDAVClient(root *Root) (*webdav.Client, error) {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return nil, fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return nil, err
	}

	// 检查WebDAV URL配置
	if acct.WebDAV.URL == "" {
		return nil, fmt.Errorf("%s 未配置WebDAV URL。运行: sog auth add %s --webdav-url <url>", email, email)
	}

	// 获取WebDAV密码
	password, err := cfg.GetPasswordForProtocol(email, config.ProtocolWebDAV)
	if err != nil {
		return nil, fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接WebDAV服务器
	client, err := webdav.Connect(webdav.Config{
		URL:      acct.WebDAV.URL,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, fmt.Errorf("连接WebDAV失败: %w", err)
	}

	return client, nil
}

// fileType 返回描述文件类型的字符串
func fileType(info *webdav.FileInfo) string {
	if info.IsDir {
		return "目录"
	}
	return "文件"
}

// outputFilesJSON 以JSON格式输出文件
func outputFilesJSON(files []webdav.FileInfo) error {
	for _, f := range files {
		ftype := "file"
		if f.IsDir {
			ftype = "dir"
		}
		fmt.Printf(`{"path":"%s","name":"%s","type":"%s","size":%d,"modified":"%s"}`+"\n",
			f.Path, f.Name, ftype, f.Size, f.Modified.Format("2006-01-02T15:04:05Z"))
	}
	return nil
}

// outputFilesShort 以短格式输出文件
func outputFilesShort(files []webdav.FileInfo) error {
	for _, f := range files {
		name := f.Name
		if f.IsDir {
			name += "/"
		}
		fmt.Println(name)
	}
	return nil
}

// outputFilesLong 以长格式输出文件
func outputFilesLong(files []webdav.FileInfo) error {
	for _, f := range files {
		ftype := "-"
		if f.IsDir {
			ftype = "d"
		}
		size := webdav.FormatSize(f.Size)
		if f.IsDir {
			size = "-"
		}
		modified := "-"
		if !f.Modified.IsZero() {
			modified = f.Modified.Format("2006-01-02 15:04")
		}
		name := f.Name
		if f.IsDir {
			name += "/"
		}
		fmt.Printf("%s %8s %16s %s\n", ftype, size, modified, name)
	}
	return nil
}
