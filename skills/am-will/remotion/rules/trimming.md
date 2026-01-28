---
name: trimming
description: Remotion 的修剪模式 - 剪掉动画的开头或结尾
metadata:
  tags: sequence, trim, clip, cut, offset
---

使用带有负 `from` 值的 `<Sequence>` 来修剪动画的开头。

## 修剪开头

负 `from` 值使时间向后偏移，使动画从中间开始：

```tsx
import { Sequence, useVideoConfig } from "remotion"; // 导入 Sequence 组件和视频配置 Hook

const fps = useVideoConfig(); // 获取视频配置（包含帧率）

{/* 从动画的第 0.5 秒开始（即向后偏移 0.5 秒） */}
<Sequence from={-0.5 * fps}>
  <MyAnimation /> {/* 动画组件 */}
</Sequence>
```

动画会在进度 15 帧时显示 - 前 15 帧被修剪掉。
在 `<MyAnimation>` 内部，`useCurrentFrame()` 从 15 开始而不是从 0 开始。

## 修剪结尾

使用 `durationInFrames` 在指定持续时间后卸载内容：

```tsx
{/* 持续 1.5 秒（45 帧，假设帧率 30fps） */}
<Sequence durationInFrames={1.5 * fps}>
  <MyAnimation /> {/* 动画组件 */}
</Sequence>
```

动画播放 45 帧后，组件会卸载。

## 修剪和延迟

嵌套序列以同时修剪开头并延迟显示时间：

```tsx
{/* 外层序列：延迟 30 帧 */}
<Sequence from={30}>
  {/* 内层序列：从第 15 帧开始（修剪前 15 帧） */}
  <Sequence from={-15}>
    <MyAnimation /> {/* 动画组件 */}
  </Sequence>
</Sequence>
```

内层序列从开头修剪 15 帧，外层序列将结果延迟 30 帧显示。
