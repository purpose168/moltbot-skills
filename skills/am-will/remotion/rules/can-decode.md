---
name: can-decode
description: 使用 Mediabunny 检查视频是否可以被浏览器解码
metadata:
  tags: decode, validation, video, audio, compatibility, browser
---

# 检查视频是否可以被解码

使用 Mediabunny 在尝试播放视频之前检查视频是否可以被浏览器解码。

## `canDecode()` 函数

此函数可以直接复制粘贴到任何项目中。

```tsx
import { Input, ALL_FORMATS, UrlSource } from "mediabunny"; // 导入 Mediabunny 组件

// 检查视频是否可以解码的异步函数
export const canDecode = async (src: string) => {
  // 创建输入源，支持所有格式
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null, // 不重试
    }),
  });

  try {
    await input.getFormat(); // 尝试获取格式信息
  } catch {
    return false; // 获取失败，返回 false
  }

  // 检查视频轨道是否可以解码
  const videoTrack = await input.getPrimaryVideoTrack();
  if (videoTrack && !(await videoTrack.canDecode())) {
    return false; // 视频轨道无法解码，返回 false
  }

  // 检查音频轨道是否可以解码
  const audioTrack = await input.getPrimaryAudioTrack();
  if (audioTrack && !(await audioTrack.canDecode())) {
    return false; // 音频轨道无法解码，返回 false
  }

  return true; // 所有检查通过，返回 true
};
```

## 用法

```tsx
const src = "https://remotion.media/video.mp4"; // 视频源 URL
const isDecodable = await canDecode(src); // 检查是否可以解码

if (isDecodable) {
  console.log("Video can be decoded"); // 视频可以被解码
} else {
  console.log("Video cannot be decoded by this browser"); // 视频无法被此浏览器解码
}
```

## 与 Blob 一起使用

对于文件上传或拖放，使用 `BlobSource`：

```tsx
import { Input, ALL_FORMATS, BlobSource } from "mediabunny"; // 导入 Mediabunny 组件

// 检查 Blob 是否可以解码的异步函数
export const canDecodeBlob = async (blob: Blob) => {
  // 创建输入源，支持所有格式
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob), // 使用 Blob 作为源
  });

  // 与上面相同的验证逻辑
};
```
