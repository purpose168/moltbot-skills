# gcal-pro

> Clawdbot 的 Google Calendar 技能 — 通过自然对话管理您的日历。

**定价：** 免费层（只读）| Pro $12 一次性（完全访问）

## 功能

### 免费层
- ✅ 查看今天的事件
- ✅ 查看明天/本周
- ✅ 搜索事件
- ✅ 列出日历
- ✅ 查找空闲时段

### Pro 层 ($12)
- ✅ 免费层的所有功能
- ✅ 创建事件
- ✅ 快速添加（自然语言）
- ✅ 更新/重新安排事件
- ✅ 删除事件
- ✅ 早晨简报（通过 Clawdbot cron）

## 安装

### 前置条件
- Python 3.11+
- Google 账户
- 已安装 Clawdbot

### 快速开始

1. **安装 Python 依赖：**
   ```powershell
   pip install -r requirements.txt
   ```

2. **设置 Google Cloud：**
   - 遵循 [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md)
   - 将 `client_secret.json` 保存到 `~/.config/gcal-pro/`

3. **身份验证：**
   ```powershell
   python scripts/gcal_auth.py auth
   ```

4. **测试：**
   ```powershell
   python scripts/gcal_core.py today
   ```

### 一键设置（完成 Google Cloud 设置后）
```powershell
.\scripts\setup.ps1
```

## 使用方法

### 查看日程
```bash
# 今天的事件
python scripts/gcal_core.py today

# 明天
python scripts/gcal_core.py tomorrow

# 本周
python scripts/gcal_core.py week

# 搜索
python scripts/gcal_core.py search -q "会议"
```

### 创建事件（Pro）
```bash
# 自然语言
python scripts/gcal_core.py quick -q "周五中午和 Alex 在 Cafe Roma 午餐"
```

### 查找空闲时间
```bash
python scripts/gcal_core.py free
```

### 早晨简报
```bash
python scripts/gcal_core.py brief
```

## 文件结构
```
gcal-pro/
├── SKILL.md              # Clawdbot 技能定义
├── README.md             # 本文件
├── requirements.txt      # Python 依赖
├── PLAN.md               # 产品计划和路线图
├── scripts/
│   ├── gcal_auth.py      # OAuth 身份验证
│   ├── gcal_core.py      # 日历操作
│   └── setup.ps1         # Windows 设置脚本
├── docs/
│   └── GOOGLE_CLOUD_SETUP.md
└── references/
    └── (API 文档、示例)
```

## 配置文件

配置文件存储在 `~/.config/gcal-pro/`：

| 文件 | 用途 |
|------|---------|
| `client_secret.json` | OAuth 应用凭据（您提供） |
| `token.json` | 您的访问令牌（自动生成） |
| `license.json` | Pro 许可证（如果已购买） |

## Clawdbot 集成

### 作为技能使用
复制到您的 Clawdbot skills 目录或直接引用。

### 早晨简报 Cron
在 Clawdbot 中设置：
```
计划：0 8 * * *（每天早上 8 点）
命令：python /path/to/gcal-pro/scripts/gcal_core.py brief
```

## 故障排除

### "找不到 client_secret.json"
完成 Google Cloud 设置并将凭据保存到 `~/.config/gcal-pro/`

### "令牌刷新失败"
重新身份验证：`python scripts/gcal_auth.py auth --force`

### "访问被阻止：未经验证的 应用"
测试期间，点击"高级"→"转到 gcal-pro（不安全）"

### "需要 Pro 层"
写入操作需要 Pro 许可证。查看操作是免费的。

## 许可证

专有软件。免费层供个人使用。写入操作需要 Pro 许可证。

## 技术支持

- 问题反馈：[GitHub Issues]
- 升级到 Pro：[Gumroad 链接]

---

由 Bilal 为 [Clawdbot](https://clawd.bot) 构建
