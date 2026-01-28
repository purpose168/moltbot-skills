---
name: pymupdf-pdf
description: 使用 PyMuPDF (fitz) 进行快速本地 PDF 解析，支持 Markdown/JSON 输出和可选的图片/表格提取。当速度比稳健性更重要时使用，或作为重型解析器不可用时的后备。默认使用单 PDF 解析，每个文档输出到独立文件夹。
---

# PyMuPDF PDF

## 概述

使用 PyMuPDF 进行本地 PDF 解析，快速、轻量级地提取为 Markdown（默认），可选 JSON 和图片/表格输出到每个文档的独立目录中。

## 前置条件 / 何时阅读参考文档

如果遇到导入错误（未安装 PyMuPDF）或 Nix `libstdc++` 问题，请阅读：
- `references/pymupdf-notes.md`

## 快速开始（单 PDF）
```bash
# 从技能目录运行
./scripts/pymupdf_parse.py /path/to/file.pdf \
  --format md \
  --outroot ./pymupdf-output
```

## 选项
- `--format md|json|both`（默认：`md`）
- `--images` 提取图片
- `--tables` 提取简单的基于行的表格 JSON（快速/粗糙）
- `--outroot DIR` 更改输出根目录
- `--lang` 将语言提示添加到 JSON 输出元数据

## 输出约定
- 默认创建 `./pymupdf-output/<pdf-basename>/`
- Markdown 输出：`output.md`
- JSON 输出：`output.json`（包含 `lang`）
- 图片：`images/` 子目录
- 表格：`tables.json`（粗糙的基于行）

## 注意事项
- PyMuPDF 很快，但在复杂 PDF 上不够稳健。
- 如需更稳健的解析，如果安装了重型 OCR 解析器（如 MinerU），请使用它。
