#!/usr/bin/env python3
"""
Bible.com 每日经文获取器
从 Bible.com (YouVersion) 获取每日经文文本、引用和可分享的图片。

功能：
- 获取每日经文的文本内容
- 获取经文引用（如：诗篇 27:4）
- 获取可分享的高质量图片
- 支持下载图片到本地

使用示例：
  # 获取每日经文（JSON格式）
  python3 votd.py
  
  # 获取每日经文并下载图片
  python3 votd.py --download /tmp/votd.jpg
"""

import json
import re
import sys
import urllib.request

def get_votd():
    """从 Bible.com 获取每日经文
    
    返回值：
        dict: 包含经文信息的字典，包括：
            - reference: 经文引用（如：诗篇 27:4）
            - text: 经文文本内容
            - usfm: 经文标准格式标识符
            - date: 日期时间
            - image_url: 可分享图片的URL
            - attribution: 归属信息
    """
    # Bible.com 每日经文页面URL
    url = 'https://www.bible.com/verse-of-the-day'

    # 创建HTTP请求，设置User-Agent以模拟浏览器访问
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })

    # 发送请求并读取响应内容
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8')

    # 从页面中提取__NEXT_DATA__中的JSON数据
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>', html)
    if not match:
        return {"error": "无法找到经文数据"}

    # 解析JSON数据
    data = json.loads(match.group(1))
    props = data['props']['pageProps']

    # 获取第一条经文信息
    verse = props['verses'][0]
    images = props.get('images', [])

    # 获取最大尺寸的图片（1280x1280）
    image_url = None
    if images:
        for rendition in images[0].get('renditions', []):
            if rendition.get('width') == 1280:
                image_url = 'https:' + rendition['url']
                break

    # 构建结果字典
    result = {
        "reference": verse['reference']['human'],
        "text": verse['content'].replace('\n', ' '),
        "usfm": verse['reference']['usfm'][0],
        "date": props.get('date', ''),
        "image_url": image_url,
        "attribution": "Bible.com / YouVersion"
    }

    return result

def download_image(url, output_path):
    """下载每日经文图片
    
    参数：
        url (str): 图片的URL
        output_path (str): 保存图片的本地路径
    
    返回值：
        str: 保存图片的本地路径
    """
    # 创建HTTP请求，设置User-Agent
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    # 发送请求并保存图片
    with urllib.request.urlopen(req, timeout=15) as response:
        with open(output_path, 'wb') as f:
            f.write(response.read())
    
    return output_path

if __name__ == '__main__':
    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == '--download':
        # 获取输出路径，默认为/tmp/votd.jpg
        output = sys.argv[2] if len(sys.argv) > 2 else '/tmp/votd.jpg'
        # 获取每日经文
        votd = get_votd()
        # 如果有图片URL，则下载图片
        if votd.get('image_url'):
            download_image(votd['image_url'], output)
            votd['image_path'] = output
        # 输出JSON格式的结果
        print(json.dumps(votd, indent=2, ensure_ascii=False))
    else:
        # 直接输出每日经文（JSON格式）
        print(json.dumps(get_votd(), indent=2, ensure_ascii=False))
