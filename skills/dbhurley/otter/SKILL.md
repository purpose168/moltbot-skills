---
name: otter
description: Otter.ai 转录命令行工具 - 列出、搜索、下载和同步会议转录到 CRM。
version: 1.0.0
author: dbhurley
homepage: https://otter.ai
metadata:
  clawdis:
    emoji: "🦦"
    requires:
      bins: ["python3", "uv"]
      env:
        - OTTER_EMAIL
        - OTTER_PASSWORD
    optionalEnv:
      - TWENTY_API_URL
      - TWENTY_API_TOKEN
    primaryEnv: OTTER_EMAIL
---

# Otter.ai 转录命令行工具

与 Otter.ai 交互管理会议转录 - 列出、搜索、下载、上传、总结和同步到 CRM。

## 🔑 必需的密钥

| 变量 | 描述 | 如何获取 |
|----------|-------------|------------|
| `OTTER_EMAIL` | 您的 Otter.ai 账户邮箱 | 您的登录邮箱 |
| `OTTER_PASSWORD` | 您的 Otter.ai 密码 | 在 Otter 账户设置中设置 |

## 🔐 可选密钥（用于 CRM 同步）

| 变量 | 描述 | 如何获取 |
|----------|-------------|------------|
| `TWENTY_API_URL` | Twenty CRM API 端点 | 您的 Twenty 实例 URL |
| `TWENTY_API_TOKEN` | Twenty API 密钥 | Twenty → 设置 → 开发者 → API 密钥 |

## ⚙️ 设置

在 `~/.clawdis/clawdis.json` 中配置：
```json
{
  "skills": {
    "otter": {
      "env": {
        "OTTER_EMAIL": "you@company.com",
        "OTTER_PASSWORD": "your-password",
        "TWENTY_API_URL": "https://api.your-twenty.com",
        "TWENTY_API_TOKEN": "your-token"
      }
    }
  }
}
```

## 📋 命令

### 列出最近的转录
```bash
uv run {baseDir}/scripts/otter.py list [--limit 10]
```

### 获取完整转录
```bash
uv run {baseDir}/scripts/otter.py get <speech_id>
```

### 搜索转录
```bash
uv run {baseDir}/scripts/otter.py search "季度评审"
```

### 下载转录
```bash
uv run {baseDir}/scripts/otter.py download <speech_id> [--format txt|pdf|docx|srt]
```

### 上传音频进行转录
```bash
uv run {baseDir}/scripts/otter.py upload /path/to/audio.mp3
```

### 获取 AI 摘要
```bash
uv run {baseDir}/scripts/otter.py summary <speech_id>
```

### 同步到 Twenty CRM
```bash
uv run {baseDir}/scripts/otter.py sync-twenty <speech_id>
uv run {baseDir}/scripts/otter.py sync-twenty <speech_id> --company "客户名称"
```

## 📤 输出格式

所有命令都支持 `--json` 用于机器可读输出：
```bash
uv run {baseDir}/scripts/otter.py list --json
```

## 🔗 Twenty CRM 集成

同步到 Twenty 时，会创建：
- **备注** 包含转录标题、日期、时长和完整文本
- **自动链接** 到相关业务，如果 `--company` 匹配

## ⚠️ 注意事项

- 需要 Otter.ai 账户（建议使用 Business 版以获取 API 访问权限）
- 使用非官方的 Otter.ai API
- SSO 用户：在 Otter 账户设置中创建密码
- 可能会有速率限制

## 📦 安装

```bash
clawdhub install otter
```
