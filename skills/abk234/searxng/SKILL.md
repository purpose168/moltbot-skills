---
name: searxng
description: 使用本地SearXNG实例进行尊重隐私的元搜索。无需外部API依赖，即可搜索网络、图片、新闻等。
author: Avinash Venkatswamy
version: 1.0.1
homepage: https://searxng.org
triggers:
  - "搜索"
  - "搜索网络"
  - "查找信息"
  - "查询"
metadata: {"clawdbot":{"emoji":"🔍","requires":{"bins":["python3"]},"config":{"env":{"SEARXNG_URL":{"description":"SearXNG实例URL","default":"http://localhost:8080","required":true}}}}}
---

# SearXNG 搜索

使用您的本地SearXNG实例搜索网络——一个尊重隐私的元搜索引擎。

## 命令

### 网络搜索
```bash
uv run {baseDir}/scripts/searxng.py search "查询"              # 前10个结果
uv run {baseDir}/scripts/searxng.py search "查询" -n 20        # 前20个结果
uv run {baseDir}/scripts/searxng.py search "查询" --format json # JSON输出
```

### 类别搜索
```bash
uv run {baseDir}/scripts/searxng.py search "查询" --category images
uv run {baseDir}/scripts/searxng.py search "查询" --category news
uv run {baseDir}/scripts/searxng.py search "查询" --category videos
```

### 高级选项
```bash
uv run {baseDir}/scripts/searxng.py search "查询" --language en
uv run {baseDir}/scripts/searxng.py search "查询" --time-range day
```

## 配置

**必需：** 设置 `SEARXNG_URL` 环境变量到您的SearXNG实例：

```bash
export SEARXNG_URL=https://your-searxng-instance.com
```

或在您的Clawdbot配置中配置：
```json
{
  "env": {
    "SEARXNG_URL": "https://your-searxng-instance.com"
  }
}
```

默认值（如果未设置）：`http://localhost:8080`

## 特性

- 🔒 **隐私优先**（使用您的本地实例）
- 🌐 **多引擎聚合**
- 📰 **多种搜索类别**
- 🎨 **丰富的格式化输出**
- 🚀 **快速JSON模式用于程序化使用**

## API

使用您的本地SearXNG JSON API端点（默认无需身份验证）。