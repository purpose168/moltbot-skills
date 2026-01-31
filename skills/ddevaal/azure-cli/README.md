# Azure CLI 技能

**通过命令行界面掌握 Microsoft Azure 云平台管理。**

这个兼容 AgentSkills 的技能提供了 Azure CLI（命令行界面）的全面知识，用于管理 Azure 云资源、基础设施和服务。

## 什么是 Azure CLI？

Azure CLI 是微软开发的跨平台命令行工具，用于管理 Azure 云资源。它提供对 Azure 服务的完整访问，包括：

- **虚拟机和容器** — VM、VMSS、AKS、容器实例
- **网络** — 虚拟网络、负载均衡器、VPN、CDN、应用网关
- **存储和数据库** — 存储账户、SQL Server、MySQL、PostgreSQL、CosmosDB
- **应用服务** — App Service、Functions、Web Apps、Container Apps
- **监控和管理** — Azure Monitor、Log Analytics、Policy、RBAC
- **DevOps 和自动化** — Azure DevOps、Pipelines、Extensions
- **以及 50+ 其他服务**

## 安装

### 快速安装

**macOS：**
```bash
brew install azure-cli
```

**Linux：**
```bash
curl -sL https://aka.ms/InstallAzureCliLinux | bash
```

**Windows：**
```powershell
choco install azure-cli
# 或从 https://aka.ms/InstallAzureCliWindowsMSI 下载 MSI
```

### 验证安装

```bash
az --version
az login
```

## 技能内容

### 主要文档
- **SKILL.md** — 核心 Azure CLI 技能，包含基本命令、模式和快速入门指南
- **references/REFERENCE.md** — 全面的命令参考，涵盖所有 66 个模块和 1000+ 个命令

### 辅助脚本
用于常见 Azure 操作的实用 bash 脚本：
- `azure-vm-status.sh` — 检查 VM 状态和电源状态
- `azure-resource-cleanup.sh` — 识别和清理未使用的资源
- `azure-storage-analysis.sh` — 分析存储账户使用情况
- `azure-subscription-info.sh` — 获取订阅配额和限制
- `azure-rg-deploy.sh` — 部署带监控的基础设施

**使用方法：**
```bash
chmod +x scripts/*.sh
./scripts/azure-vm-status.sh -g myResourceGroup
./scripts/azure-storage-analysis.sh -s mySubscription
```

## 快速入门

### 1. 身份验证
```bash
az login                    # 打开浏览器进行交互式登录
```

### 2. 创建资源组
```bash
az group create -g myRG -l eastus
```

### 3. 创建虚拟机
```bash
az vm create \
  -g myRG \
  -n myVM \
  --image UbuntuLTS \
  --admin-username azureuser \
  --generate-ssh-keys
```

### 4. 管理资源
```bash
az vm list -g myRG                          # 列出 VM
az vm show -g myRG -n myVM                  # 获取详细信息
az vm start -g myRG -n myVM                 # 启动 VM
az vm stop -g myRG -n myVM                  # 停止 VM
```

## 关键概念

### 全局参数（适用于所有命令）
```bash
--subscription ID           # 目标订阅
--resource-group -g RG     # 目标资源组
--output -o json|table|tsv|yaml  # 输出格式
--query JMESPATH_QUERY      # 过滤输出
--verbose -v                # 详细输出
--help -h                   # 命令帮助
```

### 输出格式化
```bash
# 表格（人类可读）
az vm list -g myRG --output table

# JSON（用于脚本）
az vm list -g myRG --output json

# 提取特定字段
az vm list -g myRG --query "[].name" -o tsv
```

### JMESPath 查询
```bash
# 仅获取运行中的 VM
az vm list --query "[?powerState=='VM running'].name"

# 获取特定字段
az vm list --query "[].{name: name, size: hardwareProfile.vmSize}"

# 计数资源
az vm list --query "length([])"
```

## 常见工作流

