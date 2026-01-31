---
name: nomad
version: 1.0.0
description: 查询 HashiCorp Nomad 集群。列出作业、节点、分配、评估和服务。用于监控和故障排除的只读操作。
homepage: https://github.com/danfedick/nomad-skill
metadata: {"clawdbot":{"emoji":"📦","requires":{"bins":["nomad"]}}}
---

# Nomad 技能

使用 `nomad` CLI 查询 HashiCorp Nomad 集群。用于监控和故障排除的只读操作。

## 要求

- 已安装 `nomad` CLI
- 设置 `NOMAD_ADDR` 环境变量（默认为 http://127.0.0.1:4646）
- 如果启用了 ACL，需要 `NOMAD_TOKEN`

## 命令

### 作业

列出所有作业：
```bash
nomad job status
```

获取作业详情：
```bash
nomad job status <job-id>
```

作业历史：
```bash
nomad job history <job-id>
```

作业部署：
```bash
nomad job deployments <job-id>
```

### 分配

列出作业的分配：
```bash
nomad job allocs <job-id>
```

分配详情：
```bash
nomad alloc status <alloc-id>
```

分配日志（标准输出）：
```bash
nomad alloc logs <alloc-id>
```

分配日志（标准错误）：
```bash
nomad alloc logs -stderr <alloc-id>
```

跟随日志：
```bash
nomad alloc logs -f <alloc-id>
```

### 节点

列出所有节点：
```bash
nomad node status
```

节点详情：
```bash
nomad node status <node-id>
```

节点分配：
```bash
nomad node status -allocs <node-id>
```

### 评估

列出最近的评估：
```bash
nomad eval list
```

评估详情：
```bash
nomad eval status <eval-id>
```

### 服务

列出服务（Nomad 原生服务发现）：
```bash
nomad service list
```

服务信息：
```bash
nomad service info <service-name>
```

### 命名空间

列出命名空间：
```bash
nomad namespace list
```

### 变量

列出变量：
```bash
nomad var list
```

获取变量：
```bash
nomad var get <path>
```

### 集群

服务器成员：
```bash
nomad server members
```

代理信息：
```bash
nomad agent-info
```

## JSON 输出

对大多数命令添加 `-json` 以获取 JSON 输出：
```bash
nomad job status -json
nomad node status -json
nomad alloc status -json <alloc-id>
```

## 过滤

使用 `-filter` 进行基于表达式的过滤：
```bash
nomad job status -filter='Status == "running"'
nomad node status -filter='Status == "ready"'
```

## 常见模式

### 查找失败的分配
```bash
nomad job allocs <job-id> | grep -i failed
```

### 从最新分配获取日志
```bash
nomad alloc logs $(nomad job allocs -json <job-id> | jq -r '.[0].ID')
```

### 检查集群健康状况
```bash
nomad server members
nomad node status
```

## 环境变量

- `NOMAD_ADDR` — Nomad API 地址（默认: http://127.0.0.1:4646）
- `NOMAD_TOKEN` — 用于身份验证的 ACL 令牌
- `NOMAD_NAMESPACE` — 默认命名空间
- `NOMAD_REGION` — 默认区域
- `NOMAD_CACERT` — TLS 的 CA 证书路径
- `NOMAD_CLIENT_CERT` — TLS 的客户端证书路径
- `NOMAD_CLIENT_KEY` — TLS 的客户端密钥路径

## 注意事项

- 此技能是只读的。不进行作业提交、停止或修改。
- 使用 `nomad-tui` 进行交互式集群管理。
- 对于作业部署，直接使用 `nomad job run <file.nomad.hcl>`。
