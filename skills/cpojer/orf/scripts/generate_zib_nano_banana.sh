#!/bin/sh
set -eu

# ZiB 演播室图片生成器
# 使用 Nano Banana 生成 ORF 新闻 ZiB 演播室风格的图片

OUT_PATH="$1"
COUNT="${2:-5}"
FOCUS="${3:-auto}"

VENV_DIR="./tmp/hn-venv"
PY="$VENV_DIR/bin/python"

# 检查并创建虚拟环境
if [ ! -x "$PY" ]; then
  python3 -m venv "$VENV_DIR"
  "$PY" -m pip install --quiet --disable-pip-version-check google-genai pillow
fi

# 获取 ORF 新闻并生成提示
JSON="$(python3 skills/orf-digest/scripts/orf.py --count "$COUNT" --focus "$FOCUS" --format json)"
PROMPT="$(printf "%s" "$JSON" | node skills/orf-digest/scripts/zib_prompt.mjs)"

# 使用 Nano Banana 生成图片
"$PY" skills/hn-digest/scripts/nano_banana_mood.py --out "$OUT_PATH" --resolution 1K --prompt "$PROMPT"
