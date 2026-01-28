---
name: gemini-deep-research
description: 使用 Gemini 深度研究代理执行复杂的长时间运行的研究任务。当被要求研究需要多源综合、竞争分析、市场调查或系统性网络搜索和分析的综合技术调查时使用。
metadata: {"clawdbot":{"emoji":"🔬","requires":{"env":["GEMINI_API_KEY"]},"primaryEnv":"GEMINI_API_KEY"}}
---

# Gemini 深度研究

使用 Gemini 的深度研究智能体执行复杂的长时间运行的上下文收集和综合任务。

## 前置条件

- `GEMINI_API_KEY` 环境变量（来自 Google AI Studio）
- **注意**：这**不**适用于反重力 OAuth 令牌。需要直接的 Gemini API 密钥。

## 工作原理

深度研究是一个代理，它：
1. 将复杂查询分解为子问题
2. 系统性地搜索网络
3. 将发现综合成综合报告
4. 提供流式进度更新

## 使用方法

### 基本研究

```bash
scripts/deep_research.py --query "研究 Google TPU 的历史"
```

### 自定义输出格式

```bash
scripts/deep_research.py --query "研究电动汽车电池的竞争格局" \
  --format "1. 执行摘要\n2. 关键参与者（包括数据表）\n3. 供应链风险"
```

### 带文件搜索（可选）

```bash
scripts/deep_research.py --query "将我们的2025财年报告与当前的公共网络新闻进行对比" \
  --file-search-store "fileSearchStores/my-store-name"
```

### 流式进度

```bash
scripts/deep_research.py --query "您的研究主题" --stream
```

## 输出

脚本将结果保存到带时间戳的文件：
- `deep-research-YYYY-MM-DD-HH-MM-SS.md` - Markdown 格式的最终报告
- `deep-research-YYYY-MM-DD-HH-MM-SS.json` - 完整的交互元数据

## API 详情

- **端点**：`https://generativelanguage.googleapis.com/v1beta/interactions`
- **智能体**：`deep-research-pro-preview-12-2025`
- **认证**：`x-goog-api-key` 标头（**不是** OAuth Bearer 令牌）

## 限制

- 需要 Gemini API 密钥（从 [Google AI Studio](https://aistudio.google.com/apikey) 获取）
- **不**适用于反重力 OAuth 身份验证
- 长时间运行的任务（根据复杂性，可能需要几分钟到几小时）
- 根据您的配额可能产生 API 成本
