---
name: Azure CLI
description: 通过命令行界面全面管理 Azure 云平台
license: MIT
metadata:
  author: Dennis de Vaal <d.devaal@gmail.com>
  version: "1.0.0"
  keywords: "azure,cloud,infrastructure,devops,iac,management,scripting"
repository: https://github.com/Azure/azure-cli
compatibility:
  - platform: macOS
    min_version: "10.12"
  - platform: Linux
    min_version: "Ubuntu 18.04"
  - platform: Windows
    min_version: "Windows 10"
---

# Azure CLI 技能

**掌握 Azure 命令行界面，用于云基础设施管理、自动化和 DevOps 工作流程。**

Azure CLI 是 Microsoft 强大的跨平台命令行工具，用于管理 Azure 资源。此技能提供了 Azure CLI 命令、身份验证、资源管理和自动化模式的全面知识。

## 你将学习什么

### 核心概念
- Azure 订阅和资源组架构
- 身份验证方法和凭据管理
- 资源提供程序组织和注册
- 全局参数、输出格式和查询语法
- 自动化脚本和错误处理

### 主要服务领域（66 个命令模块）
- **计算：** 虚拟机、缩放集、Kubernetes (AKS)、容器
- **网络：** 虚拟网络、负载均衡器、CDN、流量管理器
- **存储和数据：** 存储帐户、数据湖、Cosmos DB、数据库
- **应用服务：** App Service、Functions、容器应用
- **数据库：** SQL Server、MySQL、PostgreSQL、CosmosDB
- **集成和消息：** Event Hubs、Service Bus、Logic Apps
- **监控和管理：** Azure Monitor、策略、RBAC、成本管理
- **AI 和机器学习：** 认知服务、机器学习
- **DevOps：** Azure DevOps、管道、扩展

## 快速入门

### 安装

**macOS：**
```bash
brew install azure-cli
```

**Linux (Ubuntu/Debian)：**
```bash
curl -sL https://aka.ms/InstallAzureCliLinux | bash
```

**Windows：**
```powershell
choco install azure-cli
# 或从 https://aka.ms/InstallAzureCliWindowsMSI 下载 MSI
```

**验证安装：**
```bash
az --version          # 显示版本
az --help             # 显示通用帮助
```

### 第一步

```bash
# 1. 登录 Azure（打开浏览器进行身份验证）
az login

# 2. 查看你的订阅
az account list

# 3. 设置默认订阅（可选）
az account set --subscription "My Subscription"

# 4. 创建资源组
az group create -g myResourceGroup -l eastus

# 5. 列出你的资源组
az group list
```

## 基本命令

### 身份验证和帐户

```bash
az login                                    # 交互式登录
az login --service-principal -u APP_ID -p PASSWORD -t TENANT_ID
az login --identity                         # 托管身份
az logout                                   # 登出
az account show                             # 当前帐户
az account list                             # 所有帐户
az account set --subscription SUBSCRIPTION  # 设置默认
```

### 全局标志（可与任何命令一起使用）

```bash
--subscription ID       # 目标订阅
--resource-group -g RG  # 目标资源组
--output -o json|table|tsv|yaml  # 输出格式
--query JMESPATH_QUERY  # 过滤/提取输出
--verbose -v            # 详细输出
--debug                 # 调试模式
--help -h               # 命令帮助
```

### 资源组

```bash
az group list           # 列出所有资源组
az group create -g RG -l LOCATION  # 创建
az group delete -g RG   # 删除
az group show -g RG     # 获取详情
az group update -g RG --tags key=value  # 更新标签
```

### 虚拟机（计算）

```bash
az vm create -g RG -n VM_NAME --image UbuntuLTS
az vm list -g RG
az vm show -g RG -n VM_NAME
az vm start -g RG -n VM_NAME
az vm stop -g RG -n VM_NAME
az vm restart -g RG -n VM_NAME
az vm delete -g RG -n VM_NAME
```

### 存储操作

```bash
az storage account create -g RG -n ACCOUNT --sku Standard_LRS
az storage account list
az storage container create --account-name ACCOUNT -n CONTAINER
az storage blob upload --account-name ACCOUNT -c CONTAINER -n BLOB -f LOCAL_FILE
az storage blob download --account-name ACCOUNT -c CONTAINER -n BLOB -f LOCAL_FILE
```

### Azure Kubernetes 服务 (AKS)

```bash
az aks create -g RG -n CLUSTER --node-count 2
az aks get-credentials -g RG -n CLUSTER
az aks list
az aks show -g RG -n CLUSTER
az aks delete -g RG -n CLUSTER
```

## 常见模式

