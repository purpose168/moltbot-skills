---
name: irish-takeaway
description: 通过 Deliveroo/Just Eat 查找爱尔兰附近的外卖店并浏览菜单。使用 Google Places API 进行发现，使用浏览器自动化进行菜单抓取。
metadata: {"clawdbot":{"emoji":"🍕","requires":{"bins":["goplaces"],"env":["GOOGLE_PLACES_API_KEY"]}}}
---

# 爱尔兰外卖查找器 🍕🇮🇪

查找附近的外卖店并从 Deliveroo 或 Just Eat 获取菜单。

## 前置条件

- 已安装 `goplaces` CLI（`brew install steepete/tap/goplaces`）
- 已设置 `GOOGLE_PLACES_API_KEY` 环境变量
- 可用的浏览器工具

## 工作流程

### 第一步：查找附近的外卖店

使用 goplaces 在某个位置附近搜索餐厅：

```bash
# 按坐标搜索（负数经度需要 = 语法）
goplaces search "takeaway" --lat=53.7179 --lng=-6.3561 --radius-m=3000 --limit=10

# 按菜系搜索
goplaces search "chinese takeaway" --lat=53.7179 --lng=-6.3561 --radius-m=2000

# 按评分筛选
goplaces search "pizza" --lat=53.7179 --lng=-6.3561 --min-rating=4 --open-now
```

爱尔兰常用位置坐标：
- **Drogheda**: 53.7179, -6.3561
- **都柏林市中心**: 53.3498, -6.2603
- **科克**: 51.8985, -8.4756
- **戈尔韦**: 53.2707, -9.0568

### 第二步：获取 Deliveroo 菜单（浏览器自动化）

1. 启动浏览器并导航到 Deliveroo：
```
browser action=start target=host
browser action=navigate targetUrl="https://deliveroo.ie/" target=host
```

2. 如果弹出提示，接受 cookie（查找"Accept all"按钮）

3. 在地址搜索框中输入位置：
```
browser action=act request={"kind": "type", "ref": "<textbox-ref>", "text": "Drogheda, Co. Louth"}
```

4. 从自动完成下拉列表中选择位置

5. 从列表中找到并点击餐厅

6. 拍摄快照以提取菜单项 - 查找：
   - 类别标题（h2）
   - 带有名称、描述、价格的项按钮
   - 项描述中的过敏原信息

### 第三步：解析菜单数据

菜单项通常以按钮形式出现，结构如下：
- **名称**: 在段落元素中
- **描述**: 在文本内容中
- **价格**: 通常为"€X.XX"格式
- **过敏原**: 在描述后列出（麸质、牛奶等）

### 示例对话流程

用户："Drogheda 我附近有什么外卖店？"
→ 运行 goplaces 搜索，展示评分最高的前 5-10 个结果

用户："显示 Mizzoni's 的菜单"
→ 浏览器到 Deliveroo → 搜索 → 点击餐厅 → 快照 → 解析菜单

用户："他们有什么披萨？"
→ 按类别筛选菜单项，展示披萨选项及价格

### Just Eat 替代方案

如果餐厅不在 Deliveroo 上，尝试 Just Eat：
```
browser action=navigate targetUrl="https://www.just-eat.ie/" target=host
```

类似流程：输入邮编/地址 → 浏览餐厅 → 点击查看菜单

### 提示

- 始终先关闭 cookie 横幅
- 在点击之前等待自动完成建议
- 一些餐厅有"有限订单跟踪" - 仍然可以查看菜单
- 价格在描述中包含过敏原信息
- 使用 compact=true 的快照以获得更清晰的输出

### 菜单类别查找

- 套餐特惠
- 披萨（按尺寸：小/中/大/XL/车轮披萨）
- 开胃菜
- 意大利面
- 汉堡
- 配菜
- 甜点
- 饮料

## 未来增强功能

- [ ] Twilio 语音集成用于电话订购
- [ ] 跨平台价格比较
- [ ] 收藏餐厅记忆
- [ ] 订单历史跟踪
