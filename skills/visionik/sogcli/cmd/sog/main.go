// sog - 标准运维工具
//
// 用于邮件、日历、联系人、任务和文件的开放标准命令行工具。
// IMAP/SMTP/CalDAV/CardDAV/WebDAV 的替代方案，类似于 gog (Google) 和 mog (Microsoft)。
package main

import (
	"fmt"
	"os"

	"github.com/alecthomas/kong"
	"github.com/visionik/sogcli/internal/cli"
)

var version = "dev"

func main() {
	// 在 kong 解析之前处理 --ai-help 参数
	// 这样可以在任何子命令之前显示 AI 帮助信息
	for _, arg := range os.Args[1:] {
		if arg == "--ai-help" || arg == "-ai-help" {
			fmt.Println(cli.AIHelpText)
			os.Exit(0)
		}
	}

	var root cli.Root
	ctx := kong.Parse(&root,
		kong.Name("sog"),
		kong.Description("标准运维工具 — IMAP/SMTP/CalDAV/CardDAV/WebDAV 命令行工具"),
		kong.UsageOnError(),
		kong.Vars{
			"version": version,
		},
		kong.PostBuild(func(k *kong.Kong) error {
			// 手动将 --ai-help 添加到帮助文本中
			return nil
		}),
	)

	err := ctx.Run(&root)
	if err != nil {
		// 将错误输出到标准错误流
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}
}
