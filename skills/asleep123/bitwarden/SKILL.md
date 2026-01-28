---
name: bitwarden
description: 使用 rbw CLI 安全地访问和管理 Bitwarden/Vaultwarden 密码。
metadata: {"clawdbot":{"emoji":"🔒","os":["linux","macos"],"requires":{"bins":["rbw"]}}}
---

# Bitwarden 技能

使用 `rbw` CLI 与 Bitwarden 或 Vaultwarden 密码库交互。

## 使用方法与配置

### 1. 首次设置
```bash
rbw config set email <您的邮箱>
rbw config set baseurl <密码库URL>  # 可选，默认为 bitwarden.com
rbw login
```
*注意：登录需要主密码，可能还需要 2FA（邮箱/TOTP）。*

### 2. 解锁
```bash
rbw unlock
```
*注意：`rbw` 在代理中缓存会话密钥。如果需要交互式输入（pinentry），请查看是否可以使用 `pinentry-curses`（基于 CLI 的 pinentry）作为 pinentry 提供程序。*

### 3. 管理操作
- **列出项目：** `rbw list`
- **获取项目：** `rbw get "名称"`
- **获取完整 JSON：** `rbw get --full "名称"`
- **搜索：** `rbw search "查询词"`
- **添加：** `rbw add ...`
- **同步：** `rbw sync`（刷新密码库）
*注意：获取详情前始终先同步以确保数据准确。*

## 工具说明

代理使用 `exec` 来运行 `rbw` 命令。
- 解锁时，如果 `rbw` 通过 pinentry-curses 提示输入密码，请使用 `tmux`。
- 添加项目时，`rbw add` 可能需要配置 `EDITOR` 或使用 `tmux`。
