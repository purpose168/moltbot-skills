---
name: linkedin-cli
description: 一个类似鸟类的 LinkedIn CLI，用于搜索个人资料、检查消息并使用会话 cookie 汇总动态。
homepage: https://github.com/clawdbot/linkedin-cli
metadata: {"clawdbot":{"emoji":"💼","requires":{"bins":["python3"],"env":["LINKEDIN_LI_AT","LINKEDIN_JSESSIONID"]}}}
---

# LinkedIn CLI (lk)

一个灵感来自 `bird` CLI 的精巧 LinkedIn 命令行工具。它使用会话 cookie 进行身份验证，允许自动化个人资料侦察、动态摘要和消息检查，无需浏览器。

## 设置

1. **提取 Cookie**：在 Chrome/Firefox 中打开 LinkedIn。
2. 转到 **开发者工具 (F12)** -> **应用程序** -> **Cookie** -> `www.linkedin.com`。
3. 复制 `li_at` 和 `JSESSIONID` 的值。
4. 在环境变量中设置它们：
   ```bash
   export LINKEDIN_LI_AT="your_li_at_value"
   export LINKEDIN_JSESSIONID="your_jsessionid_value"
   ```

## 使用方法

- `lk whoami`：显示当前个人资料详情。
- `lk search "查询词"`：按关键词搜索人员。
- `lk profile <公开ID>`：获取特定个人资料的详细摘要。
- `lk feed -n 10`：汇总时间线的前 N 条动态。
- `lk messages`：快速查看最近的对话。
- `lk check`：组合的 whoami 和 messages 检查。

## 依赖项

需要 `linkedin-api` Python 包：
```bash
pip install linkedin-api
```

## 作者
- 由 Fido 🐶 构建
