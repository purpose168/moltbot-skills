---
name: wheels-router
description: 使用 Wheels Router（香港）和 Transitous（全球）规划全球公共交通出行
license: MIT
compatibility: opencode
metadata:
  transport: mcp
  coverage: global
  specialty: hong-kong
---

## 功能介绍

我通过连接 Wheels Router MCP 服务器帮助您规划全球公共交通出行。

**对于香港出行**，我使用 Wheels Router API，提供：
- 包含港铁、巴士、电车、渡轮和步行的详细路线规划
- 实时时刻表和准确票价
- 站台信息和出口详情
- 转乘优惠（如有）

**对于全球出行**，我使用 Transitous API，覆盖：
- 全球主要城市的交通数据
- 公共交通的基本路线规划
- 步行导航和换乘指引

## 使用场景

在以下情况使用此技能：
- 使用公共交通规划出行
- 查找两点之间的最佳路线
- 检查交通时刻表和换乘
- 获取香港交通票价估算
- 在规划路线前搜索地点

**示例：**
- "如何从油塘港铁站前往香港机场？"
- "从铜锣湾到中环现在最好的方式是什么？"
- "规划从东京站到涩谷的出行"
- "搜索维多利亚公园附近的地点"

## 连接方式

### 如果您使用 mcporter（clawdbot 等）

如果您没有 mcporter 技能，请按照以下步骤操作：
添加到 `config/mcporter.json`：

```json
{
  "mcpServers": {
    "wheels-router": {
      "description": "规划全球公共交通出行",
      "baseUrl": "https://mcp.justusewheels.com/mcp"
    }
  }
}
```

然后直接调用工具：
```bash
npx mcporter call wheels-router.search_location query="香港机场"
npx mcporter call wheels-router.plan_trip origin="22.28,114.24" destination="22.31,113.92"
```

### 对于其他 MCP 客户端

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`)：
```json
{
  "mcpServers": {
    "wheels-router": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.justusewheels.com/mcp"]
    }
  }
}
```

**Cursor/Windsurf/VS Code** (`.cursor/mcp.json` 或类似文件)：
```json
{
  "mcpServers": {
    "wheels-router": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.justusewheels.com/mcp"]
    }
  }
}
```

## 可用工具

### `search_location`

在规划出行前搜索地点。如果您没有精确坐标，请始终先使用此工具。

**参数：**
- `query`（必需）：地点名称或地址（例如："香港机场"、"油塘港铁站 A2 出口"）
- `limit`（可选）：结果数量（1-10，默认 5）

**示例：**
```javascript
search_location({
  query: "香港国际机场",
  limit: 3
})
```

**返回：**
- `display_name`：完整地址
- `lat`, `lon`：用于 `plan_trip` 的坐标
- `type`, `class`：地点类别

### `plan_trip`

规划两点之间的交通路线。

**参数：**
- `origin`（必需）：起点，格式为 `"lat,lon"` 或 `"stop:ID"`
- `destination`（必需）：终点，格式为 `"lat,lon"` 或 `"stop:ID"`
- `depart_at`（可选）：ISO 8601 出发时间（例如：`"2026-01-26T10:00:00+08:00"`）
- `arrive_by`（可选）：ISO 8601 最晚到达时间
- `modes`（可选）：逗号分隔的交通方式，如 `"mtr,bus,ferry"`（仅在需要时指定）
- `max_results`（可选）：路线选项数量限制（1-5）

**示例：**
```javascript
plan_trip({
  origin: "22.2836,114.2358",
  destination: "22.3080,113.9185",
  depart_at: "2026-01-26T14:30:00+08:00",
  max_results: 3
})
```

**返回：**
- `plans`：路线选项数组
  - `duration_seconds`：总行程时间
  - `fares_min`, `fares_max`：票价范围（港币，仅限香港）
  - `legs`：逐步指引
    - `type`："walk"、"transit"、"wait"、"station_transfer"
    - 交通路段包括：路线名称、终点站、站台信息
    - 步行路段包括：距离、时长

## 最佳实践

1. **始终先搜索**：使用 `search_location` 查找坐标后再调用 `plan_trip`
2. **使用坐标**：使用 `lat,lon` 格式规划出行以获得最佳结果
3. **指定时间**：包含 `depart_at` 或 `arrive_by` 以获得准确时刻表
4. **检查多个选项**：使用 `max_results` 请求 2-3 个路线选项
5. **了解票价**：`fares_min` 和 `fares_max` 显示票价范围 — 转乘优惠在有提供时会单独注明

## 重要说明

- **转乘优惠**：仅在明确存在于香港路线时显示，并非所有路线都符合条件
- **实时数据**：香港路线使用实时时刻表；全球覆盖范围可能有所不同
- **时区**：使用 UTC 或本地时区偏移（香港时间 UTC+8）
- **覆盖范围**：香港最佳；全球覆盖范围因城市而异

## 示例工作流程

```javascript
// 1. 搜索地点
const origins = await search_location({ 
  query: "油塘港铁站", 
  limit: 1 
});

const destinations = await search_location({ 
  query: "香港机场", 
  limit: 1 
});

// 2. 规划出行
const routes = await plan_trip({
  origin: `${origins[0].lat},${origins[0].lon}`,
  destination: `${destinations[0].lat},${destinations[0].lon}`,
  depart_at: "2026-01-26T15:00:00+08:00",
  max_results: 2
});

// 3. 向用户呈现最佳选项，或仅在用户特别要求时呈现具体结果。
// 默认情况下，只需给出类似 "[步行] > [3D] > [步行] > [观塘线] > [步行]" 的信息
```

## 错误处理

- **"无法找到地点"**：尝试更具体的搜索查询
- **"未找到路线"**：检查坐标是否有效且在覆盖区域内
- **"无效的时间格式"**：确保使用带时区的 ISO 8601 格式
- **速率限制**：注意 API 使用，适时缓存结果

## 覆盖区域

- ✅ **完全覆盖**：香港（港铁、巴士、电车、渡轮、详细票价）
- ✅ **良好覆盖**：具有 Transitous 数据的全球主要城市
- ⚠️ **有限覆盖**：较小城市可能交通数据不完整
