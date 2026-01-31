---
name: bbc-news
description: 通过 RSS 订阅获取并显示来自各个部分和地区的 BBC 新闻报道。当用户询问 BBC 新闻、英国新闻头条、来自 BBC 的世界新闻或来自特定 BBC 部分的新闻（技术、商业、政治、科学、健康、娱乐、英国地区新闻或世界地区）时使用。
---

# BBC 新闻

获取来自不同部分和地区的 BBC 新闻头条。

## 快速开始

获取头条新闻：
```bash
python3 scripts/bbc_news.py
```

从特定部分获取：
```bash
python3 scripts/bbc_news.py uk
python3 scripts/bbc_news.py world
python3 scripts/bbc_news.py technology
```

列出所有可用部分：
```bash
python3 scripts/bbc_news.py --list
```

## 可用部分

### 主要部分
- `top` - 头条新闻（默认）
- `uk` - 英国新闻
- `world` - 世界新闻
- `business` - 商业新闻
- `politics` - 政治
- `health` - 健康新闻
- `education` - 教育
- `science` - 科学与环境
- `technology` - 技术新闻
- `entertainment` - 娱乐与艺术

### 英国地区
- `england` - 英格兰新闻
- `scotland` - 苏格兰新闻
- `wales` - 威尔士新闻
- `northern-ireland` - 北爱尔兰新闻

### 世界地区
- `africa` - 非洲新闻
- `asia` - 亚洲新闻
- `australia` - 澳大利亚新闻
- `europe` - 欧洲新闻
- `latin-america` - 拉丁美洲新闻
- `middle-east` - 中东新闻
- `us-canada` - 美国和加拿大新闻

## 选项

**限制新闻数量：**
```bash
python3 scripts/bbc_news.py world --limit 5
```

**JSON 输出：**
```bash
python3 scripts/bbc_news.py technology --json
```

## 示例

获取英国前 5 条新闻：
```bash
python3 scripts/bbc_news.py uk --limit 5
```

获取苏格兰新闻（JSON 格式）：
```bash
python3 scripts/bbc_news.py scotland --json
```

获取最新技术头条：
```bash
python3 scripts/bbc_news.py technology --limit 3
```

## 依赖

需要 `feedparser`：
```bash
pip3 install feedparser
```

## 资源

### scripts/bbc_news.py
Python 命令行工具，用于从 RSS 订阅获取并显示 BBC 新闻报道。支持所有主要的 BBC 部分和地区，具有文本和 JSON 输出格式。

### references/feeds.md
按部分和地区组织的完整 BBC 新闻 RSS 订阅 URL 列表。
