---
name: recipe-to-list
description: 将食谱转换为 Todoist 购物清单。使用 Gemini Flash 视觉功能从食谱照片中提取食材，或通过搜索+抓取从食谱网页提取，然后与现有的购物清单进行对比（使用保守的同义词/重叠规则），跳过 pantry 主食（盐/胡椒），并在单位匹配时合并数量。同时将每个做过的食谱保存到工作区 cookbook（recipes/）。
---

# 创建购物清单（Gemini Flash + Todoist）

目标流程：
1) 输入可以是**照片**或**食谱网页搜索**
2) 提取食材（照片使用 Gemini Flash；网页使用 web_fetch 文本 → Gemini）
3) 拉取当前 Todoist **购物**清单
4) 使用重叠 + 同义词映射进行对比（保持保守；仅合并高置信度的等价物，如香菜↔ cilantro、面包屑↔ panko）
5) 更新**购物**清单（默认：仅添加缺失的项目；跳过盐/胡椒）

使用捆绑的脚本处理**照片 → 食材 → 购物清单更新**部分。

它还**自动保存**一个 Markdown 条目到 `recipes/`（您的 cookbook 知识库）并追加到 `recipes/index.md`。

对于**食谱名称 → 网页搜索**，请先使用 `web_search` + `web_fetch` 确认，然后同样的更新逻辑将食材输入（并保存食谱）。

## 前置条件

- 环境变量：`GEMINI_API_KEY`（或 `GOOGLE_API_KEY`）用于 Gemini
- 环境变量：`TODOIST_API_TOKEN` 用于 Todoist
- 命令行工具：`todoist`（todoist-ts-cli）

## 输出格式

- 项目被重新格式化为以**食材名称**开头，后面跟括号中的数量。
- 购物清单保持**扁平**（无 Todoist 部分/分组）。

## 运行

```bash
python3 skills/recipe-to-list/scripts/recipe_to_list.py \
  --image /path/to/photo.jpg \
  --title "<可选标题>" \
  --source "photo:/path/to/photo.jpg"
```

### 可选参数

- `--model gemini-2.0-flash`（默认；自动回退）或任何兼容的 Gemini 视觉模型
- `--dry-run` 打印提取的项目而不创建任务
- `--prefix "[Recipe] "` 为每个创建的任务添加前缀
- `--no-overlap-check` 跳过检查现有购物清单
- `--include-pantry` 包括盐/胡椒
- `--no-save` 跳过保存到 `recipes/`

## 发送给模型的内容

脚本提示 Gemini 返回**严格的 JSON**：

```json
{
  "items": ["2 large globe eggplants", "kosher salt", "..."],
  "notes": "optional"
}
```

如果解析失败，请使用更清晰的裁剪（仅食材列表）重新运行，或提供手动列表。
