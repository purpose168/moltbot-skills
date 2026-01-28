# PyMuPDF 注意事项

- 通过 PyMuPDF (`fitz`) 实现快速本地解析。
- 不如专门的 PDF 解析器稳健；表格提取功能有限。
- `page.get_text("markdown")` 提供快速的 Markdown 输出。
- `page.get_text("text")` 提供用于 JSON 的纯文本。
- 图片提取使用 `page.get_images(full=True)` 和 `Pixmap`。

安装：
```bash
pip install pymupdf
```

NixOS 说明（如果导入时出现 libstdc++ 缺失错误）：
```bash
# 找到 gcc 库路径并导出：
ls /nix/store/*gcc*/lib/libstdc++.so.6 2>/dev/null | head -1
export LD_LIBRARY_PATH=/nix/store/<您的 gcc 库哈希值>-gcc-<版本>-lib/lib
```
