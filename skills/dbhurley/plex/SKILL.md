---
name: plex
description: 控制 Plex 媒体服务器 - 浏览库、搜索、播放媒体、管理播放。
homepage: https://plex.tv
metadata: {"clawdis":{"emoji":"🎬","requires":{"bins":["curl"],"env":["PLEX_TOKEN","PLEX_SERVER"]},"primaryEnv":"PLEX_TOKEN"}}
---

# Plex 媒体服务器

使用 Plex API 控制 Plex 媒体服务器。

## 设置

设置环境变量：
- `PLEX_SERVER`: 您的 Plex 服务器 URL（例如，`http://192.168.1.100:32400`）
- `PLEX_TOKEN`: 您的 Plex 认证令牌（在 plex.tv/claim 或 Plex 应用 XML 中找到）

## 常用命令

### 获取服务器信息
```bash
curl -s "$PLEX_SERVER/?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 浏览库
```bash
curl -s "$PLEX_SERVER/library/sections?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 列出库内容
```bash
# 将 1 替换为您的库部分键（从上面的浏览中获取）
curl -s "$PLEX_SERVER/library/sections/1/all?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 搜索
```bash
curl -s "$PLEX_SERVER/search?query=搜索词&X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 获取最近添加的内容
```bash
curl -s "$PLEX_SERVER/library/recentlyAdded?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 获取待播清单（继续观看）
```bash
curl -s "$PLEX_SERVER/library/onDeck?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 获取活跃会话（当前正在播放）
```bash
curl -s "$PLEX_SERVER/status/sessions?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

### 列出可用客户端/播放器
```bash
curl -s "$PLEX_SERVER/clients?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json"
```

## 库部分类型

- 电影（通常是部分 1）
- 电视节目（通常是部分 2）
- 音乐
- 照片

## 注意事项

- 添加 `-H "Accept: application/json"` 获取 JSON 输出（默认是 XML）
- 库部分键（1、2、3...）因服务器设置而异 — 先列出部分
- 媒体键看起来像 `/library/metadata/12345`
- 在设备上开始播放前始终确认
- 获取令牌：plex.tv → 账户 → 授权设备 → XML 链接
