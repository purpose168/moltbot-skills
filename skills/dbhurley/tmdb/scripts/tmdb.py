# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "click"]
# ///
"""
TMDb 电影和电视剧数据库 - 提供电影/电视剧搜索、流媒体信息查询和个性化推荐功能。

主要功能：
- 搜索电影和电视剧
- 查看电影/电视剧详细信息，包括演员阵容、评分、剧情简介等
- 查找电影/电视剧的流媒体播放渠道
- 发现热门和趋势内容
- 基于喜好推荐相似电影
- 管理个人观影清单
- 设置用户偏好以获得个性化推荐
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
import click

# TMDb API 基础 URL
TMDB_BASE = "https://api.themoviedb.org/3"
# 从环境变量读取 API 密钥
API_KEY = os.environ.get("TMDB_API_KEY", "")
# 数据文件目录
DATA_DIR = Path(__file__).parent.parent / "data"
# 观影清单文件路径
WATCHLIST_FILE = DATA_DIR / "watchlist.json"
# 用户偏好文件路径
PREFS_FILE = DATA_DIR / "preferences.json"

# 电影类型名称到 ID 的映射
# Genre name to ID mapping
GENRES = {
    "action": 28,            # 动作
    "adventure": 12,         # 冒险
    "animation": 16,         # 动画
    "comedy": 35,            # 喜剧
    "crime": 80,             # 犯罪
    "documentary": 99,       # 纪录片
    "drama": 18,             # 剧情
    "family": 10751,         # 家庭
    "fantasy": 14,           # 奇幻
    "history": 36,           # 历史
    "horror": 27,            # 恐怖
    "music": 10402,          # 音乐
    "mystery": 9648,         # 悬疑
    "romance": 10749,        # 爱情
    "sci-fi": 878,           # 科幻
    "science fiction": 878,  # 科幻（别名）
    "thriller": 53,          # 惊悚
    "tv movie": 10770,       # 电视电影
    "war": 10752,            # 战争
    "western": 37,           # 西部
}

# 创建反向映射：ID 到名称
GENRE_NAMES = {v: k for k, v in GENRES.items()}


def api_get(endpoint: str, params: dict = None) -> dict:
    """
    发起 TMDb API 请求并返回 JSON 响应。
    
    参数:
        endpoint: API 端点路径（不含基础 URL）
        params: 可选的查询参数字典
        
    返回:
        API 响应解析后的字典
        
    退出:
        如果未设置 API_KEY 或请求失败，输出错误信息并退出程序
    """
    if not API_KEY:
        click.echo("❌ 未设置 TMDB_API_KEY 环境变量", err=True)
        sys.exit(1)
    
    params = params or {}
    params["api_key"] = API_KEY
    
    # 发送 GET 请求，设置 15 秒超时
    resp = httpx.get(f"{TMDB_BASE}{endpoint}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def load_json(path: Path) -> dict:
    """
    从文件加载 JSON 数据。
    
    参数:
        path: JSON 文件路径
        
    返回:
        解析后的字典，如果文件不存在或解析失败则返回空字典
    """
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, IOError):
        return {}


def save_json(path: Path, data: dict) -> None:
    """
    将数据保存为 JSON 文件。
    
    参数:
        path: 目标文件路径
        data: 要保存的数据字典
    """
    # 确保目录存在
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def format_movie(m: dict, detailed: bool = False) -> str:
    """
    将电影信息格式化为字符串用于显示。
    
    参数:
        m: 电影信息字典
        detailed: 是否显示详细信息（包含简介、类型等）
        
    返回:
        格式化的电影信息字符串
    """
    year = m.get("release_date", "")[:4] or "待定"  # 上映年份
    rating = m.get("vote_average", 0)  # 评分
    stars = "⭐" * round(rating / 2)  # 将 10 分制转换为 5 星制
    
    lines = [f"🎬 **{m.get('title', '未知')}** ({year})"]
    lines.append(f"   评分: {rating}/10 {stars}")
    
    if detailed:
        # 显示标语
        if m.get("tagline"):
            lines.append(f"   \"{m['tagline']}\"")
        # 显示时长
        if m.get("runtime"):
            hrs, mins = divmod(m["runtime"], 60)
            lines.append(f"   片长: {hrs}小时 {mins}分钟")
        # 显示类型
        if m.get("genres"):
            genres = ", ".join(g["name"] for g in m["genres"])
            lines.append(f"   类型: {genres}")
        # 显示简介（截断为 200 字符）
        if m.get("overview"):
            overview = m["overview"][:200] + "..." if len(m.get("overview", "")) > 200 else m.get("overview", "")
            lines.append(f"   {overview}")
    
    return "\n".join(lines)


def format_tv(t: dict, detailed: bool = False) -> str:
    """
    将电视剧信息格式化为字符串用于显示。
    
    参数:
        t: 电视剧信息字典
        detailed: 是否显示详细信息
        
    返回:
        格式化的电视剧信息字符串
    """
    year = t.get("first_air_date", "")[:4] or "待定"  # 首播年份
    rating = t.get("vote_average", 0)  # 评分
    stars = "⭐" * round(rating / 2)  # 将 10 分制转换为 5 星制
    
    lines = [f"📺 **{t.get('name', '未知')}** ({year})"]
    lines.append(f"   评分: {rating}/10 {stars}")
    
    if detailed:
        # 显示标语
        if t.get("tagline"):
            lines.append(f"   \"{t['tagline']}\"")
        # 显示季数和集数
        if t.get("number_of_seasons"):
            lines.append(f"   季数: {t['number_of_seasons']}, 集数: {t.get('number_of_episodes', '?')}")
        # 显示类型
        if t.get("genres"):
            genres = ", ".join(g["name"] for g in t["genres"])
            lines.append(f"   类型: {genres}")
        # 显示简介（截断为 200 字符）
        if t.get("overview"):
            overview = t["overview"][:200] + "..." if len(t.get("overview", "")) > 200 else t.get("overview", "")
            lines.append(f"   {overview}")
    
    return "\n".join(lines)


@click.group()
def cli():
    """
    TMDb 命令行工具主入口。
    
    这是一个命令行组，用于组织所有 TMDb 相关的子命令。
    """
    pass


@cli.command()
@click.argument("query")
@click.option("--tv", is_flag=True, help="搜索电视剧而非电影")
@click.option("--limit", "-l", default=5, help="最大结果数量")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 格式输出")
def search(query: str, tv: bool, limit: int, json_output: bool):
    """
    搜索电影或电视剧。
    
    参数:
        query: 搜索关键词
        tv: 是否搜索电视剧
        limit: 返回结果数量限制
        json_output: 是否以 JSON 格式输出
    """
    # 根据 tv 参数选择 API 端点
    endpoint = "/search/tv" if tv else "/search/movie"
    data = api_get(endpoint, {"query": query})
    
    results = data.get("results", [])[:limit]
    
    if json_output:
        click.echo(json.dumps(results, indent=2))
        return
    
    if not results:
        click.echo(f"未找到与 '{query}' 相关的结果")
        return
    
    media_type = "电视剧" if tv else "电影"
    click.echo(f"找到 {len(results)} 个{media_type}：\n")
    
    for item in results:
        if tv:
            year = item.get("first_air_date", "")[:4] or "?"
            click.echo(f"  [{item['id']}] {item.get('name', '?')} ({year}) ⭐{item.get('vote_average', 0):.1f}")
        else:
            year = item.get("release_date", "")[:4] or "?"
            click.echo(f"  [{item['id']}] {item.get('title', '?')} ({year}) ⭐{item.get('vote_average', 0):.1f}")


@cli.command()
@click.argument("movie_id")
@click.option("--cast", is_flag=True, help="包含演员阵容信息")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 格式输出")
def movie(movie_id: str, cast: bool, json_output: bool):
    """
    根据 ID 获取电影详细信息。
    
    如果提供的 ID 不是数字，则先搜索再获取详情。
    
    参数:
        movie_id: 电影 ID 或电影名称
        cast: 是否包含演员阵容
        json_output: 是否以 JSON 格式输出
    """
    # 如果不是数字 ID，先搜索电影
    if not movie_id.isdigit():
        data = api_get("/search/movie", {"query": movie_id})
        results = data.get("results", [])
        if not results:
            click.echo(f"❌ 电影 '{movie_id}' 未找到")
            return
        movie_id = str(results[0]["id"])
    
    # 获取电影详情
    data = api_get(f"/movie/{movie_id}")
    
    # 如果需要演员信息，获取演员表
    if cast:
        credits = api_get(f"/movie/{movie_id}/credits")
        data["cast"] = credits.get("cast", [])[:10]  # 前 10 名演员
        # 提取主要创作人员（导演、编剧）
        data["crew"] = [c for c in credits.get("crew", []) if c.get("job") in ("Director", "Writer", "Screenplay")]
    
    if json_output:
        click.echo(json.dumps(data, indent=2))
        return
    
    # 以美化的格式显示电影信息
    click.echo(format_movie(data, detailed=True))
    
    # 显示演员阵容
    if cast and data.get("cast"):
        click.echo("\n   演员阵容：")
        for c in data["cast"]:
            click.echo(f"     • {c['name']} 饰演 {c.get('character', '?')}")
    
    # 显示创作团队
    if cast and data.get("crew"):
        click.echo("\n   创作团队：")
        for c in data["crew"]:
            click.echo(f"     • {c['name']} ({c['job']})")


@cli.command()
@click.argument("tv_id")
@click.option("--cast", is_flag=True, help="包含演员阵容信息")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 格式输出")
def tv(tv_id: str, cast: bool, json_output: bool):
    """
    根据 ID 获取电视剧详细信息。
    
    如果提供的 ID 不是数字，则先搜索再获取详情。
    
    参数:
        tv_id: 电视剧 ID 或电视剧名称
        cast: 是否包含演员阵容
        json_output: 是否以 JSON 格式输出
    """
    # 如果不是数字 ID，先搜索电视剧
    if not tv_id.isdigit():
        data = api_get("/search/tv", {"query": tv_id})
        results = data.get("results", [])
        if not results:
            click.echo(f"❌ 电视剧 '{tv_id}' 未找到")
            return
        tv_id = str(results[0]["id"])
    
    # 获取电视剧详情
    data = api_get(f"/tv/{tv_id}")
    
    # 如果需要演员信息，获取演员表
    if cast:
        credits = api_get(f"/tv/{tv_id}/credits")
        data["cast"] = credits.get("cast", [])[:10]  # 前 10 名演员
    
    if json_output:
        click.echo(json.dumps(data, indent=2))
        return
    
    # 以美化的格式显示电视剧信息
    click.echo(format_tv(data, detailed=True))
    
    # 显示演员阵容
    if cast and data.get("cast"):
        click.echo("\n   演员阵容：")
        for c in data["cast"]:
            click.echo(f"     • {c['name']} 饰演 {c.get('character', '?')}")


@cli.command()
@click.argument("query")
@click.option("--limit", "-l", default=5, help="最大结果数量")
def person(query: str, limit: int):
    """
    搜索演员、导演等人物信息。
    
    参数:
        query: 搜索关键词（人物名称）
        limit: 返回结果数量限制
    """
    data = api_get("/search/person", {"query": query})
    results = data.get("results", [])[:limit]
    
    if not results:
        click.echo(f"未找到与 '{query}' 相关的人物")
        return
    
    for p in results:
        known_for = p.get("known_for", [])[:3]  # 获取前 3 部代表作
        titles = ", ".join(
            m.get("title") or m.get("name", "?") for m in known_for
        )
        click.echo(f"👤 **{p['name']}** ({p.get('known_for_department', '?')})")
        if titles:
            click.echo(f"   代表作: {titles}")
        click.echo()


@cli.command()
@click.argument("query")
@click.option("--region", "-r", default="US", help="地区代码（如：US、GB 等）")
@click.option("--json-output", "-j", is_flag=True, help="以 JSON 格式输出")
def where(query: str, region: str, json_output: bool):
    """
    查找电影或电视剧的流媒体播放渠道。
    
    参数:
        query: 电影或电视剧名称
        region: 地区代码
        json_output: 是否以 JSON 格式输出
    """
    # 首先搜索电影
    movie_data = api_get("/search/movie", {"query": query})
    # 同时搜索电视剧
    tv_data = api_get("/search/tv", {"query": query})
    
    movie_results = movie_data.get("results", [])
    tv_results = tv_data.get("results", [])
    
    # 优先使用电影结果，其次使用电视剧结果
    if movie_results:
        item = movie_results[0]
        media_type = "movie"
        title = item.get("title", "Unknown")
        item_id = item["id"]
    elif tv_results:
        item = tv_results[0]
        media_type = "tv"
        title = item.get("name", "Unknown")
        item_id = item["id"]
    else:
        click.echo(f"❌ 未找到 '{query}'")
        return
    
    # 获取流媒体提供商信息
    providers = api_get(f"/{media_type}/{item_id}/watch/providers")
    region_data = providers.get("results", {}).get(region, {})
    
    if json_output:
        click.echo(json.dumps({"title": title, "id": item_id, "type": media_type, "providers": region_data}, indent=2))
        return
    
    click.echo(f"🎬 **{title}** - 在 {region} 的流媒体平台：\n")
    
    if not region_data:
        click.echo(f"   该地区 ({region}) 没有可用的流媒体信息")
        return
    
    # 显示订阅流媒体平台
    if region_data.get("flatrate"):
        click.echo("   📺 订阅观看：")
        for p in region_data["flatrate"]:
            click.echo(f"      • {p['provider_name']}")
    
    # 显示租借平台
    if region_data.get("rent"):
        click.echo("   💵 租借：")
        for p in region_data["rent"][:5]:
            click.echo(f"      • {p['provider_name']}")
    
    # 显示购买平台
    if region_data.get("buy"):
        click.echo("   🛒 购买：")
        for p in region_data["buy"][:5]:
            click.echo(f"      • {p['provider_name']}")
    
    # 显示更多信息链接
    if region_data.get("link"):
        click.echo(f"\n   更多信息: {region_data['link']}")


@cli.command()
@click.option("--tv", is_flag=True, help="显示趋势电视剧而非电影")
@click.option("--limit", "-l", default=10, help="最大结果数量")
def trending(tv: bool, limit: int):
    """
    显示本周热门电影或电视剧。
    
    参数:
        tv: 是否显示热门电视剧
        limit: 返回结果数量限制
    """
    media_type = "tv" if tv else "movie"
    data = api_get(f"/trending/{media_type}/week")
    results = data.get("results", [])[:limit]
    
    media_type_cn = "电视剧" if tv else "电影"
    click.echo(f"🔥 本周热门{media_type_cn}：\n")
    
    for i, item in enumerate(results, 1):
        if tv:
            year = item.get("first_air_date", "")[:4] or "?"
            click.echo(f"  {i}. {item.get('name', '?')} ({year}) ⭐{item.get('vote_average', 0):.1f}")
        else:
            year = item.get("release_date", "")[:4] or "?"
            click.echo(f"  {i}. {item.get('title', '?')} ({year}) ⭐{item.get('vote_average', 0):.1f}")


@cli.command()
@click.argument("query")
@click.option("--limit", "-l", default=10, help="最大结果数量")
def recommend(query: str, limit: int):
    """
    基于电影获取相似推荐。
    
    参数:
        query: 电影名称
        limit: 返回结果数量限制
    """
    # 首先搜索电影
    search_data = api_get("/search/movie", {"query": query})
    results = search_data.get("results", [])
    
    if not results:
        click.echo(f"❌ 电影 '{query}' 未找到")
        return
    
    movie_id = results[0]["id"]
    title = results[0].get("title", "Unknown")
    
    # 获取推荐电影
    rec_data = api_get(f"/movie/{movie_id}/recommendations")
    recs = rec_data.get("results", [])[:limit]
    
    if not recs:
        click.echo(f"未找到与 '{title}' 相关的推荐")
        return
    
    click.echo(f"🎯 如果你喜欢 **{title}**，可以尝试：\n")
    
    for r in recs:
        year = r.get("release_date", "")[:4] or "?"
        click.echo(f"  • {r.get('title', '?')} ({year}) ⭐{r.get('vote_average', 0):.1f}")


@cli.command()
@click.option("--genre", "-g", help="类型名称（action、comedy、sci-fi 等）")
@click.option("--year", "-y", type=int, help="上映年份")
@click.option("--rating", "-r", type=float, help="最低评分")
@click.option("--limit", "-l", default=10, help="最大结果数量")
def discover(genre: str, year: int, rating: float, limit: int):
    """
    发现符合筛选条件的电影。
    
    参数:
        genre: 电影类型
        year: 上映年份
        rating: 最低评分
        limit: 返回结果数量限制
    """
    params = {"sort_by": "popularity.desc"}  # 按热度降序排列
    
    if genre:
        genre_id = GENRES.get(genre.lower())
        if not genre_id:
            click.echo(f"❌ 未知的类型 '{genre}'。可选类型: {', '.join(GENRES.keys())}")
            return
        params["with_genres"] = genre_id
    
    if year:
        params["primary_release_year"] = year
    
    if rating:
        params["vote_average.gte"] = rating
        params["vote_count.gte"] = 100  # 确保有足够的投票数
    
    data = api_get("/discover/movie", params)
    results = data.get("results", [])[:limit]
    
    # 构建筛选条件描述
    filters = []
    if genre:
        filters.append(genre.title())
    if year:
        filters.append(str(year))
    if rating:
        filters.append(f"≥{rating}⭐")
    
    click.echo(f"🔍 发现: {' | '.join(filters) or '热门'}\n")
    
    for r in results:
        year_str = r.get("release_date", "")[:4] or "?"
        click.echo(f"  • {r.get('title', '?')} ({year_str}) ⭐{r.get('vote_average', 0):.1f}")


@cli.command()
@click.argument("user_id")
@click.option("--genres", help="喜好的类型（逗号分隔）")
@click.option("--directors", help="喜好的导演（逗号分隔）")
@click.option("--avoid", help="要避免的类型（逗号分隔）")
@click.option("--show", is_flag=True, help="显示当前偏好设置")
def pref(user_id: str, genres: str, directors: str, avoid: str, show: bool):
    """
    设置或查看用户偏好设置。
    
    参数:
        user_id: 用户 ID
        genres: 喜好的电影类型
        directors: 喜好的导演
        avoid: 要避免的电影类型
        show: 是否显示当前偏好
    """
    prefs = load_json(PREFS_FILE)
    
    # 初始化用户偏好（如果不存在）
    if user_id not in prefs:
        prefs[user_id] = {"genres": [], "directors": [], "avoid": [], "updated": None}
    
    # 显示偏好设置
    if show:
        user_prefs = prefs.get(user_id, {})
        click.echo(f"用户 {user_id} 的偏好设置：")
        click.echo(f"  喜好类型: {', '.join(user_prefs.get('genres', [])) or '未设置'}")
        click.echo(f"  喜好导演: {', '.join(user_prefs.get('directors', [])) or '未设置'}")
        click.echo(f"  避免类型: {', '.join(user_prefs.get('avoid', [])) or '未设置'}")
        return
    
    # 更新偏好设置
    if genres:
        prefs[user_id]["genres"] = [g.strip().lower() for g in genres.split(",")]
    if directors:
        prefs[user_id]["directors"] = [d.strip() for d in directors.split(",")]
    if avoid:
        prefs[user_id]["avoid"] = [a.strip().lower() for a in avoid.split(",")]
    
    prefs[user_id]["updated"] = datetime.now(timezone.utc).isoformat()
    save_json(PREFS_FILE, prefs)
    
    click.echo(f"✅ 已更新用户 {user_id} 的偏好设置")
    
    # 尝试保存到 ppl.gift（如果可用）
    try:
        ppl_note = f"🎬 MOVIE PREFS: genres={','.join(prefs[user_id].get('genres', []))}, avoid={','.join(prefs[user_id].get('avoid', []))}"
        # 此处可以与 ppl skill 集成
    except Exception:
        pass


@cli.command()
@click.argument("user_id")
@click.argument("action", required=False)
@click.argument("movie_ref", required=False)
def watchlist(user_id: str, action: str, movie_ref: str):
    """
    管理用户的观影清单。
    
    用法：
        watchlist <user_id>              # 查看观影清单
        watchlist <user_id> add <电影>   # 添加电影
        watchlist <user_id> rm <电影>    # 移除电影
    
    参数:
        user_id: 用户 ID
        action: 操作（add/rm）
        movie_ref: 电影 ID 或电影名称
    """
    data = load_json(WATCHLIST_FILE)
    
    # 初始化用户的观影清单（如果不存在）
    if user_id not in data:
        data[user_id] = []
    
    # 查看观影清单
    if not action:
        items = data.get(user_id, [])
        if not items:
            click.echo(f"用户 {user_id} 的观影清单为空")
            return
        
        click.echo(f"📋 用户 {user_id} 的观影清单 ({len(items)} 项)：\n")
        for item in items:
            click.echo(f"  [{item['id']}] {item['title']} ({item.get('year', '?')})")
        return
    
    # 添加到观影清单
    if action == "add" and movie_ref:
        # 如果不是数字 ID，先搜索电影
        if not movie_ref.isdigit():
            search_data = api_get("/search/movie", {"query": movie_ref})
            results = search_data.get("results", [])
            if not results:
                click.echo(f"❌ 电影 '{movie_ref}' 未找到")
                return
            movie_info = results[0]
        else:
            movie_info = api_get(f"/movie/{movie_ref}")
        
        movie_id = movie_info["id"]
        
        # 检查是否已在观影清单中
        if any(m["id"] == movie_id for m in data[user_id]):
            click.echo(f"'{movie_info.get('title', '?')}' 已在观影清单中")
            return
        
        # 添加到观影清单
        data[user_id].append({
            "id": movie_id,
            "title": movie_info.get("title", "Unknown"),
            "year": movie_info.get("release_date", "")[:4],
            "added": datetime.now(timezone.utc).isoformat(),
        })
        save_json(WATCHLIST_FILE, data)
        click.echo(f"✅ 已将 '{movie_info.get('title', '?')}' 添加到观影清单")
        return
    
    # 从观影清单移除
    if action == "rm" and movie_ref:
        movie_id = int(movie_ref) if movie_ref.isdigit() else None
        original_len = len(data[user_id])
        
        if movie_id:
            data[user_id] = [m for m in data[user_id] if m["id"] != movie_id]
        else:
            data[user_id] = [m for m in data[user_id] if movie_ref.lower() not in m["title"].lower()]
        
        if len(data[user_id]) < original_len:
            save_json(WATCHLIST_FILE, data)
            click.echo(f"✅ 已从观影清单移除")
        else:
            click.echo(f"❌ 未在观影清单中找到 '{movie_ref}'")
        return
    
    click.echo("用法: watchlist <user_id> [add|rm] [电影]")


@cli.command()
@click.argument("user_id")
@click.option("--limit", "-l", default=10, help="最大建议数量")
def suggest(user_id: str, limit: int):
    """
    根据用户偏好获取个性化电影推荐。
    
    参数:
        user_id: 用户 ID
        limit: 返回建议数量
    """
    prefs = load_json(PREFS_FILE).get(user_id, {})
    
    liked_genres = prefs.get("genres", [])
    avoid_genres = prefs.get("avoid", [])
    
    # 根据偏好构建发现参数
    params = {"sort_by": "popularity.desc", "vote_count.gte": 500}
    
    # 添加喜好的类型
    if liked_genres:
        genre_ids = [GENRES.get(g) for g in liked_genres if g in GENRES]
        if genre_ids:
            params["with_genres"] = ",".join(str(g) for g in genre_ids[:3])
    
    # 排除不喜欢的类型
    if avoid_genres:
        avoid_ids = [GENRES.get(g) for g in avoid_genres if g in GENRES]
        if avoid_ids:
            params["without_genres"] = ",".join(str(g) for g in avoid_ids)
    
    # 尝试获取 Plex 观看历史以获得更好的推荐
    plex_watched = []
    try:
        # 检查 Plex skill 是否存在
        plex_skill = Path(__file__).parent.parent.parent / "plex"
        if plex_skill.exists():
            # 可以在这里与 Plex 集成获取观看历史
            pass
    except Exception:
        pass
    
    # 发现电影
    data = api_get("/discover/movie", params)
    results = data.get("results", [])[:limit]
    
    # 构建偏好描述
    pref_desc = f"（基于喜好: {', '.join(liked_genres)}）" if liked_genres else ""
    click.echo(f"🎯 对用户 {user_id} 的建议{pref_desc}：\n")
    
    for r in results:
        year = r.get("release_date", "")[:4] or "?"
        genre_names = []
        for gid in r.get("genre_ids", [])[:2]:
            if gid in GENRE_NAMES:
                genre_names.append(GENRE_NAMES[gid].title())
        genres_str = f" [{', '.join(genre_names)}]" if genre_names else ""
        click.echo(f"  • {r.get('title', '?')} ({year}) ⭐{r.get('vote_average', 0):.1f}{genres_str}")


@cli.command()
@click.argument("query")
@click.option("--cast", is_flag=True, help="包含演员阵容")
def info(query: str, cast: bool):
    """
    搜索并显示电影或电视剧的详细信息。
    
    参数:
        query: 搜索关键词
        cast: 是否包含演员阵容
    """
    # 先尝试搜索电影
    movie_data = api_get("/search/movie", {"query": query})
    if movie_data.get("results"):
        movie_id = movie_data["results"][0]["id"]
        ctx = click.Context(movie)
        ctx.invoke(movie, movie_id=str(movie_id), cast=cast, json_output=False)
        return
    
    # 再尝试搜索电视剧
    tv_data = api_get("/search/tv", {"query": query})
    if tv_data.get("results"):
        tv_id = tv_data["results"][0]["id"]
        ctx = click.Context(tv)
        ctx.invoke(tv, tv_id=str(tv_id), cast=cast, json_output=False)
        return
    
    click.echo(f"❌ 未找到与 '{query}' 相关的电影或电视剧")


if __name__ == "__main__":
    cli()
