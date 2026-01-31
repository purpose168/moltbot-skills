---
name: private-connect
description: 从任何地方按名称访问私有服务。无需 VPN 或 SSH 隧道。
homepage: https://privateconnect.co
repository: https://github.com/treadiehq/private-connect
author: Treadie
gating:
  binary: connect
---

# Private Connect

从任何地方按名称访问私有服务。无需 VPN 或 SSH 隧道。

## 功能

Private Connect 允许您使用简单的名称而不是 IP 和端口来访问私有基础设施（数据库、API、GPU 集群）。在几秒钟内与队友共享您的开发环境。

## 命令

### connect_reach
按名称连接到私有服务。

**示例：**
- "连接到临时数据库"
- "访问生产 API"
- "连接到 jupyter-gpu"

### connect_status
显示可用服务及其连接状态。

**示例：**
- "有哪些服务可用？"
- "显示我已连接的服务"
- "临时数据库在线吗？"

### connect_share
与队友共享您当前的环境。

**示例：**
- "共享我的环境"
- "创建一个 7 天后过期的共享链接"
- "与团队共享我的设置一周"

### connect_join
加入来自队友的共享环境。

**示例：**
- "加入共享代码 x7k9m2"
- "连接到 Bob 的环境"

### connect_clone
克隆队友的整个环境设置。

**示例：**
- "克隆 Alice 的环境"
- "像高级开发人员一样设置我的环境"

### connect_list_shares
列出活动的环境共享。

**示例：**
- "显示我活动的共享"
- "我正在共享哪些环境？"

### connect_revoke
撤销共享的环境。

**示例：**
- "撤销共享 x7k9m2"
- "停止与承包商共享"

## 设置

1. 安装 Private Connect：
```bash
curl -fsSL https://privateconnect.co/install.sh | bash
```

2. 身份验证：
```bash
connect up
```

3. 技能将使用您已身份验证的会话。

## 要求

- 已安装并通过身份验证的 Private Connect CLI
- `connect` 命令在 PATH 中可用
