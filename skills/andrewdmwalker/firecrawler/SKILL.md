---
name: firecrawl
description: 使用 Firecrawl API 进行网页抓取和爬取。获取网页内容为 Markdown、截取屏幕截图、提取结构化数据、搜索网络以及爬取文档站点。当用户需要抓取 URL、获取当前网络信息、捕获屏幕截图、从页面提取特定数据或爬取框架/库的文档时使用。
version: 1.0.0
author: captmarbles
---

# Firecrawl 网络技能

使用 [Firecrawl](https://firecrawl.dev) 进行网页抓取、搜索和爬取。

## 设置

1. 从 [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) 获取您的 API 密钥
2. 设置环境变量：
   ```bash
   export FIRECRAWL_API_KEY=fc-your-key-here
   ```
3. 安装 SDK：
   ```bash
   pip3 install firecrawl
   ```

## 使用方法

所有命令都使用此技能目录中捆绑的 `fc.py` 脚本。

### 获取页面为 Markdown

获取任意 URL 并转换为干净的 Markdown。处理 JavaScript 渲染的内容。

```bash
python3 fc.py markdown "https://example.com"
python3 fc.py markdown "https://example.com" --main-only  # 跳过导航/页脚
```

### 截取屏幕截图

捕获任意 URL 的全页面屏幕截图。

```bash
python3 fc.py screenshot "https://example.com" -o screenshot.png
```

### 提取结构化数据

使用 JSON 架构从页面拉取特定字段。

**架构示例** (`schema.json`)：
```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "price": { "type": "number" },
    "features": { "type": "array", "items": { "type": "string" } }
  }
}
```

```bash
python3 fc.py extract "https://example.com/product" --schema schema.json
python3 fc.py extract "https://example.com/product" --schema schema.json --prompt "提取主要产品详情"
```

### 网络搜索

搜索网络并从结果中获取内容（可能需要付费层）。

```bash
python3 fc.py search "Python 3.13 新特性" --limit 5
```

### 爬取文档

爬取整个文档站点。非常适合学习新框架。

```bash
python3 fc.py crawl "https://docs.example.com" --limit 30
python3 fc.py crawl "https://docs.example.com" --limit 50 --output ./docs
```

**注意：** 每个页面消耗 1 积分。设置合理的限制。

### 映射站点 URL

在决定抓取之前发现网站上的所有 URL。

```bash
python3 fc.py map "https://example.com" --limit 100
python3 fc.py map "https://example.com" --search "api"
```

## 示例提示

- *"抓取 https://blog.example.com/post 并总结它"*
- *"截取 stripe.com 的屏幕截图"*
- *"从此产品页面提取名称、价格和功能"*
- *"爬取 Astro 文档以便您可以帮助我构建网站"*
- *"映射 docs.stripe.com 上的所有 URL"*

## 定价

免费层包含 500 积分。1 积分 = 1 个页面/屏幕截图/搜索查询。
