---
name: measuring-dom-nodes
description: 测量 Remotion 中 DOM 元素的尺寸
metadata:
  tags: measure, layout, dimensions, getBoundingClientRect, scale
---

# 在 Remotion 中测量 DOM 节点

Remotion 对视频容器应用 `scale()` 变换，这会影响 `getBoundingClientRect()` 的值。使用 `useCurrentScale()` 获取正确的测量值。

## 测量元素尺寸

```tsx
import { useCurrentScale } from "remotion"; // 导入获取当前缩放比例的 Hook
import { useRef, useEffect, useState } from "react"; // 导入 React Hooks

export const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null); // 创建对 DOM 元素的引用
  const scale = useCurrentScale(); // 获取当前缩放比例
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // 存储尺寸状态

  useEffect(() => {
    if (!ref.current) return; // 如果引用不存在，直接返回
    // 获取元素边界矩形
    const rect = ref.current.getBoundingClientRect();
    // 根据缩放比例调整尺寸（还原真实尺寸）
    setDimensions({
      width: rect.width / scale, // 宽度除以缩放比例
      height: rect.height / scale, // 高度除以缩放比例
    });
  }, [scale]); // 当缩放比例变化时重新计算

  // 返回带有引用的 div 元素
  return <div ref={ref}>Content to measure</div>;
};
```
