---
name: dexcom
description: 通过 Dexcom G7/G6 连续血糖监测仪（CGM）监控血糖
homepage: https://www.dexcom.com
metadata: {"clawdbot":{"emoji":"🩸","requires":{"bins":["uv"],"env":["DEXCOM_USER","DEXCOM_PASSWORD"]},"primaryEnv":"DEXCOM_USER","install":[{"id":"uv-brew","kind":"brew","formula":"uv","bins":["uv"],"label":"Install uv (brew)"}]}}
---

# Dexcom 连续血糖监测

通过 Dexcom G6/G7 连续血糖监测仪实时监控血糖。

## 初始设置

设置环境变量：
```bash
export DEXCOM_USER="your@email.com"
export DEXCOM_PASSWORD="your-password"
export DEXCOM_REGION="ous"  # 或 "us"（可选，默认为 "ous"）
```

或在 `~/.clawdbot/clawdbot.json` 中配置：
```json5
{
  skills: {
    "dexcom": {
      env: {
        DEXCOM_USER: "your@email.com",
        DEXCOM_PASSWORD: "your-password",
        DEXCOM_REGION: "ous"
      }
    }
  }
}
```

## 使用方法

**格式化的报告：**
```bash
uv run {baseDir}/scripts/glucose.py now
```

**原始 JSON 数据：**
```bash
uv run {baseDir}/scripts/glucose.py json
```

## 输出示例

```
🩸 血糖: 100 mg/dL (5.6 mmol/L)
📈 趋势: 稳定 ➡️
🎯 状态: 🟢 正常范围
⏰ 2026-01-18 09:30:00
```

## 环境要求

- 启用了 Share 功能的 Dexcom G6 或 G7 设备
- uv（Python 包管理器）
- 有效的 Dexcom Share 凭据
