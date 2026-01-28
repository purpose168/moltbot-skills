---
name: charger
description: 通过 Google Places 检查电动汽车充电器的可用性（收藏夹、附近搜索）。
metadata:
  clawdbot:
    config:
      requiredEnv:
        - GOOGLE_PLACES_API_KEY
      stateDirs:
        - config
        - .cache
---

# charger

基于 Google Places（新版）电动汽车充电器数据构建的高级充电器检查器。

此技能包含一个 `bin/charger` 命令行工具（Node.js），用于检查充电器可用性。

## 设置

- 环境要求：
  - Node.js 18+（Clawdbot 已自带）
  - `GOOGLE_PLACES_API_KEY`（建议放在 `~/.clawdbot/.env` 中）

- 将命令行工具添加到 PATH（示例）：
  - `ln -sf "$(pwd)"/bin/charger /home/claw/clawd/bin/charger`

- 添加收藏夹：
  - `charger favorites add home --place-id <placeId>`

## 命令

- 检查收藏夹/地点 ID/查询：
  - `charger check home`
  - `charger check "Wien Energie Charging Station Liniengasse 2 1060 Wien"`

- 查找附近：
  - `charger nearby --lat 48.188472 --lng 16.348854 --radius 2000 --max 10`

## 通知

推荐的工作模式：

1) `charger`（此技能）产生清晰的 `Any free: YES|NO` 结果。
2) 计划任务（Gateway cron）运行一个小型辅助脚本，仅在应该通知时输出内容。

### 辅助脚本（实际决定是否通知）

此包包含 `scripts/charger-notify.sh`。

功能说明：
- 运行 `charger check <target>`
- 如果 `Any free: YES` **且** 上次运行结果不是 `YES`，则打印一条通知
- 否则**不打印任何内容**

所以：**无输出 = 无通知**。

状态管理：
- 将最后状态存储在 `~/.cache/charger-notify/<target>.state`，因此仅在状态变化 `NO/UNKNOWN → YES` 时发送通知。

使用方法：
- `bash scripts/charger-notify.sh home`

示例通知输出：
- `EV charger available: Tanke Wien Energie Charging Station — Amtshausgasse 9, 1050 Wien, Austria — 1/2 available (OOS 0) (updated 2026-01-21T21:05:00Z)`

### 典型 cron 计划（如何接收 Telegram 通知）

Cron 是调度器。它按计时器运行辅助脚本，并将脚本输出的内容发送给您。
因为辅助脚本**仅在可用性变化时输出**，所以您只在重要时刻收到消息。

每 10 分钟检查：
- `*/10 * * * *`

如果您想将此集成到 Clawdbot Gateway cron（以便接收 Telegram 通知），请告诉我：
- 目标（`home`）
- 间隔（每 5/10/20 分钟）
- 静默时间（可选）
