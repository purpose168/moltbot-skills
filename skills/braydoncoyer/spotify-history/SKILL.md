---
name: spotify-history
description: 通过 Spotify Web API 访问播放历史、热门艺术家/歌曲，并获取个性化推荐。用于获取用户最近播放、分析音乐品味或生成推荐时使用。需要一次性 OAuth 设置。
---

# Spotify 播放历史与推荐

访问 Spotify 播放历史并获取个性化音乐推荐。

## 设置（一次性）

### 快速设置（推荐）

运行设置向导：
```bash
bash skills/spotify-history/scripts/setup.sh
```

此向导将引导您完成：
1. 创建 Spotify 开发者应用
2. 安全保存凭据
3. 授权访问

### 手动设置

1. **创建 Spotify 开发者应用**
   - 访问 [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - 点击**创建应用**
   - 填写信息：
     - **应用名称：** `Clawd`（或任何名称）
     - **应用描述：** `个人助手集成`
     - **重定向 URI：** `http://127.0.0.1:8888/callback` ⚠️ 请使用准确的 URL！
   - 保存并复制**客户端 ID**和**客户端密钥**

2. **保存凭据**

   **方案 A：凭据文件（推荐）**
   ```bash
   mkdir -p credentials
   cat > credentials/spotify.json <<EOF
   {
     "client_id": "您的客户端ID",
     "client_secret": "您的客户端密钥"
   }
   EOF
   chmod 600 credentials/spotify.json
   ```

   **方案 B：环境变量**
   ```bash
   # 添加到 ~/.zshrc 或 ~/.bashrc
   export SPOTIFY_CLIENT_ID="您的客户端ID"
   export SPOTIFY_CLIENT_SECRET="您的客户端密钥"
   ```

3. **身份验证**

   **使用浏览器（本地机器）：**
   ```bash
   python3 scripts/spotify-auth.py
   ```

   **无头模式（无浏览器）：**
   ```bash
   python3 scripts/spotify-auth.py --headless
   ```
   按照提示操作：通过 URL 授权并粘贴回调 URL。

令牌保存到 `~/.config/spotify-clawd/token.json`，过期时自动刷新。

## 使用方法

### 命令行

```bash
# 最近播放历史
python3 scripts/spotify-api.py recent

# 热门艺术家（时间范围：short_term, medium_term, long_term）
python3 scripts/spotify-api.py top-artists medium_term

# 热门歌曲
python3 scripts/spotify-api.py top-tracks medium_term

# 基于您的热门艺术家获取推荐
python3 scripts/spotify-api.py recommend

# 原始 API 调用（任何端点）
python3 scripts/spotify-api.py json /me
python3 scripts/spotify-api.py json /me/player/recently-played
```

### 时间范围

- `short_term` — 最近约 4 周
- `medium_term` — 最近约 6 个月（默认）
- `long_term` — 所有时间

### 示例输出

```
热门艺术家 (medium_term):
  1. 汉斯·季默 [原声带, 配乐]
  2. 约翰·威廉姆斯 [原声带, 配乐]
  3. 迈克尔·吉亚奇诺 [原声带, 配乐]
  4. 马克斯·里希特 [氛围音乐, 现代古典]
  5. 卢多维科·艾奥迪 [意大利当代古典]
```

## 代理使用

当用户询问音乐相关问题时：
- "我最近在听什么？" → `spotify-api.py recent`
- "我的热门艺术家是谁？" → `spotify-api.py top-artists`
- "推荐一些新音乐" → `spotify-api.py recommend` + 添加您自己的知识

对于推荐，结合 API 数据和音乐知识，建议用户库中没有的类似艺术家。

## 故障排除

### "未找到 Spotify 凭据！"
- 确保 `credentials/spotify.json` 存在 **或** 已设置环境变量
- 首先检查凭据文件，然后检查环境变量
- 运行 `bash skills/spotify-history/scripts/setup.sh` 创建凭据

### "未经过身份验证。请先运行 spotify-auth.py。"
- 令牌不存在或无效
- 运行：`python3 scripts/spotify-auth.py`（或使用 `--headless` 如果没有浏览器）

### 令牌刷新时出现 "HTTP 错误 400：坏请求"
- 凭据已更改或无效
- 重新运行设置：`bash skills/spotify-history/scripts/setup.sh`
- 或使用正确的客户端 ID/密钥更新 `credentials/spotify.json`

### "HTTP 错误 401：未授权"
- 令牌已过期且自动刷新失败
- 删除令牌并重新认证：
  ```bash
  rm ~/.config/spotify-clawd/token.json
  python3 scripts/spotify-auth.py
  ```

### 无头模式 / 无浏览器
- 使用 `--headless` 标志：`python3 scripts/spotify-auth.py --headless`
- 在任何设备上手动打开授权 URL
- 复制回调 URL（以 `http://127.0.0.1:8888/callback?code=...` 开头）
- 出现提示时粘贴回去

## 安全说明

- 令牌以 0600 权限存储（仅用户可读写）
- 客户端密钥应保密
- 重定向 URI 使用 `127.0.0.1`（仅本地）以确保安全

## 所需权限范围

- `user-read-recently-played` — 最近播放历史
- `user-top-read` — 热门艺术家和歌曲
- `user-read-playback-state` — 当前播放状态
- `user-read-currently-playing` — 当前正在播放的歌曲
