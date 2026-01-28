---
name: animations
description: Remotion 的基础动画技能
metadata:
  tags: animations, transitions, frames, useCurrentFrame
---

所有动画都必须由 `useCurrentFrame()` 钩子驱动。
将动画以秒为单位编写，然后乘以 `useVideoConfig()` 中的 `fps` 值。

```tsx
import { useCurrentFrame } from "remotion";

export const FadeIn = () => {
  const frame = useCurrentFrame(); // 获取当前帧号
  const { fps } = useVideoConfig(); // 获取视频配置，包括帧率

  // 使用 interpolate 函数将帧号映射到透明度值
  // 帧 0-2 秒：透明度从 0 渐变到 1
  const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: 'clamp', // 右侧外推：限制最大值
  });

  // 返回带有透明度样式的 div
  return (
    <div style={{ opacity }}>Hello World!</div>
  );
};
```

禁止使用 CSS transitions 或 CSS animations - 它们无法正确渲染。
禁止使用 Tailwind animation 类名 - 它们无法正确渲染。
