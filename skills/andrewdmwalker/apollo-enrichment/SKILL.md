---
name: apollo
description: Apollo.io 联系人和公司富化 API。使用电子邮件、电话、职位、公司数据富化人员。使用行业、收入、员工数量、资金富化组织。搜索潜在客户。当用户需要富化联系人、查找电子邮件、查找公司信息或搜索潜在客户时使用。
version: 1.0.0
author: captmarbles
---

# Apollo 富化技能

使用 [Apollo.io](https://apollo.io) API 富化联系人和公司。

## 设置

1. 从 [Apollo 设置](https://app.apollo.io/#/settings/integrations/api) 获取您的 API 密钥
2. 设置环境变量：
   ```bash
   export APOLLO_API_KEY=your-api-key-here
   ```

## 使用方法

所有命令都使用此技能目录中捆绑的 `apollo.py` 脚本。

### 富化个人

获取联系人的电子邮件、电话、职位和公司数据。

```bash
# 通过电子邮件
python3 apollo.py enrich --email "john@acme.com"

# 通过姓名 + 公司
python3 apollo.py enrich --name "John Smith" --domain "acme.com"

# 包含个人电子邮件和电话
python3 apollo.py enrich --email "john@acme.com" --reveal-email --reveal-phone
```

### 批量富化人员

一次调用富化最多 10 个人。

```bash
# 从包含 {email, first_name, last_name, domain} 数组的 JSON 文件
python3 apollo.py bulk-enrich --file contacts.json

# 显示个人联系信息
python3 apollo.py bulk-enrich --file contacts.json --reveal-email --reveal-phone
```

**contacts.json 示例：**
```json
[
  {"email": "john@acme.com"},
  {"first_name": "Jane", "last_name": "Doe", "domain": "techcorp.io"}
]
```

### 富化公司

获取行业、收入、员工数量、资金数据。

```bash
python3 apollo.py company --domain "stripe.com"
```

### 搜索人员

按条件查找潜在客户。

```bash
# 按职位和公司
python3 apollo.py search --titles "CEO,CTO" --domain "acme.com"

# 按职位和位置
python3 apollo.py search --titles "VP Sales" --locations "San Francisco"

# 限制结果数量
python3 apollo.py search --titles "Engineer" --domain "google.com" --limit 10
```

## 示例提示

- *"使用 Apollo 富化 john@acme.com"*
- *"获取 stripe.com 的公司信息"*
- *"查找纽约的金融科技公司的 CTO"*
- *"批量富化此联系人列表"*
- *"Notion 的员工数量和收入是多少？"*

## 返回的数据

**个人富化：**
- 姓名、职位、标题
- 电子邮件（工作和个人）
- 电话（直拨和移动）
- 公司、行业
- LinkedIn URL
- 位置

**公司富化：**
- 名称、域名、徽标
- 行业、关键词
- 员工数量、收入
- 融资轮次、投资者
- 使用的技术
- 社交链接

## 积分

Apollo 使用积分进行富化。在 [apollo.io/settings/credits](https://app.apollo.io/#/settings/credits) 查看您的使用情况。
