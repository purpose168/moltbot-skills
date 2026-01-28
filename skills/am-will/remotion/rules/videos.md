---
name: videos
description: 在 Remotion 中嵌入视频 - 修剪、音量、速度、循环、音调
metadata:
  tags: video, media, trim, volume, speed, loop, pitch
---

# 在 Remotion 中使用视频

## 前置条件

首先，需要安装 @remotion/media 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/media # 如果项目使用 npm
bunx remotion add @remotion/media # 如果项目使用 bun
yarn remotion add @remotion/media # 如果项目使用 yarn
pnpm exec remotion add @remotion/media # 如果项目使用 pnpm
```

使用 `@remotion/media` 的 `<Video>` 组件将视频嵌入到您的合成中。

```tsx
import { Video } from "@remotion/media";
import { staticFile } from "remotion";

export const MyComposition = () => {
  // 使用 Video 组件播放本地视频文件
  return <Video src={staticFile("video.mp4")} />;
};
```

也支持远程 URL：

```tsx
{/* 直接使用远程视频 URL */}
<Video src="https://remotion.media/video.mp4" />
```

## 修剪

使用 `trimBefore` 和 `trimAfter` 移除视频的部分。值以帧为单位。

```tsx
const { fps } = useVideoConfig(); // 获取帧率

return (
  <Video
    src={staticFile("video.mp4")}
    trimBefore={2 * fps} // 跳过前 2 秒
    trimAfter={10 * fps} // 在第 10 秒标记处结束
  />
);
```

## 延迟

将视频包装在 `<Sequence>` 中以延迟显示时间：

```tsx
import { Sequence, staticFile } from "remotion";
import { Video } from "@remotion/media";

const { fps } = useVideoConfig();

return (
  {/* 从第 1 秒开始显示视频 */}
  <Sequence from={1 * fps}>
    <Video src={staticFile("video.mp4")} />
  </Sequence>
);
```

视频将在 1 秒后显示。

## 大小和位置

使用 `style` 属性控制大小和位置：

```tsx
<Video
  src={staticFile("video.mp4")}
  style={{
    width: 500, // 宽度 500 像素
    height: 300, // 高度 300 像素
    position: "absolute", // 绝对定位
    top: 100, // 距离顶部 100 像素
    left: 50, // 距离左侧 50 像素
    objectFit: "cover", // 保持宽高比填充
  }}
/>
```

## 音量

设置静态音量（0 到 1）：

```tsx
{/* 音量设置为 50% */}
<Video src={staticFile("video.mp4")} volume={0.5} />
```

或者使用回调函数根据当前帧动态调整音量：

```tsx
import { interpolate } from "remotion";

const { fps } = useVideoConfig();

return (
  <Video
    src={staticFile("video.mp4")}
    volume={(f) =>
      // 音量从 0 渐变到 1（1 秒内）
      interpolate(f, [0, 1 * fps], [0, 1], { extrapolateRight: "clamp" })
    }
  />
);
```

使用 `muted` 完全静音视频：

```tsx
{/* 静音视频 */}
<Video src={staticFile("video.mp4")} muted />
```

## 速度

使用 `playbackRate` 更改播放速度：

```tsx
<Video src={staticFile("video.mp4")} playbackRate={2} /> {/* 2 倍速 */}
<Video src={staticFile("video.mp4")} playbackRate={0.5} /> {/* 半速 */}
```

不支持反向播放。

## 循环

使用 `loop` 使视频无限循环：

```tsx
{/* 循环播放视频 */}
<Video src={staticFile("video.mp4")} loop />
```

使用 `loopVolumeCurveBehavior` 控制循环时帧计数的行为：

- `"repeat"`：每次循环时帧计数重置为 0（用于 `volume` 回调）
- `"extend"`：帧计数继续递增

```tsx
<Video
  src={staticFile("video.mp4")}
  loop
  loopVolumeCurveBehavior="extend"
  volume={(f) => interpolate(f, [0, 300], [1, 0])} // 在多次循环中淡出
/>
```

## 音调

使用 `toneFrequency` 调整音调而不影响速度。值范围从 0.01 到 2：

```tsx
{/* 较高音调 */}
<Video
  src={staticFile("video.mp4")}
  toneFrequency={1.5}
/>
{/* 较低音调 */}
<Video
  src={staticFile("video.mp4")}
  toneFrequency={0.8}
/>
```

音调调整仅在服务器端渲染时有效，不适用于 Remotion Studio 预览或 `<Player />`。
