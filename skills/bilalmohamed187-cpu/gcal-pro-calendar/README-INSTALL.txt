=====================================
 gcal-pro - Clawdbot 的 Google 日历技能
 安装指南
=====================================

感谢您购买 gcal-pro！

系统要求
--------
- 已安装 Clawdbot（https://clawd.bot）
- Python 3.11 或更高版本
- Google 账户

快速安装（5 分钟）
------------------

1. 将压缩包解压到您的 Clawdbot skills 文件夹或任何位置

2. 安装 Python 依赖：
   pip install -r requirements.txt

3. 设置 Google Calendar API（一次性操作）：
   - 访问 https://console.cloud.google.com
   - 创建一个名为 "gcal-pro" 的新项目
   - 启用 "Google Calendar API"
   - 转到 API 和服务 > OAuth 同意屏幕
   - 选择 "外部"，填写应用名称和邮箱
   - 添加权限范围：calendar.readonly 和 calendar.events
   - 将您自己添加为测试用户
   - 转到凭据 > 创建凭据 > OAuth 客户端 ID
   - 选择 "桌面应用"，下载 JSON 文件
   - 保存为：~/.config/gcal-pro/client_secret.json

4. 进行身份验证：
   python scripts/gcal_auth.py auth
   （浏览器将打开 - 使用 Google 账号登录）

5. 激活您的专业版许可证：
   python scripts/gcal_license.py activate --key 您的许可证密钥

6. 测试安装：
   python scripts/gcal_core.py today
   python scripts/gcal_core.py brief

与 Clawdbot 配合使用
--------------------
只需自然对话：
- "我今天日历上有什么？"
- "周五中午安排与 Alex 的午餐"
- "删除我下午 3 点的会议"
- "这周我什么时候有空？"

技术支持
--------
遇到问题？请发送邮件至：[您的邮箱]
文档：请参阅 SKILL.md 获取完整文档

=====================================
