---
name: gram
description: 用于通过 cookies 查看动态、帖子、个人资料和互动情况的 Instagram CLI。
homepage: https://github.com/arein/gram
metadata: {"clawdbot":{"emoji":"📸","requires":{"bins":["gram"]},"install":[{"id":"npm","kind":"node","package":"@cyberdrk/gram","bins":["gram"],"label":"安装 gram (npm)"}]}}
---

# gram 📸

使用 REST/GraphQL API + cookie 认证的 Instagram CLI。

## 安装

```bash
# npm/pnpm/bun
npm install -g @cyberdrk/gram

# 一次性运行（无需安装）
bunx @cyberdrk/gram whoami
```

## 认证

`gram` 使用来自你 Instagram 网页会话的基于 cookie 的认证。

使用 `--session-id`、`--csrf-token` 和 `--ds-user-id` 直接传递 cookie，或使用 `--cookie-source` 获取浏览器 cookie。

运行 `gram check` 查看哪个来源处于活动状态。对于 Arc/Brave，使用 `--chrome-profile-dir <path>`。

## 命令

### 账户和认证

```bash
gram whoami                    # 显示已登录的账户
gram check                     # 显示凭据来源
gram query-ids --refresh       # 刷新 GraphQL 查询 ID 缓存
```

### 阅读帖子

```bash
gram post <shortcode-or-url>   # 查看帖子
gram <shortcode-or-url>        # post 的简写
gram comments <shortcode> -n 20 # 查看帖子的评论
gram likers <shortcode>        # 查看点赞帖子的用户
```

### 动态

```bash
gram feed -n 20                # 首页动态
gram explore -n 20             # 发现/探索动态
```

### 用户个人资料

```bash
gram user <username>           # 查看用户个人资料
gram user @instagram --json    # JSON 输出
gram posts <username> -n 20    # 用户的帖子
gram following [username]      # 用户关注的人（默认为你）
gram followers [username]      # 某人的粉丝（默认为你）
```

### 搜索

```bash
gram search "query"            # 搜索用户、话题、地点
gram search "coffee" --type users
gram search "nyc" --type places
gram search "#photography" --type hashtags
```

### 互动操作

```bash
gram like <shortcode>          # 点赞帖子
gram unlike <shortcode>        # 取消点赞
gram save <shortcode>          # 保存/收藏帖子
gram unsave <shortcode>        # 取消保存
gram comment <shortcode> "nice!" # 评论帖子
gram follow <username>         # 关注用户
gram unfollow <username>       # 取消关注
```

## 输出选项

```bash
--json          # JSON 输出
--json-full     # JSON 包含原始 API 响应在 _raw 字段中
--plain         # 无 emoji，无颜色（脚本友好）
--no-emoji      # 禁用 emoji
--no-color      # 禁用 ANSI 颜色（或设置 NO_COLOR=1）
```

## 全局选项

```bash
--session-id <token>           # Instagram sessionid cookie
--csrf-token <token>           # Instagram csrftoken cookie
--ds-user-id <id>              # Instagram ds_user_id cookie
--cookie-source <source>       # 浏览器 cookie 的 cookie 源（可重复）
--chrome-profile <name>        # Chrome 配置文件名
--chrome-profile-dir <path>    # Chrome/Chromium 配置目录或 cookie 数据库路径
--firefox-profile <name>       # Firefox 配置
--timeout <ms>                 # 请求超时时间
--cookie-timeout <ms>          # Cookie 提取超时时间
```

## 配置文件

`~/.config/gram/config.json5`（全局）或 `./.gramrc.json5`（项目）：

```json5
{
  cookieSource: ["safari", "chrome"],
  chromeProfile: "Profile 1",
  timeoutMs: 60000
}
```

环境变量：`GRAM_TIMEOUT_MS`, `GRAM_COOKIE_TIMEOUT_MS`

## 故障排除

### 查询 ID 过时（404 错误）
```bash
gram query-ids --refresh
```

### Cookie 提取失败
- 检查浏览器已登录 Instagram
- 尝试不同的 `--cookie-source`
- 对于 Arc/Brave：使用 `--chrome-profile-dir`
- 手动提供 cookie：`--session-id`, `--csrf-token`, `--ds-user-id`

### 用户智能体不匹配错误
- CLI 默认使用桌面用户智能体
- 如果你的会话是在移动设备上创建的，可能会失败
- 通过桌面浏览器登录创建新会话

---

**简而言之**：通过 CLI 查看动态、个人资料、搜索和与 Instagram 互动。📸
