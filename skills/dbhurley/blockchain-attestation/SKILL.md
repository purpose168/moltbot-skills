---
name: blockchain_attestation
description: 使用以太坊证明服务（EAS）创建可验证的代理工作证明，默认使用Base链。
metadata: {"clawdbot":{"emoji":"⛓️","homepage":"https://attest.org","requires":{"bins":["node"]},"primaryEnv":"EAS_PRIVATE_KEY"}}
---

# 区块链证明（EAS）

此技能使用以太坊证明服务（EAS）创建已完成工作的**链上**或**链下**证明。

默认配置：
- 默认链：**Base 主网**
- 默认模式：**链下**（零 gas 费用，仍然可验证）
- 默认数据模型：存储任务和交付物的**哈希值**（加上小型代理 ID 和元数据字符串）

## 安全和隐私规则

1. **永远不要**在链上证明中放置密钥、私钥、令牌或用户私人数据。
2. 对于大多数用例，首选**链下**证明。
3. 如果需要链下证明的公共时间戳锚点，使用**timestamp**命令，它会将UID锚定在链上而不发布完整载荷。
4. 只有在用户明确请求或已批准成本后才运行链上交易。

## 环境变量

签名所需（链下或链上）：
- `EAS_PRIVATE_KEY`

链上交易和链上读取所需：
- `EAS_RPC_URL`（所选链的RPC端点）

可选：
- `EAS_CHAIN`（`base`或`base_sepolia`，默认为`base`）
- `CLAWDBOT_AGENT_ID`（覆盖`agentId`字段）

## 一次性设置

安装Node依赖项：

```bash
cd {baseDir} && npm install
```

## 每条链一次性：注册模式

此技能使用单一模式：

```
bytes32 taskHash, bytes32 outputHash, string agentId, string metadata
```

注册它（链上交易）并将生成的模式UID持久化到`schemas.json`：

```bash
cd {baseDir} && node attest.mjs schema register --chain base
```

对于Base Sepolia：

```bash
cd {baseDir} && node attest.mjs schema register --chain base_sepolia
```

## 创建证明（推荐：链下）

最佳默认工作流：
1. 提供任务描述文本
2. 提供交付物文件路径（或交付物文本）
3. 创建链下证明
4. 将签名的载荷保存到文件
5. 向用户返回UID和浏览器链接

示例：

```bash
cd {baseDir} && node attest.mjs attest \
  --mode offchain \
  --chain base \
  --task-text "将Q4董事会演示文稿总结为1页备忘录" \
  --output-file ./deliverables/memo.pdf \
  --recipient 0x0000000000000000000000000000000000000000 \
  --metadata '{"hashAlg":"sha256","artifact":"memo.pdf"}' \
  --save ./attestations/latest.offchain.json
```

## 在链上为链下UID添加时间戳（可选锚点）

```bash
cd {baseDir} && node attest.mjs timestamp --chain base --uid <uid>
```

## 创建链上证明（需要gas费用）

```bash
cd {baseDir} && node attest.mjs attest \
  --mode onchain \
  --chain base \
  --task-text "..." \
  --output-file ./path/to/output \
  --metadata '{"hashAlg":"sha256"}'
```

## 验证

验证链上UID：

```bash
cd {baseDir} && node attest.mjs verify --chain base --uid <uid>
```

验证链下证明JSON文件（由此技能生成）：

```bash
cd {baseDir} && node attest.mjs verify --offchain-file ./attestations/latest.offchain.json
```

## 哈希助手

如果需要哈希值而不创建证明：

```bash
cd {baseDir} && node attest.mjs hash --file ./deliverables/memo.pdf
```

## 输出约定

所有命令向stdout打印单个JSON对象。
- 成功时：`{ "success": true, ... }`
- 错误时：`{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`

这是故意设计的，以便代理可以可靠地解析结果。
