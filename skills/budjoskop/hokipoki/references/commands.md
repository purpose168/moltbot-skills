# HokiPoki CLI 命令参考

## 身份验证

| 命令 | 功能描述 |
|------|---------|
| `hokipoki login` | 身份验证（打开浏览器） |
| `hokipoki logout` | 清除本地身份验证 |
| `hokipoki whoami` | 显示当前用户 |

## 请求（请求者模式）

```
hokipoki request --tool <工具> --task "<任务描述>" [选项]
```

| 选项 | 功能描述 |
|------|---------|
| `--tool <工具>` | AI 工具：`claude`、`codex`、`gemini` |
| `--task <任务>` | 任务描述 |
| `--files <文件...>` | 要包含的特定文件 |
| `--dir <目录...>` | 要递归包含的目录 |
| `--all` | 包含整个代码库（遵守 .gitignore 规则） |
| `--workspace <标识符>` | 路由到特定的团队工作区 |
| `--no-auto-apply` | 保存补丁但不应用 |
| `--json` | JSON 格式输出，用于程序处理 |
| `--interactive` | 交互模式（仅限人工终端使用，**不适合代理使用**） |

## 提供者模式

```bash
# 注册（一次性操作）
hokipoki register --as-provider --tools claude codex gemini

# 监听请求
hokipoki listen --tools claude codex
```

## 状态查询

```bash
hokipoki status      # 账户信息、工作区、历史记录
hokipoki dashboard   # 打开 Web 仪表板
```

## Shell 补全

```bash
hokipoki completion --install   # 一次性设置
exec $SHELL                     # 重启 Shell
```

## 令牌位置

| 工具 | 身份验证命令 | 令牌位置 |
|------|------------|---------|
| Claude | `claude setup-token` | `~/.hokipoki/` |
| Codex | `codex login` | `~/.codex/auth.json` |
| Gemini | `gemini` | `~/.gemini/oauth_creds.json` |

**自动刷新**：`hokipoki listen` 会在令牌过期时自动触发重新认证。

## Codex 沙盒修复

Codex 默认情况下会阻止 `.git/` 写入。在 `~/.codex/config.toml` 中添加以下配置：

```toml
[sandbox_workspace_write]
writable_roots = [".git"]
```

## 安全模型

- 端到端加密的 P2P 连接
- LUKS 加密的 Docker 容器
- 一次性令牌的临时 git 服务器
- 任务完成后不保留任何代码
- 每次任务后自动清除容器内存
- API 密钥永远不会离开提供者的机器
