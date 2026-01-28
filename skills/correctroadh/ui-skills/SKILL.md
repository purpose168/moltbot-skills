---
name: ui-skills
description: 为智能体构建更好界面的固执约束（Opinionated constraints）。包含 UI 组件、动画、交互和性能的详细规范。
---

# UI 技能

为智能体构建更好界面的固执约束。

## 技术栈

- **必须** 在使用自定义值之前使用 Tailwind CSS 默认值（间距、圆角、阴影）
- **必须** 在需要 JavaScript 动画时使用 `motion/react`（原 `framer-motion`）
- **应该** 在 Tailwind CSS 中对入场和微动画使用 `tw-animate-css`
- **必须** 使用 `cn` 工具函数（`clsx` + `tailwind-merge`）处理类名逻辑

## 组件

- **必须** 对任何具有键盘或焦点行为的组件使用可访问的原始组件（`Base UI`、`React Aria`、`Radix`）
- **必须** 首先使用项目中现有的组件原始组件
- **永远不要** 在同一交互界面内混合不同的原始组件系统
- **应该** 如果兼容，优先使用 [`Base UI`](https://base-ui.com/react/components) 作为新的原始组件
- **必须** 为纯图标按钮添加 `aria-label`
- **永远不要** 手动重建键盘或焦点行为，除非明确要求

## 交互

- **必须** 对破坏性或不可逆的操作使用 `AlertDialog`
- **应该** 对加载状态使用结构化骨架屏
- **永远不要** 使用 `h-screen`，应使用 `h-dvh`
- **必须** 固定元素需要考虑 `safe-area-inset`
- **必须** 在操作发生的位置附近显示错误
- **永远不要** 在 `input` 或 `textarea` 元素中阻止粘贴

## 动画

- **永远不要** 除非明确要求，否则不要添加动画
- **必须** 只动画化复合属性（`transform`、`opacity`）
- **永远不要** 动画化布局属性（`width`、`height`、`top`、`left`、`margin`、`padding`）
- **应该** 避免动画化绘制属性（`background`、`color`），小范围局部 UI（文本、图标）除外
- **应该** 入场动画使用 `ease-out`
- **永远不要** 交互反馈动画超过 `200ms`
- **必须** 当动画元素不在屏幕内时暂停循环动画
- **必须** 尊重 `prefers-reduced-motion`
- **永远不要** 引入自定义缓动曲线，除非明确要求
- **应该** 避免动画化大型图片或全屏表面

## 排版

- **必须** 标题使用 `text-balance`，正文/段落使用 `text-pretty`
- **必须** 数据使用 `tabular-nums`
- **应该** 密集 UI 使用 `truncate` 或 `line-clamp`
- **永远不要** 修改 `letter-spacing`（`tracking-`），除非明确要求

## 布局

- **必须** 使用固定的 `z-index` 比例（不使用任意的 `z-x`）
- **应该** 方形元素使用 `size-x` 而不是 `w-x` + `h-x`

## 性能

- **永远不要** 动画化大型 `blur()` 或 `backdrop-filter` 表面
- **永远不要** 在非活动动画期间应用 `will-change`
- **永远不要** 对任何可以用渲染逻辑表达的内容使用 `useEffect`

## 设计

- **永远不要** 使用渐变，除非明确要求
- **永远不要** 使用紫色或多色渐变
- **永远不要** 将发光效果作为主要可识别元素
- **应该** 除非明确要求，否则使用 Tailwind CSS 默认阴影比例
- **必须** 给空状态一个清晰的下一个操作
- **应该** 每个视图限制使用一种强调色
- **应该** 在引入新颜色之前使用现有主题或 Tailwind CSS 颜色标记
