---
name: clawd-docs-v2
description: 智能 ClawdBot 文档访问，支持本地搜索索引、缓存片段和按需获取。令牌高效且关注新鲜度。
homepage: https://docs.clawd.bot/
metadata: {"clawdbot":{"emoji":"📚"}}
version: 2.2.0
---

# Clawd-Docs v2.0 - 智能文档访问

此技能提供对 ClawdBot 文档的**智能访问**，包括：
- **本地搜索索引** - 即时关键词查找（0 tokens）
- **缓存片段** - 预获取的常见答案（~300-500 tokens）
- **按需获取** - 需要时获取完整页面（~8-12k tokens）
- **新鲜度跟踪** - 每种页面类型的 TTL

---

## 快速开始

### 步骤 1：首先检查黄金片段

在获取任何内容之前，检查**黄金片段**是否存在：

```bash
ls ~/clawd/data/docs-snippets/
```

**可用的片段（先检查缓存！）：**
| 片段 | 匹配查询 |
|------|----------|
| `telegram-setup.md` | "ako nastaviť telegram", "telegram setup" |
| `telegram-allowfrom.md` | "allowFrom", "kto mi môže písať", "access control" |
| `oauth-troubleshoot.md` | "token expired", "oauth error", "credentials" |
| `update-procedure.md` | "ako updatnuť", "update clawdbot" |
| `restart-gateway.md` | "restart", "reštart", "stop/start" |
| `config-basics.md` | "config", "nastavenie", "konfigurácia" |
| `config-providers.md` | "pridať provider", "discord setup", "nový kanál" |
| `memory-search.md` | "memory", "vector search", "pamäť", "embeddings" |

**读取片段：**
```bash
cat ~/clawd/data/docs-snippets/telegram-setup.md
```

### 步骤 2：搜索索引（如果片段不存在）

检查 `~/clawd/data/docs-index.json` 获取页面建议。

**关键词匹配：**
- "telegram" → channels/telegram
- "oauth" → concepts/oauth, gateway/troubleshooting
- "update" → install/updating
- "config" → gateway/configuration

### 步骤 3：检查完整页面缓存

**在通过 brightdata 获取之前**，检查页面是否已缓存：

```bash
# 转换路径：concepts/memory → concepts_memory.md
ls ~/clawd/data/docs-cache/ | grep "concepts_memory"
```

**如果存在，本地读取（0 tokens！）：**
```bash
cat ~/clawd/data/docs-cache/concepts_memory.md
```

### 步骤 4：获取页面（仅当不在缓存中时）

使用原生的 **web_fetch** 工具（Clawdbot 核心的一部分 - 免费且快速！）

```javascript
web_fetch({ url: "https://docs.clawd.bot/{path}", extractMode: "markdown" })
```

**示例：**
```javascript
web_fetch({ url: "https://docs.clawd.bot/tools/skills", extractMode: "markdown" })
```

**web_fetch 优势：**
| | web_fetch | brightdata |
|---|-----------|------------|
| **成本** | $0（免费！） | ~$0.003/调用 |
| **速度** | ~400ms | 2-5秒 |
| **质量** | Markdown ✅ | Markdown ✅ |

---

## 搜索索引结构

**位置：** `~/clawd/data/docs-index.json`

```json
{
  "pages": [
    {
      "path": "channels/telegram",
      "ttl_days": 7,
      "keywords": ["telegram", "tg", "bot", "allowfrom"]
    }
  ],
  "synonyms": {
    "telegram": ["tg", "telegrambot"],
    "configuration": ["config", "nastavenie", "settings"]
  }
}
```

**使用同义词**进行模糊匹配。

---

## TTL 策略（新鲜度）

