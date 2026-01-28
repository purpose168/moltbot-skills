---
name: text-animations
description: Remotion 的排版和文本动画模式
metadata:
  tags: typography, text, typewriter, highlighter ken
---

## 文本动画

基于 `useCurrentFrame()`，逐个字符减少字符串以创建打字机效果。

## 打字机效果

有关带有闪烁光标和第一句话后暂停的高级示例，请参阅[打字机效果示例](assets/text-animations-typewriter.tsx)。

始终使用字符串切片来实现打字机效果。切勿使用逐字符透明度。

## 单词高亮

有关如何为单词高亮设置动画的示例（像荧光笔一样），请参阅[单词高亮示例](assets/text-animations-word-highlight.tsx)。
