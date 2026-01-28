---
name: news-aggregator-skill
description: "综合新闻聚合器，从 8 大主流平台获取、筛选和深度分析实时内容：Hacker News、GitHub Trending、Product Hunt、36Kr、腾讯新闻、华尔街见闻、V2EX 和微博。适用于'每日扫描'、'科技新闻简报'、'金融资讯'和热门话题的'深度解读'。"
---

# 新闻聚合技能

从多个来源获取实时热门新闻。

## 工具

### fetch_news.py

**使用方法：**

```bash
### 单个来源（限制 10 条）
```

```bash
### 全局扫描（选项 12）- **广泛获取策略**
> **注意**：此策略专门用于"全局扫描"场景，我们希望捕捉所有趋势。

```bash
# 1. 广泛获取（为语义筛选准备海量池）
python3 scripts/fetch_news.py --source all --limit 15 --deep

# 2. 语义筛选：
# 代理手动筛选广泛列表（约 120 条）以找到用户关注的主题。
```

### 单个来源和组合（智能关键词扩展）
**关键**：您必须自动扩展用户的简单关键词以覆盖整个领域。
*   用户："AI" -> 代理使用：`--keyword "AI,LLM,GPT,Claude,Generative,Machine Learning,RAG,Agent"`
*   用户："Android" -> 代理使用：`--keyword "Android,Kotlin,Google,Mobile,App"`
*   用户："Finance" -> 代理使用：`--keyword "Finance,Stock,Market,Economy,Crypto,Gold"`

```bash
# 示例：用户询问"HN 上的 AI 新闻"（注意扩展的关键词）
python3 scripts/fetch_news.py --source hackernews --limit 20 --keyword "AI,LLM,DeepSeek,Agent" --deep
```

### 特定关键词搜索
仅对非常具体、独特的术语使用 `--keyword`（例如 "DeepSeek"、"OpenAI"）。
```bash
python3 scripts/fetch_news.py --source all --limit 10 --keyword "DeepSeek" --deep
```

**参数说明：**

- `--source`：来源之一 `hackernews`、`weibo`、`github`、`36kr`、`producthunt`、`v2ex`、`tencent`、`wallstreetcn`、`all`。
- `--limit`：每个来源的最大条目数（默认 10）。
- `--keyword`：逗号分隔的筛选器（例如 "AI,GPT"）。
- `--deep`：**【新增】** 启用深度获取。下载并提取文章的主要文本内容。

**输出：**
JSON 数组。如果使用 `--deep`，条目将包含与文章文本关联的 `content` 字段。

## 交互式菜单

当用户说 **"news-aggregator-skill 如意如意"**（或类似的"菜单/帮助"触发词）时：
1.  **读取**技能目录中的 `templates.md` 内容。
2.  **展示**可用命令列表给用户，完全按照文件中的显示。
3.  **引导**用户选择数字或复制命令执行。

### 智能时间筛选和报告（关键）
如果用户请求特定时间窗口（例如"过去 X 小时"）且结果稀疏（< 5 条）：
1.  **优先用户窗口**：首先，列出所有严格在用户请求时间范围内的条目（时间 < X）。
2.  **智能填充**：如果列表很短，您必须包含来自更广范围（例如过去 24 小时）的高价值/高热度项目，以确保报告提供至少 5 个有意义的见解。
3.  **标注**：清楚标记这些较旧的条目（例如"⚠️ 18 小时前"、"🔥 24 小时热度"），让用户知道它们是补充内容。
4.  **高价值项目**：始终优先考虑"SOTA"、"重大发布"或"高热度"项目，即使它们稍微超出时间窗口。
5.  **GitHub Trending 异常**：对于纯列表来源（如 **GitHub Trending**），严格返回获取列表中的有效条目（例如前 10 名）。**列出所有获取的条目**。不要执行"智能填充"。
    *   **深度分析（必需）**：对于**每个**项目，您**必须**利用 AI 能力分析：
        *   **核心价值（Core Value）**：它解决了什么问题？为什么会热门？
        *   **启发思考（Inspiration）**：可以得出什么技术或产品见解？
        *   **场景标签（Scenarios）**：3-5 个关键词（例如 `#RAG #LocalFirst #Rust`）。

### 6. 响应指南（关键）

**格式与风格：**
- **语言**：简体中文。
- **风格**：杂志/简报风格（例如"经济学人"或"Morning Brew"的感觉）。专业、简洁、有吸引力。
- **结构**：
    - **全球头条**：跨所有领域最重要的 3-5 条故事。
    - **科技与 AI**：AI、LLM 和 Tech 的专门部分。
    - **金融/社交**：其他强相关类别（如果相关）。
- **条目格式**：
    - **标题**：**必须是 Markdown 链接**指向原始 URL。
        - ✅ 正确：`### 1. [OpenAI 发布 GPT-5](https://...)`
        - ❌ 错误：`### 1. OpenAI 发布 GPT-5`
    - **元数据行**：必须包含来源、**时间/日期**和热度/分数。
    - **一句话总结**：有力、明确的"所以呢？"总结。
    - **深度解读（项目符号）**：2-3 个要点解释为什么这很重要、技术细节或上下文。（"深度扫描"必需）

**输出产物：**
- 始终将完整报告保存到 `reports/` 目录，使用带时间戳的文件名（例如 `reports/hn_news_YYYYMMDD_HHMM.md`）。
- 在聊天中向用户展示完整报告内容。
