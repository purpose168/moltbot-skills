// mog - Microsoft 操作小工具
//
// Microsoft 365 的命令行工具 — 邮件、日历、驱动器、联系人、任务、Word、PowerPoint、Excel、OneNote
// 原始 Node.js 版本的 Go 移植版。
package main

import (
	"fmt"
	"os"

	"github.com/alecthomas/kong"
	"github.com/visionik/mogcli/internal/cli"
)

var version = "dev"

func main() {
	// 在 kong 解析之前处理 --ai-help
	for _, arg := range os.Args[1:] {
		if arg == "--ai-help" || arg == "-ai-help" {
			fmt.Println(cli.AIHelpText)
			os.Exit(0)
		}
	}

	var root cli.Root
	ctx := kong.Parse(&root,
		kong.Name("mog"),
		kong.Description("Microsoft 操作小工具 — Microsoft 365 命令行工具"),
		kong.UsageOnError(),
		kong.Vars{
			"version": version,
		},
	)

	err := ctx.Run(&root)
	if err != nil {
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}
}