| 页面类别 | TTL | 原因 |
|---------|-----|------|
| `install/updating` | 1 天 | 总是最新的！ |
| `gateway/*` | 7 天 | 配置更改 |
| `channels/*` | 7 天 | 提供程序更新 |
| `tools/*` | 7 天 | 添加的功能 |
| `concepts/*` | 14 天 | 很少更改 |
| `reference/*` | 30 天 | 稳定的模板 |

**检查片段过期：**
```bash
head -10 ~/clawd/data/docs-snippets/telegram-setup.md | grep expires
```

---

## 常见场景

### "Ako nastaviť Telegram？"
1. ✅ 读取 `~/clawd/data/docs-snippets/telegram-setup.md`

### "allowFrom nefunguje"
1. ✅ 读取 `~/clawd/data/docs-snippets/telegram-allowfrom.md`

### "Token expired / oauth error"
1. ✅ 读取 `~/clawd/data/docs-snippets/oauth-troubleshoot.md`

### "Ako updatnúť ClawdBot？"
1. ✅ 读取 `~/clawd/data/docs-snippets/update-procedure.md`

### "Ako pridať nový skill？"（不是片段）
1. 搜索索引 → tools/skills
2. 获取：`web_fetch({ url: "https://docs.clawd.bot/tools/skills", extractMode: "markdown" })`

### "Multi-agent routing"
1. 搜索索引 → concepts/multi-agent
2. 获取：`web_fetch({ url: "https://docs.clawd.bot/concepts/multi-agent", extractMode: "markdown" })`

---

## 回退：完整索引刷新

如果你找不到你需要的东西：

```javascript
web_fetch({ url: "https://docs.clawd.bot/llms.txt", extractMode: "markdown" })
```

返回所有文档页面的**完整列表**。

---

## 令牌效率指南

| 方法 | Tokens | 何时使用 |
|------|--------|----------|
| 黄金片段 | ~300-500 | ✅ 总是第一步！ |
| 搜索索引 | 0 | 关键词查找 |
| 完整页面获取 | ~8-12k | 最后手段 |
| 批量获取 | ~20-30k | 多个相关主题 |

**80-90% 的查询**应该从片段中回答！

---

## 数据位置

```
~/clawd/data/
├── docs-index.json       # 搜索索引
├── docs-stats.json       # 使用情况跟踪
├── docs-snippets/        # 缓存的黄金片段
│   ├── telegram-setup.md
│   ├── telegram-allowfrom.md
│   ├── oauth-troubleshoot.md
│   ├── update-procedure.md
│   ├── restart-gateway.md
│   └── config-basics.md
└── docs-cache/           # 完整页面缓存（未来）
```

---

## 版本信息

| 项目 | 值 |
|------|-------|
| **技能版本** | 2.1.0 |
| **创建** | 2026-01-14 |
| **更新** | 2026-01-26 |
| **作者** | Claude Code + Clawd（协作） |
| **来源** | https://docs.clawd.bot/ |
| **依赖** | web_fetch（Clawdbot 核心工具） |
| **索引页面** | ~50 个核心页面 |
| **黄金片段** | 7 个预缓存 |

---

## 更新日志

### v2.2.0 (2026-01-26)
- **迁移到 web_fetch** - 用原生 Clawdbot 工具替换 brightdata MCP
- 好处：免费 ($0)，更快（~400ms vs 2-5s）
- 无外部依赖（不再需要 mcporter）
- 协作工作：Claude Code 🦞 实现，Clawd 🐾 审核

### v2.1.3 (2026-01-25) - ClawdHub
- 文档修复：检查 vs 刷新澄清

### v2.0.0 (2026-01-14)
- 3层架构：搜索索引 → 片段 → 按需获取
- 常见查询的黄金片段预缓存
- 基于 TTL 的新鲜度跟踪
- 同义词支持模糊匹配
- 常见查询减少 80-90% tokens

### v1.0.0 (2026-01-08)
- 初始发布，仅使用 brightdata 获取

---

*此技能提供智能文档访问 - 总是先缓存片段，仅在必要时获取。*
