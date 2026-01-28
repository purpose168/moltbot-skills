#!/usr/bin/env python3
"""
pymupdf_parse.py - PyMuPDF PDF 解析器

功能说明：
- 使用 PyMuPDF (fitz) 库快速解析 PDF 文档
- 支持输出为 Markdown、JSON 或两种格式
- 可选提取内嵌图片
- 可选提取简单表格数据

使用场景：
- 快速文本提取
- 批处理 PDF 文件
- 当解析速度比布局保留更重要时

使用方法：
    python3 scripts/pymupdf_parse.py /path/to/document.pdf
    python3 scripts/pymupdf_parse.py /path/to/document.pdf --format json
    python3 scripts/pymupdf_parse.py /path/to/document.pdf --format both --images
    python3 scripts/pymupdf_parse.py /path/to/document.pdf --outroot ./my-output
"""

import argparse
import json
import os
from pathlib import Path

import fitz  # PyMuPDF 库


def extract_markdown(doc: fitz.Document) -> str:
    """
    从 PDF 文档提取 Markdown 格式文本

    为每页添加页面标记，便于定位和引用。

    Args:
        doc: PyMuPDF Document 对象

    Returns:
        str: 包含所有页面文本的 Markdown 字符串
    """
    parts = []
    for i, page in enumerate(doc, start=1):
        try:
            # 尝试获取 Markdown 格式文本
            text = page.get_text("markdown")
        except Exception:
            # 对于不支持 Markdown 的旧版本，回退到纯文本
            text = page.get_text("text")
        if text:
            # 添加页面标记
            parts.append(f"\n\n<!-- page {i} -->\n\n")
            parts.append(text)
    return "".join(parts).strip() + "\n"


def extract_json(doc: fitz.Document, lang: str) -> dict:
    """
    从 PDF 文档提取 JSON 格式数据

    为每页创建独立的文本条目，便于程序处理。

    Args:
        doc: PyMuPDF Document 对象
        lang: 语言提示（存储在元数据中）

    Returns:
        dict: 包含语言和页面列表的字典
    """
    pages = []
    for i, page in enumerate(doc, start=1):
        pages.append({
            "page": i,
            "text": page.get_text("text")
        })
    return {"lang": lang, "pages": pages}


def extract_images(doc: fitz.Document, outdir: Path) -> int:
    """
    从 PDF 文档提取所有内嵌图片

    将图片保存为 PNG 格式，文件名包含页码和图片索引。

    Args:
        doc: PyMuPDF Document 对象
        outdir: 图片输出目录

    Returns:
        int: 提取的图片数量
    """
    count = 0
    for i, page in enumerate(doc, start=1):
        for img_index, img in enumerate(page.get_images(full=True), start=1):
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)
            if pix.n < 5:
                # CMYK 或灰度图片直接保存
                img_path = outdir / f"page-{i}-img-{img_index}.png"
                pix.save(img_path)
            else:
                # RGB 图片需要转换
                pix = fitz.Pixmap(fitz.csRGB, pix)
                img_path = outdir / f"page-{i}-img-{img_index}.png"
                pix.save(img_path)
            count += 1
    return count


def extract_tables_basic(doc: fitz.Document) -> list:
    """
    从 PDF表格数据（基于行的近似）

    注意 文档提取简单：PyMuPDF 不提供稳健的表格提取功能。
    此函数返回一个占位符实现，按行分割文本。

    Args:
        doc: PyMuPDF Document 对象

    Returns:
        list: 包含每页行文本的字典列表
    """
    tables = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text")
        tables.append({"page": i, "lines": text.splitlines()})
    return tables


def main():
    """
    主函数：解析命令行参数并执行 PDF 解析
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", help="PDF 文件路径")
    parser.add_argument("--outroot", default="./pymupdf-output", help="输出根目录")
    parser.add_argument("--format", default="md", choices=["md", "json", "both"], help="输出格式")
    parser.add_argument("--images", action="store_true", help="提取图片")
    parser.add_argument("--tables", action="store_true", help="提取简单表格（基于行）")
    parser.add_argument("--lang", default="en", help="语言提示（仅用于信息）")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"未找到输入文件：{pdf_path}")

    # 创建输出目录
    outdir = Path(args.outroot) / pdf_path.stem
    outdir.mkdir(parents=True, exist_ok=True)

    with fitz.open(pdf_path) as doc:
        # 输出 Markdown 格式
        if args.format in ("md", "both"):
            md = extract_markdown(doc)
            (outdir / "output.md").write_text(md, encoding="utf-8")

        # 输出 JSON 格式
        if args.format in ("json", "both"):
            data = extract_json(doc, args.lang)
            (outdir / "output.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        # 提取图片
        if args.images:
            img_dir = outdir / "images"
            img_dir.mkdir(exist_ok=True)
            extract_images(doc, img_dir)

        # 提取表格
        if args.tables:
            tables = extract_tables_basic(doc)
            (outdir / "tables.json").write_text(json.dumps(tables, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"完成。输出目录：{outdir}")


if __name__ == "__main__":
    main()
