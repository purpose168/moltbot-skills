# Bear Blog 浏览器 API 参考

通过 Clawdbot 的浏览器工具与 Bear Blog 交互的完整参考。

## 前置条件

1. 启用浏览器：`DISPLAY=:99` 在 `~/.clawdbot/.env` 中
2. 启动浏览器：`POST http://127.0.0.1:18791/start`
3. 已登录（会话保存在 Cookie 中）

## 身份验证

### 登录
```bash
# 导航到登录页面
POST /navigate {"url": "https://bearblog.dev/accounts/login/"}

# 填写凭据（使用快照获取引用）
POST /act {"kind": "fill", "fields": [
  {"ref": "emailRef", "type": "text", "value": "email@example.com"}
]}
POST /act {"kind": "fill", "fields": [
  {"ref": "passwordRef", "type": "text", "value": "password"}
]}

# 点击提交
POST /act {"kind": "click", "ref": "submitButtonRef"}
```

## 文章操作

### 创建文章

Bear Blog 使用：
- `div#header_content`（可编辑）— 属性显示和输入（ref=e14）
- `input#hidden_header_content`（隐藏）— 提交时由 JS 自动填充
- `textarea#body_content` — 文章内容（ref=e15）

**好消息：** Playwright 的 `fill` 适用于 `[contenteditable]` 元素！
您可以**仅使用 `fill`** 创建文章，无需 `evaluate`。

```bash
# 导航到新文章页面
POST /navigate {"url": "https://bearblog.dev/<子域名>/dashboard/posts/new/"}

# 获取快照以确认引用（通常 e14=头部，e15=主体，e10=发布）
GET /snapshot

# 填写头部（可编辑 div）- 换行符有效！
POST /act {
  "kind": "fill",
  "fields": [{"ref": "e14", "type": "text", "value": "title: 我的文章\nlink: 我的别名\ntags: 标签1, 标签2\nmake_discoverable: true"}]
}

# 填写主体（textarea）
POST /act {
  "kind": "fill",
  "fields": [{"ref": "e15", "type": "text", "value": "# 内容\n\n这里写 Markdown..."}]
}

# 点击发布
POST /act {"kind": "click", "ref": "e10"}

# 发布
POST /act {
  "kind": "evaluate",
  "fn": "() => { document.getElementById('publish-button').click(); return 'published'; }"
}
```

### 编辑文章

```bash
# 导航到编辑页面
POST /navigate {"url": "https://bearblog.dev/<子域名>/dashboard/posts/<uid>/"}

# 读取当前内容
POST /act {
  "kind": "evaluate",
  "fn": "() => ({
    header: document.getElementById('header_content').innerText,
    body: document.getElementById('body_content').value
  })"
}

# 更新内容
POST /act {
  "kind": "evaluate",
  "fn": "() => {
    document.getElementById('body_content').value = '更新内容...';
    return 'updated';
  }"
}

# 保存（点击发布）
POST /act {
  "kind": "evaluate",
  "fn": "() => { document.getElementById('publish-button').click(); return 'saved'; }"
}
```

### 列出文章

```bash
# 导航到文章列表
POST /navigate {"url": "https://bearblog.dev/<子域名>/dashboard/posts/"}

# 获取所有文章
POST /act {
  "kind": "evaluate",
  "fn": "() => Array.from(document.querySelectorAll('a'))
    .filter(a => a.href.includes('/dashboard/posts/') && a.href.length > 45)
    .map(a => ({title: a.innerText, href: a.href}))"
}
```

### 删除文章

```bash
# 导航到文章编辑页面
POST /navigate {"url": "https://bearblog.dev/<子域名>/dashboard/posts/<uid>/"}

# 覆盖确认并点击删除
POST /act {
  "kind": "evaluate",
  "fn": "() => {
    window.confirm = () => true;
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.innerText.toLowerCase() === 'delete');
    if (btn) { btn.click(); return 'deleted'; }
    return 'not found';
  }"
}
```

### 存为草稿

```bash
POST /act {
  "kind": "evaluate",
  "fn": "() => { document.getElementById('save-button').click(); return 'saved as draft'; }"
}
```

### 取消发布

```bash
# 查找并点击取消发布按钮（仅在已发布的文章上可见）
POST /act {
  "kind": "evaluate",
  "fn": "() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.innerText.toLowerCase().includes('unpublish'));
    if (btn) { btn.click(); return 'unpublished'; }
    return 'not found';
  }"
}
```

## 头部属性参考

```
title: 文章标题
link: 自定义别名
alias: 旧URL重定向
canonical_url: https://原始来源.com/文章
published_date: 2026-01-05 15:30
is_page: false
meta_description: SEO 描述
meta_image: https://example.com/image.jpg
lang: en
tags: 标签1, 标签2, 标签3
make_discoverable: true
```

## 提示

1. **一切都使用 `fill`**：Playwright 支持 `[contenteditable]` 上的 `fill` - 无需 `evaluate`！
2. **换行符有效**：`fill` 在可编辑区和 textarea 中都能正确处理 `\n`
3. **导航后检查引用**：像 e14、e15 这样的引用通常稳定，但请用 `GET /snapshot` 验证
4. **确认对话框**：在点击删除前通过 `evaluate` 覆盖 `window.confirm`
5. **截图**：使用 `POST /screenshot` 调试视觉状态
6. **缓存问题**：浏览器可能缓存 404 - 如需要使用 `location.reload(true)`

## 常见问题

- **属性不保存**：确保您填写的是可编辑 div（e14），而不是隐藏字段
- **删除不工作**：必须通过 `evaluate` 覆盖 `window.confirm`
- **登录循环**：检查 Cookie 是否保持（浏览器配置）
- **子域名 URL 404**：使用 bearblog.dev/<子域名>/dashboard/... 格式
- **发布后 404**：浏览器缓存 - 等一会儿或硬刷新