### 模式 1：输出格式
```bash
# 仅获取特定字段
az vm list --query "[].{name: name, state: powerState}"

# 仅获取名称
az vm list --query "[].name" -o tsv

# 过滤和提取
az vm list --query "[?powerState=='VM running'].name"
```

### 模式 2：自动化和脚本
```bash
#!/bin/bash
set -e  # 出错时退出

# 获取 VM ID
VM_ID=$(az vm create \
  -g myRG \
  -n myVM \
  --image UbuntuLTS \
  --query id \
  --output tsv)

echo "Created VM: $VM_ID"

# 检查预配状态
az vm show --ids "$VM_ID" --query provisioningState
```

### 模式 3：批量操作
```bash
# 删除资源组中的所有 VM
az vm list -g myRG -d --query "[].id" -o tsv | xargs az vm delete --ids

# 按标签列出所有资源
az resource list --tag env=production
```

### 模式 4：使用默认值
```bash
# 设置默认值以减少输入
az configure --defaults group=myRG subscription=mySubscription location=eastus

# 现在命令更简单
az vm create -n myVM --image UbuntuLTS  # 继承 group、subscription、location
```

## 辅助脚本

此技能包含用于常见操作的辅助 bash 脚本：

- **azure-vm-status.sh** — 检查订阅中的 VM 状态
- **azure-resource-cleanup.sh** — 识别并移除未使用的资源
- **azure-storage-analysis.sh** — 分析存储帐户使用情况和成本
- **azure-subscription-info.sh** — 获取订阅配额和限制
- **azure-rg-deploy.sh** — 部署带有监控的基础设施

**使用方法：**
```bash
./scripts/azure-vm-status.sh -g myResourceGroup
./scripts/azure-storage-analysis.sh --subscription mySubscription
```

## 高级主题

### 使用 JMESPath 进行输出查询
Azure CLI 支持使用 JMESPath 进行强大的输出过滤：

```bash
# 排序结果
az vm list --query "sort_by([], &name)"

# 复杂过滤
az vm list --query "[?location=='eastus' && powerState=='VM running'].name"

# 聚合
az vm list --query "length([])"  # 计算 VM 数量
```

### 错误处理
```bash
# 检查退出代码
az vm create -g RG -n VM --image UbuntuLTS
if [ $? -eq 0 ]; then
  echo "VM 创建成功"
else
  echo "创建 VM 失败"
  exit 1
fi
```

### 身份验证方法

**服务主体（自动化）：**
```bash
az login --service-principal \
  --username $AZURE_CLIENT_ID \
  --password $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID
```

**托管身份（Azure 资源）：**
```bash
# 在 Azure VM 或容器实例上
az login --identity
```

**基于令牌（CI/CD）：**
```bash
echo "$AZURE_ACCESS_TOKEN" | az login --service-principal -u $AZURE_CLIENT_ID --password-stdin --tenant $AZURE_TENANT_ID
```

## 关键资源

- **官方文档：** https://learn.microsoft.com/zh-cn/cli/azure/
- **命令参考：** https://learn.microsoft.com/zh-cn/cli/azure/reference-index
- **GitHub 仓库：** https://github.com/Azure/azure-cli
- **综合指南：** 请参阅 [references/REFERENCE.md](references/REFERENCE.md)
- **发布说明：** https://github.com/Azure/azure-cli/releases

## 提示和技巧

1. **启用制表符补全：**
   ```bash
   # 带 Homebrew 的 macOS
   eval "$(az completion init zsh)"
   
   # Linux (bash)
   eval "$(az completion init bash)"
   ```

2. **快速查找命令：**
   ```bash
   az find "create virtual machine"  # 搜索命令
   ```

3. **对长时间操作使用 --no-wait：**
   ```bash
   az vm create -g RG -n VM --image UbuntuLTS --no-wait
   # 稍后使用 az vm show 检查状态
   ```

4. **保存常用参数：**
   ```bash
   az configure --defaults group=myRG location=eastus
   ```

5. **与其他工具结合使用：**
   ```bash
   # 与 jq 一起使用进行高级 JSON 处理
   az vm list | jq '.[] | select(.powerState == "VM running") | .name'
   
   # 与 xargs 一起使用进行批量操作
   az storage account list --query "[].name" -o tsv | xargs -I {} az storage account show -g RG -n {}
   ```

## 后续步骤

- 查看 [references/REFERENCE.md](references/REFERENCE.md) 获取全面的命令文档
- 探索 `scripts/` 目录中的辅助脚本
- 先使用非生产资源进行练习
- 查看 Azure 最佳实践和成本优化策略

---

**版本：** 1.0.0  
**许可证：** MIT  
**兼容：** Azure CLI v2.50+、Azure 订阅
