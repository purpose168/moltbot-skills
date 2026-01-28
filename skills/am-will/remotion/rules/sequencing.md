---
name: sequencing
description: Remotion 的排序模式 - 延迟、修剪、限制项目持续时间
metadata:
  tags: sequence, series, timing, delay, trim
---

使用 `<Sequence>` 延迟元素在时间线中的显示时间。

```tsx
import { Sequence } from "remotion"; // 导入 Sequence 组件

const {fps} = useVideoConfig(); // 获取视频配置（包含帧率）

{/* 第一个 Sequence：从第 1 秒开始，持续 2 秒，预加载 1 秒 */}
<Sequence from={1 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Title /> {/* 标题组件 */}
</Sequence>
{/* 第二个 Sequence：从第 2 秒开始，持续 2 秒，预加载 1 秒 */}
<Sequence from={2 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Subtitle /> {/* 副标题组件 */}
</Sequence>
```

默认情况下，这会将组件包装在绝对填充元素中。
如果不应该包装项目，请使用 `layout` 属性：

```tsx
{/* 设置 layout 为 none，避免包装 */}
<Sequence layout="none">
  <Title />
</Sequence>
```

## 预加载

这会在实际播放之前在时间线中加载组件。
始终预加载任何 `<Sequence>`！

```tsx
{/* 预加载 1 秒（30 帧，假设帧率 30fps） */}
<Sequence premountFor={1 * fps}>
  <Title />
</Sequence>
```

## 系列

当元素应该一个接一个地播放而不重叠时，使用 `<Series>`。

```tsx
import {Series} from 'remotion'; // 导入 Series 组件

<Series>
  {/* 第一个序列：开场白，持续 45 帧 */}
  <Series.Sequence durationInFrames={45}>
    <Intro /> {/* 开场组件 */}
  </Series.Sequence>
  {/* 第二个序列：主要内容，持续 60 帧 */}
  <Series.Sequence durationInFrames={60}>
    <MainContent /> {/* 主要内容组件 */}
  </Series.Sequence>
  {/* 第三个序列：结束语，持续 30 帧 */}
  <Series.Sequence durationInFrames={30}>
    <Outro /> {/* 结束组件 */}
  </Series.Sequence>
</Series>;
```

与 `<Sequence>` 相同，使用 `<Series.Sequence>` 时项目默认会被包装在绝对填充元素中，除非将 `layout` 属性设置为 `none`。

### 带重叠的系列

对重叠的序列使用负偏移：

```tsx
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA /> {/* 场景 A */}
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    {/* 场景 B 在场景 A 结束前 15 帧开始 */}
    <SceneB /> {/* 场景 B */}
  </Series.Sequence>
</Series>
```

## 序列内的帧引用

在 Sequence 内部，`useCurrentFrame()` 返回局部帧（从 0 开始）：

```tsx
<Sequence from={60} durationInFrames={30}>
  <MyComponent />
  {/* 在 MyComponent 内部，useCurrentFrame() 返回 0-29，而不是 60-89 */}
</Sequence>
```

## 嵌套序列

序列可以嵌套以实现复杂的时序：

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background /> {/* 背景层 */}
  {/* 标题序列：从第 15 帧开始，持续 90 帧 */}
  <Sequence from={15} durationInFrames={90} layout="none">
    <Title /> {/* 标题 */}
  </Sequence>
  {/* 副标题序列：从第 45 帧开始，持续 60 帧 */}
  <Sequence from={45} durationInFrames={60} layout="none">
    <Subtitle /> {/* 副标题 */}
  </Sequence>
</Sequence>
```
