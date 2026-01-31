#!/bin/bash
# 生成 WhatsApp 风格的视频
# 用法: ./generate.sh [output-name]

OUTPUT_NAME=${1:-"whatsapp-video"}
PROJECT_DIR="$HOME/Projects/remotion-test"

cd "$PROJECT_DIR" || exit 1

echo "🎬 正在渲染 WhatsApp 视频..."
npx remotion render WhatsAppDemo "out/${OUTPUT_NAME}.mp4" --concurrency=4

if [ $? -eq 0 ]; then
    echo "✅ 视频已保存到: $PROJECT_DIR/out/${OUTPUT_NAME}.mp4"
    open "$PROJECT_DIR/out/${OUTPUT_NAME}.mp4"
else
    echo "❌ 渲染失败"
    exit 1
fi
