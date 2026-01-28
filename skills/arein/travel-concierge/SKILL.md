---
name: travel-concierge
description: 查找住宿列表的联系方式（Airbnb、Booking.com、VRBO、Expedia）
version: 1.0.0
triggers:
  - find contact
  - hotel contact
  - accommodation contact
  - property contact
  - airbnb contact
  - booking contact
  - vrbo contact
  - expedia contact
  - direct booking
  - property email
  - property phone
---

# 旅行管家

查找住宿列表的联系方式（电话、电子邮件、WhatsApp、Instagram 等）以实现直接预订。

## 使用方法

当用户提供预订网址或询问查找住宿的联系方式时：

1. 运行 CLI 提取联系信息：
   ```bash
   travel-concierge find-contact "<url>"
   ```

2. 向用户展示包含所有发现的联系方式的档案。

## 支持的平台

- **Airbnb**: `airbnb.com/rooms/...`
- **Booking.com**: `booking.com/hotel/...`
- **VRBO**: `vrbo.com/...`
- **Expedia**: `expedia.com/...Hotel...`

## 示例

### 查找 Airbnb 列表的联系方式
用户："查找这个 Airbnb 的联系方式：https://www.airbnb.com/rooms/12345"
操作：运行 `travel-concierge find-contact "https://www.airbnb.com/rooms/12345"`

### 查找 Booking.com 酒店的联系方式
用户："我如何直接联系这家酒店？"（附上 Booking.com 网址）
操作：运行 `travel-concierge find-contact "<booking-url>"`

### 用于脚本的 JSON 输出
```bash
travel-concierge find-contact --json "https://..."
```

### 详细输出以查看搜索进度
```bash
travel-concierge find-contact --verbose "https://..."
```

## 配置

该工具无需任何 API 密钥即可使用网络抓取工作。如需增强结果，请配置可选 API：

```bash
# 设置 Google Places API 密钥以获取经过验证的电话/网站数据
travel-concierge config set googlePlacesApiKey "your-key"

# 查看当前配置
travel-concierge config show
```

## 输出格式

CLI 返回包含以下内容的联系档案：
- **物业信息**：名称、平台、位置、房东姓名
- **联系方式**：
  - 电话号码
  - 电子邮件地址
  - WhatsApp（如有）
  - Instagram 个人资料
  - Facebook 页面
  - 网站
  - Google 地图网址
- **来源**：找到每个联系信息的位置及置信度

## 注意事项

- 该工具仅提取公开可用的信息
- 对于 JavaScript 渲染的列表页面可能需要浏览器自动化（通过 `agent-browser`）
- 某些平台严格限制抓取；结果可能有所不同
- 配置后 Google Places API 提供最可靠的联系数据
