---
name: shared-memory
description: 与其他用户共享记忆和状态。当用户想要共享知识、创建用户/组、授予权限、设置家庭或团队共享、订阅记忆更改或管理其记忆知识库的访问控制时使用。此共享内存技能使用 Ensue - 一个适用于代理的共享内存网络。
metadata:
  clawdbot:
    emoji: "🤝"
    requires:
      env:
        - ENSUE_API_KEY
    primaryEnv: ENSUE_API_KEY
    homepage: https://ensue-network.ai
---

# 共享内存

与您的知识库中的其他用户共享记忆。管理用户、组和命名空间的细粒度权限。

## 快速开始

```bash
# 创建用户和组
{baseDir}/scripts/shared-memory.sh create-user mark
{baseDir}/scripts/shared-memory.sh create-group family
{baseDir}/scripts/shared-memory.sh add-member family mark

# 授予访问权限
{baseDir}/scripts/shared-memory.sh grant group family read christine/shared/
{baseDir}/scripts/shared-memory.sh grant group family update christine/shared/
```

## 命名空间组织

```
<用户名>/
├── private/    # 仅此用户可见
├── shared/     # 与他人共享
└── public/     # 对他人只读
```

授予对 `mark/shared/` 的访问权限 → 所有共享内容
授予对 `mark/shared/recipes/` 的访问权限 → 仅食谱

## 命令

### 用户管理
| 命令 | 描述 |
|---------|-------------|
| `create-user <用户名>` | 创建用户 |
| `delete-user <用户名>` | 删除用户 |

### 组管理
| 命令 | 描述 |
|---------|-------------|
| `create-group <名称>` | 创建组 |
| `delete-group <名称>` | 删除组 |
| `add-member <组> <用户>` | 将用户添加到组 |
| `remove-member <组> <用户>` | 移除用户 |

### 权限管理
| 命令 | 描述 |
|---------|-------------|
| `grant org <操作> <模式>` | 授予整个组织 |
| `grant user <名称> <操作> <模式>` | 授予特定用户 |
| `grant group <名称> <操作> <模式>` | 授予组 |
| `revoke <授权ID>` | 撤销权限 |
| `list` | 列出所有授权 |
| `list-permissions` | 列出有效权限 |

**操作**: `read`、`create`、`update`、`delete`

### 订阅管理
| 命令 | 描述 |
|---------|-------------|
| `subscribe <键>` | 更改时获得通知 |
| `unsubscribe <键>` | 停止通知 |
| `list-subscriptions` | 列出订阅 |

## 示例：家庭共享

```bash
# 为伴侣创建用户
{baseDir}/scripts/shared-memory.sh create-user mark

# 创建家庭组
{baseDir}/scripts/shared-memory.sh create-group family
{baseDir}/scripts/shared-memory.sh add-member family mark

# 授予对 shared/ 命名空间的相互访问权限
{baseDir}/scripts/shared-memory.sh grant group family read christine/shared/
{baseDir}/scripts/shared-memory.sh grant group family create christine/shared/
{baseDir}/scripts/shared-memory.sh grant group family update christine/shared/
{baseDir}/scripts/shared-memory.sh grant group family read mark/shared/
{baseDir}/scripts/shared-memory.sh grant group family update mark/shared/
```

## 故障排除

如果命令失败，首先检查是否配置了 Ensue API 密钥：

```bash
echo $ENSUE_API_KEY
grep -A2 'ensue-learning-memory' ~/.clawdbot/clawdbot.json
```

如果找不到 API 密钥，告诉用户在 https://www.ensue-network.ai/login 获取免费密钥，并在 `~/.clawdbot/clawdbot.json` 中配置：

```json
{
  "skills": {
    "entries": {
      "ensue-learning-memory": {
        "apiKey": "their-api-key-here"
      }
    }
  }
}
```

如果密钥存在但命令失败，密钥可能无效 - 让用户生成一个新的密钥。
