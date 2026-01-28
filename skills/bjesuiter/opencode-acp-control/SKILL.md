---
name: opencode-acp-control
description: 通过 Agent Client Protocol (ACP) 直接控制 OpenCode。启动会话、发送提示、恢复对话和管理 OpenCode 更新。
metadata:
  version: "1.0.2"
  author: "Benjamin Jesuiter <bjesuiter@gmail.com>"
  license: "MIT"
  github_url: "https://github.com/bjesuiter/opencode-acp-skill"
---

# OpenCode ACP 技能

通过 Agent Client Protocol (ACP) 直接控制 OpenCode。

## 元数据

- ACP 协议文档（适用于代理/LLM）：https://agentclientprotocol.com/llms.txt
- GitHub 仓库：https://github.com/bjesuiter/opencode-acp-skill
- 如果您在使用此技能时遇到问题，请在此处提交问题：https://github.com/bjesuiter/opencode-acp-skill/issues

## 快速参考

| 操作 | 方法 |
|------|------|
| 启动 OpenCode | `bash(command: "opencode acp", background: true)` |
| 发送消息 | `process.write(sessionId, data: "<json-rpc>\n")` |
| 读取响应 | `process.poll(sessionId)` - 每 2 秒重复 |
| 停止 OpenCode | `process.kill(sessionId)` |
| 列出会话 | `bash(command: "opencode session list", workdir: "...")` |
| 恢复会话 | 列出会话 → 询问用户 → `session/load` |
| 检查版本 | `bash(command: "opencode --version")` |

## 启动 OpenCode

```bash
bash(
  command: "opencode acp",
  background: true,
  workdir: "/path/to/your/project"
)
```

保存返回的 `sessionId` - 您将在所有后续命令中需要它。

## 协议基础

- 所有消息都是 **JSON-RPC 2.0** 格式
- 消息以 **换行符分隔**（每条以 `\n` 结尾）
- 维护从 0 开始的 **消息 ID 计数器**

## 逐步工作流程

### 步骤 1：初始化连接

启动 OpenCode 后立即发送：

```json
{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{"fs":{"readTextFile":true,"writeTextFile":true},"terminal":true},"clientInfo":{"name":"clawdbot","title":"Clawdbot","version":"1.0.0"}}}
```

轮询响应。期望 `result.protocolVersion: 1`。

### 步骤 2：创建会话

```json
{"jsonrpc":"2.0","id":1,"method":"session/new","params":{"cwd":"/path/to/project","mcpServers":[]}}
```

轮询响应。保存 `result.sessionId`（例如 `"sess_abc123"`）。

### 步骤 3：发送提示

```json
{"jsonrpc":"2.0","id":2,"method":"session/prompt","params":{"sessionId":"sess_abc123","prompt":[{"type":"text","text":"您的问题"}]}}
```

每 2 秒轮询一次。您将收到：
- `session/update` 通知（流式内容）
- 带 `result.stopReason` 的最终响应

### 步骤 4：读取响应

每次轮询可能返回多行。将每行解析为 JSON：

- **通知**：`method: "session/update"` - 为响应收集这些
- **响应**：具有与您请求匹配的 `id` - 当出现 `stopReason` 时停止轮询

### 步骤 5：取消（如需要）

```json
{"jsonrpc":"2.0","method":"session/cancel","params":{"sessionId":"sess_abc123"}}
```

不期望响应 - 这是通知。

## 要跟踪的状态

每个 OpenCode 实例，跟踪：
- `processSessionId` - 来自 bash 工具（clawdbot 的进程 ID）
- `opencodeSessionId` - 来自 session/new 响应（OpenCode 的会话 ID）
- `messageId` - 为每个请求递增

## 轮询策略

```python
# 初始化后轮询
response = process.poll(sessionId)
while "protocolVersion" not in response:
    sleep(2)
    response = process.poll(sessionId)

# 发送提示后轮询
process.write(sessionId, json_rpc_message)
response = process.poll(sessionId)
while "stopReason" not in response:
    sleep(2)
    response = process.poll(sessionId)
```

## 恢复会话

### 步骤 1：列出可用会话

```bash
bash(command: "opencode session list", workdir: "/path/to/project")
```

### 步骤 2：询问用户

```python
# 显示会话列表并询问用户选择
sessions = parse_session_list(output)
selected = ask_user("选择要恢复的会话", sessions)
```

### 步骤 3：恢复会话

```json
{"jsonrpc":"2.0","id":0,"method":"session/load","params":{"sessionId":"<用户选择的会话ID>"}}
```

## 错误处理

### 连接错误

```python
try:
    process.poll(sessionId)
except Exception as e:
    # OpenCode 可能已崩溃或停止
    # 建议重新启动
    bash(command="opencode acp", background: true)
```

### 超时错误

```python
# 如果轮询超时，增加间隔或设置最大轮询次数
max_polls = 30
for i in range(max_polls):
    response = process.poll(sessionId)
    if "stopReason" in response:
        break
    sleep(2)
else:
    # 超时 - 取消操作
    process.write(sessionId, cancel_message)
```

## 版本检查

```bash
bash(command: "opencode --version")
```

解析输出版本号以确保兼容性。

## 完整示例

```python
# 1. 启动 OpenCode
result = bash(command="opencode acp", background=true)
process_id = result.sessionId

# 2. 初始化
init_msg = create_init_message()
process.write(process_id, init_msg)
response = poll_until_ready(process_id)

# 3. 创建会话
session_msg = create_session_message("/path/to/project")
process.write(process_id, session_msg)
session_id = extract_session_id(response)

# 4. 发送提示
prompt_msg = create_prompt_message(session_id, "解释量子计算")
process.write(process_id, prompt_msg)
response = poll_for_completion(process_id)

# 5. 处理响应
final_response = parse_response(response)
print(final_response)
```

## 资源

- ACP 协议规范：https://agentclientprotocol.com/llms.txt
- OpenCode GitHub：https://github.com/opencode-ai/opencode
- 此技能的问题：https://github.com/bjesuiter/opencode-acp-skill/issues