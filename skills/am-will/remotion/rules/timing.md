---
name: timing
description: Remotion 中的插值曲线 - 线性、缓动、弹簧动画
metadata:
  tags: spring, bounce, easing, interpolation
---

简单的线性插值使用 `interpolate` 函数完成。

```ts title="在 100 帧内从 0 到 1"
import {interpolate} from 'remotion'; // 导入插值函数

// 在 100 帧内将帧号从 [0, 100] 映射到透明度值 [0, 1]
const opacity = interpolate(frame, [0, 100], [0, 1]);
```

默认情况下，值不会被限制，因此值可以超出范围 [0, 1]。
以下是如何限制它们：

```ts title="在 100 帧内从 0 到 1，带外推限制"
const opacity = interpolate(frame, [0, 100], [0, 1], {
  extrapolateRight: 'clamp', // 右侧限制：最大值不超过 1
  extrapolateLeft: 'clamp', // 左侧限制：最小值不小于 0
});
```

## 弹簧动画

弹簧动画具有更自然的运动。
它们随时间从 0 到 1。

```ts title="弹簧动画在 100 帧内从 0 到 1"
import {spring, useCurrentFrame, useVideoConfig} from 'remotion'; // 导入弹簧动画函数和 Hooks

const frame = useCurrentFrame(); // 获取当前帧号
const {fps} = useVideoConfig(); // 获取视频配置（包含帧率）

// 创建弹簧动画值（从 0 到 1）
const scale = spring({
  frame, // 当前帧号
  fps, // 帧率
});
```

### 物理属性

默认配置为：`mass: 1, damping: 10, stiffness: 100`。
这会导致动画在稳定之前有一点弹跳。

配置可以像这样覆盖：

```ts
const scale = spring({
  frame, // 当前帧号
  fps, // 帧率
  config: {damping: 200}, // 自定义阻尼系数
});
```

推荐的没有弹跳的自然运动配置是：`{ damping: 200 }`。

以下是一些常见配置：

```tsx
const smooth = {damping: 200}; // 平滑，无弹跳（微妙的揭示效果）
const snappy = {damping: 20, stiffness: 200}; // 快速，最小弹跳（UI 元素）
const bouncy = {damping: 8}; // 弹跳入场（有趣的动画）
const heavy = {damping: 15, stiffness: 80, mass: 2}; // 沉重、缓慢、小弹跳
```

### 延迟

默认情况下，动画立即开始。
使用 `delay` 参数按帧数延迟动画。

```tsx
const entrance = spring({
  frame: frame - ENTRANCE_DELAY, // 减去入场延迟
  fps, // 帧率
  delay: 20, // 延迟 20 帧
});
```

### 持续时间

`spring()` 根据物理特性具有自然持续时间。
要将动画拉伸到特定持续时间，使用 `durationInFrames` 参数。

```tsx
const spring = spring({
  frame, // 当前帧号
  fps, // 帧率
  durationInFrames: 40, // 持续 40 帧
});
```

### 将 spring() 与 interpolate() 组合

将弹簧输出（0-1）映射到自定义范围：

```tsx
const springProgress = spring({
  frame, // 当前帧号
  fps, // 帧率
});

// 映射到旋转角度
const rotation = interpolate(springProgress, [0, 1], [0, 360]);

// 应用旋转样式
<div style={{rotate: rotation + 'deg'}} />;
```

### 添加弹簧

弹簧只返回数字，因此可以进行数学运算：

```tsx
const frame = useCurrentFrame(); // 获取当前帧号
const {fps, durationInFrames} = useVideoConfig(); // 获取帧率和持续时间

// 入场动画：从 0 开始
const inAnimation = spring({
  frame, // 当前帧号
  fps, // 帧率
});
// 出场动画：在结束时开始
const outAnimation = spring({
  frame, // 当前帧号
  fps, // 帧率
  durationInFrames: 1 * fps, // 持续 1 秒
  delay: durationInFrames - 1 * fps, // 在结束前 1 秒开始
});

// 组合动画：入场减去出场
const scale = inAnimation - outAnimation;
```

## 缓动

缓动可以添加到 `interpolate` 函数：

```ts
import {interpolate, Easing} from 'remotion'; // 导入插值函数和缓动函数

const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad), // 使用二次缓动：先慢后快再慢
  extrapolateLeft: 'clamp', // 左侧限制
  extrapolateRight: 'clamp', // 右侧限制
});
```

默认缓动是 `Easing.linear`。
还有其他各种凹凸性：

- `Easing.in` 开始慢然后加速
- `Easing.out` 开始快然后减速
- `Easing.inOut` 先慢后快再慢

以及曲线（从最线性到最弯曲排序）：

- `Easing.quad` 二次曲线
- `Easing.sin` 正弦曲线
- `Easing.exp` 指数曲线
- `Easing.circle` 圆形曲线

凹凸性和曲线需要组合成缓动函数：

```ts
const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad), // 先慢后快再慢的二次缓动
  extrapolateLeft: 'clamp', // 左侧限制
  extrapolateRight: 'clamp', // 右侧限制
});
```

还支持三次贝塞尔曲线：

```ts
const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.bezier(0.8, 0.22, 0.96, 0.65), // 自定义贝塞尔曲线
  extrapolateLeft: 'clamp', // 左侧限制
  extrapolateRight: 'clamp', // 右侧限制
});
```
