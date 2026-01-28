---
name: linkedin
description: 通过浏览器中继或 Cookie 实现 LinkedIn 自动化，用于消息传递、个人资料查看和网络操作。
homepage: https://linkedin.com
metadata: {"clawdbot":{"emoji":"💼"}}
---

# LinkedIn

使用浏览器自动化与 LinkedIn 交互 - 检查消息、查看资料、搜索和发送连接请求。

## 连接方法

### 选项 1：Chrome 扩展中继（推荐）
1. 在 Chrome 中打开 LinkedIn 并登录
2. 点击 Clawdbot Browser Relay 工具栏图标以附加标签页
3. 使用 `browser` 工具和 `profile="chrome"`

### 选项 2：独立浏览器
1. 使用 `browser` 工具和 `profile="clawd"`
2. 导航到 linkedin.com
3. 手动登录（一次性设置）
4. 会话保持以供将来使用

## 常见操作

### 检查连接状态
```
browser action=snapshot profile=chrome targetUrl="https://www.linkedin.com/feed/"
```

### 查看通知/消息
```
browser action=navigate profile=chrome targetUrl="https://www.linkedin.com/messaging/"
browser action=snapshot profile=chrome
```

### 搜索人员
```
browser action=navigate profile=chrome targetUrl="https://www.linkedin.com/search/results/people/?keywords=查询词"
browser action=snapshot profile=chrome
```

### 查看个人资料
```
browser action=navigate profile=chrome targetUrl="https://www.linkedin.com/in/用户名/"
browser action=snapshot profile=chrome
```

### 发送消息（首先与用户确认！）
1. 导航到消息或个人资料
2. 使用 `browser action=act` 配合点击/输入操作
3. 发送前始终确认消息内容

## 安全规则
- **永远不要在没有明确用户批准的情况下发送消息**
- **永远不要在没有确认的情况下接受/发送连接请求**
- **避免快速自动化操作** - LinkedIn 对检测自动化非常激进
- 速率限制：建议最多每小时约 30 次操作

## 会话 Cookie 方法（高级）

如果浏览器中继不可用，从浏览器提取 `li_at` Cookie：
1. 在浏览器中打开 LinkedIn 并登录
2. 开发者工具 → 应用 → Cookie → linkedin.com
3. 复制 `li_at` 值
4. 安全存储以供 API 请求使用

## 故障排除
- 如果已注销：在浏览器中重新身份验证
- 如果被限流：等待 24 小时，减少操作频率
- 如果遇到 CAPTCHA：在浏览器中手动完成，然后继续