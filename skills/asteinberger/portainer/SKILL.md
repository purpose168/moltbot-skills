---
name: portainer
description: 通过 Portainer API 控制 Docker 容器和堆栈。列出容器、启动/停止/重启容器、查看日志，以及从 Git 重新部署堆栈。
metadata: {"clawdbot":{"requires":{"bins":["curl","jq"],"env":["PORTAINER_API_KEY"]},"primaryEnv":"PORTAINER_API_KEY"}}
---

# Portainer 技能

```
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   P O R T A I N E R   C O N T R O L   C L I              ║
    ║                                                           ║
    ║       通过 Portainer API 管理 Docker 容器                 ║
    ║            启动、停止、部署、重新部署                      ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
```

> *"Docker 容器？荷叶上的事，我来处理。"*

---

## 此技能功能介绍

**Portainer 技能**让您通过 Portainer 的 REST API 控制 Docker 基础设施。无需接触 Web UI，即可管理容器、堆栈和部署。

**功能特性：**
- **状态** — 检查 Portainer 服务器状态
- **端点** — 列出所有 Docker 环境
- **容器** — 列出、启动、停止、重启容器
- **堆栈** — 列出和管理 Docker Compose 堆栈
- **重新部署** — 从 Git 拉取并重新部署堆栈
- **日志** — 查看容器日志

---

## 环境要求

| 所需项 | 详情 |
|------|---------|
| **Portainer** | 2.x 版本，支持 API 访问 |
| **工具** | `curl`, `jq` |
| **认证** | API 访问令牌 |

### 设置步骤

1. **从 Portainer 获取 API 令牌：**
   - 登录 Portainer Web UI
   - 点击用户名 → 我的账户
   - 滚动到"访问令牌" → 添加访问令牌
   - 复制令牌（再次无法查看！）

2. **配置凭据：**
   ```bash
   # 添加到 ~/.clawdbot/.env
   PORTAINER_URL=https://your-portainer-server:9443
   PORTAINER_API_KEY=ptr_your_token_here
   ```

3. **准备就绪！**

---

## 命令

### `status` — 检查 Portainer 服务器

```bash
./portainer.sh status
```

**输出：**
```
Portainer v2.27.3
```

---

### `endpoints` — 列出环境

```bash
./portainer.sh endpoints
```

**输出：**
```
3: portainer (local) - online
4: production (remote) - online
```

---

### `containers` — 列出容器

```bash
# 列出默认端点（4）上的容器
./portainer.sh containers

# 列出特定端点上的容器
./portainer.sh containers 3
```

**输出：**
```
steinbergerraum-web-1    running    Up 2 days
cora-web-1               running    Up 6 weeks
minecraft                running    Up 6 weeks (healthy)
```

---

### `stacks` — 列出所有堆栈

```bash
./portainer.sh stacks
```

**输出：**
```
25: steinbergerraum - active
33: cora - active
35: minecraft - active
4: pulse-website - inactive
```

---

### `stack-info` — 堆栈详情

```bash
./portainer.sh stack-info 25
```

**输出：**
```json
{
  "Id": 25,
  "Name": "steinbergerraum",
  "Status": 1,
  "EndpointId": 4,
  "GitConfig": "https://github.com/user/repo",
  "UpdateDate": "2026-01-25T08:44:56Z"
}
```

---

### `redeploy` — 拉取并重新部署堆栈

```bash
./portainer.sh redeploy 25
```

**输出：**
```
Stack 'steinbergerraum' redeployed successfully
```

此操作将：
1. 从 Git 拉取最新代码
2. 必要时重建容器
3. 重启堆栈

---

### `start` / `stop` / `restart` — 容器控制

```bash
# 启动容器
./portainer.sh start steinbergerraum-web-1

# 停止容器
./portainer.sh stop steinbergerraum-web-1

# 重启容器
./portainer.sh restart steinbergerraum-web-1

# 指定端点（默认：4）
./portainer.sh restart steinbergerraum-web-1 4
```

**输出：**
```
Container 'steinbergerraum-web-1' restarted
```

---

### `logs` — 查看容器日志

```bash
# 最后 100 行（默认）
./portainer.sh logs steinbergerraum-web-1

# 最后 50 行
./portainer.sh logs steinbergerraum-web-1 4 50
```

---

## 典型工作流程

### "部署网站更新"
```bash
# 合并 PR 后
./portainer.sh redeploy 25
./portainer.sh logs steinbergerraum-web-1 4 20
```

### "调试容器"
```bash
./portainer.sh containers
./portainer.sh logs cora-web-1
./portainer.sh restart cora-web-1
```

### "系统概览"
```bash
./portainer.sh status
./portainer.sh endpoints
./portainer.sh containers
./portainer.sh stacks
```

---

## 故障排除

### "需要身份验证 / 未找到仓库"

**问题：** 堆栈重新部署失败，显示 git 身份验证错误

**解决方案：** 堆栈需要 `repositoryGitCredentialID` 参数。脚本通过从现有堆栈配置中读取自动处理此问题。

---

### "未找到容器"

**问题：** 容器名称不匹配

**解决方案：** 使用 `./portainer.sh containers` 中的精确名称：
- 包含完整名称：`steinbergerraum-web-1` 而不是 `steinbergerraum`
- 名称区分大小写

---

### "必须设置 PORTAINER_URL 和 PORTAINER_API_KEY"

**问题：** 未配置凭据

**解决方案：**
```bash
# 添加到 ~/.clawdbot/.env
echo "PORTAINER_URL=https://your-server:9443" >> ~/.clawdbot/.env
echo "PORTAINER_API_KEY=ptr_your_token" >> ~/.clawdbot/.env
```

---

## 与 Clawd 的集成

```
"重新部署网站"
-> ./portainer.sh redeploy 25

"显示运行中的容器"
-> ./portainer.sh containers

"重启 Minecraft 服务器"
-> ./portainer.sh restart minecraft

"我们有哪些堆栈？"
-> ./portainer.sh stacks
```

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | 初始发布 |

---

## 致谢..@
 (----

```
  @)
( >__< )   "容器不过是代码跳跃的华丽荷叶罢了！"
 ^^  ^^
```

**作者：** Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 协助）  
**技术支持：** [Portainer](https://portainer.io/) API  
**所属：** [Clawdbot](https://clawdhub.com) 技能集合

---

<div align="center">

**用 为 Clawdbot 社区制作**

*Ribbit!*

</div>
