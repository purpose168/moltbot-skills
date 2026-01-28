---
name: deepwork-tracker
description: 本地跟踪深度工作会话（开始/停止/状态），并生成 GitHub 贡献图风格的每日分钟热力图以便分享（例如通过 Telegram）。当用户说"开始深度工作"、"停止深度工作"、"我在会话中吗？"、"显示我的深度工作图"或要求查看深度工作历史时使用。
---

# 深度工作追踪器

使用位于 `~/clawd/deepwork/deepwork.js` 的本地深度工作应用（SQLite 支持）。

## 引导（如果脚本缺失）

如果 `~/clawd/deepwork/deepwork.js` 不存在，请从公共仓库引导：

```bash
mkdir -p ~/clawd
cd ~/clawd

# 如果缺失则克隆
[ -d ~/clawd/deepwork-tracker/.git ] || git clone https://github.com/adunne09/deepwork-tracker.git ~/clawd/deepwork-tracker

# 确保预期的运行时路径存在
mkdir -p ~/clawd/deepwork
cp -f ~/clawd/deepwork-tracker/app/deepwork.js ~/clawd/deepwork/deepwork.js
chmod +x ~/clawd/deepwork/deepwork.js
```

（如果克隆/复制失败，不要让用户请求失败——仍然尝试其他步骤并报告缺少什么。）

## 命令

通过 exec 运行：

- 开始会话（同时启动 macOS Clock 计时器；默认目标 60 分钟）：
  - `~/clawd/deepwork/deepwork.js start --target-min 60`
- 停止会话：
  - `~/clawd/deepwork/deepwork.js stop`
- 检查状态：
  - `~/clawd/deepwork/deepwork.js status`
- 生成报告：
  - 最近 7 天（默认）：`~/clawd/deepwork/deepwork.js report --days 7 --format text`
  - 准备发送到 Telegram 的最近 7 天：`~/clawd/deepwork/deepwork.js report --days 7 --format telegram`
  - 热力图（可选）：`~/clawd/deepwork/deepwork.js report --mode heatmap --weeks 52 --format telegram`

## 聊天工作流程

### 开始深度工作
1) 运行 `~/clawd/deepwork/deepwork.js start --target-min 60`（如果用户指定其他目标则使用该值）。
2) 这也应该为目标持续时间启动 macOS Clock 计时器（尽力而为；可能需要辅助功能权限）。
3) 用确认行回复。

### 停止深度工作
1) 运行 `~/clawd/deepwork/deepwork.js stop`。
2) 用持续时间回复。

### 显示深度工作图
1) 运行 `~/clawd/deepwork/deepwork.js report --days 7 --format telegram`。
2) **始终发送**输出到 Telegram 上的 Alex（ID `8551040296`），使用 `message` 工具并使用 Markdown 等宽代码块。
3) 可选地在当前聊天中确认已发送。

如果用户需要不同的范围，支持 `--days 7|14|30|60`。
（当明确请求时，热力图仍可通过 `--mode heatmap --weeks ...` 使用。）