# Bear Blog 文章工作流程

使用 Clawdbot 的浏览器工具创建文章的步骤工作流程。

## 前置条件

1. 配置中启用了浏览器工具
2. 已登录 Bear Blog（会话 Cookie 保持有效）

## 工作流程

### 1. 检查登录状态

```
browser action:navigate url:https://bearblog.dev/dashboard/
browser action:snapshot
```

如果未登录，您将看到登录页面。

### 2. 登录（如需要）

```
browser action:navigate url:https://bearblog.dev/accounts/login/
browser action:type selector:"input[name='login']" text:"your@email.com"
browser action:type selector:"input[name='password']" text:"yourpassword"
browser action:click selector:"button[type='submit']"
```

### 3. 导航到新文章

```
browser action:navigate url:https://<子域名>.bearblog.dev/dashboard/post/
browser action:snapshot
```

### 4. 填写头部内容

头部文本区域的 ID 是 `header_content`：

```
browser action:type selector:"#header_content" text:"title: 我的文章标题
link: 我的文章别名
published_date: 2026-01-05 15:00
tags: 示例, 测试
make_discoverable: true
meta_description: 一篇测试文章"
```

### 5. 填写主体内容

主体文本区域的 ID 是 `body_content`：

```
browser action:type selector:"#body_content" text:"# 您好世界

这是我的文章内容。

## 第一章

一些内容在这里。

---

*感谢阅读！*"
```

### 6. 预览（可选）

```
browser action:click selector:"#preview-button"
browser action:snapshot
```

### 7. 发布

```
browser action:click selector:"#publish-button"
browser action:snapshot
```

## 注意事项

- 确切的选择器可能会变化；使用 `browser action:snapshot` 检查页面
- 对于草稿，跳过发布步骤
- 会话在浏览器操作之间保持有效
