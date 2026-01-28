# 常见商户映射

难以自动分类的商户的覆盖规则。

## 瑞士商户

| 商户模式 | 类别 | 备注 |
|---------|------|------|
| COOP、COOP CITY | 杂货 | 瑞士超市连锁 |
| MIGROS、M-BUDGET | 杂货 | 瑞士超市连锁 |
| DENNER | 杂货 | 折扣超市 |
| ALDI SUISSE | 杂货 | 折扣超市 |
| LIDL | 杂货 | 折扣超市 |
| MANOR | 购物 | 百货商店（非 Manor Food）|
| MANOR FOOD | 杂货 | Manor 食品区 |
| SBB、CFF、FFS | 交通 | 瑞士联邦铁路 |
| POSTFINANCE | 转账 | 瑞士邮政银行 |
| TWINT | 转账 | 瑞士移动支付 |
| SWISSCOM | 水电费 | 电信 |
| SUNRISE | 水电费 | 电信 |
| SALT | 水电费 | 电信 |
| EWZ | 水电费 | 苏黎世电力 |
| CSS、HELSANA、SWICA | 健康 | 健康保险 |
| CEMBRA | 其他 | 信用卡费用 |

## 国际商户

| 商户模式 | 类别 | 备注 |
|---------|------|------|
| AMAZON | 购物 | 除非明显是杂货 |
| APPLE.COM/BILL | 订阅 | App Store、iCloud 等 |
| GOOGLE *SERVICES | 订阅 | Google One、YouTube Premium |
| PAYPAL *SPOTIFY | 订阅 | 通过 PayPal 的 Spotify |
| NETFLIX.COM | 订阅 | 流媒体 |
| UBER、UBER EATS | 交通 或 外出就餐 | 检查金额：<20 = 交通 |
| BOOKING.COM | 旅行 | 酒店 |
| AIRBNB | 旅行 | 住宿 |
| RYANAIR、EASYJET | 旅行 | 廉价航空公司 |

## 模糊商户

这些需要用户确认：

| 商户 | 可能是 | 消除歧义 |
|------|--------|----------|
| STARBUCKS | 外出就餐 或 杂货 | 店内 = 外出就餐，咖啡豆 = 杂货 |
| IKEA | 购物 或 外出就餐 | 检查金额：>50 = 购物 |
| 加油站 | 交通 或 杂货 | 商店购买 vs 燃油 |
| 药店 | 健康 或 杂货 | 药品 = 健康，洗漱用品 = 杂货 |

## 添加覆盖

当用户对商户进行分类时，保存到状态：

```bash
python -m watch_my_money set-merchant "WEIRD MERCHANT NAME" --category shopping
```

或在 `analyze` 期间交互式进行：
```
未知商户：ACME CORP（3 笔交易，450 瑞士法郎）
类别？[groceries/shopping/other/skip]：shopping
→ 已保存覆盖以供将来运行
```
