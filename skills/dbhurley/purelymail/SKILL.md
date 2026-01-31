---
name: purelymail
description: 为 Clawdbot 代理设置和测试 PurelyMail 邮件服务。生成配置、测试 IMAP/SMTP 连接、验证收件箱连通性。
homepage: https://purelymail.com
metadata:
  clawdhub:
    emoji: "📬"
    requires:
      bins: ["python3"]
---

# Clawdbot 的 PurelyMail 设置

使用 [PurelyMail](https://purelymail.com) 为你的 Clawdbot 代理设置电子邮件 - 这是一个简单、注重隐私的邮件服务，非常适合代理收件箱。

## 为什么选择 PurelyMail？

- **经济实惠**：约 $10/年，无限地址
- **简单易用**：无冗余功能，专注于邮件本身
- **隐私保护**：基于美国，数据保留最小化
- **可靠性高**：良好的邮件送达率
- **代理友好**：IMAP/SMTP 设置简单

## 快速开始（向导）

最简单的设置方法是使用交互式向导：

```bash
purelymail wizard
```

向导将：
1. ✓ 检查你是否有 PurelyMail 账户
2. ✓ 测试你的 IMAP/SMTP 连接
3. ✓ 生成 clawdbot.json 配置
4. ✓ 可选发送测试邮件

## 手动设置

### 1. 创建 PurelyMail 账户

1. 访问 [purelymail.com](https://purelymail.com) 并注册
2. 添加你的域名（或使用他们的子域名）
3. 为你的代理创建一个邮箱（例如，`agent@yourdomain.com`）
4. 记录密码

### 2. 生成 Clawdbot 配置

```bash
purelymail config --email agent@yourdomain.com --password "YourPassword"
```

输出要添加到你的 `clawdbot.json` 的 JSON：

```json
{
  "skills": {
    "entries": {
      "agent-email": {
        "env": {
          "AGENT_EMAIL": "agent@yourdomain.com",
          "AGENT_EMAIL_PASSWORD": "YourPassword",
          "AGENT_IMAP_SERVER": "imap.purelymail.com",
          "AGENT_SMTP_SERVER": "smtp.purelymail.com"
        }
      }
    }
  }
}
```

### 3. 测试连接

```bash
purelymail test --email agent@yourdomain.com --password "YourPassword"
```

测试 IMAP 和 SMTP 连接。

### 4. 发送测试邮件

```bash
purelymail send-test --email agent@yourdomain.com --password "YourPassword" --to you@example.com
```

### 5. 检查收件箱

```bash
purelymail inbox --email agent@yourdomain.com --password "YourPassword" --limit 5
```

## 命令

| 命令 | 描述 |
|------|------|
| `config` | 生成 clawdbot.json 配置代码段 |
| `test` | 测试 IMAP/SMTP 连接 |
| `send-test` | 发送测试邮件 |
| `inbox` | 列出最近的收件箱消息 |
| `read` | 阅读特定邮件 |
| `setup-guide` | 打印完整设置说明 |

## 环境变量

在 clawdbot.json 中配置后，以下环境变量可用：

- `AGENT_EMAIL` - 邮箱地址
- `AGENT_EMAIL_PASSWORD` - 密码
- `AGENT_IMAP_SERVER` - IMAP 服务器 (imap.purelymail.com)
- `AGENT_SMTP_SERVER` - SMTP 服务器 (smtp.purelymail.com)

## PurelyMail 设置

| 设置 | 值 |
|------|------|
| IMAP 服务器 | `imap.purelymail.com` |
| IMAP 端口 | `993` (SSL) |
| SMTP 服务器 | `smtp.purelymail.com` |
| SMTP 端口 | `465` (SSL) 或 `587` (STARTTLS) |
| 认证 | 邮箱 + 密码 |

## 提示

- 为你的代理使用强且唯一的密码
- 考虑为代理邮件创建专用域名
- PurelyMail 支持捕获所有地址（非常适合路由）
- 在你的 PurelyMail 账户上启用 2FA（为代理使用应用密码）
