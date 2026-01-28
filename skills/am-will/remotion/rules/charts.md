---
name: charts
description: Remotion 的图表和数据可视化模式。用于创建条形图、饼图、直方图、进度条或任何数据驱动的动画。
metadata:
  tags: charts, data, visualization, bar-chart, pie-chart, graphs
---

# Remotion 中的图表

您可以通过使用常规 React 代码在 Remotion 中创建条形图 - 允许使用 HTML 和 SVG，以及 D3.js。

## 禁止不使用 `useCurrentFrame()` 驱动的动画

禁用第三方库的所有动画。
它们会导致渲染时出现闪烁。
相反，所有动画都应由 `useCurrentFrame()` 驱动。

## 条形图动画

有关基本示例实现，请参阅[条形图示例](assets/charts/bar-chart.tsx)。

### 交错条形

您可以这样为条形的高度设置动画并交错显示：

```tsx
const STAGGER_DELAY = 5; // 每个条形之间的延迟帧数
const frame = useCurrentFrame(); // 获取当前帧号
const {fps} = useVideoConfig(); // 获取视频配置

// 映射数据到条形元素
const bars = data.map((item, i) => {
  const delay = i * STAGGER_DELAY; // 根据索引计算延迟
  // 使用弹簧动画计算高度
  const height = spring({
    frame, // 当前帧
    fps, // 帧率
    delay, // 延迟帧数
    config: {damping: 200}, // 阻尼系数，控制动画平滑度
  });
  // 返回带有计算高度的 div 元素
  return <div style={{height: height * item.value}} />;
});
```

## 饼图动画

使用 stroke-dashoffset 为扇形设置动画，从 12 点钟方向开始。

```tsx
const frame = useCurrentFrame(); // 获取当前帧号
const {fps} = useVideoConfig(); // 获取视频配置

// 将帧号插值到 0-1 的进度值
const progress = interpolate(frame, [0, 100], [0, 1]);

// 计算圆周长
const circumference = 2 * Math.PI * radius;
// 根据值计算扇形长度
const segmentLength = (value / total) * circumference;
// 根据进度计算偏移量
const offset = interpolate(progress, [0, 1], [segmentLength, 0]);

// 绘制饼图扇形
// r: 半径, cx/cy: 中心点坐标
// stroke-dasharray: 实线和虚线的长度模式
// stroke-dashoffset: 虚线偏移量，用于动画
// rotate(-90 ...): 旋转使起点从 12 点钟方向开始
<circle
  r={radius}
  cx={center}
  cy={center}
  fill="none"
  stroke={color}
  strokeWidth={strokeWidth}
  strokeDasharray={`${segmentLength} ${circumference}`}
  strokeDashoffset={offset}
  transform={`rotate(-90 ${center} ${center})`}
/>;
```
