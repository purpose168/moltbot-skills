---
name: excel
description: 读取、写入、编辑和格式化 Excel 文件 (.xlsx)。创建电子表格、操作数据、应用格式、管理工作表、合并单元格、查找/替换，以及导出为 CSV/JSON/Markdown。用于任何 Excel 文件操作任务。
metadata: {"clawdbot":{"emoji":"📊","requires":{"bins":["python3"],"pip":["openpyxl"]}}}
---

# Excel 工具

全面的 Excel 文件操作 - 读取、写入、编辑、格式化和导出。

## 安装设置

```bash
pip install openpyxl

# 或使用 uv（推荐）
uv run --with openpyxl python3 scripts/excel.py --help
```

## 快速参考

```bash
cd skills/excel

# 获取文件信息
python3 scripts/excel.py info report.xlsx

# 读取整个工作表
python3 scripts/excel.py read report.xlsx
python3 scripts/excel.py read report.xlsx --format markdown
python3 scripts/excel.py read report.xlsx --sheet "Sales" --range A1:D10

# 读取特定单元格
python3 scripts/excel.py cell report.xlsx B5

# 创建新工作簿
python3 scripts/excel.py create output.xlsx
python3 scripts/excel.py create output.xlsx --sheets "Data,Summary,Charts"

# 写入数据
python3 scripts/excel.py write output.xlsx --data '[[1,2,3],[4,5,6]]'
python3 scripts/excel.py write output.xlsx --data '{"headers":["Name","Age"],"rows":[["Alice",30],["Bob",25]]}'

# 编辑单元格
python3 scripts/excel.py edit report.xlsx A1 "New Value"
python3 scripts/excel.py edit report.xlsx B2 "SUM(A1:A10)" --formula

# 导出
python3 scripts/excel.py to-csv report.xlsx output.csv
python3 scripts/excel.py to-json report.xlsx output.json
python3 scripts/excel.py to-markdown report.xlsx
```

## 命令

### 读取数据

**info** - 获取工作簿元数据
```bash
python3 scripts/excel.py info report.xlsx
# 返回：工作表、维度、行列计数
```

**read** - 读取工作表数据
```bash
python3 scripts/excel.py read file.xlsx                     # JSON 输出
python3 scripts/excel.py read file.xlsx --format csv        # CSV 输出
python3 scripts/excel.py read file.xlsx --format markdown   # Markdown 表格
python3 scripts/excel.py read file.xlsx --sheet "Sheet2"    # 特定工作表
python3 scripts/excel.py read file.xlsx --range A1:D10      # 特定范围
```

**cell** - 读取特定单元格
```bash
python3 scripts/excel.py cell file.xlsx A1
python3 scripts/excel.py cell file.xlsx B5 --sheet "Data"
# 返回：值、公式（如有）、数据类型、合并状态
```

### 创建和写入

**create** - 创建新工作簿
```bash
python3 scripts/excel.py create new.xlsx
python3 scripts/excel.py create new.xlsx --sheets "Sheet1,Sheet2,Summary"
```

**write** - 向单元格写入数据
```bash
# 二维数组
python3 scripts/excel.py write file.xlsx --data '[[1,2,3],[4,5,6]]'

# 带表头
python3 scripts/excel.py write file.xlsx --data '{"headers":["A","B"],"rows":[[1,2],[3,4]]}'

# 从特定单元格开始
python3 scripts/excel.py write file.xlsx --data '[[1,2]]' --start C5

# 键值对
python3 scripts/excel.py write file.xlsx --data '{"Name":"Alice","Age":30}'
```

**from-csv** - 从 CSV 创建 Excel
```bash
python3 scripts/excel.py from-csv data.csv output.xlsx
python3 scripts/excel.py from-csv data.csv output.xlsx --sheet "Imported"
```

**from-json** - 从 JSON 创建 Excel
```bash
python3 scripts/excel.py from-json data.json output.xlsx
# 支持：对象数组、数组数组、表头+行格式
```

### 编辑操作

**edit** - 编辑单元格值或公式
```bash
python3 scripts/excel.py edit file.xlsx A1 "New Value"
python3 scripts/excel.py edit file.xlsx B2 100
python3 scripts/excel.py edit file.xlsx C3 "SUM(A1:B2)" --formula
python3 scripts/excel.py edit file.xlsx D4 "=VLOOKUP(A1,Data!A:B,2,FALSE)" --formula
```

**find** - 搜索文本
```bash
python3 scripts/excel.py find file.xlsx "search term"
python3 scripts/excel.py find file.xlsx "error" --sheet "Log"
# 返回：包含该文本的单元格列表
```

**replace** - 查找并替换
```bash
python3 scripts/excel.py replace file.xlsx "old" "new"
python3 scripts/excel.py replace file.xlsx "2024" "2025" --sheet "Dates"
```

### 工作表管理

**add-sheet** - 添加新工作表
```bash
python3 scripts/excel.py add-sheet file.xlsx "NewSheet"
python3 scripts/excel.py add-sheet file.xlsx "First" --position 0  # 插入到开头
```

**rename-sheet** - 重命名工作表
```bash
python3 scripts/excel.py rename-sheet file.xlsx "Sheet1" "Data"
```

**delete-sheet** - 删除工作表
```bash
python3 scripts/excel.py delete-sheet file.xlsx "OldSheet"
```

**copy-sheet** - 复制工作表
```bash
python3 scripts/excel.py copy-sheet file.xlsx "Template" "January"
```

### 行和列操作

