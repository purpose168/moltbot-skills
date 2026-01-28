#!/usr/bin/env bash
set -euo pipefail

# recipe-to-list.sh
#
# 从照片创建 Todoist 购物清单。
# 将食材提取并添加到 Todoist 购物清单，同时保存到 cookbook。
#
# 使用方法：
#   bash recipe-to-list.sh /path/to/photo.jpg
#
# 可选环境变量：
#   DRY_RUN=1          # 打印要添加的项目，不创建任务
#   INCLUDE_PANTRY=1   # 包括 pantry 主食（盐/胡椒）
#   PREFIX="[Recipe] " # 任务前缀

# 解析参数
IMAGE_PATH="${1:-}"
if [[ -z "$IMAGE_PATH" ]]; then
  echo "用法: $0 <照片路径>" >&2
  echo "  示例: $0 ~/recipes/pasta.jpg" >&2
  echo "" >&2
  echo "环境变量（可选）：" >&2
  echo "  DRY_RUN=1           # 干运行模式" >&2
  echo "  INCLUDE_PANTRY=1    # 包括 pantry 主食" >&2
  echo "  PREFIX='[Recipe] '  # 任务前缀" >&2
  exit 2
fi

# 检查图片是否存在
if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "错误：图片未找到：$IMAGE_PATH" >&2
  exit 2
fi

# 构建命令
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/recipe_to_list.py"

# 检查 Python 脚本是否存在
if [[ ! -f "$PYTHON_SCRIPT" ]]; then
  echo "错误：Python 脚本未找到：$PYTHON_SCRIPT" >&2
  exit 2
fi

# 设置默认值
DRY_RUN="${DRY_RUN:-}"
INCLUDE_PANTRY="${INCLUDE_PANTRY:-}"
PREFIX="${PREFIX:-}"

# 构建参数
ARGS=("--image" "$IMAGE_PATH")
if [[ -n "$DRY_RUN" ]]; then
  ARGS+=("--dry-run")
fi
if [[ -n "$INCLUDE_PANTRY" ]]; then
  ARGS+=("--include-pantry")
fi
if [[ -n "$PREFIX" ]]; then
  ARGS+=("--prefix" "$PREFIX")
fi

# 运行 Python 脚本
echo "正在从照片提取食材并创建购物清单..."
cd "$(dirname "$SCRIPT_DIR")"
python3 "${ARGS[@]}"
