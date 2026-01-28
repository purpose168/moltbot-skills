---
name: transitions
description: Remotion 的全屏场景转换
metadata:
  tags: transitions, fade, slide, wipe, scenes
---

## 全屏场景转换

使用 `<TransitionSeries>` 在多个场景或片段之间进行动画过渡。
这将使子元素绝对定位。

## 前置条件

首先，需要安装 @remotion/transitions 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/transitions # 如果项目使用 npm
bunx remotion add @remotion/transitions # 如果项目使用 bun
yarn remotion add @remotion/transitions # 如果项目使用 yarn
pnpm exec remotion add @remotion/transitions # 如果项目使用 pnpm
```

## 示例用法

```tsx
import {TransitionSeries, linearTiming} from '@remotion/transitions'; // 导入转换系列组件和线性时序
import {fade} from '@remotion/transitions/fade'; // 导入淡入淡出转换

{/* 转换系列容器 */}
<TransitionSeries>
  {/* 第一个场景序列：持续 60 帧 */}
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA /> {/* 场景 A 组件 */}
  </TransitionSeries.Sequence>
  {/* 转换：淡入淡出效果，持续 15 帧 */}
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
  {/* 第二个场景序列：持续 60 帧 */}
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB /> {/* 场景 B 组件 */}
  </TransitionSeries.Sequence>
</TransitionSeries>;
```

## 可用的转换类型

从各自的模块导入转换：

```tsx
import {fade} from '@remotion/transitions/fade'; // 淡入淡出
import {slide} from '@remotion/transitions/slide'; // 滑动
import {wipe} from '@remotion/transitions/wipe'; // 擦除
import {flip} from '@remotion/transitions/flip'; // 翻转
import {clockWipe} from '@remotion/transitions/clock-wipe'; // 时钟擦除
```

## 带方向的滑动转换

为入场/出场动画指定滑动方向。

```tsx
import {slide} from '@remotion/transitions/slide'; // 导入滑动转换

{/* 从左侧滑入，持续 20 帧 */}
<TransitionSeries.Transition presentation={slide({direction: 'from-left'})} timing={linearTiming({durationInFrames: 20})} />;
```

方向可选值：`"from-left"`（从左）、`"from-right"`（从右）、`"from-top"`（从上）、`"from-bottom"`（从下）

## 时序选项

```tsx
import {linearTiming, springTiming} from '@remotion/transitions'; // 导入时序函数

// 线性时序 - 恒定速度
linearTiming({durationInFrames: 20});

// 弹簧时序 - 有机运动
springTiming({config: {damping: 200}, durationInFrames: 25});
```

## 持续时间计算

转换会与相邻场景重叠，因此合成的总长度**短于**所有序列持续时间的总和。

例如，使用两个 60 帧的序列和 15 帧的转换：

- 无转换：`60 + 60 = 120` 帧
- 有转换：`60 + 60 - 15 = 105` 帧

转换持续时间会被减去，因为在转换期间两个场景同时播放。

### 获取转换的持续时间

对时序对象使用 `getDurationInFrames()` 方法：

```tsx
import {linearTiming, springTiming} from '@remotion/transitions'; // 导入时序函数

// 线性时序：返回 20
const linearDuration = linearTiming({durationInFrames: 20}).getDurationInFrames({fps: 30});

// 弹簧时序：根据弹簧物理计算返回持续时间
const springDuration = springTiming({config: {damping: 200}}).getDurationInFrames({fps: 30});
```

对于没有明确 `durationInFrames` 的 `springTiming`，持续时间取决于 `fps`，因为它会计算弹簧动画何时稳定。

### 计算合成的总持续时间

```tsx
import {linearTiming} from '@remotion/transitions'; // 导入线性时序函数

// 各场景持续时间
const scene1Duration = 60;
const scene2Duration = 60;
const scene3Duration = 60;

// 各转换的时序
const timing1 = linearTiming({durationInFrames: 15});
const timing2 = linearTiming({durationInFrames: 20});

// 计算各转换的持续时间（帧数）
const transition1Duration = timing1.getDurationInFrames({fps: 30});
const transition2Duration = timing2.getDurationInFrames({fps: 30});

// 计算总持续时间：场景总时长减去转换重叠时间
const totalDuration = scene1Duration + scene2Duration + scene3Duration - transition1Duration - transition2Duration;
// 60 + 60 + 60 - 15 - 20 = 145 帧
```
