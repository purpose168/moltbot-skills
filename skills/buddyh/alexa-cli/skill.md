---
name: alexa-cli
description: 通过 `alexacli` 命令行工具控制 Amazon Echo 设备和智能家居。当用户要求在 Echo 设备上说话/播报、控制灯光/恒温器/锁具、发送语音命令或查询 Alexa 时使用此工具。
homepage: https://github.com/buddyh/alexa-cli
metadata: {"clawdbot":{"emoji":"🔊","requires":{"bins":["alexacli"]},"install":[{"id":"brew","kind":"brew","formula":"buddyh/tap/alexacli","bins":["alexacli"],"label":"安装 alexacli (brew)"},{"id":"go","kind":"go","module":"github.com/buddyh/alexa-cli/cmd/alexa@latest","bins":["alexacli"],"label":"安装 alexa-cli (go)"}]}}
---

# Alexa CLI（命令行工具）

使用 `alexacli` 通过非官方 Alexa API 控制 Amazon Echo 设备和智能家居。

## 设备管理

```bash
# 列出所有 Echo 设备
alexacli devices
alexacli devices --json

# 以 JSON 格式输出设备列表
```

## 文字转语音（TTS）

通过文字转语音功能在 Echo 设备上播报消息：

```bash
# 在指定设备上说话
alexacli speak "你好世界" -d "厨房 Echo"

# 向所有设备播报通知
alexacli speak "晚餐准备好了！" --announce

# 设备名称支持模糊匹配（不区分大小写）
alexacli speak "构建完成" -d 厨房
```

## 语音命令（智能家居控制）

发送任何语音命令，就像对 Alexa 说话一样：

```bash
# 控制灯光
alexacli command "关闭客厅灯光" -d 厨房
alexacli command "将卧室灯光调暗到 50%" -d 卧室

# 控制恒温器
alexacli command "将恒温器设置为 72 度" -d 卧室

# 控制门锁
alexacli command "锁上前门" -d 厨房

# 控制音乐播放
alexacli command "播放爵士音乐" -d "客厅"

# 设置计时器
alexacli command "设置 10 分钟计时器" -d 厨房
```

**提示**：`-d` 参数用于指定执行命令的 Echo 设备。

## 问答模式（获取 Alexa 回复）

发送命令并获取 Alexa 的文字回复：

```bash
# 查询恒温器设置
alexacli ask "恒温器设置是多少" -d 厨房
# 输出：恒温器设置为 68 度。

alexacli ask "今天日程上有什么" -d 厨房 --json
```

此功能适用于查询设备状态或获取 Alexa 特定信息。

## 历史记录

```bash
# 查看最近的语音活动
alexacli history
alexacli history --limit 5 --json
```

## 命令参考

| 命令 | 功能描述 |
|------|---------|
| `alexacli devices` | 列出所有 Echo 设备 |
| `alexacli speak <文本> -d <设备>` | 在指定设备上进行文字转语音播报 |
| `alexacli speak <文本> --announce` | 向所有设备播报通知 |
| `alexacli command <文本> -d <设备>` | 发送语音命令（智能家居控制、音乐播放等） |
| `alexacli ask <文本> -d <设备>` | 发送命令并获取 Alexa 回复 |
| `alexacli history` | 查看最近的语音活动记录 |
| `alexacli auth` | 配置身份验证信息 |

## 重要说明

- 使用 Amazon 非官方 API（与 Alexa App 使用的 API 相同）
- 刷新令牌有效期约为 14 天，如果过期请重新运行 `alexacli auth`
- 设备名称支持部分匹配，不区分大小写
- 对于 AI/代理用途，建议使用自然语言配合 `alexacli command`
