---
name: seo-dataforseo
description: "使用 DataForSEO API 进行 SEO 关键词研究。执行关键词分析、YouTube 关键词研究、竞争对手分析、SERP 分析和趋势跟踪。当用户要求：研究关键词、分析搜索量/CPC/竞争、查找关键词建议、检查关键词难度、分析竞争对手、获取热门话题、进行 YouTube SEO 研究或优化着陆页关键词时使用。需要 DataForSEO API 账户和 .env 文件中的凭据。"
---

# SEO 关键词研究（DataForSEO）

## 设置

安装依赖项：

```bash
pip install -r scripts/requirements.txt
```

通过在项目根目录创建 `.env` 文件来配置凭据：

```
DATAFORSEO_LOGIN=your_email@example.com
DATAFORSEO_PASSWORD=your_api_password
```

从以下位置获取凭据：https://app.dataforseo.com/api-access

## 快速开始

| 用户说 | 要调用的函数 |
|-----------|-----------------|
| "研究 [主题] 的关键词" | `keyword_research("topic")` |
| "[想法] 的 YouTube 关键词数据" | `youtube_keyword_research("idea")` |
| "分析竞争对手 [domain.com]" | `competitor_analysis("domain.com")` |
| "现在有什么热门？" | `trending_topics()` |
| "[列表] 的关键词分析" | `full_keyword_analysis(["kw1", "kw2"])` |
| "[主题] 的着陆页关键词" | `landing_page_keyword_research(["kw1"], "competitor.com")` |

通过从 `scripts/main.py` 导入来执行函数：

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path("scripts")))
from main import *

result = keyword_research("AI website builders")
```

## 工作流程模式

每个研究任务都遵循三个阶段：

### 1. 研究
运行 API 函数。每次函数调用都会访问 DataForSEO API 并返回结构化数据。

### 2. 自动保存
所有结果会自动保存到 `results/{category}/` 目录下带时间戳的 JSON 文件。文件命名模式：`YYYYMMDD_HHMMSS__operation__keyword__extra_info.json`

### 3. 总结
研究后，读取保存的 JSON 文件并在 `results/summary/` 中创建包含数据表、排名机会和战略建议的 markdown 摘要。

## 高层函数

这些是 `scripts/main.py` 中的主要函数。每个函数协调多个 API 调用以完成完整的研究工作流程。

| 函数 | 用途 | 收集内容 |
|----------|---------|----------------|
| `keyword_research(keyword)` | 单个关键词深入分析 | 概述、建议、相关关键词、难度 |
| `youtube_keyword_research(keyword)` | YouTube 内容研究 | 概述、建议、YouTube SERP 排名、YouTube 趋势 |
| `landing_page_keyword_research(keywords, competitor_domain)` | 着陆页 SEO | 概述、意图、难度、SERP 分析、竞争对手关键词 |
| `full_keyword_analysis(keywords)` | 战略内容规划 | 概述、难度、意图、关键词创意、历史搜索量、Google 趋势 |
| `competitor_analysis(domain, keywords)` | 竞争对手情报 | 域名关键词、Google Ads 关键词、竞争对手域名 |
| `trending_topics(location_name)` | 当前趋势 | 当前热门搜索 |

### 参数

所有函数都接受可选的 `location_name` 参数（默认值："United States"）。大多数函数也有布尔标志来跳过特定的子分析（例如 `include_suggestions=False`）。

### 单独的 API 函数

要进行细粒度控制，请从 API 模块导入特定函数。请参阅 [references/api-reference.md](references/api-reference.md) 获取包含参数、限制和示例的 25 个 API 函数的完整列表。

## 结果存储

结果自动保存到 `results/`，结构如下：

```
results/
├── keywords_data/    # 搜索量、CPC、竞争
├── labs/             # 建议、难度、意图
├── serp/             # Google/YouTube 排名
├── trends/           # Google 趋势数据
└── summary/          # 人类可读的 markdown 摘要
```

### 管理结果

```python
from core.storage import list_results, load_result, get_latest_result

# 列出最近的结果
files = list_results(category="labs", limit=10)

# 加载特定结果
data = load_result(files[0])

# 获取某个操作最近的结果
latest = get_latest_result(category="labs", operation="keyword_suggestions")
```

### 工具函数

```python
from main import get_recent_results, load_latest

# 列出所有类别的最近文件
files = get_recent_results(limit=10)

# 加载某个类别的最新结果
data = load_latest("labs", "keyword_suggestions")
```

## 创建摘要

运行研究后，在 `results/summary/` 中创建 markdown 摘要文档。包括：

- **数据表** - 包含搜索量、CPC、竞争、难度
- **排名列表** - 机会排名（按搜索量或机会分数排序）
- **SERP 分析** - 显示当前排名靠前的内容
- **建议** - 内容策略、标题、标签建议

为摘要文件命名时要具有描述性（例如 `results/summary/ai-tools-keyword-research.md`）。

## 提示

1. **要具体** — "获取 'AI website builders' 的关键词建议" 比 "研究 AI 东西" 效果更好
2. **请求摘要** — 研究后始终创建摘要文档，并命名具体
3. **批量相关关键词** — 一次传递多个相关关键词进行比较
4. **指定目标** — "用于 YouTube 视频" 与 "用于着陆页" 会改变哪些数据最重要
5. **要求竞争分析** — "显示哪些视频正在排名" 有助于识别内容空白

## 默认值

- **位置**：美国（代码 2840）
- **语言**：英语
- **API 限制**：700 个关键词用于搜索量/概述，1000 个用于难度/意图，5 个用于趋势，200 个用于关键词创意