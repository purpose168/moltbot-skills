---
name: gcal-pro
description: Google Calendar 集成，用于查看、创建和管理日历事件。当用户询问日程、想要添加/编辑/删除事件、检查可用性或需要早晨简报时使用。支持自然语言，如"我明天的日历上有什么？"或"周五中午和 Alex 吃午餐"。免费层提供只读访问；Pro 层（$12）添加创建/编辑/删除和早晨简报功能。
---

# gcal-pro

通过自然对话管理 Google Calendar。

## 快速参考

| 操作 | 命令 | 层级 |
|--------|---------|------|
| 查看今天 | `python scripts/gcal_core.py today` | 免费 |
| 查看明天 | `python scripts/gcal_core.py tomorrow` | 免费 |
| 查看本周 | `python scripts/gcal_core.py week` | 免费 |
| 搜索事件 | `python scripts/gcal_core.py search -q "会议"` | 免费 |
| 列出日历 | `python scripts/gcal_core.py calendars` | 免费 |
| 查找空闲时间 | `python scripts/gcal_core.py free` | 免费 |
| 快速添加 | `python scripts/gcal_core.py quick -q "周五中午午餐"` | Pro |
| 删除事件 | `python scripts/gcal_core.py delete --id 事件_ID -y` | Pro |
| 早晨简报 | `python scripts/gcal_core.py brief` | Pro |

## 设置

**需要首次设置：**

1. 用户必须创建 Google Cloud 项目和 OAuth 凭据
2. 将 `client_secret.json` 保存到 `~/.config/gcal-pro/`
3. 运行身份验证：
   ```bash
   python scripts/gcal_auth.py auth
   ```
4. 浏览器打开 → 用户授予日历访问权限 → 完成

**检查身份验证状态：**
```bash
python scripts/gcal_auth.py status
```

## 层级

### 免费层
- 查看事件（今天、明天、本周、月份）
- 搜索事件
- 列出日历
- 查找空闲时段

### Pro 层（$12 一次性）
- 免费层的所有功能，加上：
- 创建事件
- 快速添加（自然语言）
- 更新/重新安排事件
- 删除事件
- 通过 cron 发送早晨简报

## 使用模式

### 查看日程

当用户问"我日历上有什么？"或"今天有什么安排？"：

```bash
cd /path/to/gcal-pro
python scripts/gcal_core.py today
```

对于特定范围：
- "明天" → `python scripts/gcal_core.py tomorrow`
- "这周" → `python scripts/gcal_core.py week`
- "和 Alex 的会议" → `python scripts/gcal_core.py search -q "Alex"`

### 创建事件（Pro）

当用户说"添加到我的日历"或"安排 Y"：

**选项 1：快速添加（自然语言）**
```bash
python scripts/gcal_core.py quick -q "周五中午和 Alex 午餐"
```

**选项 2：结构化创建（通过 Python）**
```python
from scripts.gcal_core import create_event, parse_datetime

create_event(
    summary="和 Alex 午餐",
    start=parse_datetime("周五中午"),
    location="Cafe Roma",
    confirmed=True  # 设置为 False 以显示确认提示
)
```

### 修改事件（Pro）

**⚠️ 破坏性操作需要确认！**

在删除或重大修改事件之前，务必先确认用户：

1. 显示事件详情
2. 询问"我应该删除/重新安排这个吗？"
3. 只有在用户确认后才使用 `confirmed=True` 或 `-y` 标志继续

**删除：**
```bash
# 首先，找到事件
python scripts/gcal_core.py search -q "牙医"
# 显示事件 ID

# 然后删除（需要用户确认）
python scripts/gcal_core.py delete --id abc123xyz -y
```

### 查找空闲时间

当用户问"我什么时候有空？"或"找时间开1小时的会议"：

```bash
python scripts/gcal_core.py free
```

### 早晨简报（Pro + Cron）

通过 Clawdbot cron 设置以发送每日议程：

```python
from scripts.gcal_core import generate_morning_brief
print(generate_morning_brief())
```

**Cron 设置示例：**
- 计划：每天早上 8:00
- 操作：运行 `python scripts/gcal_core.py brief`
- 发送：将输出发送到用户的 messaging 渠道

## 错误处理

| 错误 | 原因 | 解决方案 |
|-------|-------|----------|
| "client_secret.json 未找到" | 设置不完整 | 完成 Google Cloud 设置 |
| "令牌刷新失败" | 已过期/被撤销 | 运行 `python scripts/gcal_auth.py auth --force` |
| "需要 Pro 层" | 免费用户尝试写入 | 提示升级或解释限制 |
| "事件未找到" | 无效的事件 ID | 先搜索正确的事件 |

## 时区处理

- 所有时间都按用户的本地时区解释（默认：America/New_York）
- 当用户指定时区（例如"下午2点 EST"）时，遵循它
- 以用户的本地时区显示时间
- 以带时区的 ISO 8601 格式存储
