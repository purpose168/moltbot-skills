---
name: bearblog
description: 在 Bear Blog (bearblog.dev) 上创建和管理博客文章。支持扩展 Markdown、自定义属性和基于浏览器的发布。
metadata: {"clawdbot":{"emoji":"🐻","homepage":"https://bearblog.dev","requires":{"config":["browser.enabled"]}}}
---

# Bear Blog 技能

在 [Bear Blog](https://bearblog.dev) 上创建、编辑和管理文章 — 一个极简、快速的博客平台。

## 身份验证

Bear Blog 需要基于浏览器的身份验证。通过浏览器工具登录一次，Cookie 将保持有效。

```
browser action:navigate url:https://bearblog.dev/accounts/login/
```

## 创建文章

### 步骤 1：导航到文章编辑器

```
browser action:navigate url:https://<子域名>.bearblog.dev/dashboard/post/
```

### 步骤 2：填写编辑器

Bear Blog 使用**纯文本头部格式**——无需 JavaScript DOM 操作！

编辑器有两个文本区域：
- `header_content` — 元数据属性（每行一个）
- `body_content` — 实际的 Markdown 文章内容

**头部格式：**
```
title: 您的文章标题
link: 自定义别名
published_date: 2026-01-05 14:00
tags: 标签1, 标签2, 标签3
make_discoverable: true
is_page: false
class_name: 自定义CSS类
meta_description: 文章的 SEO 描述
meta_image: https://example.com/image.jpg
lang: en
canonical_url: https://原始来源.com/文章
alias: 替代URL
```

**主体格式：** 带有扩展的标准 Markdown（见下文）。

模板中使用分隔符 `___`（三个下划线）将头部与主体分开。

### 步骤 3：发布

点击发布按钮或使用 `publish: true` 提交表单。

## 文章属性参考

| 属性 | 描述 | 示例 |
|------|------|------|
| `title` | 文章标题（必需） | `title: 我的文章` |
| `link` | 自定义 URL 别名 | `link: 我的自定义URL` |
| `published_date` | 发布日期/时间 | `published_date: 2026-01-05 14:30` |
| `tags` | 逗号分隔的标签 | `tags: 技术, 人工智能, 编程` |
| `make_discoverable` | 显示在发现订阅源中 | `make_discoverable: true` |
| `is_page` | 静态页面 vs 博客文章 | `is_page: false` |
| `class_name` | 自定义 CSS 类（短横线分隔） | `class_name: 精选` |
| `meta_description` | SEO 元描述 | `meta_description: 关于...的文章` |
| `meta_image` | Open Graph 图片 URL | `meta_image: https://...` |
| `lang` | 语言代码 | `lang: zh` |
| `canonical_url` | SEO 规范 URL | `canonical_url: https://...` |
| `alias` | 替代 URL 路径 | `alias: 旧URL` |

## 扩展 Markdown

Bear Blog 使用带有插件的 [Mistune](https://github.com/lepture/mistune)：

### 文本格式化
- `~~删除线~~` → ~~删除线~~
- `^上标^` → 上标
- `~下标~` → 下标
- `==高亮==` → 高亮 (mark)
- `**粗体**` 和 `*斜体*` — 标准格式

### 脚注
```markdown
这里有一句带脚注的句子。[^1]

[^1]: 这是脚注内容。
```

### 任务列表
```markdown
- [x] 已完成任务
- [ ] 未完成任务
```

### 表格
```markdown
| 表头 1 | 表头 2 |
|--------|--------|
| 单元格 1 | 单元格 2 |
```

### 代码块
````markdown
```python
def hello():
    print("Hello, world!")
```
````

通过 Pygments 实现语法高亮（在 ``` 后指定语言）。

### 数学公式 (LaTeX)
- 行内: `$E = mc^2$`
- 块级: `$$\int_0^\infty e^{-x^2} dx$$`

### 缩写
```markdown
*[HTML]: 超文本标记语言
HTML 规范由 W3C 维护。
```

### 警告框
```markdown
.. note::
   这是一个提示警告。

.. warning::
   这是一个警告。
```

### 目录
```markdown
.. toc::
```

## 动态变量

在内容中使用 `{{ 变量 }}`：

### 博客变量
- `{{ blog_title }}` — 博客标题
- `{{ blog_description }}` — 博客元描述
- `{{ blog_created_date }}` — 博客创建日期
- `{{ blog_last_modified }}` — 上次修改时间
- `{{ blog_last_posted }}` — 距上次发布的时间
- `{{ blog_link }}` — 完整博客 URL
- `{{ tags }}` — 带链接的渲染标签列表

### 文章变量（在文章模板中）
- `{{ post_title }}` — 当前文章标题
- `{{ post_description }}` — 文章元描述
- `{{ post_published_date }}` — 发布日期
- `{{ post_last_modified }}` — 距修改时间
- `{{ post_link }}` — 完整文章 URL
- `{{ next_post }}` — 下一篇文章链接
- `{{ previous_post }}` — 上一篇文章链接

### 文章列表
```markdown
{{ posts }}
{{ posts limit:5 }}
{{ posts tag:"技术" }}
{{ posts tag:"技术,人工智能" limit:10 order:asc }}
{{ posts description:True image:True content:True }}
```

参数：
- `tag:` — 按标签筛选，逗号分隔
- `limit:` — 最大文章数量
- `order:` — `asc` 或 `desc`（默认：desc）
- `description:True` — 显示元描述
- `image:True` — 显示元图片
- `content:True` — 显示完整内容（仅在页面上）

### 邮件订阅（仅限升级的博客）
```markdown
{{ email-signup }}
{{ email_signup }}
```

## 链接

### 标准链接
```markdown
[链接文本](https://example.com)
[带标题的链接](https://example.com "标题文本")
```

### 在新标签页打开
在 URL 前加上 `tab:`：
```markdown
[外部链接](tab:https://example.com)
```

### 标题锚点
标题自动获得短横线格式的 ID：
```markdown
## 我的章节标题
```
链接到：`#我的章节标题`

## 排版

自动替换：
- `(c)` → ©
- `(C)` → ©
- `(r)` → ®
- `(R)` → ®
- `(tm)` → ™
- `(TM)` → ™
- `(p)` → ℗
- `(P)` → ℗
- `+-` → ±

## 原始 HTML

HTML 可直接在 Markdown 中使用：

```html
<div class="custom-class" style="text-align: center;">
  <p>居中内容，附带自定义样式</p>
</div>
```

**注意：** 对于免费账户，`<script>`、`<object>`、`<embed>`、`<form>` 会被移除。Iframe 白名单（YouTube、Vimeo、Spotify 等）。

## 白名单 Iframe 来源

- youtube.com, youtube-nocookie.com
- vimeo.com
- soundcloud.com
- spotify.com
- codepen.io
- google.com（文档、驱动器、地图）
- bandcamp.com
- apple.com（音乐嵌入）
- archive.org
- 等等...

## 仪表板 URL

将 `<子域名>` 替换为您的博客子域名：

- **博客列表：** `https://bearblog.dev/dashboard/`
- **仪表板：** `https://<子域名>.bearblog.dev/dashboard/`
- **新文章：** `https://<子域名>.bearblog.dev/dashboard/post/`
- **编辑文章：** `https://<子域名>.bearblog.dev/dashboard/post/<uid>/`
- **样式：** `https://<子域名>.bearblog.dev/dashboard/styles/`
- **导航：** `https://<子域名>.bearblog.dev/dashboard/nav/`
- **分析：** `https://<子域名>.bearblog.dev/dashboard/analytics/`
- **设置：** `https://<子域名>.bearblog.dev/dashboard/settings/`

## 示例：完整文章

**头部内容：**
```
title: AI 助手入门指南
link: ai-assistants-intro
published_date: 2026-01-05 15:00
tags: ai, 教程, 技术
make_discoverable: true
is_page: false
meta_description: AI 助手使用初学者指南
lang: en
```

**主体内容：**
```markdown
AI 助手正在改变我们的工作方式。以下是您需要了解的内容。

## 为什么使用 AI 助手？

它们可以帮助：
- [x] 写作和编辑
- [x] 研究和分析
- [ ] 煮咖啡（还没有！）

> "最好的工具是您实际使用的那一个。" — 某位智者

## 入门

查看 [OpenAI](tab:https://openai.com) 或 [Anthropic](tab:https://anthropic.com) 了解热门选择。

---

*您使用 AI 的体验如何？请告诉我！*

{{ previous_post }} {{ next_post }}
```

## 提示

1. **发布前预览** — 使用预览按钮检查格式
2. **使用模板** — 在仪表板设置中设置文章模板以保持一致的头部
3. **定时发布** — 设置未来的 `published_date`
4. **草稿模式** — 不点击发布以保持为草稿
5. **自定义 CSS** — 添加 `class_name` 并在博客 CSS 中设置样式
6. **SEO** — 始终设置 `meta_description` 和 `meta_image`

## 故障排除

- **文章不显示？** 检查 `publish` 状态和 `published_date`
- **标签不工作？** 使用逗号分隔，不加引号
- **样式问题？** 检查 `class_name` 是否为短横线格式（小写、连字符）
- **日期格式错误？** 使用 `YYYY-MM-DD HH:MM`
