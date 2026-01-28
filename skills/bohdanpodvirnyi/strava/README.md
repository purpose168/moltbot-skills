# Strava 技能（Clawdbot）

🏃 **使用 Strava API 加载和分析您的 Strava 活动、统计数据和训练**。

## 功能

- ✅ 列出最近的活动（支持分页）
- ✅ 按日期范围筛选活动
- ✅ 获取详细的活动统计（距离、配速、心率、爬升）
- ✅ 访问运动员个人资料和累计统计
- ✅ 自动令牌刷新辅助脚本
- ✅ 速率限制感知（200次/15分钟，2000次/天）
- ✅ 纯 curl 工作（无额外依赖）

## 快速开始

### 1. 创建 Strava API 应用

访问 https://www.strava.com/settings/api 创建一个应用。

### 2. 获取 OAuth 令牌

按照 [SKILL.md](./SKILL.md) 中的设置说明获取访问令牌和刷新令牌。

### 3. 配置

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

## 使用示例

向您的代理询问：
- "显示我最近的 10 个 Strava 活动"
- "上周我做了什么活动？"
- "获取我最近一次跑步的详情"
- "我这个月的总距离是多少？"
- "显示我的 Strava 个人资料和统计"

## 您可以做什么

- **列出活动**：可自定义页面大小的近期训练
- **按日期筛选**：使用 Unix 时间戳查询特定日期范围
- **活动详情**：包含配速、心率、爬升的完整指标
- **运动员统计**：个人资料信息和累计统计数据
- **令牌管理**：自动刷新过期的令牌（每 6 小时过期）

## API 覆盖范围

- `GET /athlete/activities` - 列出活动
- `GET /activities/{id}` - 活动详情
- `GET /athlete` - 运动员个人资料
- `GET /athletes/{id}/stats` - 运动员统计
- `POST /oauth/token` - 令牌刷新

## 文档

完整的设置说明、API 参考和高级用法请参见 [SKILL.md](./SKILL.md)。

## 环境要求

- `curl`（macOS/Linux 自带）
- Strava API 应用凭据
- OAuth 访问令牌

## 链接

- **Strava 开发者**：https://developers.strava.com/
- **API 文档**：https://developers.strava.com/docs/reference/
- **创建应用**：https://www.strava.com/settings/api

## 许可证

MIT

## 作者

为 Clawdbot AI 助手创建

---

🦞 Clawdbot 技能生态系统的一部分
