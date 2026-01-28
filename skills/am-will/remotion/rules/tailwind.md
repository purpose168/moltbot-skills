---
name: tailwind
description: 在 Remotion 中使用 TailwindCSS
metadata:
---

如果项目中安装了 TailwindCSS，您可以在 Remotion 中使用它。

不要使用 `transition-*` 或 `animate-*` 类 - 始终使用 `useCurrentFrame()` 钩子进行动画。

首先必须在 Remotion 项目中安装并启用 TailwindCSS - 使用 WebFetch 获取 https://www.remotion.dev/docs/tailwind 以获取安装说明。
