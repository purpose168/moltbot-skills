# Microsoft 365 集成

## 描述
通过 Microsoft Graph API 访问 Microsoft 365 服务 - 邮件（Outlook）、日历、OneDrive、待办事项任务和联系人。

## 激活
当用户提到以下内容时激活：outlook、电子邮件、日历、onedrive、microsoft、office 365、o365、ms365、我的会议、我的电子邮件、安排会议、发送电子邮件、检查日历、待办事项、microsoft 任务

## 配置
首次登录后会缓存身份验证。设备代码流程不需要环境变量。

对于无头/自动化操作，请设置以下环境变量：
- MS365_MCP_CLIENT_ID - Azure AD 应用客户端 ID
- MS365_MCP_CLIENT_SECRET - Azure AD 应用密钥
- MS365_MCP_TENANT_ID - 租户 ID（个人账户使用 "consumers"）

## 可用命令

### 身份验证

```bash
# 通过设备代码登录（交互式）
python3 /root/clawd/skills/ms365/ms365_cli.py login

# 检查身份验证状态
python3 /root/clawd/skills/ms365/ms365_cli.py status

# 列出已缓存的账户
python3 /root/clawd/skills/ms365/ms365_cli.py accounts

# 获取当前用户信息
python3 /root/clawd/skills/ms365/ms365_cli.py user
```

### 邮件（Outlook）

```bash
# 列出最近的邮件
python3 /root/clawd/skills/ms365/ms365_cli.py mail list [--top N]

# 读取特定邮件
python3 /root/clawd/skills/ms365/ms365_cli.py mail read MESSAGE_ID

# 发送邮件
python3 /root/clawd/skills/ms365/ms365_cli.py mail send --to "recipient@example.com" --subject "Subject" --body "Message body"
```

### 日历

```bash
# 列出即将发生的事件
python3 /root/clawd/skills/ms365/ms365_cli.py calendar list [--top N]

# 创建事件
python3 /root/clawd/skills/ms365/ms365_cli.py calendar create --subject "Meeting" --start "2026-01-15T10:00:00" --end "2026-01-15T11:00:00" [--body "Description"] [--timezone "America/Chicago"]
```

### OneDrive 文件

```bash
# 列出根目录中的文件
python3 /root/clawd/skills/ms365/ms365_cli.py files list

# 列出文件夹中的文件
python3 /root/clawd/skills/ms365/ms365_cli.py files list --path "Documents"
```

### 待办事项任务

```bash
# 列出任务列表
python3 /root/clawd/skills/ms365/ms365_cli.py tasks lists

# 从列表中获取任务
python3 /root/clawd/skills/ms365/ms365_cli.py tasks get LIST_ID

# 创建任务
python3 /root/clawd/skills/ms365/ms365_cli.py tasks create LIST_ID --title "Task title" [--due "2026-01-20"]
```

### 联系人

```bash
# 列出联系人
python3 /root/clawd/skills/ms365/ms365_cli.py contacts list [--top N]

# 搜索联系人
python3 /root/clawd/skills/ms365/ms365_cli.py contacts search "John"
```

## 使用示例

用户："检查我的 outlook 邮件"
代理：运行 `mail list --top 10` 命令

用户："我今天有什么会议？"
代理：运行 `calendar list` 命令

用户："向 john@company.com 发送关于项目更新的电子邮件"
代理：使用适当的参数运行 `mail send`

用户："显示我的 OneDrive 文件"
代理：运行 `files list` 命令

用户："添加一个审查预算的任务"
代理：先列出任务列表，然后在适当的列表中创建任务

## 提示

在帮助使用 Microsoft 365 时：
- 对所有操作使用 ms365_cli.py 脚本
- 如果命令失败，先检查身份验证状态
- 如果未登录，引导用户完成设备代码登录
- 对于日历事件，使用 ISO 8601 日期时间格式
- 默认时区是 America/Chicago
- 发送电子邮件时，确认收件人和内容后再发送
- 对于任务，先列出可用的任务列表让用户选择

## 归属

此技能使用 Softeria 的 **ms-365-mcp-server**。
- **NPM 包**: [@softeria/ms-365-mcp-server](https://www.npmjs.com/package/@softeria/ms-365-mcp-server)
- **GitHub**: https://github.com/Softeria/ms-365-mcp-server
- **许可证**: MIT
