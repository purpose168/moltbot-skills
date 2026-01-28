# 节点扩展技能

使用轻量级 LLM 工作节点实现并行任务执行。这可以大幅加速研究、批处理和多步骤任务。

## ⚡ 关键规则：即时确认模式

使用 Swarm 时，**在调用 exec 之前务必先输出确认消息**：

```
🐝 **Swarm 正在初始化...** 正在并行研究 6 家公司
```

然后再调用 exec。这确保用户能立即看到反馈，知道 Swarm 正在加速工作，而不是造成延迟。

**正确做法：**
```
我：🐝 Swarm 正在初始化... 正在并行研究 6 家 AI 初创公司
[exec 调用]
我：以下是研究结果...
```

**错误做法：**
```
[exec 调用但没有提前消息]  ← 用户看不到任何内容，以为卡住了
我：以下是研究结果...
```

## 使用场景

在以下情况下激活节点扩展：

1. **多个独立主题** - "研究前 5 名 AI 公司"
2. **批处理** - "分析这 10 个 URL"
3. **多步骤流水线** - 需要搜索 → 获取 → 分析的任务
4. **用户要求速度** - "快速"、"并行"、"快"
5. **检测到 3 个以上的独立子任务**

**不要**用于：
- 单一的原子问题
- 需要顺序依赖的任务
- 非常短的任务（<1 秒）

## 使用方法

### 检查是否已配置

```bash
cat ~/.config/clawdbot/node-scaling.yaml
```

如果未配置，引导用户：
```
节点扩展尚未设置。您想让我帮您配置吗？

您需要来自以下提供商之一的 API 密钥：
• Google Gemini（最便宜）：https://aistudio.google.com/apikey
• Groq（免费套餐）：https://console.groq.com/keys
• OpenAI：https://platform.openai.com/api-keys
```

### 运行设置

```bash
cd ~/clawd/skills/node-scaling && node bin/setup.js
```

### 执行并行任务

对于类似"研究前 5 名 AI 公司"的研究任务：

```javascript
// 1. 加载调度器
const { Dispatcher } = require('~/clawd/skills/node-scaling/lib/dispatcher');
const dispatcher = new Dispatcher();

// 2. 定义并行任务
const subjects = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft'];

// 3. 第一阶段：并行搜索
const searchTasks = subjects.map(s => ({
  nodeType: 'search',
  tool: 'web_search',
  input: `${s} AI 产品 2024`,
}));
const searchResults = await dispatcher.executeParallel(searchTasks);

// 4. 第二阶段：并行获取
const fetchTasks = searchResults.results
  .filter(r => r.success)
  .map(r => ({
    nodeType: 'fetch',
    tool: 'web_fetch',
    input: r.result.results[0].url,
  }));
const fetchResults = await dispatcher.executeParallel(fetchTasks);

// 5. 第三阶段：并行分析
const analyzeTasks = fetchResults.results
  .filter(r => r.success)
  .map((r, i) => ({
    nodeType: 'analyze',
    instruction: `总结 ${subjects[i]} 的 AI 战略`,
    input: r.result.content,
  }));
const analyses = await dispatcher.executeParallel(analyzeTasks);

// 6. 综合（这部分由您完成）
// 将并行结果合并成连贯的响应
```

## 配置

配置文件：`~/.config/clawdbot/node-scaling.yaml`

关键设置：
```yaml
node_scaling:
  limits:
    max_nodes: 10        # 根据系统资源调整
  provider:
    name: gemini         # gemini、openai、anthropic、groq
    api_key_env: GEMINI_API_KEY
```

### 调整设置

```bash
# 查看当前配置
cat ~/.config/clawdbot/node-scaling.yaml

# 编辑最大节点数（示例）
sed -i 's/max_nodes: .*/max_nodes: 20/' ~/.config/clawdbot/node-scaling.yaml
```

## 性能预期

| 任务类型 | 单节点 | 使用扩展 | 加速比 |
|---------|--------|---------|--------|
| 5 次搜索 | 6秒 | 1.6秒 | 3.8倍 |
| 10 次摘要 | 7秒 | 1秒 | 7倍 |
| 5 家公司研究 | 18秒 | 6秒 | 3倍 |
| 10 次深度分析 | 166秒 | 9秒 | 18倍 |

