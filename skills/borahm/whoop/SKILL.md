---
name: whoop
description: 从 Whoop API 检索您的训练和生理周期数据。显示最近训练详情、负荷、慢性负荷、急性负荷和 HSC（硬度分数计算）。
metadata:
  clawdbot:
    config:
      requiredEnv:
        - WHOOP_API_TOKEN
---

# Whoop 技能

🏋️ 通过 Whoop API 检索您的训练和生理周期数据。

此技能提供对 Whoop 数据的即时访问，支持：
- 训练历史
- 周期数据（睡眠、恢复、心率变异性）
- 负荷指标（训练负荷、慢性负荷、急性负荷）
- HSC（硬度分数计算）

## 设置

### 获取 Whoop API 令牌

Whoop 目前不提供公共 API。但您可以：

1. **登录 Whoop Web 界面**（https://app.whoop.com）
2. **打开开发者工具**（F12）
3. **复制访问令牌**：
   - 转到 Network（网络）标签
   - 刷新页面
   - 找到任意请求的 Authorization 头
   - 复制 Bearer 令牌

### 配置环境变量

添加到 `~/.clawdbot/clawdbot.json`：

```json
{
  "skills": {
    "entries": {
      "whoop": {
        "enabled": true,
        "env": {
          "WHOOP_API_TOKEN": "您的 Whoop 访问令牌"
        }
      }
    }
  }
}
```

或使用环境变量：

```bash
export WHOOP_API_TOKEN="您的访问令牌"
```

## 使用方法

### 获取今天的恢复和睡眠

```bash
# 使用相对日期（今天）
node bin/whoop.js recovery today

# 使用相对日期（昨天）
node bin/whoop.js recovery yesterday

# 使用具体日期
node bin/whoop.js recovery 2024-01-15
```

### 获取今天的训练

```bash
node bin/whoop.js workout today
```

### 获取周期数据

```bash
# 显示本周周期数据
node bin/whoop.js cycle this_week

# 显示上周周期数据
node bin/whoop.js cycle last_week

# 显示特定日期的周期数据
node bin/whoop.js cycle 2024-01-15
```

### 获取负荷数据

```bash
# 显示本周负荷
node bin/whoop.js load this_week

# 显示历史负荷
node bin/whoop.js load last_30_days
```

### 交互式模式

直接运行获取今天的概览：

```bash
node bin/whoop.js
```

## 数据说明

### 恢复（Recovery）

恢复分数反映您的身体准备程度：
- **0-33%**：低恢复 - 建议休息或轻松训练
- **34-66%**：中等恢复 - 可进行正常训练
- **67-100%**：高恢复 - 适合高强度训练

包含指标：
- 心率变异性（HRV）
- 静息心率（RHR）
- 睡眠表现
- 呼吸率

### 训练（Workout）

训练数据包括：
- 活动类型（跑步、骑行、力量训练等）
- 训练时长
- 消耗卡路里
- 平均心率和最大心率
- 峰值心率区域时间

### 周期（Cycle）

周期数据总结您的每日恢复和睡眠：
- 每日恢复分数
- 睡眠时长和质量
- 睡眠一致性

### 负荷（Load）

训练负荷指标：
- **训练负荷**：单次训练的努力程度
- **慢性负荷（ATL）**：过去 7 天的平均训练负荷
- **急性负荷（ITL）**：过去一天的负荷
- **ACWR**：急慢性负荷比，用于评估训练压力

### HSC（硬度分数计算）

HSC 是急性负荷与慢性负荷的比值：
- **< 0.80**：恢复不足 - 建议减少训练
- **0.80-1.30**：最佳范围 - 适合继续当前训练
- **> 1.30**：过度训练风险 - 建议减少训练

## 示例输出

### 恢复示例

```
📊 2024年1月15日恢复

恢复分数: 85%
━━━━━━━━━━━━━━━━━━━━
心率变异性 (HRV): 62 ms
静息心率 (RHR): 48 bpm
睡眠表现: 92%
呼吸率: 14 rpm

建议: 高恢复日！适合高强度训练。
```

### 训练示例

```
🏋️ 力量训练 - 2024年1月15日
━━━━━━━━━━━━━━━━━━━━
时长: 45分钟
消耗: 420 kcal
平均心率: 135 bpm
最大心率: 168 bpm

峰值心率区域:
  Zone 5 (90-100%): 5分钟
  Zone 4 (80-90%): 12分钟
```

## 常见问题

### 令牌过期

如果收到 401 错误，您的令牌可能已过期。请重新获取新的访问令牌。

### 没有数据

某些日期可能没有恢复或训练数据。系统会自动跳过这些日期。

### 速率限制

Whoop API 可能有速率限制。如果遇到错误，请稍后再试。

## 链接

- Whoop Web: https://app.whoop.com
- Whoop 开发者资源: https://www.whoop.com/developers
