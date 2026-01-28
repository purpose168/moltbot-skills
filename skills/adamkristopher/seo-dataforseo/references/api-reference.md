# API 参考

DataForSEO API 模块的所有函数的完整参考。

## 目录

- [关键词数据 API](#关键词数据-api)（4个函数）
- [实验室 API](#实验室-api)（9个函数）
- [SERP API](#serp-api)（6个函数）
- [趋势 API](#趋势-api)（6个函数）

---

## 关键词数据 API

导入：`from api.keywords_data import ...`

### `get_search_volume(keywords, location_name, language_name, save)`

获取关键词的搜索量、CPC 和竞争数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分析的关键词（最多700个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含每个关键词的搜索量、CPC 和竞争的字典。

### `get_keywords_for_site(target_domain, location_name, language_name, save)`

获取与特定域名相关的关键词。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `target_domain` | `str` | 必需 | 要分析的域名（例如 "example.com"） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含与域名相关的关键词的字典。

### `get_ad_traffic_by_keywords(keywords, location_name, language_name, bid, save)`

在给定 CPC 出价下估算关键词的广告流量潜力。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分析的关键词 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `bid` | `float` | `2.0` | 用于估算的最大 CPC 出价 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含给定出价下流量估算的字典。

### `get_keywords_for_keywords(keywords, location_name, language_name, save)`

从 Google Ads 关键词规划师获取关键词扩展创意。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 种子关键词（最多20个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含扩展关键词创意的字典。

---

## 实验室 API

导入：`from api.labs import ...`

### `get_keyword_overview(keywords, location_name, language_name, include_serp_info, save)`

综合关键词数据：搜索量、CPC、竞争和搜索意图。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分析的关键词（最多700个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `include_serp_info` | `bool` | `False` | 包含 SERP 功能数据 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含综合关键词指标的字典。

### `get_keyword_suggestions(keyword, location_name, language_name, include_seed_keyword, include_serp_info, limit, save)`

基于种子关键词获取长尾关键词建议。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 种子关键词（最少3个字符） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `include_seed_keyword` | `bool` | `True` | 包含种子关键词指标 |
| `include_serp_info` | `bool` | `False` | 包含每个关键词的 SERP 数据 |
| `limit` | `int` | `100` | 最大结果数（最多1000个） |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含关键词建议和指标的字典。

### `get_keyword_ideas(keywords, location_name, language_name, include_serp_info, closely_variants, limit, save)`

从与种子关键词相同类别中获取关键词创意。超越语义相似性。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 种子关键词（最多200个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `include_serp_info` | `bool` | `False` | 包含 SERP 数据 |
| `closely_variants` | `bool` | `False` | 短语匹配（True） vs 广泛匹配（False） |
| `limit` | `int` | `700` | 最大结果数（最多1000个） |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含关键词创意和指标的字典。

### `get_related_keywords(keyword, location_name, language_name, depth, include_seed_keyword, include_serp_info, limit, save)`

使用深度优先搜索从 Google 的"相关搜索"功能获取关键词。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 种子关键词 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `2` | 搜索深度 0-4（4 = 最多约4680个结果） |
| `include_seed_keyword` | `bool` | `True` | 包含种子关键词指标 |
| `include_serp_info` | `bool` | `False` | 包含 SERP 数据 |
| `limit` | `int` | `100` | 最大结果数（最多1000个） |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含相关关键词和指标的字典。

### `get_bulk_keyword_difficulty(keywords, location_name, language_name, save)`

获取关键词难度分数（0-100），表示在排名前10位有多困难。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分析的关键词（最多1000个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含每个关键词难度分数的字典。

### `get_historical_search_volume(keywords, location_name, language_name, include_serp_info, save)`

获取自2019年以来的每月搜索量数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分析的关键词（最多700个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `include_serp_info` | `bool` | `False` | 包含 SERP 功能 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含历史搜索量和每月细分的字典。

### `get_search_intent(keywords, location_name, language_name, save)`

将关键词分类为信息性、导航性、交易性或商业性。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要分类的关键词（最多1000个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含每个关键词意图分类的字典。

### `get_domain_keywords(target_domain, location_name, language_name, limit, save)`

获取域名在自然搜索中排名的关键词。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `target_domain` | `str` | 必需 | 要分析的域名（例如 "example.com"） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `limit` | `int` | `100` | 最大结果数 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含域名排名的关键词的字典。

### `get_competitors(keywords, location_name, language_name, limit, save)`

查找为相同关键词竞争的域名。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要查找竞争对手的关键词 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `limit` | `int` | `20` | 返回的最大竞争对手数 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含竞争对手域名及其指标的字典。

---

## SERP API

导入：`from api.serp import ...`

### `get_google_serp(keyword, location_name, language_name, depth, device, save)`

获取关键词的 Google 自然搜索结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `100` | 结果数量（最多700个） |
| `device` | `str` | `"desktop"` | `"desktop"` 或 `"mobile"` |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含 SERP 数据的字典，包括排名、URL、标题和 SERP 功能。

### `get_youtube_serp(keyword, location_name, language_name, depth, device, save)`

获取关键词的 YouTube 自然搜索结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询（最多700个字符） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `20` | 结果数量（最多700个，按每20个计费） |
| `device` | `str` | `"desktop"` | `"desktop"` 或 `"mobile"` |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含 YouTube 视频排名、标题、频道、浏览量的字典。

### `get_google_maps_serp(keyword, location_name, language_name, depth, save)`

获取 Google 地图/本地搜索结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询（例如 "附近的餐厅"） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `20` | 结果数量 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含本地商家列表的字典。

### `get_google_news_serp(keyword, location_name, language_name, depth, save)`

获取 Google 新闻搜索结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `100` | 结果数量 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含新闻文章和排名的字典。

### `get_google_images_serp(keyword, location_name, language_name, depth, save)`

获取 Google 图片搜索结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询 |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `depth` | `int` | `100` | 结果数量 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含图片结果的字典，包括 URL、标题、来源。

### `get_featured_snippet(keyword, location_name, language_name, save)`

专注于精选摘要和 SERP 功能的 Google SERP。返回桌面端前10个结果。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keyword` | `str` | 必需 | 搜索查询（最好是问题） |
| `location_name` | `str` | "United States" | 目标位置 |
| `language_name` | `str` | "English" | 目标语言 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含 SERP 数据的字典，包括精选摘要详情。

---

## 趋势 API

导入：`from api.trends import ...`

### `get_trends_explore(keywords, location_name, search_type, time_range, date_from, date_to, category_code, save)`

获取关键词的 Google 趋势数据。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要比较的关键词（最多5个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `search_type` | `str` | `"web"` | `"web"`、`"news"`、`"youtube"`、`"images"`、`"froogle"`（购物） |
| `time_range` | `str` | `"past_12_months"` | `"past_hour"`、`"past_4_hours"`、`"past_day"`、`"past_7_days"`、`"past_month"`、`"past_3_months"`、`"past_12_months"`、`"past_5_years"` |
| `date_from` | `str` | `None` | 自定义开始日期（yyyy-mm-dd），覆盖 time_range |
| `date_to` | `str` | `None` | 自定义结束日期（yyyy-mm-dd） |
| `category_code` | `int` | `None` | Google 趋势类别过滤器 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含趋势图表、区域兴趣、相关主题和查询的字典。

### `get_youtube_trends(keywords, location_name, time_range, save)`

YouTube 特定的趋势数据。`get_trends_explore` 的便捷包装器，`search_type="youtube"`。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要比较的关键词（最多5个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `time_range` | `str` | `"past_12_months"` | 时间范围 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含 YouTube 趋势数据的字典。

### `get_news_trends(keywords, location_name, time_range, save)`

Google 新闻趋势数据。`get_trends_explore` 的便捷包装器，`search_type="news"`。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要比较的关键词（最多5个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `time_range` | `str` | `"past_12_months"` | 时间范围 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含新闻趋势数据的字典。

### `get_shopping_trends(keywords, location_name, time_range, save)`

Google 购物趋势数据。`get_trends_explore` 的便捷包装器，`search_type="froogle"`。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要比较的关键词（最多5个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `time_range` | `str` | `"past_12_months"` | 时间范围 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含购物/电商趋势数据的字典。

### `compare_keyword_trends(keywords, location_name, search_types, time_range, save)`

跨多个搜索平台比较关键词趋势。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `keywords` | `List[str]` | 必需 | 要比较的关键词（最多5个） |
| `location_name` | `str` | "United States" | 目标位置 |
| `search_types` | `List[str]` | `["web", "youtube"]` | 要比较的平台 |
| `time_range` | `str` | `"past_12_months"` | 时间范围 |
| `save` | `bool` | `True` | 保存单个结果 |

**返回：** 包含 search_type 键和趋势数据值的字典。

### `get_trending_now(location_name, save)`

获取当前实时热门搜索。

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `location_name` | `str` | "United States" | 目标位置 |
| `save` | `bool` | `True` | 将结果保存为 JSON |

**返回：** 包含当前热门搜索的字典。