### 扩展 Web 应用
```bash
# 创建 App Service 计划
az appservice plan create -g myRG -n myplan --sku B2 --is-linux

# 创建 Web 应用
az webapp create -g myRG -p myplan -n myapp

# 设置配置
az webapp config appsettings set -g myRG -n myapp \
  --settings WEBSITE_NODE_DEFAULT_VERSION=14.17.0

# 部署代码
az webapp deployment source config-zip -g myRG -n myapp --src myapp.zip

# 监控性能
az monitor metrics list -g myRG --resource /subscriptions/.../providers/Microsoft.Web/sites/myapp
```

### 使用模板部署基础设施
```bash
# 验证模板
az deployment group validate -g myRG --template-file template.json

# 部署
az deployment group create -g myRG --template-file template.json --parameters params.json

# 监控部署
az deployment group show -g myRG -n deployment_name
```

### 使用 Bash 脚本自动化
```bash
#!/bin/bash
set -e  # 出错时退出

# 创建资源组
az group create -g myRG -l eastus

# 创建并配置 VM
VM_ID=$(az vm create -g myRG -n myVM --image UbuntuLTS \
  --query id --output tsv)

# 运行启动脚本
az vm run-command invoke -g myRG -n myVM \
  --command-id RunShellScript \
  --scripts "sudo apt-get update && sudo apt-get install -y nginx"

echo "VM 已部署: $VM_ID"
```

## 最佳实践

1. **使用默认值减少输入：**
   ```bash
   az configure --defaults group=myRG location=eastus
   ```

2. **安全身份验证：**
   - 对交互式会话使用 `az login`
   - 对自动化使用带环境变量的服务主体
   - 永远不要在脚本中硬编码凭据

3. **为脚本格式化输出：**
   ```bash
   # 使用 --query 和 -o tsv 提取值
   VM_ID=$(az vm create ... --query id --output tsv)
   ```

4. **对长时间操作使用 --no-wait：**
   ```bash
   az vm create ... --no-wait
   az vm show -g RG -n VM --query provisioningState  # 稍后检查
   ```

5. **标记资源以进行成本跟踪：**
   ```bash
   az vm create -g RG -n VM ... --tags env=prod team=backend cost-center=123
   ```

6. **在脚本中启用错误处理：**
   ```bash
   set -e                # 出错时退出
   set -u                # 未定义变量时退出
   set -o pipefail       # 管道失败时退出
   ```

## 文档

- **主要技能指南：** [SKILL.md](SKILL.md)
- **命令参考：** [references/REFERENCE.md](references/REFERENCE.md)
- **辅助脚本：** [scripts/](scripts/)
- **官方 Azure CLI 文档：** https://learn.microsoft.com/zh-cn/cli/azure/
- **GitHub 仓库：** https://github.com/Azure/azure-cli

## 获取帮助

### 内置帮助
```bash
az --help                          # 通用帮助
az vm --help                        # 模块帮助
az vm create --help                 # 命令帮助
az find "search term"              # 查找命令
```

### 资源
- **Microsoft Learn：** https://learn.microsoft.com/zh-cn/cli/azure/
- **命令参考：** https://learn.microsoft.com/zh-cn/cli/azure/reference-index
- **GitHub Issues：** https://github.com/Azure/azure-cli/issues
- **Stack Overflow：** 使用 `azure-cli` 标签

## 身份验证方法

### 交互式登录（开发）
```bash
az login
```

### 服务主体（自动化/CI-CD）
```bash
az login --service-principal \
  --username $AZURE_CLIENT_ID \
  --password $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID
```

### 托管身份（Azure 资源）
```bash
# 在 Azure VM、容器或函数上
az login --identity
```

### 基于令牌（高级）
```bash
az login --service-principal -u $CLIENT_ID --password-stdin --tenant $TENANT_ID
```

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 源信息

- **项目：** Azure CLI
- **仓库：** https://github.com/Azure/azure-cli
- **最新版本：** 2.82.0（截至 2026 年 1 月）
- **语言：** Python
- **社区：** 4,400+ stars，1,200+ 贡献者

## 贡献

此技能基于官方 Azure CLI 文档和源代码。有关 Azure CLI 本身的问题或改进，请访问 https://github.com/Azure/azure-cli

---

**技能版本：** 1.0.0  
**最后更新：** 2026 年 1 月 24 日  
**作者：** Dennis de Vaal <d.devaal@gmail.com>
