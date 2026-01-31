---
name: meshguard
description: 管理网格防护 AI 代理治理 - 代理、策略、审计日志和监控。
metadata: {"clawdbot":{"requires":{"bins":["curl","jq"]}}}
---

# 网格防护

AI 代理治理平台。管理代理、策略、审计日志，并监控您的网格防护实例。

## 设置

首次设置 — 运行向导：
```bash
bash skills/meshguard/scripts/meshguard-setup.sh
```
这会将配置保存到 `~/.meshguard/config`（URL、API 密钥、管理员令牌）。

## 环境变量

| 变量 | 描述 |
|----------|-------------|
| `MESHGUARD_URL` | 网关 URL（默认：`https://dashboard.meshguard.app`） |
| `MESHGUARD_API_KEY` | 用于认证请求的 API 密钥 |
| `MESHGUARD_ADMIN_TOKEN` | 用于组织管理和注册的管理员令牌 |

配置文件 `~/.meshguard/config` 会被 CLI 自动加载。

## CLI 使用

所有命令都通过包装脚本执行：
```bash
bash skills/meshguard/scripts/meshguard-cli.sh <command> [args...]
```

### 状态检查
```bash
meshguard-cli.sh status
```
返回网关健康状态、版本和连接性。

### 代理管理
```bash
meshguard-cli.sh agents list                          # 列出组织中的所有代理
meshguard-cli.sh agents create <name> --tier <tier>   # 创建代理（等级：free|pro|enterprise）
meshguard-cli.sh agents get <agent-id>                # 获取代理详情
meshguard-cli.sh agents delete <agent-id>             # 删除代理
```

### 策略管理
```bash
meshguard-cli.sh policies list                        # 列出所有策略
meshguard-cli.sh policies create <yaml-file>          # 从 YAML 文件创建策略
meshguard-cli.sh policies get <policy-id>             # 获取策略详情
meshguard-cli.sh policies delete <policy-id>          # 删除策略
```

策略 YAML 格式：
```yaml
name: rate-limit-policy
description: Limit agent calls to 100/min
rules:
  - type: rate_limit
    max_requests: 100
    window_seconds: 60
  - type: content_filter
    block_categories: [pii, credentials]
```

### 审计日志
```bash
meshguard-cli.sh audit query                              # 最近的审计事件
meshguard-cli.sh audit query --agent <name>               # 按代理过滤
meshguard-cli.sh audit query --action <action>            # 按操作类型过滤
meshguard-cli.sh audit query --limit 50                   # 限制结果数量
meshguard-cli.sh audit query --agent X --action Y --limit N  # 组合过滤
```

操作类型：`agent.create`, `agent.delete`, `policy.create`, `policy.update`, `policy.delete`, `auth.login`, `auth.revoke`

### 自助注册
```bash
meshguard-cli.sh signup --name "Acme Corp" --email admin@acme.com
```
创建新组织并返回 API 凭证。需要 `MESHGUARD_ADMIN_TOKEN`。

## 工作流示例

**使用策略注册新代理：**
1. 创建代理：`meshguard-cli.sh agents create my-agent --tier pro`
2. 创建策略：`meshguard-cli.sh policies create policy.yaml`
3. 验证：`meshguard-cli.sh agents list`

**调查代理活动：**
1. 查询日志：`meshguard-cli.sh audit query --agent my-agent --limit 20`
2. 检查代理状态：`meshguard-cli.sh agents get <id>`

## API 参考

完整的端点文档请参阅 `skills/meshguard/references/api-reference.md`。
