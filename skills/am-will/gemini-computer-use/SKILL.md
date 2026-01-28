---
name: gemini-computer-use
description: 使用 Playwright 构建和运行 Gemini 2.5 计算机使用浏览器控制智能体。当用户想要通过 Gemini 计算机使用模型自动化网页浏览器任务、需要智能体循环（截图 → function_call → action → function_response），或要求集成风险 UI 操作的安全确认时使用。
---

# Gemini 计算机使用

## 快速开始

1. 来源环境文件并设置您的 API 密钥：

   ```bash
   cp env.example env.sh
   $EDITOR env.sh
   source env.sh
   ```

2. 创建虚拟环境并安装依赖：

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install google-genai playwright
   playwright install chromium
   ```

3. 使用提示运行智能体脚本：

   ```bash
   python scripts/computer_use_agent.py \
     --prompt "Find the latest blog post title on example.com" \
     --start-url "https://example.com" \
     --turn-limit 6
   ```

## 浏览器选择

- 默认：Playwright 捆绑的 Chromium（无需环境变量）。
- 使用 `COMPUTER_USE_BROWSER_CHANNEL` 选择频道（Chrome/Edge）。
- 使用 `COMPUTER_USE_BROWSER_EXECUTABLE` 使用自定义基于 Chromium 的可执行文件（例如 Brave）。

如果两者都设置，`COMPUTER_USE_BROWSER_EXECUTABLE` 优先。

## 核心工作流程（智能体循环）

1. 捕获截图并将用户目标 + 截图发送给模型。
2. 解析响应中的 `function_call` 操作。
3. 在 Playwright 中执行每个操作。
4. 如果 `safety_decision` 是 `require_confirmation`，在执行前提示用户。
5. 发送包含最新 URL + 截图的 `function_response` 对象。
6. 重复直到模型只返回文本（无操作）或达到轮次限制。

## 操作指南

- 在沙盒浏览器配置文件或容器中运行。
- 使用 `--exclude` 阻止您不希望模型执行的风险操作。
- 保持视口为 1440x900，除非您有理由更改它。

## 资源

- 脚本：`scripts/computer_use_agent.py`
- 参考笔记：`references/google-computer-use.md`
- 环境模板：`env.example`