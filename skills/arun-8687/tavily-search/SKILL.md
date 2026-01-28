---
name: tavily
description: 通过 Tavily API 进行 AI 优化的网络搜索。为 AI 智能体返回简洁、相关的结果。
homepage: https://tavily.com
metadata: {"clawdbot":{"emoji":"🔍","requires":{"bins":["node"],"env":["TAVILY_API_KEY"]},"primaryEnv":"TAVILY_API_KEY"}}
---

# Tavily 搜索

使用 Tavily API 进行 AI 优化的网络搜索。为 AI 智能体设计 - 返回干净、相关的内容。

## 搜索

```bash
node {baseDir}/scripts/search.mjs "查询词"
node {baseDir}/scripts/search.mjs "查询词" -n 10
node {baseDir}/scripts/search.mjs "查询词" --deep
node {baseDir}/scripts/search.mjs "查询词" --topic news
```

## 选项

- `-n <数量>`: 结果数量（默认：5，最大：20）
- `--deep`: 使用高级搜索进行更深入的研究（较慢，但更全面）
- `--topic <主题>`: 搜索主题 - `general`（默认）或 `news`
- `--days <n>`: 对于新闻主题，限制为最近 n 天

## 从 URL 提取内容

```bash
node {baseDir}/scripts/extract.mjs "https://example.com/article"
```

## 注意事项

- 需要从 https://tavily.com 获取 `TAVILY_API_KEY`
- Tavily 针对 AI 进行了优化 - 返回干净、相关的摘要
- 对于复杂的研究问题使用 `--deep`
- 对于时事使用 `--topic news`
