// Package cli 定义了 mog 的命令行接口。
package cli

import (
	"fmt"
	"os"

	"github.com/visionik/mogcli/internal/graph"
)

// ClientFactory 是一个创建 Graph 客户端的函数类型。
// 这允许进行依赖注入以便于测试。
type ClientFactory func() (graph.Client, error)

// Root 是命令行工具的顶层结构体。
type Root struct {
	// 全局标志
	AIHelp  bool        `name:"ai-help" help:"显示 AI/LLM 智能体的详细帮助信息"`
	JSON    bool        `help:"输出 JSON 到标准输出 (最适合脚本处理)" xor:"format"`
	Plain   bool        `help:"输出稳定的、可解析的文本到标准输出 (TSV格式; 无颜色)" xor:"format"`
	Verbose bool        `help:"显示完整 ID 和额外详细信息" short:"v"`
	Force   bool        `help:"跳过破坏性命令的确认提示"`
	NoInput bool        `help:"从不提示; 直接失败 (适用于 CI 环境)" name:"no-input"`
	Version VersionFlag `name:"version" help:"打印版本信息并退出"`

	// 子命令
	Auth     AuthCmd     `cmd:"" help:"身份验证"`
	Mail     MailCmd     `cmd:"" aliases:"email" help:"邮件操作"`
	Calendar CalendarCmd `cmd:"" aliases:"cal" help:"日历操作"`
	Drive    DriveCmd    `cmd:"" help:"OneDrive 文件操作"`
	Contacts ContactsCmd `cmd:"" help:"联系人操作"`
	Tasks    TasksCmd    `cmd:"" aliases:"todo" help:"Microsoft To-Do 任务"`
	Excel    ExcelCmd    `cmd:"" help:"Excel 电子表格操作"`
	OneNote  OneNoteCmd  `cmd:"" aliases:"onenote" help:"OneNote 操作"`
	Word     WordCmd     `cmd:"" help:"Word 文档操作"`
	PPT      PPTCmd      `cmd:"" aliases:"ppt,powerpoint" help:"PowerPoint 操作"`

	// ClientFactory 允许注入自定义客户端工厂以用于测试。
	// 如果为 nil，则使用 graph.NewClient。
	ClientFactory ClientFactory `kong:"-"`
}

// GetClient 使用配置的工厂或默认值返回 Graph 客户端。
func (r *Root) GetClient() (graph.Client, error) {
	if r.ClientFactory != nil {
		return r.ClientFactory()
	}
	return graph.NewClient()
}

// VersionFlag 处理 --version 参数。
type VersionFlag string

// BeforeApply 在参数应用前打印版本信息并退出。
func (v VersionFlag) BeforeApply() error {
	fmt.Println(v)
	os.Exit(0)
	return nil
}
