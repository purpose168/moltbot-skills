# PyMuPDF PDF 解析器 - Clawdbot 技能

一个使用 [PyMuPDF](https://pymupdf.readthedocs.io/) (fitz) 进行快速、轻量级 PDF 解析的 [Clawdbot](https://github.com/clawdbot/clawdbot) 技能。适用于需要快速提取文本的场景。

## 功能特性

- **快速处理** — 每页解析 PDF 约需 1 秒
- **轻量级** — 只需一个 pip 依赖，无需重型模型
- **Markdown 输出** — 带页面标记的清晰文本提取
- **JSON 输出** — 每页简单结构化文本
- **图片提取** — 可选的内嵌图片提取
- **NixOS 兼容** — 包含 libstdc++ 问题说明

## 安装

### 前置条件

1. **Python 3.8+**
2. **PyMuPDF**：`pip install pymupdf`
3. **Clawdbot** 已安装

### 安装技能

```bash
# 克隆仓库
git clone https://github.com/kesslerio/PyMuPDF-PDF-Parser-Clawdbot-Skill.git

# 或将 pymupdf-pdf/ 文件夹复制到 Clawdbot 技能目录
cp -r PyMuPDF-PDF-Parser-Clawdbot-Skill/pymupdf-pdf ~/.clawdbot/skills/

# 安装依赖
pip install pymupdf
```

### NixOS 用户

如果遇到 `libstdc++` 导入错误：

```bash
export LD_LIBRARY_PATH=/nix/store/<您的 gcc 库路径>/lib
```

详情请参阅 `pymupdf-pdf/references/pymupdf-notes.md`。

## 使用方法

### 快速开始

```bash
# 从技能目录运行
./scripts/pymupdf_parse.py /path/to/document.pdf
```

### 选项

```bash
./scripts/pymupdf_parse.py /path/to/document.pdf --format json
./scripts/pymupdf_parse.py /path/to/document.pdf --format both --images
./scripts/pymupdf_parse.py /path/to/document.pdf --outroot ./my-output
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--format` | `md` | 输出格式：`md`、`json` 或 `both` |
| `--outroot` | `./pymupdf-output` | 输出根目录 |
| `--images` | 关闭 | 提取内嵌图片 |
| `--tables` | 关闭 | 提取基于行的表格近似 |
| `--lang` | `en` | 语言提示（存储在 JSON 元数据中） |

## 输出

在输出根目录下为每个文档创建文件夹：

```
./pymupdf-output/
└── document-name/
    ├── output.md      # 带页面标记的 Markdown
    ├── output.json    # 简单 JSON（约 1KB，每页文本）
    ├── images/        # 提取的图片（如果使用 --images）
    └── tables.json    # 基于行的表格（如果使用 --tables）
```

### 输出质量

PyMuPDF 产生**快速、最小化的输出**：
- 纯文本提取（不保留布局）
- 简单 JSON，每页文本
- 可选图片提取

**适用于：** 快速文本提取、批处理或速度重要的场景。

## 与 MinerU 的比较

| 方面 | PyMuPDF | MinerU |
|------|---------|--------|
| 速度 | 快（约 1 秒/页） | 较慢（约 15-30 秒/页） |
| JSON 输出 | 最小（约 1KB，仅文本） | 丰富（约 50KB+，布局数据） |
| 图片提取 | 可选 | 自动 |
| 布局保留 | 基础 | 优秀 |
| 依赖 | 轻量（pip 安装） | 重型（约 20GB 模型） |

**当速度重要时使用 PyMuPDF。**  
**当质量和结构比速度更重要时使用 MinerU。**

## 许可证

Apache 2.0

## 贡献

欢迎提交问题和建议。提交前请用各种 PDF 类型测试更改。

## 相关链接

- [MinerU PDF 解析器技能](https://github.com/kesslerio/MinerU-PDF-Parser-Clawdbot-Skill) — 丰富的、布局感知的替代方案
- [PyMuPDF](https://pymupdf.readthedocs.io/) — 底层 PDF 库
- [Clawdbot](https://github.com/clawdbot/clawdbot) — AI 代理框架
