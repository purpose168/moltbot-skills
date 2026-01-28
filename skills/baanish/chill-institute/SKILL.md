---
name: chill-institute
description: 通过 chill.institute 服务将 URL 和种子发送到 put.io 传输队列 — 升起主帆，添加资源，然后使用 put.io 技能监控进度。
---

# Chill Institute

通过 **chill.institute** 服务将 URL 和种子发送到您的 put.io 账户。

## 功能

- 📤 **添加 URL**：将任何直接链接发送到 put.io 进行下载
- 🌱 **添加种子**：添加磁力链接或种子文件 URL
- ⚡ **快速传输**：资源在几秒钟内出现在 put.io 中

## 使用

```
# 添加 URL
"chill https://example.com/file.iso"

# 添加磁力链接
"chill magnet:?xt=urn:btih:..."

# 添加种子 URL
"chill https://example.com/torrent.torrent"
```

## 工作流程

1. **发送资源**（使用此技能）
2. **验证传输**（使用 put.io 技能）："检查 put.io 状态"
3. **管理传输**（使用 put.io 技能）："列出传输"、"删除传输"

## 设置

此技能无需额外配置。它使用 chill.institute 服务，该服务：
- 已预先配置您的 put.io 账户
- 使用您现有的 put.io 会话
- 通过 API 令牌进行身份验证

首次使用时，chill.institute 将引导您完成 OAuth 流程以链接您的 put.io 账户。

## 链接

- **网站**：https://chill.institute
- **put.io**：https://put.io

## 要求

- 已链接 put.io 账户的 chill.institute 账户
- 活跃的 put.io 订阅（传输需要存储空间）
- 网络连接（用于发送传输请求）
