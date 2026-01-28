// Package cmd 实现了用于管理 Ghost.io 站点的 ecto CLI 命令。
// 它提供了身份验证、内容管理和站点配置的命令。
package cmd

import (
	"fmt"
	"io"
	"os"

	"github.com/spf13/cobra"
)

var siteName string

// output 是命令输出的写入器。默认为 os.Stdout，但可以覆盖用于测试。
var output io.Writer = os.Stdout

// SetOutput 设置命令输出的写入器。
// 这主要用于测试。
func SetOutput(w io.Writer) {
	output = w
}

// ResetOutput 将输出写入器重置为 os.Stdout。
func ResetOutput() {
	output = os.Stdout
}

// printf 将格式化输出写入当前的输出写入器。
func printf(format string, a ...interface{}) {
	fmt.Fprintf(output, format, a...)
}

// println 将一行写入当前的输出写入器。
func println(a ...interface{}) {
	fmt.Fprintln(output, a...)
}

var aiHelp bool

var rootCmd = &cobra.Command{
	Use:   "ecto",
	Short: "Ghost.io Admin API 的命令行工具",
	Long: `ecto 是用于管理 Ghost.io 站点的命令行工具。

配置站点:
  ecto auth add mysite --url https://mysite.ghost.io --key your-admin-api-key

然后使用如下命令:
  ecto posts
  ecto post create --title "My Post" --markdown-file content.md
  ecto site`,
	Run: func(cmd *cobra.Command, args []string) {
		if aiHelp {
			printAIHelp()
			return
		}
		cmd.Help()
	},
}

func printAIHelp() {
	help := `# ecto - Ghost.io Admin API 命令行工具

## 概述
ecto 是通过管理 API 管理 Ghost.io 博客的命令行工具。
它支持多站点配置、Markdown 到 HTML 转换，以及用于脚本的 JSON 输出。

## 身份验证
Ghost Admin API 使用 JWT 身份验证，密钥格式为: {id}:{secret}
从 Ghost Admin → 设置 → 集成 → 添加自定义集成获取您的密钥。

### 设置
ecto auth add <名称> --url <ghost-url> --key <admin-api-key>
ecto auth list
ecto auth default <名称>
ecto auth remove <名称>

环境变量覆盖:
- GHOST_URL: Ghost 站点 URL
- GHOST_ADMIN_KEY: 管理 API 密钥 (id:secret 格式)
- GHOST_SITE: 配置中的站点名称

## 内容管理

### 文章
ecto posts [--状态 draft|published|scheduled|all] [--限制 N] [--json]
ecto post <id|slug> [--json] [--body]
ecto post create --title "标题" [--markdown-file file.md] [--stdin-format markdown] [--tag tag1,tag2] [--状态 draft|published]
ecto post edit <id|slug> [--title "新标题"] [--markdown-file file.md] [--状态 draft|published]
ecto post delete <id|slug> [--force]
ecto post publish <id|slug>
ecto post unpublish <id|slug>
ecto post schedule <id|slug> --at "2025-01-25T10:00:00Z"

### 页面
ecto pages [--状态 draft|published|all] [--限制 N] [--json]
ecto page <id|slug> [--json] [--body]
ecto page create --title "标题" [--markdown-file file.md] [--状态 draft|published]
ecto page edit <id|slug> [--title "新标题"] [--markdown-file file.md]
ecto page delete <id|slug> [--force]
ecto page publish <id|slug>

### 标签
ecto tags [--json]
ecto tag <id|slug> [--json]
ecto tag create --name "标签名称" [--description "描述"]
ecto tag edit <id|slug> [--name "新名称"] [--description "描述"]
ecto tag delete <id|slug> [--force]

### 图片
ecto image upload <路径> [--json]
返回上传的图片 URL。注意: Ghost API 不支持列出图片。

## 站点信息
ecto site [--json]
ecto settings [--json]
ecto users [--json]
ecto user <id|slug> [--json]
ecto newsletters [--json]
ecto newsletter <id> [--json]

## Webhooks
注意: Ghost API 仅支持创建/删除，不支持列出 webhooks。
ecto webhook create --event <event> --target-url <url> [--name "Hook 名称"]
ecto webhook delete <id> [--force]

Webhook 事件: post.published, post.unpublished, post.added, post.deleted, page.published 等

## 多站点使用
使用 --site 标志指定要使用的已配置站点:
ecto posts --site blog2
ecto post create --title "测试" --site staging

## 输出格式
所有读取命令都支持 --json 以获取机器可读输出:
ecto posts --json | jq '.posts[].title'

## 常见工作流程

### 从 markdown 创建并发布文章:
ecto post create --title "我的文章" --markdown-file post.md --tag blog --status published

### 从标准输入管道内容:
echo "# Hello World" | ecto post create --title "快速文章" --stdin-format markdown

### 安排文章:
ecto post create --title "未来文章" --markdown-file post.md
ecto post schedule future-post --at "2025-02-01T09:00:00Z"

### 使用 JSON 进行批量操作:
for id in $(ecto posts --status draft --json | jq -r '.posts[].id'); do
  ecto post publish "$id"
done

## 配置
配置文件: ~/.config/ecto/config.json
{
  "default_site": "mysite",
  "sites": {
    "mysite": {
      "name": "mysite",
      "url": "https://mysite.ghost.io",
      "api_key": "id:secret"
    }
  }
}

## 错误处理
- 错误时返回非零退出码
- 错误消息在可用时包含 API 错误详情
- 使用 --force 跳过破坏性操作的确认提示

## 限制
- Ghost API 不支持列出图片或 webhooks
- 成员/订阅管理未实现 (管理 API 限制)
- 对用户只读访问 (无法通过 API 创建/修改)
`
	fmt.Fprint(output, help)
}

// Execute 运行根命令并在出错时退出。
// 这是 CLI 的主要入口点。
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

// RootCmd 返回用于测试的根命令。
func RootCmd() *cobra.Command {
	return rootCmd
}

func init() {
	rootCmd.PersistentFlags().StringVar(&siteName, "site", "", "要使用的站点名称 (默认: 配置的默认值)")
	rootCmd.PersistentFlags().BoolVar(&aiHelp, "ai-help", false, "显示 LLM/AI 智能体的详细帮助")
}
