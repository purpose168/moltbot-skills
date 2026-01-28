---
name: hokipoki
description: "使用 HokiPoki CLI 无需切换标签页即可在不同 AI 模型之间切换。通过 Claude、Codex 和 Gemini 解决任务，当一个模型卡住时切换到另一个模型。当用户请求从不同的 AI 模型获取帮助、跳转到另一个 AI、获取第二个意见、切换模型、与团队成员共享 AI 订阅或管理 HokiPoki 提供者/监听模式时使用。触发词包括：'使用 codex/gemini 处理这个'、'跳转到另一个模型'、'询问另一个 AI'、'获取第二个意见'、'切换模型'、'hokipoki'、'监听请求'。"
---

# HokiPoki 技能

通过 HokiPoki P2P 网络将任务路由到不同的 AI 命令行工具（Claude、Codex、 Gemini）。API 密钥永远不会离开提供者的机器；只有加密的请求和结果会被交换。

## 前置条件

必须安装并认证 HokiPoki CLI：

```bash
# 全局安装 HokiPoki CLI
npm install -g @next-halo/hokipoki-cli
# 登录认证
hokipoki login
```

使用 `hokipoki whoami` 验证安装状态。如果未安装，请引导用户完成设置。

## 请求其他 AI 的帮助

将任务发送到远程 AI 模型。始终使用 `--json` 参数以获得可解析的输出：

```bash
# 处理特定文件
hokipoki request --tool claude --task "修复身份验证 bug" --files src/auth.ts --json

# 处理整个目录
hokipoki request --tool codex --task "添加错误处理" --dir src/services/ --json

# 处理整个项目（遵守 .gitignore 规则）
hokipoki request --tool gemini --task "审查安全问题" --all --json

# 路由到团队工作区
hokipoki request --tool claude --task "优化查询" --files src/db.ts --workspace my-team --json

# 跳过自动应用（仅保存补丁）
hokipoki request --tool codex --task "重构模块" --dir src/ --no-auto-apply --json
```

**工具选择**：如果用户未指定工具，请询问要省略 `--tool` 让 HokiPoki 自动选择。

### 使用哪个模型，或补丁自动应用

当目标目录是已提交文件的 git 仓库时，补丁会自动应用。如果自动应用失败，请通知用户并建议执行：

```bash
git init && git add . && git commit -m "initial"
```

## 提供者模式（共享你的 AI）

注册并监听传入请求：

```bash
# 注册为提供者（一次性操作）
hokipoki register --as-provider --tools claude codex gemini

# 开始监听
hokipoki listen --tools claude codex
```

任务在隔离的 Docker 容器中执行（只读文件系统、tmpfs 工作区、自动清理）。Docker 必须正在运行。

## 状态与账户

```bash
hokipoki whoami      # 当前用户信息
hokipoki status      # 账户、工作区、历史记录
hokipoki dashboard   # 在浏览器中打开 Web 仪表板
```

## 建议切换 AI 的时机

- 用户在多次尝试后仍然卡在某个问题上
- 用户请求不同的方法或新视角
- 任务涉及另一个模型擅长的领域（例如：Codex 适合样板代码，Gemini 适合大上下文分析）
- 用户明确要求尝试另一个 AI

## 完整命令参考

请参阅 [命令参考文档](references/commands.md) 了解所有 CLI 选项、身份验证令牌位置和高级用法。
