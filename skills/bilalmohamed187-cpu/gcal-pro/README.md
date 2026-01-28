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
```
