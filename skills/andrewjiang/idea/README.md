# 创意探索技能

启动独立的 Claude Code 会话来深入探索商业创意。

## 安装

1. 将脚本复制到您的脚本目录：
   ```bash
   cp scripts/*.sh ~/clawd/scripts/
   chmod +x ~/clawd/scripts/explore-idea.sh
   chmod +x ~/clawd/scripts/notify-research-complete.sh
   ```

2. 复制模板：
   ```bash
   cp templates/idea-exploration-prompt.md ~/clawd/templates/
   ```

3. 安装技能：
   ```bash
   mkdir -p ~/clawdis/skills/idea-exploration
   cp SKILL.md ~/clawdis/skills/idea-exploration/
   ```

4. 添加到您的 AGENTS.md：
   ```markdown
   **当用户说"Idea: [描述]":**
   1. 提取创意描述
   2. 执行: `CLAWD_SESSION_KEY="main" ~/clawd/scripts/explore-idea.sh "[创意]"`
   3. 确认: "创意探索已开始。完成后您将收到通知。"
   ```

## 要求

- `claude` CLI（Claude Code）
- `tmux`
- `telegram` CLI（supertelegram）- 用于通知
- Clawdbot（可选，用于 cron 通知）

## 使用方法

说: `Idea: [您的创意描述]`

助手将：
1. 在 tmux 中启动 Claude Code 会话
2. 研究和分析创意
3. 将结果保存到 `~/clawd/ideas/<slug>/research.md`
4. 将文件发送到 Telegram 保存的消息
5. 完成后通知您

## 自定义

编辑 `templates/idea-exploration-prompt.md` 更改分析框架。

编辑 `scripts/explore-idea.sh` 更改输出路径或行为。
