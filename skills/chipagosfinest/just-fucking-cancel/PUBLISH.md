# 将 just-fucking-cancel 发布到 ClawdHub

## 署名信息
- **原始作者**: https://github.com/rohunvora/just-fucking-cancel by @rohunvora
- **为 ClawdBot 适配**: @chipagosfinest
- **主要由 Claude 编写**: (Anthropic)

## 发布命令

```bash
# 1. 安装 ClawdHub CLI（如果尚未安装）
npm i -g clawdhub

# 2. 登录 ClawdHub
clawdhub login

# 3. 发布技能
cd /path/to/clawdbot-railway
clawdhub publish ./skills/just-fucking-cancel \
  --slug just-fucking-cancel \
  --name "just-fucking-cancel" \
  --version 1.0.0 \
  --changelog "初始发布 - 订阅审核与取消技能。

最初由 rohunvora 创建 (https://github.com/rohunvora/just-fucking-cancel)。
由 @chipagosfinest 为 ClawdBot 适配。
主要由 Claude 编写。

功能特点：
- 分析银行 CSV 导出文件以查找定期扣费
- 交互式分类（取消/调查/保留）
- 带隐私切换功能的 HTML 审核报告
- 浏览器自动化实现取消操作
- 50+ 常见服务的取消链接

如有需要，请在 X 上联系 @chipagosfinest。"
```

## 发布后

该技能将可在以下地址访问：
```
https://clawdhub.com/chipagosfinest/just-fucking-cancel
```

添加到任何 clawdbot.json 中：
```json
"just-fucking-cancel": {
  "location": "https://clawdhub.com/chipagosfinest/just-fucking-cancel"
}
```

或通过 CLI 安装：
```bash
clawdhub install chipagosfinest/just-fucking-cancel
```
