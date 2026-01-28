import argparse
import json
import requests
from bs4 import BeautifulSoup
import sys
import time
import re
import concurrent.futures
from datetime import datetime

# 请求头信息，用于网页抓取以避免基本的机器人检测
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def filter_items(items, keyword=None):
    """
    根据关键词筛选新闻条目
    
    参数：
        items: 新闻条目列表
        keyword: 逗号分隔的关键词字符串
    
    返回：
        筛选后的条目列表
    """
    if not keyword:
        return items
    # 将关键词字符串拆分为列表
    keywords = [k.strip() for k in keyword.split(',') if k.strip()]
    # 构建正则表达式模式
    pattern = '|'.join([r'\b' + re.escape(k) + r'\b' for k in keywords])
    regex = r'(?i)(' + pattern + r')'
    # 返回标题匹配关键词的条目
    return [item for item in items if re.search(regex, item['title'])]

def fetch_url_content(url):
    """
    获取 URL 内容并从段落中提取文本
    截断至 3000 字符
    
    参数：
        url: 要抓取的网页 URL
    
    返回：
        提取的文本内容（截断至 3000 字符），失败返回空字符串
    """
    if not url or not url.startswith('http'):
        return ""
    try:
        response = requests.get(url, headers=HEADERS, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        # 移除脚本和样式元素
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
        # 获取纯文本
        text = soup.get_text(separator=' ', strip=True)
        # 简单清理
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        return text[:3000]
    except Exception:
        return ""

def enrich_items_with_content(items, max_workers=10):
    """
    使用线程池并行获取多个条目的详细内容
    
    参数：
        items: 新闻条目列表
        max_workers: 最大并行工作线程数（默认 10）
    
    返回：
        包含详细内容的新条目列表
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_item = {executor.submit(fetch_url_content, item['url']): item for item in items}
        for future in concurrent.futures.as_completed(future_to_item):
            item = future_to_item[future]
            try:
                content = future.result()
                if content:
                    item['content'] = content
            except Exception:
                item['content'] = ""
    return items

# --- 新闻源获取函数 ---

def fetch_hackernews(limit=5, keyword=None):
    """
    从 Hacker News 获取热门新闻
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的 Hacker News 新闻列表
    """
    base_url = "https://news.ycombinator.com"
    news_items = []
    page = 1
    max_pages = 5
    
    # 分页获取，直到达到数量限制
    while len(news_items) < limit and page <= max_pages:
        url = f"{base_url}/news?p={page}"
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code != 200: break
        except: break

        soup = BeautifulSoup(response.text, 'html.parser')
        rows = soup.select('.athing')
        if not rows: break
        
        page_items = []
        for row in rows:
            try:
                id_ = row.get('id')
                title_line = row.select_one('.titleline a')
                if not title_line: continue
                title = title_line.get_text()
                link = title_line.get('href')
                
                # 获取元数据：评分
                score_span = soup.select_one(f'#score_{id_}')
                score = score_span.get_text() if score_span else "0 points"
                
                # 获取发布时间
                age_span = soup.select_one(f'.age a[href="item?id={id_}"]')
                time_str = age_span.get_text() if age_span else ""
                
                # 处理相对链接
                if link and link.startswith('item?id='): link = f"{base_url}/{link}"
                
                page_items.append({
                    "source": "Hacker News", 
                    "title": title, 
                    "url": link, 
                    "heat": score,
                    "time": time_str
                })
            except: continue
        
        # 应用关键词筛选
        news_items.extend(filter_items(page_items, keyword))
        if len(news_items) >= limit: break
        page += 1
        time.sleep(0.5)

    return news_items[:limit]

def fetch_weibo(limit=5, keyword=None):
    """
    从微博热搜获取实时热门搜索
    
    使用 PC 端 Ajax API 直接返回 JSON，比抓取 s.weibo.com 限流更少
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的微博热搜列表
    """
    # 使用 PC Ajax API 直接返回 JSON
    url = "https://weibo.com/ajax/side/hotSearch"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://weibo.com/"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        items = data.get('data', {}).get('realtime', [])
        
        all_items = []
        for item in items:
            # 'note' 字段通常是标题，有时是 'word'
            title = item.get('note', '') or item.get('word', '')
            if not title: continue
            
            # 'num' 是热度值
            heat = item.get('num', 0)
            
            # 构建搜索 URL
            # 网页版格式：https://s.weibo.com/weibo?q=%23TITLE%23&Refer=top
            full_url = f"https://s.weibo.com/weibo?q={requests.utils.quote(title)}&Refer=top"
            
            all_items.append({
                "source": "微博热搜", 
                "title": title, 
                "url": full_url, 
                "heat": f"{heat}",
                "time": "实时"
            })
            
        return filter_items(all_items, keyword)[:limit]
    except Exception: 
        return []

def fetch_github(limit=5, keyword=None):
    """
    从 GitHub Trending 获取热门开源项目
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的 GitHub Trending 项目列表
    """
    try:
        response = requests.get("https://github.com/trending", headers=HEADERS, timeout=10)
    except: return []
    
    soup = BeautifulSoup(response.text, 'html.parser')
    items = []
    for article in soup.select('article.Box-row'):
        try:
            h2 = article.select_one('h2 a')
            if not h2: continue
            title = h2.get_text(strip=True).replace('\n', '').replace(' ', '')
            link = "https://github.com" + h2['href']
            
            # 获取描述
            desc = article.select_one('p')
            desc_text = desc.get_text(strip=True) if desc else ""
            
            # 获取星标数（热度）
            stars_tag = article.select_one('a[href$="/stargazers"]')
            stars = stars_tag.get_text(strip=True) if stars_tag else ""
            
            items.append({
                "source": "GitHub Trending", 
                "title": f"{title} - {desc_text}", 
                "url": link,
                "heat": f"{stars} stars",
                "time": "今日"
            })
        except: continue
    return filter_items(items, keyword)[:limit]

def fetch_36kr(limit=5, keyword=None):
    """
    从 36Kr 快讯获取科技新闻
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的 36Kr 新闻列表
    """
    try:
        response = requests.get("https://36kr.com/newsflashes", headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        items = []
        for item in soup.select('.newsflash-item'):
            title = item.select_one('.item-title').get_text(strip=True)
            href = item.select_one('.item-title')['href']
            time_tag = item.select_one('.time')
            time_str = time_tag.get_text(strip=True) if time_tag else ""
            
            items.append({
                "source": "36Kr", 
                "title": title, 
                "url": f"https://36kr.com{href}" if not href.startswith('http') else href,
                "time": time_str,
                "heat": ""
            })
        return filter_items(items, keyword)[:limit]
    except: return []

def fetch_v2ex(limit=5, keyword=None):
    """
    从 V2EX 热门话题获取讨论
    
    使用 V2EX API 获取热门话题，比网页抓取更可靠
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的 V2EX 话题列表
    """
    try:
        # 热门话题 API
        data = requests.get("https://www.v2ex.com/api/topics/hot.json", headers=HEADERS, timeout=10).json()
        items = []
        for t in data:
            # V2EX API 字段：created（创建时间）、replies（回复数=热度）
            replies = t.get('replies', 0)
            created = t.get('created', 0)
            # 简单处理时间
            items.append({
                "source": "V2EX", 
                "title": t['title'], 
                "url": t['url'],
                "heat": f"{replies} replies",
                "time": "热门"
            })
        return filter_items(items, keyword)[:limit]
    except: return []

def fetch_tencent(limit=5, keyword=None):
    """
    从腾讯新闻科技频道获取科技新闻
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的腾讯新闻列表
    """
    try:
        url = "https://i.news.qq.com/web_backend/v2/getTagInfo?tagId=aEWqxLtdgmQ%3D"
        data = requests.get(url, headers={"Referer": "https://news.qq.com/"}, timeout=10).json()
        items = []
        for news in data['data']['tabs'][0]['articleList']:
            items.append({
                "source": "腾讯新闻", 
                "title": news['title'], 
                "url": news.get('url') or news.get('link_info', {}).get('url'),
                "time": news.get('pub_time', '') or news.get('publish_time', '')
            })
        return filter_items(items, keyword)[:limit]
    except: return []

def fetch_wallstreetcn(limit=5, keyword=None):
    """
    从华尔街见闻获取财经新闻
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的华尔街见闻新闻列表
    """
    try:
        url = "https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=30"
        data = requests.get(url, timeout=10).json()
        items = []
        for item in data['data']['items']:
            res = item.get('resource')
            if res and (res.get('title') or res.get('content_short')):
                 ts = res.get('display_time', 0)
                 time_str = datetime.fromtimestamp(ts).strftime('%H:%M') if ts else ""
                 items.append({
                     "source": "华尔街见闻", 
                     "title": res.get('title') or res.get('content_short'), 
                     "url": res.get('uri'),
                     "time": time_str
                 })
        return filter_items(items, keyword)[:limit]
    except: return []

def fetch_producthunt(limit=5, keyword=None):
    """
    从 Product Hunt 获取新产品发布
    
    使用 RSS 源，无需 API 密钥，速度快且可靠
    
    参数：
        limit: 返回的最大条目数（默认 5）
        keyword: 关键词筛选（默认 None）
    
    返回：
        筛选后的 Product Hunt 产品列表
    """
    try:
        # 使用 RSS 获取速度和可靠性，无需 API 密钥
        response = requests.get("https://www.producthunt.com/feed", headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'xml')
        if not soup.find('item'): soup = BeautifulSoup(response.text, 'html.parser')
        
        items = []
        for entry in soup.find_all(['item', 'entry']):
            title = entry.find('title').get_text(strip=True)
            link_tag = entry.find('link')
            url = link_tag.get('href') or link_tag.get_text(strip=True) if link_tag else ""
            
            pubBox = entry.find('pubDate') or entry.find('published')
            pub = pubBox.get_text(strip=True) if pubBox else ""
            
            items.append({
                "source": "Product Hunt", 
                "title": title, 
                "url": url,
                "time": pub,
                "heat": "热门产品" # RSS 本身就代表排名靠前
            })
        return filter_items(items, keyword)[:limit]
    except: return []

def main():
    """
    主函数：解析命令行参数并执行新闻获取
    
    支持从多个来源获取新闻，支持关键词筛选和深度获取模式
    """
    parser = argparse.ArgumentParser()
    # 来源映射：名称到对应的获取函数
    sources_map = {
        'hackernews': fetch_hackernews, 'weibo': fetch_weibo, 'github': fetch_github,
        '36kr': fetch_36kr, 'v2ex': fetch_v2ex, 'tencent': fetch_tencent,
        'wallstreetcn': fetch_wallstreetcn, 'producthunt': fetch_producthunt
    }
    
    # 命令行参数定义
    parser.add_argument('--source', default='all', help='来源（逗号分隔，默认 all）')
    parser.add_argument('--limit', type=int, default=10, help='每个来源的限制（默认 10）')
    parser.add_argument('--keyword', help='逗号分隔的关键词筛选器')
    parser.add_argument('--deep', action='store_true', help='下载文章内容用于深度摘要')
    
    args = parser.parse_args()
    
    # 确定要运行的来源函数列表
    to_run = []
    if args.source == 'all':
        to_run = list(sources_map.values())
    else:
        requested_sources = [s.strip() for s in args.source.split(',')]
        for s in requested_sources:
            if s in sources_map: to_run.append(sources_map[s])
            
    results = []
    # 并行或顺序执行各来源的获取函数
    for func in to_run:
        try:
            results.extend(func(args.limit, args.keyword))
        except: pass
        
    # 如果启用了深度获取模式，获取文章的详细内容
    if args.deep and results:
        sys.stderr.write(f"正在深度获取 {len(results)} 条目的内容...\n")
        results = enrich_items_with_content(results)
        
    # 输出 JSON 格式结果
    print(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
