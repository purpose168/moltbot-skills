---
name: github-pr
description: 在本地获取、预览、合并和测试 GitHub PR。非常适合在合并前尝试上游 PR。
homepage: https://cli.github.com
metadata:
  clawdhub:
    emoji: "🔀"
    requires:
      bins: ["gh", "git"]
---

# GitHub PR 工具

在本地获取和合并 GitHub 拉取请求到你的分支。非常适合：
- 在合并前尝试上游 PR
- 将开放 PR 中的功能整合到你的分叉中
- 在本地测试 PR 兼容性

## 前提条件

- `gh` CLI 已认证 (`gh auth login`)
- 配置了远程仓库的 Git 仓库

## 命令

### 预览 PR
```bash
github-pr preview <owner/repo> <pr-number>
```
显示 PR 标题、作者、状态、更改的文件、CI 状态和最近的评论。

### 在本地获取 PR 分支
```bash
github-pr fetch <owner/repo> <pr-number> [--branch <name>]
```
将 PR 头部获取到本地分支（默认：`pr/<number>`）。

### 合并 PR 到当前分支
```bash
github-pr merge <owner/repo> <pr-number> [--no-install]
```
获取并合并 PR。可选地在合并后运行安装。

### 完整测试周期
```bash
github-pr test <owner/repo> <pr-number>
```
获取、合并、安装依赖并运行构建 + 测试。

## 示例

```bash
# 预览来自 clawdbot 的 MS Teams PR
github-pr preview clawdbot/clawdbot 404

# 在本地获取
github-pr fetch clawdbot/clawdbot 404

# 合并到当前分支
github-pr merge clawdbot/clawdbot 404

# 或执行完整测试周期
github-pr test clawdbot/clawdbot 404
```

## 注意事项

- PR 默认从 `upstream` 远程获取
- 使用 `--remote <name>` 指定不同的远程
- 合并冲突必须手动解决
- `test` 命令自动检测包管理器（npm/pnpm/yarn/bun）
