# Tessie 技能

通过 Tessie API 控制您的 Tesla 车辆 - 一个拥有超过 500,000 用户的 Tesla 管理平台。

## 设置

获取您的 Tessie API 凭据：
1. 访问 https://tessie.com/developers
2. 注册并创建 API 密钥
3. 在 Clawdbot 中配置：

```yaml
skills:
  entries:
    tessie:
      apiKey: "您的-tessie-api-密钥"
```

或者通过环境变量：
```bash
export TESSIE_API_KEY="您的-tessie-api-密钥"
```

**注意**：车辆 ID 和 VIN 会从 API 自动检测。无需手动配置。

## 功能

### 车辆状态
- **电池电量**：当前充电百分比
- **续航里程**：估计可行驶里程
- **位置**：当前车辆坐标
- **车辆状态**：锁定/解锁、充电状态、睡眠模式
- **连接**：车辆是在线还是离线？

### 气候控制
- **启动/停止**：打开或关闭气候控制
- **预热/预冷**：设置驾驶室温度（自动检测华氏/摄氏）
- **除雾**：为车窗/后视镜除雾

### 充电
- **启动/停止**：远程控制充电
- **充电限制**：设置每日/标准充电限制
- **充电状态**：当前速率、完成时间、电池电量

### 行程
- **最近行程**：带有距离、能耗、位置的最近旅行记录

## 使用示例

```
# 检查电池和续航
"tessie battery"
"tessie how much charge"
"tessie range"

# 预热车辆（如果 >50 则假设为华氏度）
"tessie preheat 72"
"tessie precool"
"tessie turn on climate"

# 检查行程
"tessie show my drives"
"tessie recent drives"
"tessie drives 5"

# 充电命令
"tessie start charging"
"tessie stop charging"
"tessie set charge limit to 90%"
"tessie charging status"

# 车辆位置
"tessie where is my car"
"tessie location"

# 车辆状态
"tessie is the car locked?"
"tessie vehicle status"
```

## API 端点 (Tessie)

### 身份验证
所有请求都需要：
```
Authorization: Bearer <api-key>
```

### 获取车辆列表
```
GET https://api.tessie.com/vehicles
```
返回完整的车辆列表，其中包含嵌入的 `last_state`

### 获取行程
```
GET https://api.tessie.com/{VIN}/drives?limit=10
```
返回最近的行程历史

### 获取空闲记录
```
GET https://api.tessie.com/{VIN}/idles?limit=10
```
返回停车期间的驻车记录，包含气候/哨兵模式使用情况

### 命令
所有控制命令使用 VIN（而非 vehicle_id）：
```
POST https://api.tessie.com/{VIN}/command/{command}
```

**可用命令**：
- `start_climate`, `stop_climate`, `set_temperatures`
- `start_charging`, `stop_charging`, `set_charge_limit`
- `lock`, `unlock`, `enable_sentry`, `disable_sentry`
- `activate_front_trunk`, `activate_rear_trunk`
- `open_windows`, `close_windows`, `vent_windows`

完整列表：请参阅 https://developer.tessie.com

## 注意事项

- Tessie 作为您和 Tesla API 之间的中间人
- 提供比原始 Tesla API 更丰富的数据和分析
- 需要先将 Tesla 账户链接到 Tessie
- API 使用 VIN 进行命令（自动检测）
- 所有温度在内部使用摄氏度
- **尚未部署** - 准备部署，待用户审核
