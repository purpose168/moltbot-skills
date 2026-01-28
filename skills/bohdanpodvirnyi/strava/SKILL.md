---
name: strava
description: 使用 Strava API 加载和分析 Strava 活动、统计数据和训练
homepage: https://developers.strava.com/
metadata: {"clawdbot":{"emoji":"🏃","requires":{"bins":["curl"],"env":["STRAVA_ACCESS_TOKEN"]},"primaryEnv":"STRAVA_ACCESS_TOKEN"}}
---

# Strava 技能

与 Strava 交互，加载活动、分析训练并跟踪健身数据。

## 设置

### 1. 创建 Strava API 应用

1. 访问 https://www.strava.com/settings/api
2. 创建一个应用（测试时使用 `http://localhost` 作为回调）
3. 记录您的 **客户端 ID** 和 **客户端密钥**

### 2. 获取初始 OAuth 令牌

在浏览器中访问此 URL（替换 CLIENT_ID）：
```
https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
```

授权后，您将被重定向到 `http://localhost/?code=AUTHORIZATION_CODE`

兑换令牌：
```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=您的客户端ID \
  -d client_secret=您的客户端密钥 \
  -d code=授权码 \
  -d grant_type=authorization_code
```

这将返回 `access_token` 和 `refresh_token`。

### 3. 配置凭据

添加到 `~/.clawdbot/clawdbot.json`：
```json
{
  "skills": {
    "entries": {
      "strava": {
        "enabled": true,
        "env": {
          "STRAVA_ACCESS_TOKEN": "您的访问令牌",
          "STRAVA_REFRESH_TOKEN": "您的刷新令牌",
          "STRAVA_CLIENT_ID": "您的客户端ID",
          "STRAVA_CLIENT_SECRET": "您的客户端密钥"
        }
      }
    }
  }
}
```

或使用环境变量：
```bash
export STRAVA_ACCESS_TOKEN="您的访问令牌"
export STRAVA_REFRESH_TOKEN="您的刷新令牌"
export STRAVA_CLIENT_ID="您的客户端ID"
export STRAVA_CLIENT_SECRET="您的客户端密钥"
```

## 使用方法

### 列出最近的活动

获取最近的 30 个活动：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?per_page=30"
```

获取最近的 10 个活动：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?per_page=10"
```

### 按日期筛选活动

获取特定日期之后（Unix 时间戳）的活动：
```bash
# 2024年1月1日之后的活动
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?after=1704067200"
```

获取日期范围内的活动：
```bash
# 2024年1月1日至1月31日之间的活动
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?after=1704067200&before=1706745600"
```

### 获取活动详情

获取特定活动的完整详情（替换 ACTIVITY_ID）：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/activities/ACTIVITY_ID"
```

### 获取运动员个人资料

获取已认证运动员的个人资料：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete"
```

### 获取运动员统计

获取运动员统计信息（替换 ATHLETE_ID）：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athletes/ATHLETE_ID/stats"
```

### 分页

翻页浏览：
```bash
# 第1页（默认）
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?page=1&per_page=30"

# 第2页
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?page=2&per_page=30"
```

## 令牌刷新

访问令牌每 6 小时过期。使用辅助脚本刷新：
```bash
bash {baseDir}/scripts/refresh_token.sh
```

或手动刷新：
```bash
curl -s -X POST https://www.strava.com/oauth/token \
  -d client_id="${STRAVA_CLIENT_ID}" \
  -d client_secret="${STRAVA_CLIENT_SECRET}" \
  -d grant_type=refresh_token \
  -d refresh_token="${STRAVA_REFRESH_TOKEN}"
```

响应包含新的 `access_token` 和 `refresh_token`。使用这两个令牌更新您的配置。

## 常见数据字段

活动对象包含以下字段：
- `name` — 活动标题
- `distance` — 距离（米）
- `moving_time` — 移动时间（秒）
- `elapsed_time` — 总时间（秒）
- `total_elevation_gain` — 爬升增益（米）
- `type` — 活动类型（跑步、骑行、游泳等）
- `sport_type` — 具体运动类型
- `start_date` — 开始时间（ISO 8601 格式）
- `average_speed` — 平均速度（米/秒）
- `max_speed` — 最大速度（米/秒）
- `average_heartrate` — 平均心率（如果有）
- `max_heartrate` — 最大心率（如果有）
- `kudos_count` — 收到的赞数

## 速率限制

- **200 次请求**每 15 分钟
- **2,000 次请求**每天

如果触发速率限制，响应将包含 `X-RateLimit-*` 头。

## 技巧

- 转换 Unix 时间戳：`date -d @时间戳`（Linux）或 `date -r 时间戳`（macOS）
- 米转公里：除以 1000
- 米转英里：除以 1609.34
- 米/秒转公里/小时：乘以 3.6
- 米/秒转英里/小时：乘以 2.237
- 秒转小时：除以 3600
- 如果有 `jq`，使用它解析 JSON，或使用 `grep`/`sed` 进行基本提取

## 示例

获取上周的跑步活动及距离：
```bash
LAST_WEEK=$(date -d '7 days ago' +%s 2>/dev/null || date -v-7d +%s)
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?after=${LAST_WEEK}&per_page=50" \
  | grep -E '"name"|"distance"|"type"'
```

从最近活动中获取总距离：
```bash
curl -s -H "Authorization: Bearer ${STRAVA_ACCESS_TOKEN}" \
  "https://www.strava.com/api/v3/athlete/activities?per_page=10" \
  | grep -o '"distance":[0-9.]*' | cut -d: -f2 | awk '{sum+=$1} END {print sum/1000 " km"}'
```

## 错误处理

如果您收到 401 未授权错误，说明您的访问令牌已过期。运行令牌刷新命令。

如果您收到速率限制错误，请等待限制窗口重置（检查 `X-RateLimit-Usage` 头）。