## 成本跟踪

调度器会跟踪令牌使用情况。向用户报告：

```javascript
const stats = dispatcher.getNodeStats();
// 返回每个提供商的成本估算
```

## 诊断与故障排除

### 运行诊断

当 Swarm 不工作时，先运行诊断：

```bash
cd ~/clawd/skills/node-scaling && npm run diagnose
```

获取 JSON 输出（更容易解析）：
```bash
cd ~/clawd/skills/node-scaling && npm run diagnose:json
```

### 理解诊断输出

JSON 报告包括：
```json
{
  "status": "ok|warning|error",
  "machine": { /* CPU、内存、操作系统信息 */ },
  "tests": { /* 单元、集成、端到端测试结果 */ },
  "issues": [ /* 发现的问题 */ ],
  "recommendations": [ /* 建议的修复 */ ]
}
```

### 自动修复常见问题

#### 问题：`no_config_dir`
```bash
mkdir -p ~/.config/clawdbot
```

#### 问题：`no_api_key`
方式一 - 设置环境变量：
```bash
export GEMINI_API_KEY="你的密钥"
```

方式二 - 创建密钥文件：
```bash
echo "你的密钥" > ~/.config/clawdbot/gemini-key.txt
chmod 600 ~/.config/clawdbot/gemini-key.txt
```

方式三 - 运行设置向导：
```bash
cd ~/clawd/skills/node-scaling && node bin/setup.js
```

#### 问题：`node_version`
Swarm 需要 Node.js 18+。更新：
```bash
# 使用 nvm
nvm install 20
nvm use 20

# 或直接安装
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 问题：`test_failure`（单元/集成测试）
这些表示存在 bug 或安装损坏。尝试：
```bash
cd ~/clawd/skills/node-scaling
rm -rf node_modules
npm install
npm run test:unit
npm run test:integration
```

如果仍然失败，查看特定测试输出获取详情。

#### 问题：`test_failure`（端到端测试）
端到端失败通常意味着：
1. API 密钥无效 → 使用新密钥重新运行设置
2. 遇到速率限制 → 等待几分钟再试
3. 网络问题 → 检查网络连接

### 机器特定优化

运行诊断后，检查机器配置文件：
```bash
cat ~/.config/clawdbot/swarm-profile.json
```

使用 `recommendations.optimalWorkers` 值：
```bash
# 使用最优工作节点数更新配置
OPTIMAL=$(cat ~/.config/clawdbot/swarm-profile.json | jq '.recommendations.optimalWorkers // 10')
sed -i "s/max_nodes: .*/max_nodes: $OPTIMAL/" ~/.config/clawdbot/node-scaling.yaml
```

### 低内存系统

如果 `memory.freeGb` < 2：
```yaml
# 在 node-scaling.yaml 中，减少工作节点数
limits:
  max_nodes: 3
  max_concurrent_api: 3
```

### Docker/容器环境

确保容器有足够的资源：
```bash
# 检查限制
docker stats --no-stream

# 推荐的最低要求
# 内存：每个工作节点 512MB
# CPU：每个工作节点 0.5 核
```

### 速率限制

如果遇到 API 速率限制：
```yaml
# 在 node-scaling.yaml 中
limits:
  max_concurrent_api: 5  # 减少此值
```

### 完全重装

如果其他方法都不起作用，使用终极方案：
```bash
cd ~/clawd/skills/node-scaling
rm -rf node_modules
rm ~/.config/clawdbot/node-scaling.yaml
rm ~/.config/clawdbot/gemini-key.txt
npm install
node bin/setup.js
```

## 触发节点扩展的示例提示

- "研究前 10 种编程语言并比较它们"
- "分析这 5 个 URL 并总结每个"
- "查找以下公司的信息：X、Y、Z"
- "并行处理这些文档"
- "快速收集这些主题的数据"

## 集成说明

使用节点扩展时：
1. 始终向用户报告加速效果（"在 6 秒内完成 5 项研究任务，而不是 18 秒"）
2. 如果成本显著，显示成本估算
3. 如果节点扩展失败，优雅地回退
4. 不要用于简单的单个问题
