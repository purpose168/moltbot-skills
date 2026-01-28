#!/usr/bin/env python3
"""
recipe_to_list.py

使用 Gemini (Flash) 从食谱/烹饪书照片中提取食材并添加到 Todoist。

环境变量：
  - GEMINI_API_KEY 或 GOOGLE_API_KEY
  - TODOIST_API_TOKEN（用于 `todoist` 命令行工具）

功能说明：
  - 使用 Gemini 生成语言 API (v1beta) 和内联图像数据
  - 期望/请求严格的 JSON 输出；回退到尽力而为的提取
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import date
from fractions import Fraction
from pathlib import Path
from typing import Iterable

# Google Generative Language API 端点模板
API_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

# 提示词：从照片中提取食材列表
PROMPT = (
    "你正在从烹饪书/食谱照片中提取食材列表。\n"
    "仅返回严格的 JSON，不要 markdown，不要注释。\n"
    "Schema: {\"title\": string, \"items\": string[], \"notes\": string}.\n"
    "规则：\n"
    "- title：如果可见，使用简短的食谱名称；否则为空字符串\n"
    "- items：单个食材行，每个数组元素一行\n"
    "- 保留数量（例如，'3/4 杯橄榄油'）\n"
    "- 忽略步骤编号/说明\n"
    "- 如果食材有选项，用斜杠保留（例如，'Parmesan 或 pecorino'）\n"
)

# 提示词：将原始食材行转换为标准化购物格式
PROMPT_STRUCTURE = (
    "你将获得食谱的原始食材行列表。\n"
    "将它们转换为标准化的购物格式并分配购物类别。\n"
    "仅返回严格的 JSON，不要 markdown。\n"
    "Schema: {\"items\": [{\"name\": string, \"qtyText\": string, \"group\": string}]}.\n"
    "规则：\n"
    "- name 必须以食材名称开头（例如，'蛋黄'，'椰奶'）\n"
    "- qtyText 应包含数量 + 单位 + 任何尺寸说明（例如，'8 个大号的'，'2 罐（14 盎司）'）\n"
    "- group 必须是以下之一：produce（农产品）, dairy_eggs（乳制品/蛋）, meat_fish（肉类/鱼）, frozen（冷冻食品）, snacks_sweets（零食/甜点）, household（家居用品）, drinks（饮料）, other（其他）\n"
    "- 如果不确定类别，使用 'other'\n"
    "- 不要发明新的类别名称\n"
)


def _die(msg: str, code: int = 2) -> None:
    """
    打印错误消息并退出程序。
    
    Args:
        msg: 要打印的错误消息
        code: 退出码（默认 2）
    """
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def _read_bytes(path: str) -> bytes:
    """
    读取文件的所有字节。
    
    Args:
        path: 文件路径
        
    Returns:
        文件内容的字节串
    """
    with open(path, "rb") as f:
        return f.read()


def _guess_mime(path: str) -> str:
    """
    根据文件扩展名猜测 MIME 类型。
    
    Args:
        path: 文件路径
        
    Returns:
        MIME 类型字符串
    """
    p = path.lower()
    if p.endswith(".png"):
        return "image/png"
    if p.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


def gemini_extract_items(image_path: str, model: str, api_key: str, timeout: int = 60) -> dict:
    """
    使用 Gemini 视觉模型从图片中提取食材。

    Args:
        image_path: 图片文件路径
        model: Gemini 模型名称
        api_key: Google API 密钥
        timeout: 请求超时时间（秒）

    Returns:
        包含提取结果的字典，格式为 {"title": str, "items": list, "notes": str}
    """
    img = _read_bytes(image_path)
    mime = _guess_mime(image_path)
    b64 = base64.b64encode(img).decode("ascii")

    # 构建请求负载
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": PROMPT},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }

    # 尝试请求的模型，然后回退到常见的 Flash 模型
    model_candidates = [
        model,
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
    ]

    last_err: Exception | None = None
    raw = ""
    for mname in model_candidates:
        url = API_URL_TMPL.format(model=mname, key=api_key)
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
            break
        except urllib.error.HTTPError as e:
            # 404 通常表示该密钥无法使用此模型名称
            last_err = e
            if e.code in (404,):
                continue
            raise
        except Exception as e:
            last_err = e
            continue

    if not raw:
        raise RuntimeError(f"所有候选模型的 Gemini 请求失败：{last_err}")

    data = json.loads(raw)
    # v1beta 返回 candidates[0].content.parts[0].text
    try:
        text = data["candidates"][0]["content"]["parts"][0].get("text", "")
    except Exception:
        text = ""

    if not text:
        # 有时 JSON 已在其他地方结构化；返回完整响应
        return {"items": [], "notes": "响应中无文本", "raw": data}

    # 首先尝试解析严格 JSON
    try:
        return json.loads(text)
    except Exception:
        # 尽力而为：提取 JSON 对象子字符串
        m = re.search(r"\{.*\}", text, flags=re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        return {"items": _lines_to_items(text), "notes": "非 JSON 响应", "raw_text": text}


def _lines_to_items(text: str) -> list[str]:
    """
    将文本行转换为项目列表。

    Args:
        text: 原始文本

    Returns:
        项目列表
    """
    # 按换行符/项目符号拆分；丢弃空行
    lines = []
    for ln in re.split(r"\r?\n", text):
        ln = re.sub(r"^\s*[-•*\d.)]+\s*", "", ln).strip()
        if not ln:
            continue
        lines.append(ln)
    return lines


# Unicode 分数到 ASCII 的映射
_UNICODE_FRAC = {
    "½": "1/2",
    "¼": "1/4",
    "¾": "3/4",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
}


def _ascii_fracs(s: str) -> str:
    """
    将 Unicode 分数转换为 ASCII 分数。

    Args:
        s: 输入字符串

    Returns:
        转换后的字符串
    """
    for k, v in _UNICODE_FRAC.items():
        s = s.replace(k, v)
    return s


def normalize_raw_ingredient_line(s: str) -> str:
    """
    将原始食谱食材行规范化为 '食材 (数量)' 格式或 '... or ...' 行。

    这是有意为之的启发式方法，针对购物清单输出。
    """
    s = _ascii_fracs(s.strip())
    s = re.sub(r"^or\s+", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()

    # 大蒜："8-10 瓣大蒜" -> "大蒜瓣 (8-10)"
    m = re.match(r"^(?P<qty>\d+\s*[-–]\s*\d+|\d+)(?:\s+)(?:cloves?)\s+garlic\b", s, flags=re.I)
    if m:
        qty = re.sub(r"\s*[-–]\s*", "-", m.group("qty"))
        return f"大蒜瓣 ({qty})"

    # 啤酒："2 12 盎司罐装啤酒 ..." -> "啤酒 (2x12oz)"
    m = re.match(r"^(?P<n>\d+)\s+(?P<size>\d+)\s*[-–]?\s*ounce\s+cans?\s+beer\b", s, flags=re.I)
    if m:
        return f"啤酒 ({m.group('n')}x{m.group('size')}oz)"

    # 孜然籽 或 孜然
    m = re.match(
        r"^(?P<q1>[\d/]+(?:\.\d+)?)\s*(?P<u1>tablespoons?|tbsp|teaspoons?|tsp)\s+cumin\s+seed\s+or\s+(?P<q2>[\d/]+(?:\.\d+)?)\s*(?P<u2>tablespoons?|tbsp|teaspoons?|tsp)\s+(?:ground\s+)?cumin\b",
        s,
        flags=re.I,
    )
    if m:
        u1 = "tbsp" if m.group("u1").lower().startswith("t") and "b" in m.group("u1").lower() else "tsp" if m.group("u1").lower().startswith("t") else m.group("u1")
        u2 = "tbsp" if m.group("u2").lower().startswith("t") and "b" in m.group("u2").lower() else "tsp" if m.group("u2").lower().startswith("t") else m.group("u2")
        return f"孜然籽 ({m.group('q1')} {u1}) 或孜然 ({m.group('q2')} {u2})"

    # 通用清理：删除仅准备说明的短语
    s = re.sub(r"\b(chopped|finely chopped|coarsely chopped|thinly sliced|sliced|diced|minced|grated)\b", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" ,")

    return s


def heuristic_structure_ingredients(raw_items: list[str]) -> list[dict]:
    """
    尽力而为的本地结构化：食材优先 + 粗略购物分组。

    Args:
        raw_items: 原始食材行列表

    Returns:
        结构化食材列表，每个元素为 {"name": str, "qtyText": str, "group": str}
    """
    units = {
        "cup",
        "cups",
        "tbsp",
        "tablespoon",
        "tablespoons",
        "tsp",
        "teaspoon",
        "teaspoons",
        "oz",
        "ounce",
        "ounces",
        "lb",
        "lbs",
        "pound",
        "pounds",
        "can",
        "cans",
        "box",
        "boxes",
        "stick",
        "sticks",
        "package",
        "packages",
    }

    def classify(name: str) -> str:
        """
        根据食材名称分类到购物组。

        Args:
            name: 食材名称

        Returns:
            购物组名称
        """
        n = name.lower()
        # 农产品
        if any(w in n for w in ["banana", "lime", "lemon", "onion", "garlic", "tomato", "parsley", "basil", "cilantro", "mint", "ginger", "chili", "chilli", "sprouts", "bean sprouts"]):
            return "produce"
        # 乳制品和蛋
        if any(w in n for w in ["egg", "cream", "milk", "yogurt", "butter", "cheese"]):
            return "dairy_eggs"
        # 肉类和鱼
        if any(w in n for w in ["lamb", "beef", "pork", "chicken", "fish", "shrimp", "salmon", "tuna"]):
            return "meat_fish"
        # 零食和甜点
        if any(w in n for w in ["cookie", "cookies", "wafer", "wafers", "graham", "cracker", "crackers", "candy", "cherries", "maraschino"]):
            return "snacks_sweets"
        # 饮料
        if any(w in n for w in ["soda", "juice", "wine", "beer", "sake", "coffee", "tea"]):
            return "drinks"
        # 家居用品和非食品
        if any(w in n for w in ["detergent", "soap", "shampoo", "toothpaste", "paper towel", "toilet paper", "trash bag", "batteries"]):
            return "household"
        # 干货 / pantry -> 零食和甜点
        if any(w in n for w in ["flour", "sugar", "cornstarch", "vanilla", "cocoa", "chocolate", "coconut", "oil", "spice", "turmeric", "salt", "pepper", "cumin", "soy sauce", "vinegar", "msg", "sesame", "rice wine", "breadcrumbs", "panko", "pasta", "noodles", "rice", "beans", "chickpeas"]):
            return "snacks_sweets"
        return "other"

    out: list[dict] = []
    for raw in raw_items:
        s = _ascii_fracs(raw.strip())
        if not s:
            continue

        # 撮/少许
        m0 = re.match(r"^(pinch|dash)\s+of\s+(.+)$", s, flags=re.I)
        if m0:
            qty = m0.group(1).lower()
            name = m0.group(2).strip()
            out.append({"name": name, "qtyText": qty, "group": classify(name)})
            continue

        # 数字前缀
        m = re.match(r"^(?P<qty>\d+(?:/\d+)?(?:\.\d+)?)(?:\s+)(?P<rest>.+)$", s)
        if m:
            qty = m.group("qty")
            rest = m.group("rest").strip()

            # 处理前导括号如 "(14盎司) 罐装 ..."
            if rest.startswith("("):
                mpar = re.match(r"^\([^)]*\)\s+(?P<unit>\w+)\s+(?P<name>.+)$", rest)
                if mpar and mpar.group("unit").lower() in units:
                    unit = mpar.group("unit")
                    name = mpar.group("name").strip()
                    qty_text = f"{qty} {unit}"
                    out.append({"name": name, "qtyText": qty_text, "group": classify(name)})
                    continue

            parts = rest.split(" ", 1)
            if len(parts) == 2 and parts[0].lower() in units:
                unit = parts[0]
                name = parts[1].strip()
                qty_text = f"{qty} {unit}"
            else:
                name = rest
                qty_text = qty

            out.append({"name": name, "qtyText": qty_text, "group": classify(name)})
            continue

        # 默认
        out.append({"name": s, "qtyText": "", "group": classify(s)})

    return out


# 要剥离的前缀列表
_STRIP_PREFIXES = [
    "finely chopped",
    "coarsely chopped",
    "thinly sliced",
    "peeled",
    "softened",
    "divided",
]


def clean_name(name: str) -> str:
    """
    规范化为购物清单显示的食材名称。

    目标：输出*要买的东西*，而不是准备说明。
    """
    s = name.strip()

    # 常见的非购买形容词
    s = re.sub(r"\b(full-fat|low-fat|nonfat|fat-free)\b", "", s, flags=re.I)
    s = re.sub(r"\b(firm|ripe|small|medium|large)\b", "", s, flags=re.I)
    s = re.sub(r"\b(freshly\s+ground|ground)\b", "", s, flags=re.I)

    # 标准拼写
    s = re.sub(r"yoghurt", "yogurt", s, flags=re.I)

    # 鸡蛋部分 -> 鸡蛋
    s = re.sub(r"\begg\s+yolks?\b", "eggs", s, flags=re.I)
    s = re.sub(r"\begg\s+whites?\b", "eggs", s, flags=re.I)

    # 西班牙辣香肠干燥排序
    s = re.sub(r"\bdried\s+chorizo\b", "chorizo (dried)", s, flags=re.I)

    # 规范化黄油变体（数量在 qtyText 中处理；保持名称干净）
    s = re.sub(r"\(\s*1/2\s*stick\s*\)\s*unsalted\s+butter", "unsalted butter", s, flags=re.I)

    # 删除准备短语（逗号从句和尾部描述符）
    s = re.sub(r",\s*divided\b", "", s, flags=re.I)
    s = re.sub(r",\s*plus\s+more.*$", "", s, flags=re.I)
    s = re.sub(r",\s*(finely|coarsely)\s+chopped.*$", "", s, flags=re.I)
    s = re.sub(r",\s*(thinly\s+sliced|sliced|diced|minced|grated).*$", "", s, flags=re.I)
    s = re.sub(r",\s*(peeled|peeled\s+and\s+thinly\s+sliced|halved|softened).*$", "", s, flags=re.I)

    # 欧芹叶/茎 -> 欧芹
    s = re.sub(r"tender\s+parsley\s+leaves\s+and\s+stems", "parsley", s, flags=re.I)

    # 保留洋葱颜色
    s = re.sub(r"\byellow\s+onion\b", "yellow onion", s, flags=re.I)
    s = re.sub(r"\bred\s+onion\b", "red onion", s, flags=re.I)

    # 作为最后一道防线，删除第一个逗号后的所有内容
    s = s.split(",")[0].strip()

    # 折叠空白 + 去除标点符号
    s = re.sub(r"\s+", " ", s).strip(" -–—,")

    # 为可读性，对常见购物项目使用首字母大写
    if s.lower() == "unsalted butter":
        return "Unsalted Butter"
    if s.lower() == "limes":
        return "Lime"

    return s


def convert_to_buy_items(structured: list[dict]) -> list[dict]:
    """
    将食谱度量转换为"要买什么"的近似值。

    示例：
      - 青柠汁 (2 tbsp) -> 青柠 (1-2)

    规则匹配时始终应用转换。
    """

    def to_float(q: str) -> float | None:
        """
        将数量字符串转换为浮点数。
        """
        q = q.strip()
        if not q:
            return None
        # 拒绝范围
        if re.search(r"\d\s*[-–]\s*\d", q):
            return None
        if "/" in q:
            try:
                a, b = q.split("/", 1)
                return float(a) / float(b)
            except Exception:
                return None
        try:
            return float(q)
        except Exception:
            return None

    def qty_to_tbsp(qty_text: str) -> float | None:
        """
        将数量转换为大汤匙。
        """
        qt = qty_text.lower()
        m = re.search(r"(?P<num>\d+(?:\.\d+)?|\d+/\d+)\s*(?P<unit>tbsp|tablespoons?|tsp|teaspoons?)\b", qt)
        if not m:
            return None
        num = to_float(m.group("num"))
        if num is None:
            return None
        unit = m.group("unit")
        if unit.startswith("tsp") or unit.startswith("teaspoon"):
            return num / 3.0
        return num

    out: list[dict] = []
    for it in structured:
        name = clean_name((it.get("name") or ""))
        qty = (it.get("qtyText") or "").strip()
        group = (it.get("group") or "other").strip().lower()
        # 规范数量措辞
        qty = re.sub(r",\s*divided\b", "", qty, flags=re.I).strip()
        nlow = name.lower()

        # 柑橘汁 -> 整个水果
        if "lime juice" in nlow:
            tbsp = qty_to_tbsp(qty) or 2.0
            # 假设 1 个青柠 ~= 2 tbsp 果汁
            est = max(1.0, tbsp / 2.0)
            if est <= 1.25:
                out.append({"name": "limes", "qtyText": "1", "group": "produce"})
            else:
                lo = int(est)
                hi = int(est) + 1
                out.append({"name": "limes", "qtyText": f"{lo}-{hi}", "group": "produce"})
            continue
        if "lemon juice" in nlow:
            tbsp = qty_to_tbsp(qty) or 2.0
            est = max(1.0, tbsp / 3.0)
            lo = int(est)
            hi = int(est) + 1
            out.append({"name": "lemons", "qtyText": f"{lo}-{hi}", "group": "produce"})
            continue

        # 黄油：当食谱同时给出黄油棒 + tbsp 变体时，优先使用大汤匙
        if "butter" in nlow and "unsalted" in nlow:
            # 如果 qtyText 已经包含大汤匙，保留它；否则保持原样
            if re.search(r"\b(\d+)\s*(tablespoons?|tbsp)\b", qty, flags=re.I):
                m = re.search(r"\b(\d+)\s*(tablespoons?|tbsp)\b", qty, flags=re.I)
                out.append({"name": "Unsalted Butter", "qtyText": f"{m.group(1)} tbsp", "group": "dairy_eggs"})
                continue

        # 大蒜：切碎/剁碎的大蒜（tbsp）-> 蒜瓣（1 tbsp ~= 3 瓣）
        if "garlic" in nlow and any(x in nlow for x in ["minced", "chopped", "grated"]):
            tbsp = qty_to_tbsp(qty)
            if tbsp is not None:
                est = max(1.0, tbsp * 3.0)
                lo = int(est)
                hi = int(est) + 1
                out.append({"name": "garlic", "qtyText": f"{lo}-{hi} cloves", "group": "produce"})
                continue

        # 姜：磨碎/剁碎的姜（tbsp）-> 每 tbsp 1 英寸姜块
        if "ginger" in nlow and any(x in nlow for x in ["grated", "minced"]):
            tbsp = qty_to_tbsp(qty)
            if tbsp is not None:
                est = max(1.0, tbsp)
                lo = int(est)
                hi = int(est) + 1
                out.append({"name": "ginger", "qtyText": f"{lo}-{hi} inch piece", "group": "produce"})
                continue

        out.append({"name": name, "qtyText": qty, "group": group})

    return out


def gemini_structure_ingredients(raw_items: list[str], model: str, api_key: str, timeout: int = 60) -> list[dict]:
    """
    使用 Gemini（纯文本）规范化为食材优先格式和分组分类。

    Args:
        raw_items: 原始食材行列表
        model: Gemini 模型名称
        api_key: Google API 密钥
        timeout: 请求超时时间（秒）

    Returns:
        结构化食材列表
    """
    if not raw_items:
        return []

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": PROMPT_STRUCTURE},
                    {"text": "Raw ingredient lines:\n" + "\n".join(f"- {x}" for x in raw_items)},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 550,
            "responseMimeType": "application/json",
        },
    }

    model_candidates = [
        model,
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
    ]

    raw = ""
    last_err: Exception | None = None
    for mname in model_candidates:
        url = API_URL_TMPL.format(model=mname, key=api_key)
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
            break
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (404,):
                continue
            raise
        except Exception as e:
            last_err = e
            continue

    if not raw:
        raise RuntimeError(f"Gemini 结构化请求失败：{last_err}")

    data = json.loads(raw)
    try:
        text = data["candidates"][0]["content"]["parts"][0].get("text", "")
    except Exception:
        text = ""

    if not text:
        return []

    try:
        obj = json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if not m:
            return []
        try:
            obj = json.loads(m.group(0))
        except Exception:
            # 如果模型返回格式错误的 JSON，失败关闭，让调用者回退
            return []

    items = obj.get("items") if isinstance(obj, dict) else None
    if not isinstance(items, list):
        return []

    # 向后兼容：将旧组名映射到新模式
    group_map = {
        "dairy": "dairy_eggs",
        "eggs": "dairy_eggs",
        "meat": "meat_fish",
        "fish": "meat_fish",
        "seafood": "meat_fish",
        "baking": "snacks_sweets",  # 最接近；零食/甜点/烘焙通道
        "pantry": "other",
    }

    out: list[dict] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        name = (it.get("name") or "").strip()
        qty = (it.get("qtyText") or "").strip()
        group = (it.get("group") or "other").strip().lower()
        if not name:
            continue
        group = group_map.get(group, group)
        if group not in {"produce", "dairy_eggs", "meat_fish", "frozen", "snacks_sweets", "household", "drinks", "other"}:
            group = "other"
        out.append({"name": name, "qtyText": qty, "group": group})

    return out


# 用于重叠检测的规范化规则。
# 保持这个小规模 + 高置信度。
_SYNONYM_SUBS: list[tuple[str, str]] = [
    # 面包屑变体
    (r"\bfresh bread ?crumbs?\b", "breadcrumbs"),
    (r"\bbread ?crumbs?\b", "breadcrumbs"),
    (r"\bbreadcrumbs\b", "breadcrumbs"),
    (r"\bpanko\b", "breadcrumbs"),
    # 香草
    (r"\bcoriander\b", "cilantro"),
    (r"\bcilantro\b", "cilantro"),
    # 鸡蛋
    (r"\begg yolks?\b", "eggs"),
    (r"\begg whites?\b", "eggs"),
    (r"\beggs?\b", "eggs"),
    # 乳制品：保守
    (r"\bgreek yogurt\b", "yogurt"),
    (r"\byoghurt\b", "yogurt"),
]


def _norm_name(s: str) -> str:
    """
    启发式规范化器，用于检测重叠。
    """
    s = s.strip().lower()
    s = re.sub(r",\s*plus more.*$", "", s)  # 删除 "plus more ..." 尾部
    s = re.sub(r"\([^)]*\)", "", s)  # 删除括号
    s = re.sub(r"\b\d+\s*(?:-\s*\d+)?\b", " ", s)  # 删除简单数字/范围
    s = re.sub(r"\b\d+\/\d+\b", " ", s)  # 删除分数如 3/4
    s = re.sub(
        r"\b(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|clove|cloves|can|cans|tablespoons?)\b",
        " ",
        s,
    )
    s = re.sub(r"\s+", " ", s).strip(" -–—,")

    for pat, repl in _SYNONYM_SUBS:
        s = re.sub(pat, repl, s)

    s = re.sub(r"\s+", " ", s).strip(" -–—,")
    return s


def _get_existing_project_tasks(project: str) -> list[dict]:
    """
    获取 Todoist 项目中的现有任务。

    Args:
        project: 项目名称

    Returns:
        任务字典列表
    """
    cp = subprocess.run(
        ["todoist", "tasks", "--all", "-p", project, "--json"],
        capture_output=True,
        text=True,
    )
    if cp.returncode != 0:
        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist tasks failed")
    return json.loads(cp.stdout)


def _parse_fraction(num: str) -> Fraction | None:
    """
    解析分数字符串为 Fraction 对象。
    """
    num = num.strip()
    if not num:
        return None
    # 拒绝范围如 1-2 或 12–16
    if re.search(r"\d\s*[-–]\s*\d", num):
        return None
    if "/" in num:
        try:
            a, b = num.split("/", 1)
            return Fraction(int(a), int(b))
        except Exception:
            return None
    try:
        # 允许小数
        return Fraction(str(float(num)))
    except Exception:
        return None


# 体积单位到大汤匙的转换
_VOL_TO_TBSP = {"tbsp": Fraction(1, 1), "tsp": Fraction(1, 3), "cup": Fraction(16, 1)}


def _convert_qty(q: Fraction, unit: str, target: str) -> Fraction | None:
    """
    在兼容单位之间转换（目前是体积单位 cup/tbsp/tsp）。
    """
    if unit == target:
        return q
    if unit in _VOL_TO_TBSP and target in _VOL_TO_TBSP:
        tbsp = q * _VOL_TO_TBSP[unit]
        return tbsp / _VOL_TO_TBSP[target]
    return None


def _extract_qty_unit(text: str) -> tuple[Fraction | None, str | None]:
    """
    从购物项目字符串中尽力提取数量和单位。

    支持的模式如：
      - "橄榄油 (2 tbsp)"
      - "大蒜 (4 瓣)"
      - "鸡蛋 (4)" -> unit="count"
    拒绝范围如 "1-2" / "12–16"。
    """
    t = text.lower()

    # 优先括号内
    m = re.search(r"\(([^)]{1,50})\)", t)
    cand = m.group(1) if m else t

    # 带单位的数量
    m2 = re.search(
        r"\b(?P<num>\d+(?:\.\d+)?|\d+\/\d+)\s*(?P<unit>cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|cloves?|cans?|sticks?|boxes?|packages?)\b",
        cand,
    )
    if m2:
        qty = _parse_fraction(m2.group("num"))
        if qty is None:
            return None, None
        unit = m2.group("unit")
        unit = {
            "tablespoon": "tbsp",
            "tablespoons": "tbsp",
            "teaspoon": "tsp",
            "teaspoons": "tsp",
            "ounce": "oz",
            "ounces": "oz",
            "pound": "lb",
            "pounds": "lb",
            "lbs": "lb",
            "cup": "cup",
            "cups": "cup",
            "clove": "clove",
            "cloves": "clove",
            "can": "can",
            "cans": "can",
            "stick": "stick",
            "sticks": "stick",
            "box": "box",
            "boxes": "box",
            "package": "package",
            "packages": "package",
            "tbsp": "tbsp",
            "tsp": "tsp",
            "oz": "oz",
            "lb": "lb",
        }.get(unit, unit)
        return qty, unit

    # 纯数字（计数）
    m3 = re.search(r"\b(?P<num>\d+(?:\.\d+)?|\d+\/\d+)\b", cand)
    if m3:
        qty = _parse_fraction(m3.group("num"))
        if qty is None:
            return None, None
        return qty, "count"

    return None, None


def _fraction_to_str(q: Fraction) -> str:
    """
    将 Fraction 转换为字符串，尽可能使用美观的分数。
    """
    if q.denominator == 1:
        return str(q.numerator)
    return f"{q.numerator}/{q.denominator}"


def _slugify(s: str) -> str:
    """
    将字符串转换为 slug 格式。
    """
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s or "recipe"


def save_recipe_to_workspace(
    *,
    title: str,
    source: str,
    items: list[str],
    notes: str = "",
    recipes_dir: str = "recipes",
) -> str:
    """
    创建 Markdown 食谱条目并添加到 recipes/index.md。

    如果已存在相同来源的食谱，返回现有路径。

    Args:
        title: 食谱标题
        source: 来源（URL 或照片路径）
        items: 食材列表
        notes: 笔记
        recipes_dir: 食谱目录

    Returns:
        保存的文件路径
    """
    d = date.today().isoformat()
    t = title.strip() or "Recipe"
    slug = _slugify(t)
    out_dir = Path(recipes_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 按来源去重（URL 或 photo:...）
    src_line = f"- Source: {source}".strip()
    for fp in sorted(out_dir.glob("*.md")):
        try:
            txt = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if src_line and src_line in txt:
            return str(fp)

    path = out_dir / f"{d}--{slug}.md"
    # 避免覆盖
    if path.exists():
        path = out_dir / f"{d}--{slug}-{os.getpid()}.md"

    ing = "\n".join([f"- {x}" for x in items])
    md = (
        f"# {t}\n\n"
        f"- Date cooked: {d}\n"
        f"- Source: {source}\n\n"
        f"## Ingredients\n\n{ing}\n\n"
    )
    if notes.strip():
        md += f"## Notes\n\n{notes.strip()}\n"

    path.write_text(md, encoding="utf-8")

    # 更新索引
    idx = out_dir / "index.md"
    if not idx.exists():
        idx.write_text(
            "# Cookbook Index\n\n| Date cooked | Recipe | Tags | Rating | Source |\n|---|---|---|---:|---|\n",
            encoding="utf-8",
        )

    rel = path.as_posix()
    row = f"| {d} | [{t}]({rel}) |  |  | {source} |\n"
    with idx.open("a", encoding="utf-8") as f:
        f.write(row)

    return str(path)


def _rewrite_with_total(original: str, total: Fraction, unit: str) -> str:
    """
    重写任务内容以包含新的总数量。

    保持食材名称在前，尾部只有一个括号。
    """
    base = original.strip()
    base = re.sub(r"\s*\([^)]*\)\s*", " ", base).strip()
    if unit == "count":
        return f"{base} ({_fraction_to_str(total)})"
    return f"{base} ({_fraction_to_str(total)} {unit})"


def add_items_to_todoist(
    items: list[str],
    project: str,
    prefix: str = "",
    dry_run: bool = False,
    skip_overlap: bool = True,
    skip_pantry: bool = True,
    sum_quantities: bool = True,
) -> list[str]:
    """
    更新 Todoist 购物清单。

    默认行为：
      - 跳过 pantry 主食（盐/胡椒）
      - 使用规范化 + 同义词映射检测重叠
      - 如果有重叠且双方都有可解析的 (qty, unit)，更新现有任务为总和
      - 否则，跳过添加重复项
    """

    ids: list[str] = []

    existing_tasks = _get_existing_project_tasks(project) if (skip_overlap and not dry_run) else []
    existing_by_norm: dict[str, dict] = {}
    for t in existing_tasks:
        content = (t.get("content") or "").strip()
        if not content:
            continue
        nk = _norm_name(content)
        if not nk:
            continue

        if nk not in existing_by_norm:
            existing_by_norm[nk] = t
            continue

        # 优先已有可解析 qty+unit 的任务
        cur = existing_by_norm[nk]
        cur_qty, cur_unit = _extract_qty_unit((cur.get("content") or "").strip())
        new_qty, new_unit = _extract_qty_unit(content)
        if (cur_qty is None or not cur_unit) and (new_qty is not None and new_unit):
            existing_by_norm[nk] = t

    pantry = {
        "salt",
        "kosher salt",
        "pepper",
        "black pepper",
        "freshly ground black pepper",
    }
    pantry_regex = re.compile(r"\b(salt|pepper)\b", re.I)


    seen_new: set[str] = set()

    for item in items:
        title = f"{prefix}{item}".strip()
        if not title:
            continue

        norm = _norm_name(title)
        if not norm:
            continue

        if skip_pantry and (norm in pantry or pantry_regex.search(title)):
            continue

        # 本次运行内去重
        if norm in seen_new:
            continue
        seen_new.add(norm)

        existing_task = existing_by_norm.get(norm) if skip_overlap else None

        if dry_run:
            # 干运行中，我们只显示考虑的候选添加/更新
            print(title)
            continue

        if existing_task and sum_quantities:
            ex_content = (existing_task.get("content") or "").strip()
            ex_id = existing_task.get("id")
            if ex_id:
                ex_qty, ex_unit = _extract_qty_unit(ex_content)
                new_qty, new_unit = _extract_qty_unit(title)
                # 如果现有没有数量但新有，设置现有为新数量
                if (ex_qty is None or not ex_unit) and (new_qty is not None and new_unit):
                    new_content = _rewrite_with_total(ex_content, new_qty, new_unit)
                    cp = subprocess.run(
                        ["todoist", "update", str(ex_id), "--content", new_content, "--json"],
                        capture_output=True,
                        text=True,
                    )
                    if cp.return:
                        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "code != 0todoist update failed")
                    obj = json.loads(cp.stdout)
                    tid = obj.get("id", "")
                    if tid:
                        ids.append(tid)
                    continue

                if ex_qty is not None and new_qty is not None and ex_unit and new_unit:
                    # 允许兼容度量之间的单位转换（例如 cup <-> tbsp）
                    new_converted = _convert_qty(new_qty, new_unit, ex_unit)
                    if new_converted is None and ex_unit != new_unit:
                        # 尝试将现有转换为新单位
                        ex_converted = _convert_qty(ex_qty, ex_unit, new_unit)
                        if ex_converted is not None:
                            total = ex_converted + new_qty
                            new_content = _rewrite_with_total(ex_content, total, new_unit)
                            ex_unit = new_unit
                        else:
                            new_converted = None
                    if new_converted is not None:
                        total = ex_qty + new_converted
                        new_content = _rewrite_with_total(ex_content, total, ex_unit)
                    else:
                        total = None

                if 'total' in locals() and total is not None:
                    cp = subprocess.run(
                        ["todoist", "update", str(ex_id), "--content", new_content, "--json"],
                        capture_output=True,
                        text=True,
                    )
                    if cp.returncode != 0:
                        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist update failed")
                    obj = json.loads(cp.stdout)
                    tid = obj.get("id", "")
                    if tid:
                        ids.append(tid)
                    continue

            # 如果无法安全求和，视为重叠并跳过添加
            continue

        if existing_task and skip_overlap:
            continue

        cp = subprocess.run(
            ["todoist", "add", title, "--project", project, "--json"],
            capture_output=True,
            text=True,
        )
        if cp.returncode != 0:
            raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist add failed")
        obj = json.loads(cp.stdout)
        tid = obj.get("id", "")
        if tid:
            ids.append(tid)

    return ids


def main() -> int:
    """
    主函数：解析参数并运行食材提取和购物清单更新流程。
    """
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True, help="食谱/烹饪书照片路径")
    ap.add_argument("--project", default="Shopping", help="Todoist 项目名称（默认：Shopping）")
    ap.add_argument("--model", default="gemini-2.0-flash", help="Gemini 模型（推荐 Flash）")
    ap.add_argument("--prefix", default="", help="创建任务的前缀")
    ap.add_argument("--title", default="", help="食谱标题覆盖（用于保存到 cookbook）")
    ap.add_argument("--source", default="", help="食谱来源 URL/文本覆盖（用于保存到 cookbook）")
    ap.add_argument("--no-save", action="store_true", help="不保存到工作区 cookbook")
    ap.add_argument("--dry-run", action="store_true", help="打印提取的项目；不创建任务")
    ap.add_argument("--no-overlap-check", action="store_true", help="不检查当前购物清单的重叠")
    ap.add_argument("--include-pantry", action="store_true", help="包括 pantry 主食（如盐/胡椒）")
    ap.add_argument("--no-sum", action="store_true", help="不求和数量；只跳过重复项")
    ap.add_argument("--timeout", type=int, default=60, help="Gemini 请求超时（秒）")
    args = ap.parse_args()

    if not os.path.exists(args.image):
        _die(f"图片未找到：{args.image}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        _die("环境中缺少 GEMINI_API_KEY（或 GOOGLE_API_KEY）")

    # 确保干运行时存在 todoist 令牌
    if not args.dry_run and not os.environ.get("TODOIST_API_TOKEN"):
        _die("环境中缺少 TODOIST_API_TOKEN")

    extracted = gemini_extract_items(args.image, args.model, api_key, timeout=args.timeout)

    # 向后/稳健解析：接受 {title, items, notes} 或原始字符串列表
    if isinstance(extracted, list):
        # 有时模型返回包含单个对象的 JSON 数组
        if extracted and isinstance(extracted[0], dict):
            obj = extracted[0]
            items = obj.get("items") or []
            title = (args.title or obj.get("title") or "").strip()
            notes = (obj.get("notes") or "").strip()
        else:
            items = extracted
            title = (args.title or "").strip()
            notes = ""
    else:
        items = extracted.get("items") or []
        title = (args.title or extracted.get("title") or "").strip()
        notes = (extracted.get("notes") or "").strip()

    source = (args.source or f"photo:{args.image}").strip()
    if not isinstance(items, list):
        _die(f"Gemini 返回了意外的项目类型：{type(items)}")

    # 规范化原始字符串
    raw_lines: list[str] = []
    for it in items:
        if not isinstance(it, str):
            continue
        s = normalize_raw_ingredient_line(it)
        if s:
            raw_lines.append(s)

    if not raw_lines:
        _die("未提取到项目。请尝试更清晰的食材列表裁剪。", code=1)

    # 转换为食材优先格式 + 分组，然后按分组排序
    structured = gemini_structure_ingredients(raw_lines, args.model, api_key, timeout=args.timeout)
    if not structured:
        structured = heuristic_structure_ingredients(raw_lines)

    # 将内部组映射到 Bo 偏好的 Todoist 购物部分
    # 当前部分方案：Fresh, Pantry, Frozen, Snacks, Drinks, Household
    GROUP_ORDER = [
        "produce",
        "dairy_eggs",
        "meat_fish",
        "frozen",
        "snacks_sweets",
        "household",
        "drinks",
        "other",
    ]
    SECTION_NAME = {
        "produce": "Fresh",
        "dairy_eggs": "Fresh",
        "meat_fish": "Fresh",
        "frozen": "Frozen",
        "snacks_sweets": "Pantry",
        "household": "Household",
        "drinks": "Drinks",
        "other": "Pantry",
    }

    if structured:
        # 转换为"要买什么"（始终开启）然后排序
        structured = convert_to_buy_items(structured)

        def key(it: dict):
            g = it.get("group", "other")
            try:
                gi = GROUP_ORDER.index(g)
            except ValueError:
                gi = GROUP_ORDER.index("other")
            return (gi, it.get("name", "").lower())

        structured.sort(key=key)
        formatted: list[str] = []
        for it in structured:
            name = (it.get("name") or "").strip()
            qty = (it.get("qtyText") or "").strip()
            group = (it.get("group") or "other").strip().lower()
            if not name:
                continue
            content = f"{clean_name(name)} ({qty})" if qty else clean_name(name)
            # 规范化鸡蛋显示
            if _norm_name(content) == "eggs":
                content = "Eggs" + (f" ({qty})" if qty else "")
            formatted.append(content)
            # 无 Todoist 部分/分组；保持单个扁平列表

        add_list = formatted
    else:
        # 回退：保持原始提取
        add_list = raw_lines

    ids = add_items_to_todoist(
        add_list,
        args.project,
        prefix=args.prefix,
        dry_run=args.dry_run,
        skip_overlap=not args.no_overlap_check,
        skip_pantry=not args.include_pantry,
        sum_quantities=not args.no_sum,
    )

    saved_path = ""
    if not args.no_save:
        repo_root = Path(__file__).resolve().parents[3]  # .../clawd
        saved_path = save_recipe_to_workspace(
            title=title,
            source=source,
            items=add_list,
            notes=notes,
            recipes_dir=str(repo_root / "recipes"),
        )

    # 报告原始提取列表；添加项可能因重叠/pantry 而被过滤
    out = {
        "created": len(ids) if not args.dry_run else 0,
        "project": args.project,
        "title": title,
        "source": source,
        "items": add_list,
        "task_ids": ids,
        "saved_recipe": saved_path,
        "note": "默认跳过盐/胡椒；除非使用 --no-overlap-check，否则运行重叠检查",
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
