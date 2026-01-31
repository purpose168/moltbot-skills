---
name: tmdb
description: 通过 TMDb API 搜索电影/电视剧、获取演员阵容、评分、流媒体信息，并提供个性化推荐。
homepage: https://www.themoviedb.org/
metadata: {"clawdis":{"emoji":"🎬","requires":{"bins":["uv"],"env":["TMDB_API_KEY"]},"primaryEnv":"TMDB_API_KEY"}}
---

# TMDb - 电影数据库

提供全面的电影和电视剧信息，包括流媒体播放渠道、推荐功能和个性化设置。

## 环境配置

在使用之前，请设置以下环境变量：
- `TMDB_API_KEY`: 您的 TMDb API 密钥（在 themoviedb.org 免费注册获取）

## 快速命令

### 搜索
```bash
# 搜索电影
uv run {baseDir}/scripts/tmdb.py search "盗梦空间"

# 搜索电视剧
uv run {baseDir}/scripts/tmdb.py search "绝命毒师" --tv

# 搜索人物（演员、导演等）
uv run {baseDir}/scripts/tmdb.py person "克里斯托弗·诺兰"
```

### 电影/电视剧详情
```bash
# 完整电影信息
uv run {baseDir}/scripts/tmdb.py movie 27205

# 包含演员阵容
uv run {baseDir}/scripts/tmdb.py movie 27205 --cast

# 电视剧详情
uv run {baseDir}/scripts/tmdb.py tv 1396

# 按名称搜索并显示详情
uv run {baseDir}/scripts/tmdb.py info "蝙蝠侠：黑暗骑士"
```

### 流媒体播放渠道
```bash
# 查找流媒体播放渠道
uv run {baseDir}/scripts/tmdb.py where "盗梦空间"
uv run {baseDir}/scripts/tmdb.py where 27205

# 指定地区
uv run {baseDir}/scripts/tmdb.py where "盗梦空间" --region GB
```

### 发现功能
```bash
# 本周热门
uv run {baseDir}/scripts/tmdb.py trending
uv run {baseDir}/scripts/tmdb.py trending --tv

# 基于电影推荐
uv run {baseDir}/scripts/tmdb.py recommend "盗梦空间"

# 高级发现
uv run {baseDir}/scripts/tmdb.py discover --genre action --year 2024
uv run {baseDir}/scripts/tmdb.py discover --genre sci-fi --rating 7.5
```

### 个性化设置
```bash
# 获取个性化推荐（使用 Plex 观看历史和偏好设置）
uv run {baseDir}/scripts/tmdb.py suggest <user_id>

# 设置偏好
uv run {baseDir}/scripts/tmdb.py pref <user_id> --genres "sci-fi,thriller,drama"
uv run {baseDir}/scripts/tmdb.py pref <user_id> --directors "克里斯托弗·诺兰,丹尼斯·维伦纽瓦"
uv run {baseDir}/scripts/tmdb.py pref <user_id> --avoid "horror,romance"

# 查看偏好设置
uv run {baseDir}/scripts/tmdb.py pref <user_id> --show
```

### 观影清单
```bash
# 添加到观影清单
uv run {baseDir}/scripts/tmdb.py watchlist <user_id> add 27205
uv run {baseDir}/scripts/tmdb.py watchlist <user_id> add "沙丘：第二部"

# 查看观影清单
uv run {baseDir}/scripts/tmdb.py watchlist <user_id>

# 从观影清单移除
uv run {baseDir}/scripts/tmdb.py watchlist <user_id> rm 27205
```

## 集成功能

### Plex 集成
如果 Plex skill 可用，`suggest` 命令会获取最近的观看历史以生成更准确的推荐。

### ppl.gift (CRM) 集成
如果 ppl skill 可用，偏好设置会作为用户联系人的笔记保存，以实现跨会话持久化。

## 电影类型 ID

常用的 `--genre` 筛选类型：
| 英文类型 | ID | 中文类型 |
|----------|-----|----------|
| action | 28 | 动作 |
| adventure | 12 | 冒险 |
| animation | 16 | 动画 |
| comedy | 35 | 喜剧 |
| crime | 80 | 犯罪 |
| documentary | 99 | 纪录片 |
| drama | 18 | 剧情 |
| family | 10751 | 家庭 |
| fantasy | 14 | 奇幻 |
| horror | 27 | 恐怖 |
| mystery | 9648 | 悬疑 |
| romance | 10749 | 爱情 |
| sci-fi | 878 | 科幻 |
| thriller | 53 | 惊悚 |
| war | 10752 | 战争 |

## 使用说明

1. **API 限制**：
   - 免费版：每秒 10 次请求，每天 50 次请求
   - 流媒体提供商信息因地区而异（默认：美国）

2. **推荐算法**：
   - 结合 TMDb 数据、用户偏好和观看历史
   - 偏好设置存储在本地 JSON 文件中
   - 支持与 Plex 和 ppl.gift 集成

3. **数据存储**：
   - 观影清单和偏好设置保存在 `data/` 目录
   - 支持多用户管理
   - 数据可以跨会话持久化

4. **搜索技巧**：
   - 支持中英文电影名称搜索
   - 可以按 ID 直接查询
   - 人物搜索支持演员和导演
