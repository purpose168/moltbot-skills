# Tavily API 参考

## 概述

Tavily 是一个专为大型语言模型（LLMs）和 AI 应用优化的搜索引擎。它提供：

- **AI 优化的结果**：专门为 LLM 消费格式化的结果
- **答案生成**：从搜索结果中可选的 AI 生成摘要
- **来自来源的干净原始内容提取**：、解析后的 HTML 内容
- **域名过滤**：包含或排除特定域名
- **图片搜索**：用于视觉上下文的相关图片
- **主题专业化**：综合或新闻焦点搜索

## API 密钥设置

1. 访问 https://tavily.com 并注册
2. 从您的仪表板生成 API 密钥
3. 安全存储密钥：
   - **推荐**：添加到 Clawdbot 配置中的 `skills.entries.tavily.apiKey`
   - **替代方案**：设置 `TAVILY_API_KEY` 环境变量

## 搜索参数

### 必需参数

- `query` (string): 搜索查询字符串

### 可选参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `search_depth` | string | `"basic"` | `"basic"`（快速，约1-2秒）或 `"advanced"`（综合，约5-10秒） |
| `topic` | string | `"general"` | `"general"` 或 `"news"`（当前事件，最近7天） |
| `max_results` | int | 5 | 结果数量（1-10） |
| `include_answer` | bool | true | 包含 AI 生成的答案摘要 |
| `include_raw_content` | bool | false | 包含来源的清理后的 HTML 内容 |
| `include_images` | bool | false | 包含相关图片 |
| `include_domains` | list[str] | null | 仅搜索这些域名 |
| `exclude_domains` | list[str] | null | 排除这些域名 |

## 响应格式

```json
{
  "success": true,
  "query": "什么是量子计算？",
  "answer": "量子计算是一种使用...",
  "results": [
    {
      "title": "量子计算解释",
      "url": "https://example.com/quantum",
      "content": "量子计算利用...",
      "score": 0.95,
      "raw_content": null
    }
  ],
  "images": ["https://example.com/image.jpg"],
  "response_time": "1.67",
  "usage": {
    "credits": 1
  }
}
```

## 使用场景与最佳实践

### 何时使用 Tavily

1. **研究任务**：综合信息收集
2. **当前事件**：使用 `topic="news"` 进行新闻焦点查询
3. **特定领域搜索**：使用 `include_domains` 获得可信来源
4. **视觉内容**：启用 `include_images` 获得视觉上下文
5. **LLM 消费**：结果预先格式化用于 AI 处理

### 搜索深度比较

| 深度 | 速度 | 结果质量 | 使用场景 |
|-------|-------|-----------------|----------|
| `basic` | 1-2秒 | 良好 | 快速查找、简单事实 |
| `advanced` | 5-10秒 | 优秀 | 研究、复杂主题、综合分析 |

**建议**：从 `basic` 开始，对研究任务使用 `advanced`。

### 域名过滤

**包含域名**（允许列表）：
```python
include_domains=["python.org", "github.com", "stackoverflow.com"]
```
仅搜索这些特定域名 - 对可信来源有用。

**排除域名**（拒绝列表）：
```python
exclude_domains=["pinterest.com", "quora.com"]
```
移除不需要或低质量的来源。

### 主题选择

**综合** (`topic="general"`)：
- 默认模式
- 更广泛的网络搜索
- 历史和永恒内容
- 适合大多数查询

**新闻** (`topic="news"`)：
- 仅最近7天
- 新闻焦点来源
- 当前事件和发展
- 适合"最新"、"最近"、"当前"查询

## 成本与速率限制

- **积分**：每次搜索消耗积分（基本搜索消耗1积分）
- **免费层**：查看 https://tavily.com/pricing 了解当前限制
- **速率限制**：根据套餐层级而异

## 错误处理

常见错误：

1. **缺少 API 密钥**
   ```json
   {
     "error": "需要 Tavily API 密钥",
     "setup_instructions": "设置 TAVILY_API_KEY 环境变量"
   }
   ```

2. **未安装软件包**
   ```json
   {
     "error": "未安装 tavily-python 软件包",
     "install_command": "pip install tavily-python"
   }
   ```

3. **无效 API 密钥**
   ```json
   {
     "error": "无效的 API 密钥"
   }
   ```

4. **超出速率限制**
   ```json
   {
     "error": "超出速率限制"
   }
   ```

## Python SDK

该技能使用官方的 `tavily-python` 软件包：

```python
from tavily import TavilyClient

client = TavilyClient(api_key="tvly-...")
response = client.search(
    query="什么是 AI？",
    search_depth="advanced",
    max_results=10
)
```

安装：`pip install tavily-python`

## 与其他搜索 API 的比较

| 功能 | Tavily | Brave Search | Perplexity |
|---------|--------|--------------|------------|
| AI 答案 | ✅ 是 | ❌ 否 | ✅ 是 |
| 原始内容 | ✅ 是 | ❌ 否 | ❌ 否 |
| 域名过滤 | ✅ 是 | 有限 | ❌ 否 |
| 图片搜索 | ✅ 是 | ✅ 是 | ❌ 否 |
| 新闻模式 | ✅ 是 | ✅ 是 | ✅ 是 |
| LLM 优化 | ✅ 是 | ❌ 否 | ✅ 是 |
| 速度 | 中等 | 快速 | 中等 |
| 免费层 | ✅ 是 | ✅ 是 | 有限 |

## 额外资源

- 官方文档：https://docs.tavily.com
- Python SDK：https://github.com/tavily-ai/tavily-python
- API 参考：https://docs.tavily.com/documentation/api-reference
- 定价：https://tavily.com/pricing