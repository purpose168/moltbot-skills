# kubectl 技能

一个兼容 Agent Skills 的技能包，用于在 Kubernetes 集群上执行 kubectl 命令行操作。

## 包含内容

- **SKILL.md** — 主要技能说明（AgentSkills 格式）
- **references/REFERENCE.md** — 完整的命令参考
- **scripts/** — 用于常见工作流的辅助脚本
  - `kubectl-pod-debug.sh` — 全面的 Pod 调试
  - `kubectl-deploy-update.sh` — 带监控的安全部署镜像更新
  - `kubectl-node-drain.sh` — 带确认的安全节点维护
  - `kubectl-cluster-info.sh` — 集群健康检查

## 安装

### 通过 ClawdHub
```bash
clawdhub install kubectl-skill
```

### 手动安装
将 `kubectl-skill` 目录复制到以下位置之一：

- **工作区技能**（每个项目）：`<workspace>/skills/`
- **本地技能**（用户范围）：`~/.clawdbot/skills/`
- **额外技能文件夹**：通过 `~/.clawdbot/clawdbot.json` 配置

## 要求

- **kubectl** v1.20+ 已安装并在 PATH 中
- **kubeconfig** 文件已配置集群访问权限
- 与 Kubernetes 集群的活动连接

## 快速入门

### 验证安装
```bash
kubectl version --client
kubectl cluster-info
```

### 基本命令
```bash
# 列出 Pod
kubectl get pods -A

# 查看日志
kubectl logs POD_NAME

# 在 Pod 中执行命令
kubectl exec -it POD_NAME -- /bin/bash

# 应用配置
kubectl apply -f deployment.yaml

# 扩展部署
kubectl scale deployment/APP --replicas=3
```

## 辅助脚本

首先使脚本可执行：
```bash
chmod +x scripts/*.sh
```

### 调试 Pod
```bash
./scripts/kubectl-pod-debug.sh POD_NAME [NAMESPACE]
```

### 更新部署镜像
```bash
./scripts/kubectl-deploy-update.sh DEPLOYMENT CONTAINER IMAGE [NAMESPACE]
```

### 为维护排空节点
```bash
./scripts/kubectl-node-drain.sh NODE_NAME
```

### 检查集群健康
```bash
./scripts/kubectl-cluster-info.sh
```

## 结构

```
kubectl-skill/
├── SKILL.md                    # 主要技能说明
├── LICENSE                     # MIT 许可证
├── README.md                   # 本文档
├── references/
│   └── REFERENCE.md           # 完整的命令参考
├── scripts/
│   ├── kubectl-pod-debug.sh
│   ├── kubectl-deploy-update.sh
│   ├── kubectl-node-drain.sh
│   └── kubectl-cluster-info.sh
└── assets/                    # （可选）用于未来添加
```

## 主要功能

✅ 查询和检查 Kubernetes 资源  
✅ 部署和更新应用程序  
✅ 调试 Pod 和容器  
✅ 管理集群配置  
✅ 监控资源使用情况和健康状态  
✅ 在运行中的容器中执行命令  
✅ 查看日志和事件  
✅ 用于本地测试的端口转发  
✅ 节点维护操作  
✅ 支持安全操作的干运行  

## 环境变量

- `KUBECONFIG` — kubeconfig 文件路径（可包含多个路径，用 `:` 分隔）
- `KUBECTLDIR` — kubectl 插件目录（可选）

## 文档

- **主要说明**：请参阅 `SKILL.md` 了解概述和常见命令
- **完整参考**：请参阅 `references/REFERENCE.md` 了解所有命令
- **官方文档**：https://kubernetes.io/zh-cn/docs/reference/kubectl/
- **AgentSkills 规范**：https://agentskills.io/

## 兼容性

- **kubectl 版本**：v1.20+
- **Kubernetes 版本**：v1.20+
- **平台**：macOS、Linux、Windows（WSL）
- **Agent 框架**：任何支持 AgentSkills 格式的框架

## 贡献

此技能是 Clawdbot 项目的一部分。要贡献：

1. 在本地测试更改
2. 更新文档
3. 确保脚本可执行并经过测试
4. 提交带有清晰描述的拉取请求

## 许可证

MIT 许可证 — 详见 LICENSE 文件

## 支持

- **GitHub Issues**：报告错误和请求功能
- **官方文档**：https://kubernetes.io/zh-cn/docs/reference/kubectl/
- **ClawdHub**：https://clawdhub.com/

---

**版本**：1.0.0  
**最后更新**：2026 年 1 月 24 日  
**维护者**：Clawdbot 贡献者
