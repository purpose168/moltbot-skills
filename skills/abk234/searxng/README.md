# Clawdbot 的 SearXNG 搜索技能

使用您的本地SearXNG实例进行尊重隐私的网络搜索。

## 先决条件

**此技能需要一个正在运行的SearXNG实例。**

如果您还没有设置SearXNG：

1. **Docker（最简单）**：
   ```bash
   docker run -d -p 8080:8080 searxng/searxng
   ```

2. **手动安装**：遵循[官方指南](https://docs.searxng.org/admin/installation.html)

3. **公共实例**：使用任何公共SearXNG实例（隐私较少）

## 特性

- 🔒 **隐私优先**：使用您的本地SearXNG实例
- 🌐 **多引擎**：聚合多个搜索引擎的结果
- 📰 **多种类别**：网络、图片、新闻、视频等
- 🎨 **丰富的输出**：带有结果片段的精美表格格式
- 🚀 **快速JSON模式**：用于脚本和集成的程序化访问

## 快速开始

### 基本搜索
```
搜索 "python 异步教程"
```

### 高级用法
```
搜索 "气候变化" 显示20个结果
搜索 "可爱猫咪" 在图片类别
搜索 "突发新闻" 在新闻类别中，从昨天开始
```

## 配置

**在使用此技能之前，您必须配置您的SearXNG实例URL。**

### 设置您的SearXNG实例

在您的Clawdbot配置中配置 `SEARXNG_URL` 环境变量：

```json
{
  "env": {
    "SEARXNG_URL": "https://your-searxng-instance.com"
  }
}
```

或在您的shell中导出：
```bash
export SEARXNG_URL=https://your-searxng-instance.com
```

## 直接 CLI 使用

您也可以直接从命令行使用此技能：

```bash
# 基本搜索
uv run ~/clawd/skills/searxng/scripts/searxng.py search "查询"

# 更多结果
uv run ~/clawd/skills/searxng/scripts/searxng.py search "查询" -n 20

# 类别搜索
uv run ~/clawd/skills/searxng/scripts/searxng.py search "查询" --category images

# JSON输出（用于脚本）
uv run ~/clawd/skills/searxng/scripts/searxng.py search "查询" --format json

# 按时间过滤的新闻
uv run ~/clawd/skills/searxng/scripts/searxng.py search "最新AI新闻" --category news --time-range day
```

## 可用类别

- `general` - 一般网络搜索（默认）
- `images` - 图片搜索
- `videos` - 视频搜索
- `news` - 新闻文章
- `map` - 地图和位置
- `music` - 音乐和音频
- `files` - 文件下载
- `it` - IT和编程
- `science` - 科学论文和资源

## 时间范围

按时间筛选结果：
- `day` - 最近24小时
- `week` - 最近7天
- `month` - 最近30天
- `year` - 最近一年

## 示例

### 网络搜索
```bash
uv run ~/clawd/skills/searxng/scripts/searxng.py search "rust 编程语言"
```

### 图片搜索
```bash
uv run ~/clawd/skills/searxng/scripts/searxng.py search "日落摄影" --category images -n 10
```

### 最新新闻
```bash
uv run ~/clawd/skills/searxng/scripts/searxng.py search "科技新闻" --category news --time-range day
```

### 用于脚本的JSON输出
```bash
uv run ~/clawd/skills/searxng/scripts/searxng.py search "python 技巧" --format json | jq '.results[0]'
```

## SSL/TLS 说明

此技能配置为与自签名证书配合使用（本地SearXNG实例常见）。如果您需要严格的SSL验证，请编辑脚本并将httpx请求中的 `verify=False` 改为 `verify=True`。

## 故障排除

### 连接问题

如果您遇到连接错误：

1. **检查您的SearXNG实例是否正在运行：**
   ```bash
   curl -k $SEARXNG_URL
   # 或者：curl -k http://localhost:8080（默认值）
   ```

2. **验证配置中的URL**
3. **检查SSL证书问题**

### 无结果

如果搜索没有返回结果：

1. 检查您的SearXNG实例配置
2. 确保在SearXNG设置中启用了搜索引擎
3. 尝试不同的搜索类别

## 隐私优势

- **无跟踪**：所有搜索都通过您的本地实例
- **无数据收集**：结果在本地聚合
- **引擎多样性**：结合多个搜索提供商的结果
- **完全控制**：您管理SearXNG实例

## 关于 SearXNG

SearXNG是一个免费的、开源的元搜索引擎，尊重您的隐私。它在不存储您的搜索数据的情况下聚合多个搜索引擎的结果。

了解更多：https://docs.searxng.org/

## 许可证

此技能是Clawdbot生态系统的一部分，遵循相同的许可条款。