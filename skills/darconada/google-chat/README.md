# Google Chat 技能

通过 webhook 或 OAuth 2.0 向 Google Chat 空间和用户发送消息。

## 功能

✅ **Webhook 支持** - 发送到预配置的频道（消息显示为配置的机器人）  
✅ **OAuth 支持** - 动态发送到任何空间（消息从您的 Google Chat 应用显示）  
✅ **空间发现** - 列出所有可用的空间和 DM  
✅ **自动表情符号前缀** - OAuth 消息包含 🤖 表情符号（可配置）  
✅ **消息线程** - 支持线程对话

## 快速开始

### Webhook（最快）
```bash
python3 scripts/send_webhook.py "$WEBHOOK_URL" "您的消息"
```

### OAuth（灵活）
```bash
# 首次: 身份验证
python3 scripts/send_oauth.py \
  --credentials oauth-creds.json \
  --token token.json \
  --space "频道名称" \
  "您的消息"

# 列出空间
python3 scripts/send_oauth.py \
  --credentials oauth-creds.json \
  --token token.json \
  --list-spaces
```

## 设置要求

**对于 webhook:**
- 在 Google Chat 空间设置中创建传入 webhook

**对于 OAuth:**
1. Google Cloud Console → 创建 OAuth 2.0 凭据（桌面应用）
2. 启用 Google Chat API
3. 下载凭据 JSON
4. 运行身份验证流程（打开浏览器）

## 配置示例

有关具有多个 webhook 的配置模板，请参阅 `references/config-example.json`。

## 限制

- **OAuth 无法按电子邮件创建新的 DM** - 这是 Google Chat API 限制
- 要通过 OAuth 发送 DM，您需要现有对话的空间 ID
- 使用 `--list-spaces` 发现可用的 DM 空间 ID

## 完整文档

有关完整用法、示例和故障排除，请参阅 `SKILL.md`。

---

**创建日期:** 2026-01-25  
**测试环境:** Google Workspace
