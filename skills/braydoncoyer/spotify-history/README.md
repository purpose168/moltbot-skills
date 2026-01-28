# Spotify 播放历史与推荐

通过 Spotify Web API 访问您的播放历史、热门艺术家/歌曲，并获取个性化推荐。

## 快速开始

```bash
# 运行设置向导
bash skills/spotify-history/scripts/setup.sh

# 测试功能
python3 scripts/spotify-api.py recent
python3 scripts/spotify-api.py top-artists
python3 scripts/spotify-api.py recommend
```

## 功能说明

- **播放历史**：查看您最近播放的歌曲
- **热门艺术家/歌曲**：您播放最多的艺术家和歌曲（4 周、6 个月或所有时间）
- **音乐推荐**：基于您的音乐品味获取个性化推荐
- **自动刷新**：令牌自动刷新 - 只需设置一次，永不过期

## 环境要求

- Python 3.6+
- Spotify 账户（免费或 Premium）
- 一次性设置：Spotify 开发者应用（免费，约 2 分钟）

## 代理集成

当您向代理询问音乐相关问题时：
- "我最近在听什么？"
- "我的热门艺术家是谁？"
- "推荐一些新音乐"

代理将：
1. 获取您的 Spotify 数据
2. 分析您的音乐品味
3. 结合 API 数据和音乐知识，提供个性化推荐

## 文档说明

完整文档、故障排除和高级用法请参见 [SKILL.md](./SKILL.md)。

## 许可证

MIT
