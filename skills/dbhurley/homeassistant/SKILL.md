---
name: homeassistant
description: 控制家庭助手 - 智能插座、灯光、场景、自动化。
homepage: https://www.home-assistant.io/
metadata: {"clawdis":{"emoji":"🏠","requires":{"bins":["curl"],"env":["HA_TOKEN"]},"primaryEnv":"HA_TOKEN"}}
---

# 家庭助手

通过家庭助手 API 控制智能家居设备。

## 设置

设置环境变量：
- `HA_URL`：您的家庭助手 URL（例如：`http://192.168.1.100:8123`）
- `HA_TOKEN`：长期访问令牌（在 HA → 个人资料 → 长期访问令牌中创建）

## 快速命令

### 按域列出实体
```bash
curl -s "$HA_URL/api/states" -H "Authorization: Bearer $HA_TOKEN" | \
  jq -r '.[] | select(.entity_id | startswith("switch.")) | .entity_id'
```

### 打开/关闭
```bash
# 打开
curl -s -X POST "$HA_URL/api/services/switch/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "switch.office_lamp"}'

# 关闭
curl -s -X POST "$HA_URL/api/services/switch/turn_off" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "switch.office_lamp"}'
```

### 控制灯光
```bash
# 打开并设置亮度
curl -s -X POST "$HA_URL/api/services/light/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room", "brightness_pct": 80}'
```

### 触发场景
```bash
curl -s -X POST "$HA_URL/api/services/scene/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "scene.movie_time"}'
```

### 调用任何服务
```bash
curl -s -X POST "$HA_URL/api/services/{domain}/{service}" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "...", ...}'
```

### 获取实体状态
```bash
curl -s "$HA_URL/api/states/{entity_id}" -H "Authorization: Bearer $HA_TOKEN"
```

## 实体域

- `switch.*` — 智能插座、通用开关
- `light.*` — 灯光（Hue、LIFX 等）
- `scene.*` — 预配置场景
- `automation.*` — 自动化
- `climate.*` — 温控器
- `cover.*` — 百叶窗、车库门
- `media_player.*` — 电视、音箱
- `sensor.*` — 温度、湿度等

## 注意事项

- API 默认返回 JSON 格式
- 长期令牌不会过期 — 请安全存储
- 首先使用列表命令测试实体 ID
