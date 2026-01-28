---
name: prd
description: 创建和管理产品需求文档 (PRD)。用于：(1) 创建带有用户故事的结构化任务列表，(2) 指定带有验收标准的特性，(3) 为 AI 代理或人类开发者规划特性实现。
author: Benjamin Jesuiter <bjesuiter@gmail.com>
metadata:
  clawdbot:
    emoji: "📋"
    os: ["darwin", "linux"]
---

# PRD 技能

创建和管理产品需求文档 (PRD)，用于特性规划。

## 什么是 PRD？

**PRD（产品需求文档）** 是一个结构化规范，它：

1. 将特性分解为**小的、独立用户故事**
2. 为每个故事定义**可验证的验收标准**
3. 按**依赖关系**排序任务（模式 → 后端 → UI）

## 快速开始

1. 在项目中创建/编辑 `agents/prd.json`
2. 定义带验收标准的用户故事
3. 通过更新 `passes: false` → `true` 来跟踪进度

## prd.json 格式

```json
{
  "project": "MyApp",
  "branchName": "ralph/feature-name",
  "description": "特性的简短描述",
  "userStories": [
    {
      "id": "US-001",
      "title": "向数据库添加优先级字段",
      "description": "作为开发者，我需要存储任务优先级。",
      "acceptanceCriteria": [
        "添加优先级列：'high' | 'medium' | 'low'",
        "生成并运行迁移",
        "类型检查通过"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### 字段描述

| 字段 | 描述 |
|-------|-------------|
| `project` | 项目名称（用于上下文） |
| `branchName` | 此特性的 Git 分支（以 `ralph/` 为前缀） |
| `description` | 一行特性总结 |
| `userStories` | 要完成的故事列表 |
| `userStories[].id` | 唯一标识符（US-001, US-002） |
| `userStories[].title` | 简短描述性标题 |
| `userStories[].description` | "作为[用户]，我想要[特性]，以便[收益]" |
| `userStories[].acceptanceCriteria` | 可验证的检查清单项目 |
| `userStories[].priority` | 执行顺序（1 = 第一个） |
| `userStories[].passes` | 完成状态（`false` → `true` 表示完成） |
| `userStories[].notes` | 代理运行时添加的笔记 |

## 故事规模

**每个故事应该可以在一个上下文窗口内完成。**

### ✅ 正确规模：
- 添加数据库列和迁移
- 向现有页面添加 UI 组件
- 用新逻辑更新服务器操作
- 向列表添加筛选下拉菜单

### ❌ 太大（需要拆分）：
- "构建整个仪表板" → 拆分为：模式、查询、UI、筛选器
- "添加身份验证" → 拆分为：模式、中间件、登录 UI、会话

## 故事排序

故事按优先级顺序执行。较早的故事不得依赖于较晚的故事。

**正确顺序：**
1. 模式/数据库更改（迁移）
2. 服务器操作 / 后端逻辑
3. 使用后端的 UI 组件
4. 仪表板/摘要视图

## 验收标准

必须是可验证的，而不是模糊的。

### ✅ 好的：
- "向任务表添加 `status` 列，默认值为 'pending'"
- "筛选下拉菜单有选项：全部、进行中、已完成"

### ❌ 差的：
- "UI 应该看起来不错" → "CSS 验证通过"
- "系统应该很快" → "页面加载时间 < 200ms"

## 跟踪进度

在 `agents/prd.json` 中，通过将 `passes` 从 `false` 设置为 `true` 来标记故事完成：

```json
{
  "userStories": [
    {
      "id": "US-001",
      "passes": true,  // 已完成
      "notes": "列已添加，迁移已运行"
    }
  ]
}
```

## 示例：待办事项应用

```json
{
  "project": "Todo App",
  "branchName": "ralph/add-priority",
  "description": "为待办事项添加优先级支持",
  "userStories": [
    {
      "id": "US-001",
      "title": "添加优先级数据库列",
      "description": "作为开发者，我需要存储任务优先级。",
      "acceptanceCriteria": [
        "添加 priority 列：'high' | 'medium' | 'low'",
        "生成并运行迁移文件",
        "TypeScript 类型检查通过"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-002",
      "title": "创建优先级选择器组件",
      "description": "作为用户，我希望选择任务优先级。",
      "acceptanceCriteria": [
        "创建优先级下拉组件",
        "选项：紧急、高、中、低",
        "提交表单时保存优先级值"
      ],
      "priority": 2,
      "passes": false,
      "notes": "等待 US-001 完成"
    },
    {
      "id": "US-003",
      "title": "添加优先级筛选",
      "description": "作为用户，我希望按优先级筛选任务。",
      "acceptanceCriteria": [
        "在任务列表上方添加筛选栏",
        "支持多选筛选",
        "筛选后正确显示任务"
      ],
      "priority": 3,
      "passes": false,
      "notes": "等待 US-002 完成"
    }
  ]
}
```

## 在 Clawdbot 中使用

### 加载 PRD

```python
import json

def load_prd():
    with open("agents/prd.json") as f:
        return json.load(f)

prd = load_prd()
print(f"项目: {prd['project']}")
print(f"故事数量: {len(prd['userStories'])}")
```

### 获取下一个故事

```python
def get_next_story(prd):
    for story in prd['userStories']:
        if not story['passes']:
            return story
    return None

next_story = get_next_story(prd)
if next_story:
    print(f"执行: {next_story['id']} - {next_story['title']}")
```

### 标记故事完成

```python
def mark_story_complete(prd, story_id):
    for story in prd['userStories']:
        if story['id'] == story_id:
            story['passes'] = True
            story['notes'] = f"由 {agent_name} 于 {now} 完成"
            break
    
    with open("agents/prd.json", 'w') as f:
        json.dump(prd, f, indent=2)
```

## 最佳实践

1. **保持故事小**：单个故事应可在几小时内完成
2. **明确验收标准**：每个标准应可独立验证
3. **逻辑排序**：确保依赖关系正确（数据库 → API → UI）
4. **定期更新**：完成故事后立即标记
5. **添加笔记**：记录实现细节和决策