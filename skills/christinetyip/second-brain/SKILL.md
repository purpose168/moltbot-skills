---
name: second-brain
description: 基于 Ensue 的个人知识库，用于捕获和检索理解。当用户想要保存知识、回忆他们知道的内容、管理工具箱或基于过去的学习构建时使用。触发词："save this"、"remember"、"what do I know about"、"add to toolbox"、"my notes on"、"store this concept"。
metadata: {"clawdbot":{"emoji":"🧠","requires":{"env":["ENSUE_API_KEY"]},"primaryEnv":"ENSUE_API_KEY","homepage":"https://ensue-network.ai"}}
---

# 第二大脑 (Second Brain)

一个用于**构建随时间累积的理解**的个人知识库。不是笔记倾倒场 - 是一个结构化的系统，用于捕获您实际可以检索和使用的知识。

## 理念

您的第二大脑应该：
- **捕获理解，而不仅仅是事实** - 为忘记上下文的未来自己而写
- **可检索** - 结构化，以便在需要时能找到
- **常青** - 不包含私人详细信息、凭据或时间敏感数据
- **反映真实经验** - 只保存您真正学过或用过的东西

保存前问自己：*未来的我会感谢这个吗？*

## 命名空间结构

```
public/                           --> 可共享的知识
  concepts/                       --> 事物如何运作
    [domain]/                     --> 按主题组织
      [concept-name]              --> 单独的概念
  toolbox/                        --> 工具和技术
    _index                        --> 工具的主索引
    [category]/                   --> 按类型分组
      [tool-name]                 --> 单独的工具
  patterns/                       --> 可复用的解决方案
    [domain]/                     --> 设计模式、工作流
  references/                     --> 快速参考材料
    [topic]/                      --> 速查表、语法、API

private/                          --> 仅私人使用
  notes/                          --> 草稿、草案
  journal/                        -->  dated reflections
```

**示例领域：** `programming`、`devops`、`design`、`business`、`data`、`security`、`productivity`

## 内容格式

### 概念

用于理解事物如何运作：

```
概念名称
=============

它是什么：
[单行定义]

为什么重要：
[解决的问题，何时需要它]

它是如何工作的：
[带示例的解释]
[在有帮助的地方使用 ASCII 图表示架构/流程]

+----------+      +----------+
| 客户端   | ---> | 服务器   |
+----------+      +----------+

关键洞察：
["啊哈"时刻 - 什么让你恍然大悟]

相关：[相关概念的链接]
```

### 工具箱条目

用于您实际使用过的工具和技术：

```
工具名称

类别：[类别]
网站：[URL]
成本：[免费/付费/免费增值]

它做什么：
[简要描述]

为什么我用它：
[个人经验 - 它为你解决了什么问题]

何时使用它：
[这是正确选择的场景]

快速开始：
[最小设置/使用以开始]

陷阱：
[绊倒你的事情]
```

### 模式

用于可复用的解决方案：

```
模式名称

问题：
[触发此模式的情况]

解决方案：
[方法，相关时包含代码/伪代码]

权衡取舍：
[优缺点，何时不使用]

示例：
[具体实现]
```

### 参考资料

用于快速查找材料：

```
参考资料：[主题]

[有组织的、可扫描的内容]
[表格、列表、代码片段]
[最少散文，最大信号]
```

## 交互规则

### 保存知识

始终在保存前确认：
1. "想让我把这个保存到你的第二大脑吗？"
2. 显示将要保存的草稿
3. 确认后保存
4. 确认保存了什么以及保存在哪里

### 检索知识

当相关主题出现时：
- 搜索现有知识
- 显示相关概念
- 将新学习与现有理解联系起来

### 维护质量

保存前验证：
- 为忘记上下文的未来自己而写
- 包含"为什么"，而不仅仅是"什么"
- 有具体示例
- 无凭据、API 密钥或私人路径
- 为检索而结构化

## 反模式

1. **不要自动保存** - 始终先问
2. **不要保存未使用的工具** - 只保存实际使用的工具
3. **不要保存半理解的概念** - 先学习，后保存
4. **不要包含机密** - 无 API 密钥、密码、令牌
5. **不要创建浅层条目** - 如果无法很好地解释它，就不要保存
6. **不要重复** - 先检查是否存在，必要时更新

## API 使用

使用包装脚本：

```bash
{baseDir}/scripts/ensue-api.sh <method> '<json_args>'
```

### 操作

**搜索知识：**
```bash
{baseDir}/scripts/ensue-api.sh discover_memories '{"query": "X 是如何工作的", "limit": 5}'
```

**按命名空间列出：**
```bash
{baseDir}/scripts/ensue-api.sh list_keys '{"prefix": "public/concepts/", "limit": 20}'
```

**获取特定条目：**
```bash
{baseDir}/scripts/ensue-api.sh get_memory '{"key_names": ["public/concepts/programming/recursion"]}'
```

**创建条目：**
```bash
{baseDir}/scripts/ensue-api.sh create_memory '{"items":[
  {"key_name":"public/concepts/domain/name","description":"简短描述","value":"完整内容","embed":true}
]}'
```

**更新条目：**
```bash
{baseDir}/scripts/ensue-api.sh update_memory '{"key_name": "public/toolbox/_index", "value": "更新内容"}'
```

**删除条目：**
```bash
{baseDir}/scripts/ensue-api.sh delete_memory '{"key_name": "public/notes/old-draft"}'
```

## 工具箱索引

维护 `public/toolbox/_index` 作为主参考：

```
工具箱索引
=============

类别：
  languages/      编程语言
  frameworks/     库和框架
  devtools/       开发工具
  infrastructure/ 部署、托管、CI/CD
  productivity/   工作流和生产工具
  data/           数据库、分析、数据工具

最近添加：
  [工具] - [单行描述]

浏览："显示我的工具箱"或"[类别] 有什么工具"
```

## 意图映射

| 用户说 | 操作 |
|--------|------|
| "保存这个"、"记住这个" | 起草条目，确认，保存 |
| "关于 X 我知道什么" | 搜索和检索相关条目 |
| "将 [工具] 添加到工具箱" | 创建工具箱条目 |
| "列出我的 [领域] 概念" | 列出该命名空间的键 |
| "显示我的工具箱" | 显示工具箱索引 |
| "更新 [条目]" | 获取，显示差异，更新 |
| "删除 [条目]" | 确认，删除 |
| "搜索 [主题]" | 跨所有知识进行语义搜索 |

## 初始设置

需要 `ENSUE_API_KEY` 环境变量。

获取密钥：https://www.ensue-network.ai/dashboard

在 clawdbot.json 中配置：
```json
"skills": {
  "entries": {
    "second-brain": {
      "apiKey": "your-ensue-api-key"
    }
  }
}
```

## 安全性

- **永远不要** 记录或显示 API 密钥
- **永远不要** 在条目中存储凭据、令牌或机密
- **永远不要** 包含个人文件路径或系统详细信息
