---
name: get-video-duration
description: 使用 Mediabunny 获取视频文件的持续时间（秒）
metadata:
  tags: duration, video, length, time, seconds
---

# 使用 Mediabunny 获取视频持续时间

Mediabunny 可以提取视频文件的持续时间。它可以在浏览器、Node.js 和 Bun 环境中工作。

## 获取视频持续时间

```tsx
import { Input, ALL_FORMATS, UrlSource } from "mediabunny"; // 导入 Mediabunny 组件

// 获取视频持续时间的异步函数
export const getVideoDuration = async (src: string) => {
  // 创建输入源，支持所有格式
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null, // 不重试
    }),
  });

  // 计算并返回持续时间（秒）
  const durationInSeconds = await input.computeDuration();
  return durationInSeconds;
};
```

## 用法

```tsx
// 获取视频持续时间
const duration = await getVideoDuration("https://remotion.media/video.mp4");
console.log(duration); // 例如：10.5（秒）
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

// 计算持续时间（秒）
const durationInSeconds = await input.computeDuration();
```

## 与 Remotion 中的 staticFile 一起使用

```tsx
import { staticFile } from "remotion"; // 导入静态文件函数

// 获取本地视频文件的持续时间
const duration = await getVideoDuration(staticFile("video.mp4"));
```
