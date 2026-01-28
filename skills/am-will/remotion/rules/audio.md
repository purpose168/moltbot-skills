---
name: audio
description: 在 Remotion 中使用音频和声音 - 导入、修剪、音量、速度、音调
metadata:
  tags: audio, media, trim, volume, speed, loop, pitch, mute, sound, sfx
---

# 在 Remotion 中使用音频

## 前置条件

首先，需要安装 @remotion/media 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/media # 如果项目使用 npm
bunx remotion add @remotion/media # 如果项目使用 bun
yarn remotion add @remotion/media # 如果项目使用 yarn
pnpm exec remotion add @remotion/media # 如果项目使用 pnpm
```

## 导入音频

使用 `@remotion/media` 的 `<Audio>` 组件将音频添加到您的合成中。

```tsx
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export const MyComposition = () => {
  // 使用 Audio 组件播放本地音频文件
  return <Audio src={staticFile("audio.mp3")} />;
};
```

也支持远程 URL：

```tsx
{/* 直接使用远程音频 URL */}
<Audio src="https://remotion.media/audio.mp3" />
```

默认情况下，音频从开头播放，音量为最大，播放完整长度。
可以通过添加多个 `<Audio>` 组件来叠加多个音轨。

## 修剪

使用 `trimBefore` 和 `trimAfter` 移除音频的部分。值以帧为单位。

```tsx
const { fps } = useVideoConfig(); // 获取帧率

return (
  <Audio
    src={staticFile("audio.mp3")}
    trimBefore={2 * fps} // 跳过前 2 秒
    trimAfter={10 * fps} // 在第 10 秒标记处结束
  />
);
```

音频仍然从合成的开头开始播放 - 只播放指定的部分。

## 延迟

将音频包装在 `<Sequence>` 中以延迟开始时间：

```tsx
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";

const { fps } = useVideoConfig();

return (
  {/* 从第 1 秒开始播放音频 */}
  <Sequence from={1 * fps}>
    <Audio src={staticFile("audio.mp3")} />
  </Sequence>
);
```

音频将在 1 秒后开始播放。

## 音量

设置静态音量（0 到 1）：

```tsx
{/* 音量设置为 50% */}
<Audio src={staticFile("audio.mp3")} volume={0.5} />
```

或者使用回调函数根据当前帧动态调整音量：

```tsx
import { interpolate } from "remotion";

const { fps } = useVideoConfig();

return (
  <Audio
    src={staticFile("audio.mp3")}
    volume={(f) =>
      // 音量从 0 渐变到 1（1 秒内）
      interpolate(f, [0, 1 * fps], [0, 1], { extrapolateRight: "clamp" })
    }
  />
);
```

当音频开始播放时，`f` 的值从 0 开始，而不是合成的帧号。

## 静音

使用 `muted` 使音频静音。可以动态设置：

```tsx
const frame = useCurrentFrame(); // 获取当前帧
const { fps } = useVideoConfig(); // 获取帧率

return (
  <Audio
    src={staticFile("audio.mp3")}
    muted={frame >= 2 * fps && frame <= 4 * fps} // 在 2 秒到 4 秒之间静音
  />
);
```

## 速度

使用 `playbackRate` 更改播放速度：

```tsx
<Audio src={staticFile("audio.mp3")} playbackRate={2} /> {/* 2 倍速 */}
<Audio src={staticFile("audio.mp3")} playbackRate={0.5} /> {/* 半速 */}
```

不支持反向播放。

## 循环

使用 `loop` 使音频无限循环：

```tsx
{/* 循环播放音频 */}
<Audio src={staticFile("audio.mp3")} loop />
```

使用 `loopVolumeCurveBehavior` 控制循环时帧计数的行为：

- `"repeat"`：每次循环时帧计数重置为 0（默认）
- `"extend"`：帧计数继续递增

```tsx
<Audio
  src={staticFile("audio.mp3")}
  loop
  loopVolumeCurveBehavior="extend"
  volume={(f) => interpolate(f, [0, 300], [1, 0])} // 在多次循环中淡出
/>
```

## 音调

使用 `toneFrequency` 调整音调而不影响速度。值范围从 0.01 到 2：

```tsx
{/* 较高音调 */}
<Audio
  src={staticFile("audio.mp3")}
  toneFrequency={1.5}
/>
{/* 较低音调 */}
<Audio
  src={staticFile("audio.mp3")}
  toneFrequency={0.8}
/>
```

音调调整仅在服务器端渲染时有效，不适用于 Remotion Studio 预览或 `<Player />`。
