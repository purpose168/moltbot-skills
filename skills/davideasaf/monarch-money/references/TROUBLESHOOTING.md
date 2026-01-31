# 故障排除指南

## 目录

- [认证问题](#认证问题)
- [MFA 问题](#mfa-问题)
- [API 错误](#api-错误)
- [会话问题](#会话问题)
- [CLI 问题](#cli-问题)

## 认证问题

### "未登录" 错误

**原因：** 不存在有效的会话。

**解决方案：**
```bash
monarch-money auth login
```

### "无效凭据" 错误

**原因：** 邮箱或密码不正确。

**解决方案：**
1. 验证凭据在 https://app.monarchmoney.com 上是否有效
2. 检查环境变量中的拼写错误
3. 确保密码不包含 Shell 特殊字符（使用引号）

```bash
export MONARCH_PASSWORD='pa$$word!with@special#chars'
```

### 之前工作正常，现在出现 "认证失败" 错误

**原因：** 会话过期或 Monarch Money 使其失效。

**解决方案：**
```bash
monarch-money auth logout
monarch-money auth login
```

## MFA 问题

### "需要 MFA 代码" 错误

**原因：** `MONARCH_MFA_SECRET` 未设置或无效。

**解决方案：**

1. **获取 MFA 密钥：**
   - 登录 https://app.monarchmoney.com
   - 设置 > 安全 > 双因素认证
   - 禁用并重新启用 MFA
   - 点击 "无法扫描？查看设置密钥"
   - 复制 base32 字符串（如 `JBSWY3DPEHPK3PXP`）

2. **设置环境变量：**
   ```bash
   export MONARCH_MFA_SECRET="YOUR_SECRET_HERE"
   ```

### "MFA 代码已过期" 或 "无效 MFA 代码"

**原因：** 系统时钟不同步。TOTP 代码对时间敏感（30 秒窗口）。

**解决方案：**

1. **同步系统时钟：**
   ```bash
   # macOS/Linux
   sudo ntpdate -s time.apple.com

   # 检查当前时间
   date
   ```

2. **验证密钥是否正确：**
   - 密钥应该是 base32 字符串（字母 A-Z 和数字 2-7）
   - 它不应该是来自身份验证应用的 6 位代码
   - 有效密钥示例：`JBSWY3DPEHPK3PXP`

### MFA 密钥 vs MFA 代码

| 项目 | 格式 | 示例 | 用途 |
|------|------|------|------|
| MFA 密钥 | Base32 字符串 | `JBSWY3DPEHPK3PXP` | 设置为 `MONARCH_MFA_SECRET` |
| MFA 代码 | 6 位数字 | `123456` | 在应用中手动输入 |

CLI 需要 **密钥** 来自动生成代码。如果您只有 6 位代码，需要在 Monarch Money 设置中重新生成 MFA。

## API 错误

### 400 Bad Request

**原因：** 查询或变更无效。

**解决方案：**
1. 检查交易/分类 ID 是否为有效 UUID
2. 验证提供了所有必填字段
3. 检查金额格式（支出为负数）

### 401 Unauthorized

**原因：** 会话令牌无效或已过期。

**解决方案：**
```bash
monarch-money auth logout
monarch-money auth login
```

### 429 Too Many Requests

**原因：** 超出速率限制。

**解决方案：** 等待并重试。客户端内置了速率限制，但快速的脚本调用仍可能触发限制。

### 500 Internal Server Error

**原因：** Monarch Money API 问题。

**解决方案：**
1. 等待并重试
2. 检查 https://status.monarchmoney.com 查看是否有系统中断
3. 尝试使用较小的请求（较少的交易）

### 525 SSL Handshake Failed

**原因：** Cloudflare 保护或网络问题。

**解决方案：**
1. 等待 1-2 分钟并重试
2. 检查网络连接
3. 尝试从不同网络连接

## 会话问题

### 会话文件位置

会话存储在：`~/.mm/session.json`

### 损坏的会话文件

**症状：** 意外错误，部分登录

**解决方案：**
```bash
# 删除会话文件
rm ~/.mm/session.json

# 重新认证
monarch-money auth login
```

### 权限错误

**原因：** 会话目录权限错误。

**解决方案：**
```bash
chmod 700 ~/.mm
chmod 600 ~/.mm/session.json
```

## CLI 问题

### "command not found: monarch-money"

**原因：** CLI 未安装或不在 PATH 中。

**解决方案：**

1. **全局安装：**
   ```bash
   npm install -g monarch-money
   ```

2. **或使用 npx：**
   ```bash
   npx monarch-money doctor
   ```

3. **检查 npm bin 目录是否在 PATH 中：**
   ```bash
   npm bin -g
   # 将此路径添加到您的 Shell 配置文件
   ```

### Node.js 版本错误

**原因：** Node.js < 18

**解决方案：**
```bash
# 检查版本
node --version

# 使用 nvm 安装 Node 18+
nvm install 18
nvm use 18
```

### JSON 输出无法解析

**原因：** 错误消息与 JSON 输出混合。

**解决方案：** 错误输出到 stderr，JSON 输出到 stdout。分别捕获：

```bash
monarch-money tx list --limit 5 2>/dev/null | jq .
```

## 诊断命令

### 完整系统检查

```bash
monarch-money doctor
```

### 检查环境变量

```bash
echo "Email: ${MONARCH_EMAIL:-(not set)}"
echo "Password: ${MONARCH_PASSWORD:+set}"
echo "MFA: ${MONARCH_MFA_SECRET:+set}"
```

### 测试 API 连接

```bash
curl -s -o /dev/null -w "%{http_code}" https://api.monarch.com/graphql
# 应该返回 401（需要认证），而不是 5xx（服务器错误）
```

### 详细日志

设置调试环境变量以获取更多输出：

```bash
DEBUG=monarch* monarch-money tx list --limit 1
```