# BBC 新闻技能

一个 Clawdbot 技能，用于通过 RSS 订阅获取来自各个部分和地区的 BBC 新闻报道。

## 功能

- 📰 **多个部分**：头条新闻、英国、世界、商业、政治、健康、教育、科学、技术、娱乐
- 🌍 **英国地区新闻**：英格兰、苏格兰、威尔士、北爱尔兰
- 🗺️ **世界地区**：非洲、亚洲、澳大利亚、欧洲、拉丁美洲、中东、美国和加拿大
- 📊 **灵活输出**：文本或 JSON 格式
- ⚙️ **可定制**：限制新闻数量

## 安装

### 通过 ClawdHub

```bash
clawdhub install bbc-news
```

### 手动安装

```bash
# 克隆仓库
git clone https://github.com/ddrayne/bbc-news-skill.git ~/.clawdbot/skills/bbc-news

# 安装依赖
pip3 install feedparser
```

## 使用

### 与 Clawdbot 一起使用

向您的代理询问：
- "最新的 BBC 新闻是什么？"
- "给我展示来自 BBC 的英国技术新闻"
- "获取苏格兰前 5 条新闻"

### 直接使用脚本

```bash
# 头条新闻（默认）
python3 ~/.clawdbot/skills/bbc-news/scripts/bbc_news.py

# 特定部分
python3 ~/.clawdbot/skills/bbc-news/scripts/bbc_news.py technology

# 限制结果
python3 ~/.clawdbot/skills/bbc-news/scripts/bbc_news.py uk --limit 5

# JSON 输出
python3 ~/.clawdbot/skills/bbc-news/scripts/bbc_news.py world --json

# 列出所有部分
python3 ~/.clawdbot/skills/bbc-news/scripts/bbc_news.py --list
```

## 可用部分

### 主要部分
`top`, `uk`, `world`, `business`, `politics`, `health`, `education`, `science`, `technology`, `entertainment`

### 英国地区
`england`, `scotland`, `wales`, `northern-ireland`

### 世界地区
`africa`, `asia`, `australia`, `europe`, `latin-america`, `middle-east`, `us-canada`

## 依赖

- Python 3
- feedparser (`pip3 install feedparser`)

## 许可证

MIT
