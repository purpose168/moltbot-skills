---
name: get-video-dimensions
description: 使用 Mediabunny 获取视频文件的宽度和高度
metadata:
  tags: dimensions, width, height, resolution, size, video
---

# 使用 Mediabunny 获取视频尺寸

Mediabunny 可以提取视频文件的宽度和高度。它可以在浏览器、Node.js 和 Bun 环境中工作。

## 获取视频尺寸

```tsx
import { Input, ALL_FORMATS, UrlSource } from "mediabunny"; // 导入 Mediabunny 组件

// 获取视频尺寸的异步函数
export const getVideoDimensions = async (src: string) => {
  // 创建输入源，支持所有格式
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null, // 不重试
    }),
  });

  // 获取主视频轨道
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error("No video track found"); // 未找到视频轨道
  }

  // 返回视频尺寸
  return {
    width: videoTrack.displayWidth, // 显示宽度
    height: videoTrack.displayHeight, // 显示高度
  };
};
```

## 用法

```tsx
// 获取视频尺寸
const dimensions = await getVideoDimensions("https://remotion.media/video.mp4");
console.log(dimensions.width);  // 例如：1920
console.log(dimensions.height); // 例如：1080
```

## 与本地文件一起使用

对于本地文件，请使用 `FileSource` 而不是 `UrlSource`：

```tsx
import { Input, ALL_FORMATS, FileSource } from "mediabunny"; // 导入 Mediabunny 组件

// 创建输入源，使用文件源
const input = new Input({
  formats: ALL_FORMATS,
  source: new FileSource(file), // 来自 input 或拖放的 File 对象
});

// 获取视频轨道和尺寸
const videoTrack = await input.getPrimaryVideoTrack();
const width = videoTrack.displayWidth;
const height = videoTrack.displayHeight;
```

## 与 Remotion 中的 staticFile 一起使用

```tsx
import { staticFile } from "remotion"; // 导入静态文件函数

// 获取本地视频文件的尺寸
const dimensions = await getVideoDimensions(staticFile("video.mp4"));
```
