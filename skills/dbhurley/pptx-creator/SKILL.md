---
name: pptx-creator
description: 从大纲、数据源或AI生成内容创建专业的PowerPoint演示文稿。支持自定义模板、样式预设、从数据生成图表/表格以及AI生成图像。当被要求创建幻灯片、推介演示、报告或演示文稿时使用。
homepage: https://python-pptx.readthedocs.io
metadata: {"clawdbot":{"emoji":"📽️","requires":{"bins":["uv"]}}}
---

# PowerPoint 演示文稿创建器

从大纲、主题或数据源创建专业演示文稿。

## 快速开始

### 从大纲/Markdown创建
```bash
uv run {baseDir}/scripts/create_pptx.py --outline outline.md --output deck.pptx
```

### 从主题创建
```bash
uv run {baseDir}/scripts/create_pptx.py --topic "Q4 销售回顾" --slides 8 --output review.pptx
```

### 使用样式模板
```bash
uv run {baseDir}/scripts/create_pptx.py --outline outline.md --template corporate --output deck.pptx
```

### 从JSON结构创建
```bash
uv run {baseDir}/scripts/create_pptx.py --json slides.json --output deck.pptx
```

## 大纲格式（Markdown）

```markdown
# 演示文稿标题
subtitle: 2026年年度回顾
author: 您的姓名

## 介绍
- 欢迎和议程
- 今天的主要目标
- ![image](generate: 现代办公楼，极简风格)

## 市场分析
- chart: bar
- data: sales_by_region.csv
- 市场同比增长15%
- 强劲的竞争地位

## 财务摘要
- table: quarterly_results
- Q4表现强劲
- 超出收入目标
```

## JSON结构

```json
{
  "title": "季度回顾",
  "subtitle": "Q4 表现",
  "author": "您的姓名",
  "template": "corporate",
  "slides": [
    {
      "title": "介绍",
      "layout": "title_and_content",
      "bullets": ["欢迎", "议程", "目标"],
      "notes": "演讲者备注"
    },
    {
      "title": "收入图表",
      "layout": "chart",
      "chart_type": "bar"
    },
    {
      "title": "团队",
      "layout": "image_and_text",
      "image": "generate: 专业团队协作，企业风格",
      "bullets": ["领导层", "销售", "运营"]
    }
  ]
}
```

## 内置样式模板

- `minimal` — 干净白色，Helvetica Neue，蓝色强调（默认）
- `corporate` — 专业蓝色，Arial，商务就绪
- `creative` — 大胆橙色强调，Avenir，现代感
- `dark` — 深色背景，SF Pro，青色强调
- `executive` — 金色强调，Georgia/Calibri，精致优雅
- `startup` — 紫色强调，Poppins/Inter，推介演示就绪

### 生成所有模板
```bash
uv run {baseDir}/scripts/create_template.py --all
```

### 列出模板
```bash
uv run {baseDir}/scripts/create_pptx.py --list-templates
```

## 自定义模板

### 将现有PPTX保存为模板
```bash
uv run {baseDir}/scripts/create_pptx.py --save-template "my-brand" --from existing.pptx
```

### 分析模板结构
```bash
uv run {baseDir}/scripts/analyze_template.py existing.pptx
uv run {baseDir}/scripts/analyze_template.py existing.pptx --json
```

### 从自定义模板构建
```bash
uv run {baseDir}/scripts/use_template.py \
  --template my-brand \
  --slides content.json \
  --keep-slides 2 \
  --output presentation.pptx
```

## 数据源

### CSV/Excel
```markdown
## 区域销售
- chart: pie
- data: sales.csv
- columns: region, revenue
```

### 内联数据
```markdown
## 季度比较
- chart: bar
- data:
  - Q1: 120
  - Q2: 145  
  - Q3: 132
  - Q4: 178
```

## 图像生成

使用兼容的图像生成技能内联生成图像：

```markdown
## 我们的愿景
- ![hero](generate: 未来城市景观，清洁能源，乐观)
- 构建明天的解决方案
```

或通过JSON：
```json
{
  "title": "创新",
  "image": {
    "generate": "抽象技术可视化，蓝色调",
    "position": "right",
    "size": "half"
  }
}
```

## 布局

- `title` — 标题幻灯片
- `title_and_content` — 标题 + 项目符号（默认）
- `two_column` — 并排内容
- `image_and_text` — 带文本的图像
- `chart` — 完整图表幻灯片
- `table` — 数据表格
- `section` — 章节分隔符
- `blank` — 用于自定义内容的空白幻灯片

## 图表类型

- `bar` / `bar_stacked` — 条形图 / 堆叠条形图
- `column` / `column_stacked` — 柱状图 / 堆叠柱状图
- `line` / `line_markers` — 折线图 / 带标记的折线图
- `pie` / `doughnut` — 饼图 / 环形图
- `area` / `area_stacked` — 面积图 / 堆叠面积图
- `scatter` — 散点图

## 示例

### 推介演示
```bash
uv run {baseDir}/scripts/create_pptx.py \
  --topic "科技创业公司A轮融资推介" \
  --slides 10 \
  --template startup \
  --output pitch-deck.pptx
```

###  executive 报告
```bash
uv run {baseDir}/scripts/create_pptx.py \
  --outline report.md \
  --template executive \
  --output board-report.pptx
```

### 市场营销演示
```bash
uv run {baseDir}/scripts/create_pptx.py \
  --outline campaign.md \
  --template creative \
  --output marketing-deck.pptx
```
