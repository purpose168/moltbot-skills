---
name: gif
description: 在 Remotion 中显示 GIF、APNG、AVIF 和 WebP 动画图片
metadata:
  tags: gif, animation, images, animated, apng, avif, webp
---

# 在 Remotion 中使用动画图片

## 基本用法

使用 `<AnimatedImage>` 显示 GIF、APNG、AVIF 或 WebP 图片，并与 Remotion 的时间线同步：

```tsx
import {AnimatedImage, staticFile} from 'remotion';

export const MyComposition = () => {
  // 使用 AnimatedImage 组件显示动画图片
  return <AnimatedImage src={staticFile('animation.gif')} width={500} height={500} />;
};
```

也支持远程 URL（必须启用 CORS）：

```tsx
{/* 使用远程动画图片 URL */}
<AnimatedImage src="https://example.com/animation.gif" width={500} height={500} />
```

## 大小和适配

使用 `fit` 属性控制图片如何填充其容器：

```tsx
// 拉伸以填充（默认）
<AnimatedImage src={staticFile("animation.gif")} width={500} height={300} fit="fill" />

// 保持宽高比，适应容器内部
<AnimatedImage src={staticFile("animation.gif")} width={500} height={300} fit="contain" />

// 填充容器，需要时裁剪
<AnimatedImage src={staticFile("animation.gif")} width={500} height={300} fit="cover" />
```

## 播放速度

使用 `playbackRate` 控制动画速度：

```tsx
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} playbackRate={2} /> {/* 2 倍速 */}
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} playbackRate={0.5} /> {/* 半速 */}
```

## 循环行为

控制动画结束时的行为：

```tsx
// 无限循环（默认）
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} loopBehavior="loop" />

// 播放一次，显示最后一帧
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} loopBehavior="pause-after-finish" />

// 播放一次，然后清除画布
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} loopBehavior="clear-after-finish" />
```

## 样式

使用 `style` 属性添加额外的 CSS（使用 `width` 和 `height` 属性进行尺寸设置）：

```tsx
<AnimatedImage
  src={staticFile('animation.gif')}
  width={500}
  height={500}
  style={{
    borderRadius: 20, // 圆角边框
    position: 'absolute', // 绝对定位
    top: 100, // 距离顶部 100 像素
    left: 50, // 距离左侧 50 像素
  }}
/>
```

## 获取 GIF 持续时间

使用 `@remotion/gif` 的 `getGifDurationInSeconds()` 获取 GIF 的持续时间。

```bash
npx remotion add @remotion/gif # 如果项目使用 npm
bunx remotion add @remotion/gif # 如果项目使用 bun
yarn remotion add @remotion/gif # 如果项目使用 yarn
pnpm exec remotion add @remotion/gif # 如果项目使用 pnpm
```

```tsx
import {getGifDurationInSeconds} from '@remotion/gif';
import {staticFile} from 'remotion';

// 异步获取 GIF 持续时间（秒）
const duration = await getGifDurationInSeconds(staticFile('animation.gif'));
console.log(duration); // 例如：2.5
```

这对于设置合成持续时间以匹配 GIF 很有用：

```tsx
import {getGifDurationInSeconds} from '@remotion/gif';
import {staticFile, CalculateMetadataFunction} from 'remotion';

// 计算元数据函数：根据 GIF 持续时间设置合成持续时间
const calculateMetadata: CalculateMetadataFunction = async () => {
  // 获取 GIF 持续时间
  const duration = await getGifDurationInSeconds(staticFile('animation.gif'));
  return {
    // 将秒转换为帧数（假设帧率 30fps）
    durationInFrames: Math.ceil(duration * 30),
  };
};
```

## 替代方案

如果 `<AnimatedImage>` 不起作用（仅支持 Chrome 和 Firefox），可以改用 `@remotion/gif` 的 `<Gif>` 组件。

```bash
npx remotion add @remotion/gif # 如果项目使用 npm
bunx remotion add @remotion/gif # 如果项目使用 bun
yarn remotion add @remotion/gif # 如果项目使用 yarn
pnpm exec remotion add @remotion/gif # 如果项目使用 pnpm
```

```tsx
import {Gif} from '@remotion/gif';
import {staticFile} from 'remotion';

export const MyComposition = () => {
  // 使用 Gif 组件显示 GIF 图片
  return <Gif src={staticFile('animation.gif')} width={500} height={500} />;
};
```

`<Gif>` 组件具有与 `<AnimatedImage>` 相同的属性，但只支持 GIF 文件。
