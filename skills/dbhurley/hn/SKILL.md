---
name: hn
description: 浏览 Hacker News - 热门故事、最新、最佳、问答、展示、工作，以及带有评论的故事详情。
homepage: https://news.ycombinator.com
metadata: {"clawdis":{"emoji":"📰","requires":{"bins":["curl"]}}}
---

# Hacker News

从命令行阅读 Hacker News。

## 命令

### 热门故事
```bash
uv run {baseDir}/scripts/hn.py top          # 前 10 个故事
uv run {baseDir}/scripts/hn.py top -n 20    # 前 20 个故事
```

### 其他 feeds
```bash
uv run {baseDir}/scripts/hn.py new          # 最新故事
uv run {baseDir}/scripts/hn.py best         # 最佳故事
uv run {baseDir}/scripts/hn.py ask          # 问答 HN
uv run {baseDir}/scripts/hn.py show         # 展示 HN
uv run {baseDir}/scripts/hn.py jobs         # 工作
```

### 故事详情
```bash
uv run {baseDir}/scripts/hn.py story <id>              # 带有顶部评论的故事
uv run {baseDir}/scripts/hn.py story <id> --comments 20 # 更多评论
```

### 搜索
```bash
uv run {baseDir}/scripts/hn.py search "AI agents"      # 搜索故事
uv run {baseDir}/scripts/hn.py search "Claude" -n 5    # 限制结果数量
```

## API

使用官方的 [Hacker News API](https://github.com/HackerNews/API)（无需认证）。