**insert-rows** - 插入行
```bash
python3 scripts/excel.py insert-rows file.xlsx 5              # 在第 5 行插入 1 行
python3 scripts/excel.py insert-rows file.xlsx 5 --count 3    # 插入 3 行
```

**insert-cols** - 插入列
```bash
python3 scripts/excel.py insert-cols file.xlsx C              # 在列 C 插入
python3 scripts/excel.py insert-cols file.xlsx 3 --count 2    # 在位置 3 插入 2 列
```

**delete-rows** - 删除行
```bash
python3 scripts/excel.py delete-rows file.xlsx 5
python3 scripts/excel.py delete-rows file.xlsx 5 --count 3
```

**delete-cols** - 删除列
```bash
python3 scripts/excel.py delete-cols file.xlsx C
python3 scripts/excel.py delete-cols file.xlsx B --count 2
```

### 单元格操作

**merge** - 合并单元格
```bash
python3 scripts/excel.py merge file.xlsx A1:C1
python3 scripts/excel.py merge file.xlsx A1:A5 --sheet "Header"
```

**unmerge** - 取消合并单元格
```bash
python3 scripts/excel.py unmerge file.xlsx A1:C1
```

### 格式化

**format** - 应用单元格格式
```bash
# 粗体和斜体
python3 scripts/excel.py format file.xlsx A1:D1 --bold --italic

# 字体设置
python3 scripts/excel.py format file.xlsx A1:D1 --font-size 14 --font-color RED --font-name "Arial"

# 背景颜色
python3 scripts/excel.py format file.xlsx A1:D1 --bg-color YELLOW

# 对齐方式
python3 scripts/excel.py format file.xlsx A:A --align center --valign top

# 文本换行
python3 scripts/excel.py format file.xlsx B2:B100 --wrap

# 边框
python3 scripts/excel.py format file.xlsx A1:D10 --border thin
# 边框样式：thin（细）, medium（中等）, thick（粗）, double（双线）

# 组合设置
python3 scripts/excel.py format file.xlsx A1:D1 --bold --bg-color "#4472C4" --font-color WHITE --align center
```

**resize** - 调整行和列大小
```bash
python3 scripts/excel.py resize file.xlsx --row 1:30          # 第 1 行高度 = 30
python3 scripts/excel.py resize file.xlsx --col A:20          # 列 A 宽度 = 20
python3 scripts/excel.py resize file.xlsx --row 1:30 --col A:15 --col B:25
```

**freeze** - 冻结窗格
```bash
python3 scripts/excel.py freeze file.xlsx A2    # 冻结第 1 行
python3 scripts/excel.py freeze file.xlsx B1    # 冻结列 A
python3 scripts/excel.py freeze file.xlsx B2    # 冻结第 1 行和列 A
```

### 导出

**to-csv** - 导出为 CSV
```bash
python3 scripts/excel.py to-csv file.xlsx output.csv
python3 scripts/excel.py to-csv file.xlsx data.csv --sheet "Data"
```

**to-json** - 导出为 JSON（第一行为表头）
```bash
python3 scripts/excel.py to-json file.xlsx output.json
# 输出：[{"表头1": "值1", "表头2": "值2"}, ...]
```

**to-markdown** - 导出为 markdown 表格
```bash
python3 scripts/excel.py to-markdown file.xlsx
python3 scripts/excel.py to-markdown file.xlsx --sheet "Summary"
```

## 颜色

命名颜色：`RED`（红色）、`GREEN`（绿色）、`BLUE`（蓝色）、`YELLOW`（黄色）、`WHITE`（白色）、`BLACK`（黑色）、`GRAY`（灰色）、`ORANGE`（橙色）、`PURPLE`（紫色）、`PINK`（粉色）、`CYAN`（青色）

十六进制颜色：`#FF0000`、`#4472C4`、`00FF00`（带或不带 #）

## 常见工作流程

### 从数据创建报告
```bash
# 创建带数据的工作簿
python3 scripts/excel.py from-json sales.json report.xlsx --sheet "Sales"

# 格式化表头
python3 scripts/excel.py format report.xlsx A1:E1 --bold --bg-color "#4472C4" --font-color WHITE

# 冻结表头行
python3 scripts/excel.py freeze report.xlsx A2

# 调整列宽
python3 scripts/excel.py resize report.xlsx --col A:15 --col B:25 --col C:12
```

### 更新现有报告
```bash
# 添加新行
python3 scripts/excel.py insert-rows report.xlsx 2
python3 scripts/excel.py write report.xlsx --data '["New Item", 100, 50]' --start A2

# 更新特定单元格
python3 scripts/excel.py edit report.xlsx D10 "=SUM(D2:D9)" --formula

# 查找并替换日期
python3 scripts/excel.py replace report.xlsx "2024" "2025"
```

### 提取数据用于分析
```bash
# 读取为 JSON 进行处理
python3 scripts/excel.py read data.xlsx --format json > data.json

# 读取特定范围为 markdown
python3 scripts/excel.py read data.xlsx --range A1:D20 --format markdown

# 导出特定工作表为 CSV
python3 scripts/excel.py to-csv data.xlsx --sheet "Raw Data" export.csv
```

## 输出格式

所有命令输出带 `success: true/false` 的 JSON：

```json
{
  "success": true,
  "file": "report.xlsx",
  "sheet": "Sheet1",
  ...
}
```

使用 `read` 命令时，可使用 `--format markdown` 或 `--format csv` 获得其他输出格式。